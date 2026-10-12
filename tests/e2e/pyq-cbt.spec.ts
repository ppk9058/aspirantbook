import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import {
  prisma,
  newNonce,
  createActor,
  loginThroughUi,
  seedSeriesWithTest,
  slugFor,
} from "./test-series-e2e-helpers"
import { UserRole } from "@prisma/client"

test.describe("PYQ CBT Test Linking & Student Attempt E2E (Gate 4)", () => {
  test.setTimeout(120_000)

  let nonce: string
  let teacher: any
  let student: any
  let seriesFixture: any
  let category: any
  let cbtPaper: any

  test.beforeAll(async () => {
    nonce = newNonce()
    teacher = await createActor(nonce, UserRole.TEACHER, "cbt-teacher")
    student = await createActor(nonce, UserRole.FREE, "cbt-student")

    // Seed exam series and exam test with 2 questions
    seriesFixture = await seedSeriesWithTest({
      nonce,
      ownerId: teacher.id,
      questionCount: 2,
      durationMinutes: 30,
    })

    category = await prisma.pyqCategory.upsert({
      where: { slug: `bpsc-${slugFor(nonce)}` },
      update: {},
      create: {
        name: `BPSC Exam ${nonce}`,
        slug: `bpsc-${slugFor(nonce)}`,
        order: 1,
        isPublished: true,
      },
    })

    // Create published PYQ paper linked to the ExamTest
    cbtPaper = await prisma.pyqPaper.create({
      data: {
        title: `BPSC Official CBT Mock Paper ${nonce}`,
        slug: `bpsc-cbt-mock-${slugFor(nonce)}`,
        categoryId: category.id,
        year: 2024,
        stage: "PRELIMS",
        subject: "General Studies CBT",
        paperPdfUrl: "/uploads/pyq-private/dummy.pdf",
        accessType: "FREE",
        status: "PUBLISHED",
        creatorId: teacher.id,
        hasCbtMode: true,
        cbtTestId: seriesFixture.test.id,
      },
    })
  })

  test.afterAll(async () => {
    if (cbtPaper?.id) {
      await prisma.pyqPaper.delete({ where: { id: cbtPaper.id } }).catch(() => {})
    }
    if (category?.id) {
      await prisma.pyqCategory.delete({ where: { id: category.id } }).catch(() => {})
    }
    if (seriesFixture?.test?.id) {
      const testId = seriesFixture.test.id
      const attempts = await prisma.examAttempt.findMany({ where: { testId }, select: { id: true } })
      const attemptIds = attempts.map((a) => a.id)
      if (attemptIds.length > 0) {
        await prisma.examAttemptAnswer.deleteMany({ where: { attemptId: { in: attemptIds } } }).catch(() => {})
        await prisma.examAttempt.deleteMany({ where: { id: { in: attemptIds } } }).catch(() => {})
      }
      await prisma.examQuestion.deleteMany({ where: { section: { testId } } }).catch(() => {})
      await prisma.examSection.deleteMany({ where: { testId } }).catch(() => {})
      await prisma.examTest.delete({ where: { id: testId } }).catch(() => {})
    }
    if (seriesFixture?.series?.id) {
      await prisma.examSeries.delete({ where: { id: seriesFixture.series.id } }).catch(() => {})
    }
    const userIds = [teacher?.id, student?.id].filter(Boolean)
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {})
    }
  })

  test("CBT-01: PYQ Paper shows CBT badge and Attempt Test button, links to instructions", async ({ page }) => {
    await loginThroughUi(page, student.email)

    await page.goto("/pyqs", { waitUntil: "domcontentloaded" })
    const card = page.locator(".bg-white", { hasText: `BPSC Official CBT Mock Paper ${nonce}` }).first()
    await expect(card).toBeVisible({ timeout: 15_000 })

    // Verify CBT mode badge within the specific card
    await expect(card.getByText(/CBT Simulator Mode Available/i)).toBeVisible()

    // Find and click "Attempt Test" button within the specific card
    const attemptBtn = card.getByRole("link", { name: /Attempt Test/i })
    await expect(attemptBtn).toBeVisible()

    await attemptBtn.click()
    await page.waitForURL(`**/test-series/**/instructions?testId=${seriesFixture.test.id}*`, { timeout: 15_000 })
    expect(page.url()).toContain(seriesFixture.test.id)
  })

  test("CBT-02: Student completes and submits attempt; score, ranking and DB records exist", async ({ page }) => {
    await loginThroughUi(page, student.email)

    // 1. Start the attempt via API
    const startRes = await page.request.post("/api/exam/attempt/start", {
      data: {
        testId: seriesFixture.test.id,
        language: "English",
      },
    })
    expect(startRes.status()).toBe(201)
    const startData = await startRes.json()
    const attemptId = startData.data?.attemptId || startData.attemptId
    expect(attemptId).toBeTruthy()

    // 2. Fetch test questions
    const q1 = seriesFixture.test.sections[0].questions[0]
    const q2 = seriesFixture.test.sections[0].questions[1]

    // 3. Submit attempt with answers
    const submitRes = await page.request.post(`/api/exam/attempt/${attemptId}/submit`, {
      data: {
        answers: [
          { questionId: q1.id, selectedOption: q1.correctOption, timeSpentSecs: 15, isMarked: false },
          { questionId: q2.id, selectedOption: q2.correctOption, timeSpentSecs: 20, isMarked: false },
        ],
      },
    })
    expect(submitRes.status()).toBe(200)
    const submitData = await submitRes.json()
    expect(submitData.data?.score).toBe(2)
    expect(submitData.data?.allIndiaRank).toBe(1)

    // 4. Verify in DB
    const dbAttempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: { answers: true },
    })
    expect(dbAttempt).not.toBeNull()
    expect(dbAttempt!.status).toBe("SUBMITTED")
    expect(dbAttempt!.score).toBe(2)
    expect(dbAttempt!.correctCount).toBe(2)
    expect(dbAttempt!.wrongCount).toBe(0)
    expect(dbAttempt!.answers.length).toBe(2)
  })
})
