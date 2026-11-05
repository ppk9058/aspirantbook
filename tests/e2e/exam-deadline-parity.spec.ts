import { test, expect } from "@playwright/test"
import {
  prisma,
  createActor,
  loginAs,
  newNonce,
  cleanupNonce,
  questionFixture,
} from "./test-series-e2e-helpers"
import { DEADLINE_EXPIRED_MESSAGE } from "../../lib/exam-deadline"

/**
 * A14: exam deadline parity.
 *
 * Before this change the web sync route wrote answers BEFORE the deadline
 * check and the web submit route never enforced the grace deadline at all,
 * while the v1/mobile path rejected late answers up front. These tests drive
 * both real paths with the same late answer and assert identical behaviour:
 * the answer is never persisted and the shared message is returned.
 */

const nonce = newNonce()

let seriesId = ""
let testId = ""
let questionId = ""
let userId = ""
let userEmail = ""

async function makeAttempt(startedAt: Date) {
  return prisma.examAttempt.create({
    data: { userId, testId, status: "IN_PROGRESS", startedAt },
  })
}

function lateAnswer(selectedOption: "A" | "B" | "C" | "D" = "B") {
  return { questionId, selectedOption, isMarked: false, timeSpentSecs: 5 }
}

test.describe("A14 exam deadline parity", () => {
  test.beforeAll(async () => {
    const actor = await createActor(nonce, "FREE", "a14")
    userId = actor.id
    userEmail = actor.email

    const series = await prisma.examSeries.create({
      data: {
        title: `${nonce} A14 Series`,
        slug: `a14-${nonce.toLowerCase()}`,
        examName: "A14 Exam",
        category: "Test",
        createdById: userId,
      },
    })
    seriesId = series.id

    const examTest = await prisma.examTest.create({
      data: {
        seriesId,
        title: `${nonce} A14 Test`,
        durationMinutes: 60,
        totalQuestions: 1,
        totalMarks: 1,
        createdById: userId,
      },
    })
    testId = examTest.id

    const section = await prisma.examSection.create({
      data: { testId, title: `${nonce} Section`, order: 1 },
    })

    const question = await prisma.examQuestion.create({
      data: {
        sectionId: section.id,
        ...questionFixture(nonce, 1, "B"),
      },
    })
    questionId = question.id
  })

  test.afterAll(async () => {
    if (userId) {
      await prisma.examAttempt.deleteMany({ where: { userId } })
    }
    await cleanupNonce(nonce)
    await prisma.$disconnect()
  })

  test("web sync rejects a late answer before any write and finalizes the attempt", async ({ page }) => {
    const attempt = await makeAttempt(new Date(Date.now() - 90 * 60 * 1000))
    await loginAs(page, userEmail)

    const res = await page.request.post(`/api/exam/attempt/${attempt.id}/sync`, {
      data: { answers: [lateAnswer("B")], tabSwitchCount: 1, sequence: 1 },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()

    expect(body.data.expired).toBe(true)
    expect(body.data.synced).toBe(false)
    expect(body.data.rejected).toBe(1)
    expect(body.data.error).toBe(DEADLINE_EXPIRED_MESSAGE)
    expect(body.data.status).toBe("SUBMITTED")

    expect(await prisma.examAttemptAnswer.count({ where: { attemptId: attempt.id } })).toBe(0)
    const stored = await prisma.examAttempt.findUniqueOrThrow({ where: { id: attempt.id } })
    expect(stored.status).toBe("SUBMITTED")
    // The skipped tab-switch write must not sneak through either.
    expect(stored.tabSwitchCount).toBe(0)
  })

  test("v1/mobile sync rejects the same late answer with the same message", async ({ page }) => {
    const attempt = await makeAttempt(new Date(Date.now() - 90 * 60 * 1000))
    await loginAs(page, userEmail)

    const res = await page.request.put(`/api/v1/attempts/${attempt.id}/answers`, {
      data: {
        answers: [{ ...lateAnswer("B"), sequenceNumber: 1 }],
        lastSequenceNumber: 1,
      },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()

    expect(body.error.code).toBe("BAD_REQUEST")
    expect(body.error.message).toBe(DEADLINE_EXPIRED_MESSAGE)
    expect(await prisma.examAttemptAnswer.count({ where: { attemptId: attempt.id } })).toBe(0)
  })

  test("web submit does not persist late final answers but still grades", async ({ page }) => {
    const attempt = await makeAttempt(new Date(Date.now() - 90 * 60 * 1000))
    await loginAs(page, userEmail)

    const res = await page.request.post(`/api/exam/attempt/${attempt.id}/submit`, {
      data: { answers: [{ ...lateAnswer("D"), timeSpentSecs: 5 }] },
    })
    expect(res.status(), await res.text()).toBe(200)
    const body = await res.json()
    expect(body.data.attemptId).toBe(attempt.id)

    expect(await prisma.examAttemptAnswer.count({ where: { attemptId: attempt.id } })).toBe(0)
    const stored = await prisma.examAttempt.findUniqueOrThrow({ where: { id: attempt.id } })
    expect(stored.status).toBe("SUBMITTED")
  })

  test("v1/mobile submit does not persist late final answers but still grades", async ({ page }) => {
    const attempt = await makeAttempt(new Date(Date.now() - 90 * 60 * 1000))
    await loginAs(page, userEmail)

    const res = await page.request.post(`/api/v1/attempts/${attempt.id}/submit`, {
      data: { finalAnswers: [{ ...lateAnswer("D"), timeSpentSecs: 5, sequenceNumber: 1 }] },
    })
    expect(res.status(), await res.text()).toBe(200)
    const body = await res.json()
    expect(body.data.attemptId).toBe(attempt.id)

    expect(await prisma.examAttemptAnswer.count({ where: { attemptId: attempt.id } })).toBe(0)
    const stored = await prisma.examAttempt.findUniqueOrThrow({ where: { id: attempt.id } })
    expect(stored.status).toBe("SUBMITTED")
  })

  test("both platforms persist an in-time answer and keep the sequence guard", async ({ page }) => {
    const webAttempt = await makeAttempt(new Date(Date.now() - 60 * 1000))
    const v1Attempt = await makeAttempt(new Date(Date.now() - 60 * 1000))
    await loginAs(page, userEmail)

    // Web: write B at seq 2, then try to overwrite with A at seq 1.
    const webFirst = await page.request.post(`/api/exam/attempt/${webAttempt.id}/sync`, {
      data: { answers: [lateAnswer("B")], sequence: 2 },
    })
    expect(webFirst.status(), await webFirst.text()).toBe(200)
    expect((await webFirst.json()).data.synced).toBe(true)

    const webStale = await page.request.post(`/api/exam/attempt/${webAttempt.id}/sync`, {
      data: { answers: [lateAnswer("A")], sequence: 1 },
    })
    expect(webStale.status(), await webStale.text()).toBe(409)

    const webStored = await prisma.examAttemptAnswer.findFirstOrThrow({
      where: { attemptId: webAttempt.id },
    })
    expect(webStored.selectedOption).toBe("B")
    expect(webStored.clientSeq).toBe(2)

    // v1: same story through the mobile route (seq 2 accepted, seq 1 stale).
    const v1First = await page.request.put(`/api/v1/attempts/${v1Attempt.id}/answers`, {
      data: {
        answers: [{ ...lateAnswer("B"), sequenceNumber: 2 }],
        lastSequenceNumber: 2,
      },
    })
    expect(v1First.status(), await v1First.text()).toBe(200)
    expect((await v1First.json()).data.syncedCount).toBe(1)

    const v1Stale = await page.request.put(`/api/v1/attempts/${v1Attempt.id}/answers`, {
      data: {
        answers: [{ ...lateAnswer("A"), sequenceNumber: 1 }],
        lastSequenceNumber: 1,
      },
    })
    expect(v1Stale.status(), await v1Stale.text()).toBe(200)
    expect((await v1Stale.json()).data.syncedCount).toBe(0)

    const v1Stored = await prisma.examAttemptAnswer.findFirstOrThrow({
      where: { attemptId: v1Attempt.id },
    })
    expect(v1Stored.selectedOption).toBe("B")
    expect(v1Stored.clientSeq).toBe(2)
  })
})
