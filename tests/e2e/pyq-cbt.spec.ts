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
  slugFor,
} from "./test-series-e2e-helpers"
import { UserRole } from "@prisma/client"

test.describe.configure({ mode: "serial" })

test.describe("PYQ CBT Real Authoring Link & Student Attempt E2E (Gates B & C)", () => {
  test.setTimeout(120_000)

  let nonce: string
  let teacherA: any
  let teacherB: any
  let student: any
  let category: any
  let paperA: any
  let createdTestId: string

  test.beforeAll(async () => {
    nonce = newNonce()
    teacherA = await createActor(nonce, UserRole.TEACHER, "teacher-a")
    teacherB = await createActor(nonce, UserRole.TEACHER, "teacher-b")
    student = await createActor(nonce, UserRole.FREE, "cbt-student")

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

    // Create published PYQ paper owned by Teacher A WITHOUT cbtTestId (no fake direct linking!)
    paperA = await prisma.pyqPaper.create({
      data: {
        title: `BPSC Official Real Paper ${nonce}`,
        slug: `bpsc-real-mock-${slugFor(nonce)}`,
        categoryId: category.id,
        year: 2024,
        stage: "PRELIMS",
        subject: "General Studies Real",
        paperPdfUrl: "/uploads/pyq-private/dummy.pdf",
        accessType: "FREE",
        status: "PUBLISHED",
        creatorId: teacherA.id,
        hasCbtMode: false,
        cbtTestId: null,
      },
    })
  })

  test.afterAll(async () => {
    if (paperA?.id) {
      await prisma.pyqPaper.delete({ where: { id: paperA.id } }).catch(() => {})
    }
    if (category?.id) {
      await prisma.pyqCategory.delete({ where: { id: category.id } }).catch(() => {})
    }
    if (createdTestId) {
      const attempts = await prisma.examAttempt.findMany({ where: { testId: createdTestId }, select: { id: true } })
      const attemptIds = attempts.map((a) => a.id)
      if (attemptIds.length > 0) {
        await prisma.examAttemptAnswer.deleteMany({ where: { attemptId: { in: attemptIds } } }).catch(() => {})
        await prisma.examAttempt.deleteMany({ where: { id: { in: attemptIds } } }).catch(() => {})
      }
      await prisma.examQuestion.deleteMany({ where: { section: { testId: createdTestId } } }).catch(() => {})
      await prisma.examSection.deleteMany({ where: { testId: createdTestId } }).catch(() => {})
      await prisma.examTest.delete({ where: { id: createdTestId } }).catch(() => {})
    }
    const userIds = [teacherA?.id, teacherB?.id, student?.id].filter(Boolean)
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {})
    }
  })

  test("CBT-01: Teacher A creates test with type PYQ, links own paper via bulk JSON questions, publishes (real app flow)", async ({ page }) => {
    await loginThroughUi(page, teacherA.email)

    // Teacher A creates test linked to paperA via the real authoring API
    const createRes = await page.request.post("/api/exam/test/create", {
      data: {
        title: `BPSC Official CBT Mock ${nonce}`,
        testType: "PYQ",
        pyqPaperId: paperA.id,
        accessMode: "FREE",
        durationMinutes: 30,
        isPublished: true,
        sections: [
          {
            title: "General Studies Section",
            positiveMarks: 1,
            negativeMarks: 0.25,
            questions: [
              {
                questionEn: "Who was the first President of India?",
                questionHi: "भारत के प्रथम राष्ट्रपति कौन थे?",
                optionAEn: "Nehru",
                optionBEn: "Patel",
                optionCEn: "Dr. Rajendra Prasad",
                optionDEn: "Ambedkar",
                correctOption: "C",
                difficulty: "Easy",
                subject: "History",
              },
              {
                questionEn: "Which river flows through the Deccan Plateau?",
                questionHi: "दक्कन के पठार से कौन सी नदी बहती है?",
                optionAEn: "Ganga",
                optionBEn: "Godavari",
                optionCEn: "Yamuna",
                optionDEn: "Brahmaputra",
                correctOption: "B",
                difficulty: "Moderate",
                subject: "Geography",
              },
            ],
          },
        ],
      },
    })

    expect(createRes.status()).toBe(200)
    const resData = await createRes.json()
    expect(resData.success).toBe(true)
    createdTestId = resData.data.id
    expect(createdTestId).toBeTruthy()

    // Verify DB state was set by the app
    const updatedPaper = await prisma.pyqPaper.findUnique({
      where: { id: paperA.id },
    })
    expect(updatedPaper).not.toBeNull()
    expect(updatedPaper!.cbtTestId).toBe(createdTestId)
    expect(updatedPaper!.hasCbtMode).toBe(true)
  })

  test("CBT-02: Unpublish test clears hasCbtMode, retains cbtTestId; republish re-enables hasCbtMode", async ({ page }) => {
    await loginThroughUi(page, teacherA.email)

    // 1. Unpublish test
    const unpublishRes = await page.request.patch(`/api/exam/test/${createdTestId}`, {
      data: { isPublished: false },
    })
    expect(unpublishRes.status()).toBe(200)

    const unpublishedPaper = await prisma.pyqPaper.findUnique({
      where: { id: paperA.id },
    })
    expect(unpublishedPaper!.hasCbtMode).toBe(false)
    expect(unpublishedPaper!.cbtTestId).toBe(createdTestId)

    // 2. Republish test
    const republishRes = await page.request.patch(`/api/exam/test/${createdTestId}`, {
      data: { isPublished: true },
    })
    expect(republishRes.status()).toBe(200)

    const republishedPaper = await prisma.pyqPaper.findUnique({
      where: { id: paperA.id },
    })
    expect(republishedPaper!.hasCbtMode).toBe(true)
  })

  test("CBT-03: Teacher B linking to Teacher A's paper is rejected with 403 Forbidden", async ({ page }) => {
    await loginThroughUi(page, teacherB.email)

    const forbiddenRes = await page.request.post("/api/exam/test/create", {
      data: {
        title: `Teacher B Attempt on Paper A ${nonce}`,
        testType: "PYQ",
        pyqPaperId: paperA.id,
        accessMode: "FREE",
        durationMinutes: 30,
        isPublished: true,
        sections: [
          {
            title: "Section 1",
            positiveMarks: 1,
            negativeMarks: 0.25,
            questions: [
              {
                questionEn: "Test Q?",
                optionAEn: "A",
                optionBEn: "B",
                optionCEn: "C",
                optionDEn: "D",
                correctOption: "A",
                difficulty: "Easy",
              },
            ],
          },
        ],
      },
    })

    expect(forbiddenRes.status()).toBe(403)
    const resData = await forbiddenRes.json()
    expect(resData.error).toContain("Forbidden")
  })

  test("CBT-04: PYQ test does not leak into normal /test-series list or recommendations", async ({ page }) => {
    await loginThroughUi(page, student.email)

    // Check /api/exam/series/list
    const listRes = await page.request.get("/api/exam/series/list")
    expect(listRes.status()).toBe(200)
    const listData = await listRes.json()
    const foundInList = (listData.data || []).some(
      (s: any) => s.slug === "pyq-system-series" || s.id === "pyq-system-series"
    )
    expect(foundInList).toBe(false)

    // Check /api/exam/series/recommendations
    const recRes = await page.request.get("/api/exam/series/recommendations")
    expect(recRes.status()).toBe(200)
    const recData = await recRes.json()
    const foundInRec = (recData.data || []).some(
      (s: any) => s.slug === "pyq-system-series" || s.id === "pyq-system-series"
    )
    expect(foundInRec).toBe(false)
  })

  test("CBT-05: Student sees Attempt Test button only when published; unpublished hides button", async ({ page }) => {
    await loginThroughUi(page, student.email)

    // 1. When published, Attempt Test button is visible
    await page.goto("/pyqs", { waitUntil: "domcontentloaded" })
    const card = page.locator(".bg-white", { hasText: `BPSC Official Real Paper ${nonce}` }).first()
    await expect(card).toBeVisible({ timeout: 15_000 })
    await expect(card.getByText(/CBT Simulator Mode Available/i)).toBeVisible()
    const attemptBtn = card.getByRole("link", { name: /Attempt Test/i })
    await expect(attemptBtn).toBeVisible()

    // 2. Unpublish test
    await prisma.pyqPaper.update({
      where: { id: paperA.id },
      data: { hasCbtMode: false },
    })

    // 3. Reload, Attempt Test button should now be hidden
    await page.reload({ waitUntil: "domcontentloaded" })
    const cardAfterUnpublish = page.locator(".bg-white", { hasText: `BPSC Official Real Paper ${nonce}` }).first()
    await expect(cardAfterUnpublish).toBeVisible({ timeout: 15_000 })
    await expect(cardAfterUnpublish.getByRole("link", { name: /Attempt Test/i })).not.toBeVisible()

    // 4. Restore published state
    await prisma.pyqPaper.update({
      where: { id: paperA.id },
      data: { hasCbtMode: true },
    })
  })

  test("CBT-06: Student completes and submits attempt; score, ranking and DB records exist; attemptCount increments", async ({ page }) => {
    await loginThroughUi(page, student.email)

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

    // 2. Fetch test questions
    const testWithQs = await prisma.examTest.findUnique({
      where: { id: createdTestId },
      include: { sections: { include: { questions: true } } },
    })
    const q1 = testWithQs!.sections[0].questions[0]
    const q2 = testWithQs!.sections[0].questions[1]

    // 3. Submit attempt with correct answers
    const submitRes = await page.request.post(`/api/exam/attempt/${attemptId}/submit`, {
      data: {
        answers: [
          { questionId: q1.id, selectedOption: q1.correctOption as any, timeSpentSecs: 15, isMarked: false },
          { questionId: q2.id, selectedOption: q2.correctOption as any, timeSpentSecs: 20, isMarked: false },
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

    // 5. Verify PyqPaper attemptCount was incremented
    const finalPaper = await prisma.pyqPaper.findUnique({
      where: { id: paperA.id },
    })
    expect(finalPaper!.attemptCount).toBeGreaterThanOrEqual(1)
  })

  test("CBT-07: Guest attempting test gets 401 Unauthorized login gate", async ({ request }) => {
    // Unauthenticated request to start attempt
    const guestRes = await request.post("/api/exam/attempt/start", {
      data: {
        testId: createdTestId,
        language: "English",
      },
    })
    expect(guestRes.status()).toBe(401)
  })
})
