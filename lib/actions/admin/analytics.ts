"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { mapWithConcurrency } from "@/lib/utils/concurrency"
import { startOfDay, endOfDay, subDays } from "date-fns"

/**
 * Aggregate course analytics for a specific date.
 *
 * B6: the previous version ran the same `progress` count twice (`completions`
 * and `lessonsCompleted` were literally the same query), computed the
 * completion rate as "lessons completed today / enrollments ever", and loaded
 * every progress row and every review into memory to reduce them. Here each
 * metric comes from its own definition:
 *   completions      = enrollments marked complete during the day
 *   lessonsCompleted = lessons completed during the day
 *   completionRate   = enrollments ever completed / enrollments ever
 * and the per-user rollup is a single `groupBy` instead of a full row scan.
 */
export async function aggregateCourseAnalytics(courseId: string, date: Date, preVerified = false) {
    if (!preVerified) {
        const session = await auth()
        if (!session || session.user.role !== "ADMIN") {
            throw new Error("Unauthorized")
        }
    }

    const startDate = startOfDay(date)
    const endDate = endOfDay(date)
    const inDay = { gte: startDate, lte: endDate }

    const [
        totalEnrollments,
        newEnrollments,
        completedEnrollments,
        completions,
        dayProgress,
        lessonsCompleted,
        reviewStats,
    ] = await Promise.all([
        prisma.enrollment.count({ where: { courseId } }),
        prisma.enrollment.count({ where: { courseId, enrolledAt: inDay } }),
        prisma.enrollment.count({ where: { courseId, completedAt: { not: null } } }),
        prisma.enrollment.count({ where: { courseId, completedAt: inDay } }),
        // One row per active learner: distinct users plus their time spent.
        prisma.progress.groupBy({
            by: ["userId"],
            where: {
                lesson: { chapter: { courseId } },
                lastAccessed: inDay,
            },
            _sum: { timeSpent: true },
        }),
        prisma.progress.count({
            where: {
                lesson: { chapter: { courseId } },
                completed: true,
                lastAccessed: inDay,
            },
        }),
        prisma.review.aggregate({
            where: { courseId, createdAt: inDay },
            _avg: { rating: true },
            _count: { _all: true },
        }),
    ])

    const totalTimeSpentMinutes = dayProgress.reduce((sum, row) => sum + (row._sum.timeSpent ?? 0), 0)
    const totalTimeSpentHours = totalTimeSpentMinutes / 60
    const activeLearnersToday = dayProgress.length
    const avgTimePerUserHours = activeLearnersToday > 0 ? totalTimeSpentHours / activeLearnersToday : 0

    const newReviews = reviewStats._count._all
    const averageRating = reviewStats._avg.rating ?? 0

    const completionRate = totalEnrollments > 0
        ? (completedEnrollments / totalEnrollments) * 100
        : 0

    // Upsert analytics record
    const analytics = await prisma.courseAnalytics.upsert({
        where: {
            courseId_date: {
                courseId,
                date: startDate,
            },
        },
        update: {
            totalEnrollments,
            newEnrollments,
            activeLearnersToday,
            completions,
            completionRate,
            totalTimeSpentHours,
            avgTimePerUserHours,
            lessonsCompleted,
            averageRating,
            newReviews,
        },
        create: {
            courseId,
            date: startDate,
            totalEnrollments,
            newEnrollments,
            activeLearnersToday,
            completions,
            completionRate,
            totalTimeSpentHours,
            avgTimePerUserHours,
            lessonsCompleted,
            averageRating,
            newReviews,
        },
    })

    return analytics
}

/**
 * Aggregate user analytics for a specific date.
 *
 * B6: `loginCount` was written as a hard-coded 1 ("Simplified - would need
 * session tracking") and overwritten on every run, so it never described
 * anything. Sign-in events are not persisted anywhere (the audit logger in
 * `lib/audit/audit-logger.ts` is an in-memory array), so this job no longer
 * writes a value it cannot measure and leaves the column at its default.
 * Time spent is a single `aggregate` instead of loading every progress row.
 */
export async function aggregateUserAnalytics(userId: string, date: Date, preVerified = false) {
    if (!preVerified) {
        const session = await auth()
        if (!session || session.user.role !== "ADMIN") {
            throw new Error("Unauthorized")
        }
    }

    const startDate = startOfDay(date)
    const endDate = endOfDay(date)
    const inDay = { gte: startDate, lte: endDate }

    // Get activity metrics — all queries are independent, run in parallel
    const [lessonsCompleted, exercisesCompleted, assessmentsTaken, timeSpent, achievementsUnlocked, user] = await Promise.all([
        prisma.progress.count({
            where: {
                userId,
                completed: true,
                lastAccessed: inDay,
            },
        }),
        prisma.submission.count({
            where: {
                userId,
                passed: true,
                createdAt: inDay,
            },
        }),
        prisma.assessmentAttempt.count({
            where: {
                userId,
                startedAt: inDay,
            },
        }),
        prisma.progress.aggregate({
            where: {
                userId,
                lastAccessed: inDay,
            },
            _sum: { timeSpent: true },
        }),
        prisma.userAchievement.count({
            where: {
                userId,
                unlockedAt: inDay,
            },
        }),
        prisma.user.findUnique({
            where: { id: userId },
            select: {
                streak: true,
                _count: {
                    select: {
                        enrollments: true,
                    },
                },
            },
        }),
    ])

    const timeSpentMinutes = timeSpent._sum.timeSpent ?? 0

    // Upsert analytics record
    const analytics = await prisma.userAnalytics.upsert({
        where: {
            userId_date: {
                userId,
                date: startDate,
            },
        },
        update: {
            timeSpentMinutes,
            lessonsCompleted,
            exercisesCompleted,
            assessmentsTaken,
            achievementsUnlocked,
            streakDays: user?.streak || 0,
            coursesEnrolled: user?._count.enrollments || 0,
        },
        create: {
            userId,
            date: startDate,
            timeSpentMinutes,
            lessonsCompleted,
            exercisesCompleted,
            assessmentsTaken,
            achievementsUnlocked,
            streakDays: user?.streak || 0,
            coursesEnrolled: user?._count.enrollments || 0,
        },
    })

    return analytics
}

