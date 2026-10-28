import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"

import { prisma } from "@/lib/prisma"
import {
  aggregateCourseAnalytics,
  aggregateUserAnalytics,
  aggregateRevenueAnalytics,
} from "@/lib/actions/admin/analytics"
import { mapWithConcurrency } from "@/lib/utils/concurrency"

/**
 * B6: the admin analytics aggregations invented numbers.
 *
 * Covered here:
 *  1. course metrics use their real definitions (completions were the same
 *     query as lessonsCompleted and completionRate divided today's lessons by
 *     all-time enrollments);
 *  2. user analytics no longer writes a hard-coded loginCount of 1;
 *  3. revenue splits new vs renewal subscription revenue and leaves MRR/ARR/
 *     churn NULL instead of "monthly subscribers * 9.99" and PAST_DUE-as-churn;
 *  4. the daily job's batching helper runs every item exactly once, in order,
 *     with a bounded number of workers.
 */

const nonce = `b6-${Date.now()}`
const day = new Date(2019, 2, 15, 12, 0, 0)
const dayStart = new Date(2019, 2, 15, 0, 0, 0, 0)

describe("B6 admin analytics are measured, not invented", () => {
  // fixtures created in before(), removed in after()
  const courseIds: string[] = []
  const userIds: string[] = []
  const subscriptionIds: string[] = []
  const paymentIds: string[] = []
  const achievementIds: string[] = []

  let courseId = ""
  let learnerA = ""
  let learnerB = ""

  before(async () => {
    await prisma.$connect()

    const learnerARow = await prisma.user.create({
      data: { email: `${nonce}-a@aspirantbook.test`, role: "FREE", streak: 7, lastActive: day },
      select: { id: true },
    })
    const learnerBRow = await prisma.user.create({
      data: { email: `${nonce}-b@aspirantbook.test`, role: "FREE", lastActive: day },
      select: { id: true },
    })
    learnerA = learnerARow.id
    learnerB = learnerBRow.id
    userIds.push(learnerA, learnerB)

    const course = await prisma.course.create({
      data: {
        title: `B6 analytics course ${nonce}`,
        slug: `b6-analytics-${nonce}`,
        description: "B6 fixture",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
      },
      select: { id: true },
    })
    courseId = course.id
    courseIds.push(course.id)

    const chapter = await prisma.chapter.create({
      data: { title: "B6 chapter", courseId, order: 1 },
      select: { id: true },
    })
    const lessons = await Promise.all([
      prisma.lesson.create({
        data: { title: "B6 lesson 1", type: "READING", chapterId: chapter.id, order: 1 },
        select: { id: true },
      }),
      prisma.lesson.create({
        data: { title: "B6 lesson 2", type: "READING", chapterId: chapter.id, order: 2 },
        select: { id: true },
      }),
    ])

    await prisma.progress.createMany({
      data: [
        // learner A: two completed lessons, 30 + 60 minutes
        { userId: learnerA, lessonId: lessons[0].id, completed: true, timeSpent: 30, lastAccessed: day },
        { userId: learnerA, lessonId: lessons[1].id, completed: true, timeSpent: 60, lastAccessed: day },
        // learner B: opened one lesson, 30 minutes
        { userId: learnerB, lessonId: lessons[0].id, completed: false, timeSpent: 30, lastAccessed: day },
      ],
    })

    await prisma.enrollment.createMany({
      data: [
        // one enrollment completed that day, one still open
        { userId: learnerA, courseId, enrolledAt: day, completedAt: day },
        { userId: learnerB, courseId, enrolledAt: day, completedAt: null },
      ],
    })

    await prisma.review.createMany({
      data: [
        { userId: learnerA, courseId, rating: 4, createdAt: day },
        { userId: learnerB, courseId, rating: 5, createdAt: day },
      ],
    })

    const achievement = await prisma.achievement.create({
      data: {
        name: `B6 achievement ${nonce}`,
        slug: `b6-achievement-${nonce}`,
        description: "B6 fixture",
        icon: "trophy",
        xpReward: 10,
        condition: {},
      },
      select: { id: true },
    })
    achievementIds.push(achievement.id)
    await prisma.userAchievement.create({
      data: { userId: learnerA, achievementId: achievement.id, unlockedAt: day },
    })

    // Revenue fixtures: a new-subscription payment, a renewal payment, a
    // course purchase (no subscription) and a refund.
    const newSub = await prisma.subscription.create({
      data: {
        userId: learnerA,
        plan: "MONTHLY",
        status: "ACTIVE",
        provider: "STRIPE",
        providerId: `${nonce}-new-sub`,
        startDate: day,
        endDate: new Date(2019, 3, 15),
        createdAt: day,
      },
      select: { id: true },
    })
    const oldSub = await prisma.subscription.create({
      data: {
        userId: learnerB,
        plan: "YEARLY",
        status: "ACTIVE",
        provider: "STRIPE",
        providerId: `${nonce}-old-sub`,
        startDate: new Date(2019, 0, 1),
        endDate: new Date(2020, 0, 1),
        createdAt: new Date(2019, 0, 1),
      },
      select: { id: true },
    })
    subscriptionIds.push(newSub.id, oldSub.id)

    // Two PAST_DUE subscriptions must not be reported as cancellations, and one
    // real CANCELED subscription must be.
    for (const suffix of ["past-due-1", "past-due-2", "canceled"]) {
      const sub = await prisma.subscription.create({
        data: {
          userId: learnerA,
          plan: "MONTHLY",
          status: suffix === "canceled" ? "CANCELED" : "PAST_DUE",
          provider: "RAZORPAY",
          providerId: `${nonce}-${suffix}`,
          startDate: new Date(2018, 0, 1),
          endDate: new Date(2018, 1, 1),
          updatedAt: day,
        },
        select: { id: true },
      })
      subscriptionIds.push(sub.id)
    }

    const payments = await prisma.payment.createManyAndReturn({
      data: [
        { userId: learnerA, subscriptionId: newSub.id, amount: 500, status: "COMPLETED", createdAt: day },
        { userId: learnerB, subscriptionId: oldSub.id, amount: 300, status: "COMPLETED", createdAt: day },
        { userId: learnerA, amount: 200, status: "COMPLETED", createdAt: day },
        { userId: learnerA, amount: 100, status: "REFUNDED", createdAt: day },
      ],
      select: { id: true },
    })
    paymentIds.push(...payments.map((p) => p.id))

    // Start from empty analytics rows for this course/user/day.
    await prisma.courseAnalytics.deleteMany({ where: { courseId, date: dayStart } })
    await prisma.userAnalytics.deleteMany({ where: { userId: learnerA, date: dayStart } })
    await prisma.revenueAnalytics.deleteMany({ where: { date: dayStart } })
  })

  after(async () => {
    await prisma.userAnalytics.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.courseAnalytics.deleteMany({ where: { courseId: { in: courseIds } } })
    await prisma.revenueAnalytics.deleteMany({ where: { date: dayStart } })
    await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } })
    await prisma.subscription.deleteMany({ where: { id: { in: subscriptionIds } } })
    await prisma.achievement.deleteMany({ where: { id: { in: achievementIds } } })
    await prisma.course.deleteMany({ where: { id: { in: courseIds } } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    await prisma.$disconnect()
  })

  it("derives each course metric from its own definition", async () => {
    const row = await aggregateCourseAnalytics(courseId, day, true)

    assert.equal(row.totalEnrollments, 2)
    assert.equal(row.newEnrollments, 2)
    // one enrollment was completed during the day, not two
    assert.equal(row.completions, 1)
    assert.equal(row.lessonsCompleted, 2)
    // 1 of 2 enrollments ever completed -> 50%
    assert.equal(row.completionRate, 50)
    assert.equal(row.activeLearnersToday, 2)
    assert.equal(row.totalTimeSpentHours, 2)
    assert.equal(row.avgTimePerUserHours, 1)
    assert.equal(row.newReviews, 2)
    assert.equal(row.averageRating, 4.5)
  })

  it("does not write a fabricated login count", async () => {
    const row = await aggregateUserAnalytics(learnerA, day, true)

    assert.equal(row.timeSpentMinutes, 90)
    assert.equal(row.lessonsCompleted, 2)
    assert.equal(row.achievementsUnlocked, 1)
    assert.equal(row.streakDays, 7)
    assert.equal(row.coursesEnrolled, 1)
    // login events are not tracked anywhere; the old code always wrote 1
    assert.equal(row.loginCount, 0)
  })

  it("splits new and renewal revenue and leaves unmeasurable metrics null", async () => {
    const row = await aggregateRevenueAnalytics(day, true)

    assert.equal(row.totalRevenue, 1000)
    assert.equal(row.refunds, 100)
    assert.equal(row.netRevenue, 900)
    // 500 came from a subscription created that day, 300 from an older one;
    // the 200 course purchase belongs to neither bucket
    assert.equal(row.newSubscriptionsRevenue, 500)
    assert.equal(row.renewalRevenue, 300)
    assert.equal(row.newSubscriptions, 1)
    // PAST_DUE is not a cancellation
    assert.equal(row.cancelledSubscriptions, 1)
    assert.equal(row.activeSubscriptions >= 2, true)

    // MRR/ARR/churn were guesses; they must stay null rather than "9.99 * n"
    assert.equal(row.mrr, null)
    assert.equal(row.arr, null)
    assert.equal(row.churnRate, null)
  })

  it("keeps the stored values null, not zero, when read back", async () => {
    const stored = await prisma.revenueAnalytics.findUnique({ where: { date: dayStart } })
    assert.ok(stored)
    assert.equal(stored!.mrr, null)
    assert.equal(stored!.arr, null)
    assert.equal(stored!.churnRate, null)
  })

  it("runs batched work once per item, in order, with bounded concurrency", async () => {
    const items = Array.from({ length: 23 }, (_, i) => i)
    let inFlight = 0
    let maxInFlight = 0
    const seen: number[] = []

    const results = await mapWithConcurrency(items, 4, async (item) => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      seen.push(item)
      await new Promise((resolve) => setTimeout(resolve, 1))
      inFlight -= 1
      return item * 2
    })

    assert.deepEqual(results, items.map((i) => i * 2), "results keep input order")
    assert.deepEqual([...seen].sort((a, b) => a - b), items, "every item runs exactly once")
    assert.equal(maxInFlight <= 4, true, `concurrency must stay bounded (saw ${maxInFlight})`)
  })

  it("propagates a worker failure instead of returning partial results", async () => {
    await assert.rejects(
      mapWithConcurrency([1, 2, 3], 2, async (item) => {
        if (item === 2) throw new Error("boom")
        return item
      }),
      /boom/
    )
  })
})
