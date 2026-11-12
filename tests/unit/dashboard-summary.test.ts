import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import path from "node:path"

import { prisma } from "@/lib/prisma"
import { getDashboardSummary } from "@/lib/services/dashboard.service"

/**
 * B12: the dashboard summary fed the mobile home screen (and the web dashboard
 * cards) fabricated values: `streakDays` 1 or 3 depending on whether any attempt
 * existed, `dailyGoalProgress` 65 for a signed-in user and 20 for a guest, a
 * `todayQuiz` id (`daily-ca-quiz-today`) that matches no row, and a
 * "continue learning" lesson taken from the first published course rather than
 * the learner's own progress.
 *
 * Every case below is scoped to fixtures created here, so the assertions do not
 * depend on what else is in the test database.
 */

const nonce = `b12-${Date.now()}`

describe("B12 dashboard summary uses real rows", () => {
  let userId = ""
  let idleUserId = ""
  let courseId = ""
  let chapterId = ""
  let lessonToday = ""
  let lessonOlder = ""
  let seriesId = ""
  let attemptTestId = ""
  let publishedQuizId = ""
  let draftQuizId = ""
  let draftNewestTestId = ""

  before(async () => {
    await prisma.$connect()

    const [activeUser, idleUser] = await Promise.all([
      prisma.user.create({
        data: { email: `${nonce}-active@example.test`, name: "Active Learner", streak: 4 },
        select: { id: true },
      }),
      prisma.user.create({
        data: { email: `${nonce}-idle@example.test`, name: "Idle Learner" },
        select: { id: true },
      }),
    ])
    userId = activeUser.id
    idleUserId = idleUser.id

    const course = await prisma.course.create({
      data: {
        title: `B12 published course ${nonce}`,
        slug: `${nonce}-course`,
        description: "Dashboard fixture",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
      },
      select: { id: true },
    })
    courseId = course.id

    const chapter = await prisma.chapter.create({
      data: { title: "Chapter", order: 1, courseId },
      select: { id: true },
    })
    chapterId = chapter.id

    const [today, older] = await Promise.all([
      prisma.lesson.create({
        data: { title: "Resume here", type: "READING", order: 1, chapterId },
        select: { id: true },
      }),
      prisma.lesson.create({
        data: { title: "Older lesson", type: "READING", order: 2, chapterId },
        select: { id: true },
      }),
    ])
    lessonToday = today.id
    lessonOlder = older.id

    // 15 minutes today (50% of the documented 30-minute goal) and 10 minutes
    // three days ago (must not count towards today's goal).
    await prisma.progress.createMany({
      data: [
        { userId, lessonId: lessonToday, completed: false, timeSpent: 900, lastAccessed: new Date() },
        {
          userId,
          lessonId: lessonOlder,
          completed: true,
          timeSpent: 600,
          lastAccessed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      ],
    })

    const series = await prisma.examSeries.create({
      data: {
        title: `B12 series ${nonce}`,
        slug: `${nonce}-series`,
        examName: "BPSC",
        category: "Civil Services",
        isPublished: true,
        createdById: userId,
      },
      select: { id: true },
    })
    seriesId = series.id

    const attemptTest = await prisma.examTest.create({
      data: {
        seriesId,
        title: `B12 attempted test ${nonce}`,
        testType: "FULL_MOCK",
        isPublished: true,
        createdById: userId,
      },
      select: { id: true },
    })
    attemptTestId = attemptTest.id

    await prisma.examAttempt.create({
      data: { userId, testId: attemptTestId, status: "SUBMITTED", score: 42 },
    })

    // The newest published CURRENT_AFFAIRS test is the real "today's quiz".
    const publishedQuiz = await prisma.examTest.create({
      data: {
        seriesId,
        title: `B12 published CA quiz ${nonce}`,
        testType: "CURRENT_AFFAIRS",
        isPublished: true,
        year: 9999,
        month: 12,
        totalQuestions: 12,
        createdById: userId,
      },
      select: { id: true },
    })
    publishedQuizId = publishedQuiz.id

    // Neither of these may ever be offered to a learner.
    const draftQuiz = await prisma.examTest.create({
      data: {
        seriesId,
        title: `B12 draft CA quiz ${nonce}`,
        testType: "CURRENT_AFFAIRS",
        isPublished: false,
        year: 9999,
        month: 12,
        totalQuestions: 10,
        createdById: userId,
      },
      select: { id: true },
    })
    draftQuizId = draftQuiz.id

    const draftNewest = await prisma.examTest.create({
      data: {
        seriesId,
        title: `B12 newest draft test ${nonce}`,
        testType: "FULL_MOCK",
        isPublished: false,
        createdById: userId,
      },
      select: { id: true },
    })
    draftNewestTestId = draftNewest.id
  })

  after(async () => {
    await prisma.progress.deleteMany({ where: { userId: { in: [userId, idleUserId] } } })
    await prisma.examAttempt.deleteMany({ where: { userId: { in: [userId, idleUserId] } } })
    await prisma.examTest.deleteMany({ where: { seriesId } })
    await prisma.examSeries.deleteMany({ where: { id: seriesId } })
    await prisma.lesson.deleteMany({ where: { chapterId } })
    await prisma.chapter.deleteMany({ where: { id: chapterId } })
    await prisma.course.deleteMany({ where: { id: courseId } })
    await prisma.user.deleteMany({ where: { id: { in: [userId, idleUserId] } } })
    await prisma.$disconnect()
  })

  it("reports zeros for a guest and never links to an unpublished test", async () => {
    const summary = await getDashboardSummary(undefined)

    assert.equal(summary.streakDays, 0)
    assert.equal(summary.dailyGoalProgress, 0)
    assert.equal(summary.continueLearning, null, "a guest has no progress to resume")

    // The quiz is a real published row, not the hardcoded daily-quiz id.
    assert.notEqual(summary.todayQuiz?.id, "daily-ca-quiz-today")
    assert.equal(summary.todayQuiz?.id, publishedQuizId)
    assert.equal(summary.todayQuiz?.questionCount, 12)
    assert.notEqual(summary.todayQuiz?.id, draftQuizId)

    // Featured tests are real published tests only.
    assert.equal(summary.upcomingOrRecentTests.length <= 3, true)
    const ids = summary.upcomingOrRecentTests.map((t) => t.id)
    assert.equal(ids.includes(draftNewestTestId), false, "a draft test must not be featured")
    assert.equal(ids.includes(draftQuizId), false, "a draft quiz must not be featured")
  })

  it("uses the learner's own streak, today's study time and latest lesson", async () => {
    const summary = await getDashboardSummary(userId)

    assert.equal(summary.streakDays, 4, "streak must be User.streak, not 1 or 3")
    assert.equal(
      summary.dailyGoalProgress,
      50,
      "15 minutes of the 30-minute documented goal is 50%, not 65"
    )

    assert.equal(summary.continueLearning?.lessonId, lessonToday)
    assert.equal(summary.continueLearning?.lessonTitle, "Resume here")
    assert.equal(summary.continueLearning?.tutorialTitle, `B12 published course ${nonce}`)
    assert.equal(summary.continueLearning?.tutorialSlug, `${nonce}-course`)

    // The learner attempted one test, so their own attempt is reported.
    assert.equal(summary.upcomingOrRecentTests.length, 1)
    assert.equal(summary.upcomingOrRecentTests[0].id, attemptTestId)
    assert.equal(summary.upcomingOrRecentTests[0].score, 42)
  })

  it("returns no continue-learning for a learner with no progress", async () => {
    const summary = await getDashboardSummary(idleUserId)

    assert.equal(
      summary.continueLearning,
      null,
      "the first published course's first lesson must not be offered as progress"
    )
    assert.equal(summary.streakDays, 0)
    assert.equal(summary.dailyGoalProgress, 0)
  })

  it("caps the daily goal at 100 percent", async () => {
    // Two hours today: the goal is achieved, not 400%.
    await prisma.progress.updateMany({
      where: { userId, lessonId: lessonToday },
      data: { timeSpent: 7200, lastAccessed: new Date() },
    })

    const summary = await getDashboardSummary(userId)
    assert.equal(summary.dailyGoalProgress, 100)

    await prisma.progress.updateMany({
      where: { userId, lessonId: lessonToday },
      data: { timeSpent: 900 },
    })
  })
})

describe("B12 dashboard UI does not invent card values", () => {
  const ROOT = process.cwd()

  const read = (file: string) => fs.readFile(path.join(ROOT, file), "utf-8")

  it("the dashboard page has no fabricated guest stats or course card values", async () => {
    const page = await read("app/(dashboard)/dashboard/page.tsx")

    for (const fabricated of [
      "xp: 150",
      "streak: 3",
      "achievements: 2",
      "hoursLearned: 8",
      "rating: c.rating || 4.8",
      "enrollmentCount: c.enrollmentCount || 1000",
      'duration: "40 hours"',
      "lessonsCount: 20",
    ]) {
      assert.equal(
        page.includes(fabricated),
        false,
        `dashboard page still contains the fabricated value \`${fabricated}\``
      )
    }

    assert.match(page, /_sum: \{ timeSpent: true \}/, "hours learned must come from Progress.timeSpent")
    assert.match(page, /enrollmentCount: c\._count\.enrollments/, "learner count must be the real count")
  })

  it("the tests tab shows fetched tests with loading, error and empty states", async () => {
    const client = await read("components/dashboard/StudentDashboardClient.tsx")

    // The per-goal hand-written test fixtures are gone.
    for (const fakeId of [
      "bpsc-72nd-2026",
      "upsc-prelims-2026",
      "class-10-boards-2026",
      "ssc-cgl-2026",
      "dsa-blind-75-mock",
      "skills-dsa-faang-2026",
      "bihar-gk-speed-drill",
    ]) {
      assert.equal(client.includes(fakeId), false, `hardcoded dashboard test \`${fakeId}\` is still present`)
    }

    assert.match(client, /testsLoading/, "the tests tab needs a loading state")
    assert.match(client, /testsError/, "the tests tab needs a visible error state")
    assert.match(client, /No mock tests published yet/, "the tests tab needs an empty state")
    assert.equal(
      /\} catch \(err\) \{\}/.test(client),
      false,
      "the test catalog fetch must not swallow its error silently"
    )
  })

  it("course cards do not fall back to an invented rating, duration or learner count", async () => {
    const cards = await read("components/dashboard/RecommendedCourses.tsx")

    assert.equal(cards.includes('"4.8"'), false, "an unrated course must not display 4.8")
    assert.equal(cards.includes("12h curriculum"), false, "the curriculum length must be real")
    assert.match(cards, /course\.rating > 0/, "rating must fall back to a neutral label")
    assert.doesNotMatch(cards, /learners/, "learner counts are hidden on student-facing cards per UX Pass 6")
  })
})