/**
 * Aggregate revenue analytics for a specific date.
 *
 * B6: this used to invent money. MRR was `number of MONTHLY subscribers * 9.99`
 * (a constant, not a price anyone was charged) and ARR was that times twelve;
 * "cancelled" counted PAST_DUE subscriptions, which are not cancellations, and
 * new-subscription revenue was set to total revenue while renewal revenue was
 * hard-coded to 0.
 *
 * Now every written number comes from a stored row:
 *   totalRevenue / refunds  – summed by status
 *   new / renewal revenue   – the payment's subscription was created inside or
 *                             before the day (payments without a subscription
 *                             are course purchases and count in neither)
 *   cancelledSubscriptions  – status CANCELED updated during the day
 * MRR, ARR and churn rate are written as NULL: `Subscription` has no price and
 * no status history, so any number for them would be a guess.
 */
export async function aggregateRevenueAnalytics(date: Date, preVerified = false) {
    if (!preVerified) {
        const session = await auth()
        if (!session || session.user.role !== "ADMIN") {
            throw new Error("Unauthorized")
        }
    }

    const startDate = startOfDay(date)
    const endDate = endOfDay(date)
    const inDay = { gte: startDate, lte: endDate }

    const [
        paymentsByStatus,
        newSubscriptionsRevenue,
        renewalRevenue,
        newSubscriptions,
        cancelledSubscriptions,
        activeSubscriptions,
    ] = await Promise.all([
        prisma.payment.groupBy({
            by: ["status"],
            where: { createdAt: inDay },
            _sum: { amount: true },
        }),
        prisma.payment.aggregate({
            where: {
                createdAt: inDay,
                status: "COMPLETED",
                subscription: { createdAt: inDay },
            },
            _sum: { amount: true },
        }),
        prisma.payment.aggregate({
            where: {
                createdAt: inDay,
                status: "COMPLETED",
                subscription: { createdAt: { lt: startDate } },
            },
            _sum: { amount: true },
        }),
        prisma.subscription.count({
            where: { createdAt: inDay },
        }),
        prisma.subscription.count({
            where: {
                status: "CANCELED",
                updatedAt: inDay,
            },
        }),
        prisma.subscription.count({
            where: { status: "ACTIVE" },
        }),
    ])

    const sumFor = (status: "COMPLETED" | "REFUNDED") =>
        paymentsByStatus.find((row) => row.status === status)?._sum.amount ?? 0

    const totalRevenue = sumFor("COMPLETED")
    const refunds = sumFor("REFUNDED")
    const netRevenue = totalRevenue - refunds

    // Upsert analytics record
    const analytics = await prisma.revenueAnalytics.upsert({
        where: {
            date: startDate,
        },
        update: {
            totalRevenue,
            newSubscriptionsRevenue: newSubscriptionsRevenue._sum.amount ?? 0,
            renewalRevenue: renewalRevenue._sum.amount ?? 0,
            refunds,
            netRevenue,
            newSubscriptions,
            cancelledSubscriptions,
            activeSubscriptions,
            mrr: null,
            arr: null,
            churnRate: null,
        },
        create: {
            date: startDate,
            totalRevenue,
            newSubscriptionsRevenue: newSubscriptionsRevenue._sum.amount ?? 0,
            renewalRevenue: renewalRevenue._sum.amount ?? 0,
            refunds,
            netRevenue,
            newSubscriptions,
            cancelledSubscriptions,
            activeSubscriptions,
            mrr: null,
            arr: null,
            churnRate: null,
        },
    })

    return analytics
}

/**
 * Run all analytics aggregations for today.
 *
 * B6: courses and users were aggregated one `await` at a time. They now run in
 * bounded waves so a full day's snapshot finishes in a predictable number of
 * round trips without opening one connection per course.
 */
export async function runDailyAnalytics() {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const today = new Date()

    // Aggregate revenue
    await aggregateRevenueAnalytics(today, true)

    // Get all courses and aggregate
    const courses = await prisma.course.findMany({
        where: { status: "PUBLISHED" },
        select: { id: true },
    })

    await mapWithConcurrency(courses, 4, (course) =>
        aggregateCourseAnalytics(course.id, today, true)
    )

    // Get active users and aggregate
    const activeUsers = await prisma.user.findMany({
        where: {
            lastActive: {
                gte: subDays(today, 1),
            },
        },
        select: { id: true },
    })

    await mapWithConcurrency(activeUsers, 8, (user) =>
        aggregateUserAnalytics(user.id, today, true)
    )

    return {
        success: true,
        coursesAggregated: courses.length,
        usersAggregated: activeUsers.length,
    }
}
