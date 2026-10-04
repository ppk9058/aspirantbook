"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay, subDays } from "date-fns"

/**
 * Aggregate course analytics for a specific date
 */
export async function aggregateCourseAnalytics(courseId: string, date: Date) {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const startDate = startOfDay(date)
    const endDate = endOfDay(date)

    // Get enrollments
    const [totalEnrollments, newEnrollments] = await Promise.all([
        prisma.enrollment.count({
            where: { courseId },
        }),
        prisma.enrollment.count({
            where: {
                courseId,
                enrolledAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        }),
    ])

    // Get completions
    const completions = await prisma.progress.count({
        where: {
            courseId,
            completed: true,
            completedAt: {
                gte: startDate,
                lte: endDate,
            },
        },
    })

    // Get engagement metrics
    const progressRecords = await prisma.progress.findMany({
        where: {
            courseId,
            lastAccessed: {
                gte: startDate,
                lte: endDate,
            },
        },
        select: {
            timeSpent: true,
            userId: true,
        },
    })

    const totalTimeSpentHours = progressRecords.reduce((sum, p) => sum + (p.timeSpent || 0), 0) / 60
    const activeLearnersToday = new Set(progressRecords.map(p => p.userId)).size
    const avgTimePerUserHours = activeLearnersToday > 0 ? totalTimeSpentHours / activeLearnersToday : 0

    // Get lessons completed
    const lessonsCompleted = await prisma.progress.count({
        where: {
            courseId,
            completed: true,
            completedAt: {
                gte: startDate,
                lte: endDate,
            },
        },
    })

    // Get reviews
    const reviews = await prisma.review.findMany({
        where: {
            courseId,
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
        },
        select: {
            rating: true,
        },
    })

    const newReviews = reviews.length
    const averageRating = newReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / newReviews
        : 0

    // Calculate completion rate
    const completionRate = totalEnrollments > 0
        ? (completions / totalEnrollments) * 100
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
 * Aggregate user analytics for a specific date
 */
export async function aggregateUserAnalytics(userId: string, date: Date) {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const startDate = startOfDay(date)
    const endDate = endOfDay(date)

    // Get activity metrics
    const lessonsCompleted = await prisma.progress.count({
        where: {
            userId,
            completed: true,
            completedAt: {
                gte: startDate,
                lte: endDate,
            },
        },
    })

    const exercisesCompleted = await prisma.submission.count({
        where: {
            userId,
            isCorrect: true,
            submittedAt: {
                gte: startDate,
                lte: endDate,
            },
        },
    })

    const assessmentsTaken = await prisma.assessmentAttempt.count({
        where: {
            userId,
            startedAt: {
                gte: startDate,
                lte: endDate,
            },
        },
    })

    // Get progress records for time spent
    const progressRecords = await prisma.progress.findMany({
        where: {
            userId,
            lastAccessed: {
                gte: startDate,
                lte: endDate,
            },
        },
        select: {
            timeSpent: true,
        },
    })

    const timeSpentMinutes = progressRecords.reduce((sum, p) => sum + (p.timeSpent || 0), 0)

    // Get achievements unlocked
    const achievementsUnlocked = await prisma.userAchievement.count({
        where: {
            userId,
            earnedAt: {
                gte: startDate,
                lte: endDate,
            },
        },
    })

    // Get user data
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            streak: true,
            _count: {
                select: {
                    enrollments: true,
                },
            },
        },
    })

    // Upsert analytics record
    const analytics = await prisma.userAnalytics.upsert({
        where: {
            userId_date: {
                userId,
                date: startDate,
            },
        },
        update: {
            loginCount: 1, // Simplified - would need session tracking
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
            loginCount: 1,
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
 * Aggregate revenue analytics for a specific date
 */
export async function aggregateRevenueAnalytics(date: Date) {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const startDate = startOfDay(date)
    const endDate = endOfDay(date)

    // Get payments
    const payments = await prisma.payment.findMany({
        where: {
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
        },
        select: {
            amount: true,
            status: true,
        },
    })

    const totalRevenue = payments
        .filter(p => p.status === "COMPLETED")
        .reduce((sum, p) => sum + p.amount, 0)

    const refunds = payments
        .filter(p => p.status === "REFUNDED")
        .reduce((sum, p) => sum + p.amount, 0)

    const netRevenue = totalRevenue - refunds

    // Get subscriptions
    const [newSubscriptions, cancelledSubscriptions, activeSubscriptions] = await Promise.all([
        prisma.subscription.count({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        }),
        prisma.subscription.count({
            where: {
                status: "PAST_DUE", // Using valid enum value
                updatedAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        }),
        prisma.subscription.count({
            where: {
                status: "ACTIVE",
            },
        }),
    ])

    // Calculate MRR (simplified)
    const monthlySubscriptions = await prisma.subscription.findMany({
        where: {
            status: "ACTIVE",
            plan: "MONTHLY",
        },
    })

    const mrr = monthlySubscriptions.length * 9.99 // Assuming $9.99/month

    // Calculate churn rate
    const churnRate = activeSubscriptions > 0
        ? (cancelledSubscriptions / activeSubscriptions) * 100
        : 0

    // Upsert analytics record
    const analytics = await prisma.revenueAnalytics.upsert({
        where: {
            date: startDate,
        },
        update: {
            totalRevenue,
            newSubscriptionsRevenue: totalRevenue, // Simplified
            renewalRevenue: 0,
            refunds,
            netRevenue,
            newSubscriptions,
            cancelledSubscriptions,
            activeSubscriptions,
            mrr,
            arr: mrr * 12,
            churnRate,
        },
        create: {
            date: startDate,
            totalRevenue,
            newSubscriptionsRevenue: totalRevenue,
            renewalRevenue: 0,
            refunds,
            netRevenue,
            newSubscriptions,
            cancelledSubscriptions,
            activeSubscriptions,
            mrr,
            arr: mrr * 12,
            churnRate,
        },
    })

    return analytics
}

/**
 * Run all analytics aggregations for today
 */
export async function runDailyAnalytics() {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }

    const today = new Date()

    // Aggregate revenue
    await aggregateRevenueAnalytics(today)

    // Get all courses and aggregate
    const courses = await prisma.course.findMany({
        where: { status: "PUBLISHED" },
        select: { id: true },
    })

    for (const course of courses) {
        await aggregateCourseAnalytics(course.id, today)
    }

    // Get active users and aggregate
    const activeUsers = await prisma.user.findMany({
        where: {
            lastActive: {
                gte: subDays(today, 1),
            },
        },
        select: { id: true },
    })

    for (const user of activeUsers) {
        await aggregateUserAnalytics(user.id, today)
    }

    return {
        success: true,
        coursesAggregated: courses.length,
        usersAggregated: activeUsers.length,
    }
}
