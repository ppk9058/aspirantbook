import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import { prisma, PASSWORD, newNonce, loginThroughUi, createActor } from "./test-series-e2e-helpers"
import { UserRole } from "@prisma/client"

test.describe.configure({ mode: "serial" })

test.describe("Current Affairs CBT Quiz Module & Security Gate D", () => {
  test.setTimeout(120_000)

  let nonce: string
  let teacherUser: any
  let studentUser: any
  let createdTestId: string
  let testTitle: string

  const sampleQuestions = [
    {
      questionEn: "Which country hosted the G20 Summit in 2023?",
      questionHi: "2023 में G20 शिखर सम्मेलन की मेजबानी किस देश ने की?",
      optionAEn: "India",
      optionBEn: "Brazil",
      optionCEn: "USA",
      optionDEn: "Indonesia",
      correctOption: "A",
      difficulty: "Easy",
      subject: "Current Affairs",
    },
    {
      questionEn: "Who was appointed as the Chief Election Commissioner of India?",
      questionHi: "भारत के मुख्य चुनाव आयुक्त के रूप में किसे नियुक्त किया गया?",
      optionAEn: "Rajiv Kumar",
      optionBEn: "Sushil Chandra",
      optionCEn: "Sunil Arora",
      optionDEn: "T. N. Seshan",
      correctOption: "A",
      difficulty: "Moderate",
      subject: "Polity & Governance",
    },
    {
      questionEn: "What is the theme of World Environment Day 2024?",
      questionHi: "विश्व पर्यावरण दिवस 2024 का विषय क्या है?",
      optionAEn: "Land restoration, desertification and drought resilience",
      optionBEn: "Beat Plastic Pollution",
      optionCEn: "Only One Earth",
      optionDEn: "Ecosystem Restoration",
      correctOption: "A",
      difficulty: "Moderate",
      subject: "Environment",
    },
    {
      questionEn: "Which space mission discovered water ice on the Moon's south pole?",
      questionHi: "किस अंतरिक्ष मिशन ने चंद्रमा के दक्षिणी ध्रुव पर जल बर्फ की खोज की?",
      optionAEn: "Chandrayaan-1",
      optionBEn: "Chandrayaan-3",
      optionCEn: "Artemis 1",
      optionDEn: "Apollo 11",
      correctOption: "B",
      difficulty: "Moderate",
      subject: "Science & Tech",
    },
    {
      questionEn: "Which Indian state launched the 'Mission Mahila Sarathi'?",
      questionHi: "किस भारतीय राज्य ने 'मिशन महिला सारथी' शुरू किया?",
      optionAEn: "Uttar Pradesh",
      optionBEn: "Bihar",
      optionCEn: "Madhya Pradesh",
      optionDEn: "Rajasthan",
      correctOption: "A",
      difficulty: "Hard",
      subject: "Government Schemes",
    },
  ]

  test.beforeAll(async () => {
    nonce = newNonce()
    testTitle = `CA Monthly Quiz January 2026 - ${nonce}`
    teacherUser = await createActor(nonce, UserRole.TEACHER, "ca-teacher")
    studentUser = await createActor(nonce, UserRole.FREE, "ca-student")
  })

  test.afterAll(async () => {
    if (createdTestId) {
      const attempts = await prisma.examAttempt.findMany({
        where: { testId: createdTestId },
        select: { id: true },
      })
      const attemptIds = attempts.map((a) => a.id)
      if (attemptIds.length > 0) {
        await prisma.examAttemptAnswer.deleteMany({
          where: { attemptId: { in: attemptIds } },
        }).catch(() => {})
        await prisma.examAttempt.deleteMany({
          where: { id: { in: attemptIds } },
        }).catch(() => {})
      }
      await prisma.examQuestion.deleteMany({
        where: { section: { testId: createdTestId } },
      }).catch(() => {})
      await prisma.examSection.deleteMany({
        where: { testId: createdTestId },
      }).catch(() => {})
      await prisma.examTest.delete({
        where: { id: createdTestId },
      }).catch(() => {})
    }

    const userIds = [teacherUser?.id, studentUser?.id].filter(Boolean)
    if (userIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      }).catch(() => {})
    }
  })

  test("D-01: Teacher creates Current Affairs quiz with month=1, year=2026, 5 questions, mapped to hidden system series", async ({ page }) => {
    await loginThroughUi(page, teacherUser.email)

    const createRes = await page.request.post("/api/exam/test/create", {
      data: {
        title: testTitle,
        titleHi: "मासिक समसामयिकी क्विज जनवरी 2026",
        testType: "CURRENT_AFFAIRS",
        accessMode: "FREE",
        durationMinutes: 15,
        month: 1,
        year: 2026,
        isPublished: true,
        sections: [
          {
            title: "Current Affairs Section",
            positiveMarks: 1,
            negativeMarks: 0.25,
            questions: sampleQuestions,
          },
        ],
      },
    })

    expect(createRes.status()).toBe(200)
    const json = await createRes.json()
    expect(json.success).toBe(true)
    createdTestId = json.data.id
    expect(createdTestId).toBeTruthy()

    // Verify DB fields
    const dbTest = await prisma.examTest.findUnique({
      where: { id: createdTestId },
      include: { series: true },
    })
    expect(dbTest).not.toBeNull()
    expect(dbTest!.testType).toBe("CURRENT_AFFAIRS")
    expect(dbTest!.month).toBe(1)
    expect(dbTest!.year).toBe(2026)
    expect(dbTest!.totalQuestions).toBe(5)
    expect(dbTest!.series.slug).toBe("current-affairs-system-series")
    expect(dbTest!.series.isPublished).toBe(false)
  })

  test("D-02: Hidden series check: Quiz is hidden on /test-series, but visible on /current-affairs-quizzes", async ({ page }) => {
    // 1. Check /test-series catalogue: CA system series must NOT be displayed
    await page.goto("/test-series")
    await expect(page.getByText(testTitle)).not.toBeVisible()
    await expect(page.getByText("Current Affairs Quizzes")).not.toBeVisible()

    // 2. Check /current-affairs-quizzes: Quiz must be visible
    await page.goto("/current-affairs-quizzes")
    const card = page.locator('[data-testid="current-affairs-quiz-card"]', { hasText: testTitle })
    await expect(card).toBeVisible({ timeout: 15_000 })
    await expect(card.getByText("Current Affairs")).toBeVisible()
    await expect(card.getByText(/Questions/i)).toBeVisible()
  })

  test("D-03: Student starts attempt (unpublished series bypass), submits answers, calculates score & updates TestActionButton", async ({ page }) => {
    await loginThroughUi(page, studentUser.email)

    // 1. Start attempt via API
    const startRes = await page.request.post("/api/exam/attempt/start", {
      data: {
        testId: createdTestId,
        language: "English",
      },
    })
    expect(startRes.status()).toBe(201)
    const startData = await startRes.json()
    const attemptId = startData.data?.attemptId || startData.attemptId
    expect(attemptId).toBeTruthy()

    // 2. Fetch test questions to construct answers
    const testWithQs = await prisma.examTest.findUnique({
      where: { id: createdTestId },
      include: { sections: { include: { questions: true } } },
    })
    const questions = testWithQs!.sections[0].questions
    expect(questions.length).toBe(5)

    // Answer all 5 questions correctly
    const answers = questions.map((q) => ({
      questionId: q.id,
      selectedOption: q.correctOption as any,
      timeSpentSecs: 10,
      isMarked: false,
    }))

    // 3. Submit attempt
    const submitRes = await page.request.post(`/api/exam/attempt/${attemptId}/submit`, {
      data: { answers },
    })
    expect(submitRes.status()).toBe(200)
    const submitData = await submitRes.json()
    expect(submitData.data?.score).toBe(5)

    // 4. Verify in DB
    const dbAttempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
    })
    expect(dbAttempt?.status).toBe("SUBMITTED")
    expect(dbAttempt?.score).toBe(5)
    expect(dbAttempt?.correctCount).toBe(5)

    // 5. Navigate to /current-affairs-quizzes and verify TestActionButton reflects submitted state
    await page.goto("/current-affairs-quizzes")
    const card = page.locator('[data-testid="current-affairs-quiz-card"]', { hasText: testTitle })
    await expect(card).toBeVisible({ timeout: 15_000 })
    await expect(card.getByRole("link", { name: /Full Report/i })).toBeVisible()
    await expect(card.getByRole("link", { name: /Retake/i })).toBeVisible()
  })
})
