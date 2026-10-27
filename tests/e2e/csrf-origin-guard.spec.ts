import { test, expect } from "@playwright/test"
import {
  prisma,
  createActor,
  loginAs,
  newNonce,
  cleanupNonce,
  questionFixture,
} from "./test-series-e2e-helpers"

/**
 * A15: cookie-authenticated mutations must be same-origin.
 *
 * Before this change `lib/security/csrf.ts` existed but was never called, so a
 * cross-site form could drive any cookie-authenticated API route. The guard now
 * lives in `middleware.ts`: a mutation that carries the session cookie must
 * come from this host, while signature-authenticated webhooks, bearer-token API
 * clients and non-browser callers (no Origin header) keep working.
 */

const nonce = newNonce()
const EVIL_ORIGIN = "https://evil.example"

let testId = ""
let questionId = ""
let userId = ""
let userEmail = ""

async function makeAttempt() {
  return prisma.examAttempt.create({
    data: {
      userId,
      testId,
      status: "IN_PROGRESS",
      startedAt: new Date(Date.now() - 60 * 1000),
    },
  })
}

function answerPayload(sequence: number) {
  return {
    answers: [
      { questionId, selectedOption: "B", isMarked: false, timeSpentSecs: 5 },
    ],
    sequence,
  }
}

test.describe("A15 cross-origin mutation guard", () => {
  test.beforeAll(async () => {
    const actor = await createActor(nonce, "FREE", "a15")
    userId = actor.id
    userEmail = actor.email

    const series = await prisma.examSeries.create({
      data: {
        title: `${nonce} A15 Series`,
        slug: `a15-${nonce.toLowerCase()}`,
        examName: "A15 Exam",
        category: "Test",
        createdById: userId,
      },
    })

    const examTest = await prisma.examTest.create({
      data: {
        seriesId: series.id,
        title: `${nonce} A15 Test`,
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
      data: { sectionId: section.id, ...questionFixture(nonce, 1, "B") },
    })
    questionId = question.id
  })

  test.afterAll(async () => {
    if (userId) await prisma.examAttempt.deleteMany({ where: { userId } })
    await cleanupNonce(nonce)
    await prisma.$disconnect()
  })

  test("same-origin cookie mutation still works", async ({ page }) => {
    const attempt = await makeAttempt()
    await loginAs(page, userEmail)

    const res = await page.request.post(`/api/exam/attempt/${attempt.id}/sync`, {
      headers: { Origin: "http://127.0.0.1:3045" },
      data: answerPayload(1),
    })
    expect(res.status(), await res.text()).toBe(200)
    expect((await res.json()).data.synced).toBe(true)
    expect(
      await prisma.examAttemptAnswer.count({ where: { attemptId: attempt.id } })
    ).toBe(1)
  })

  test("cross-origin cookie mutation is rejected before it runs", async ({ page }) => {
    const attempt = await makeAttempt()
    await loginAs(page, userEmail)

    const res = await page.request.post(`/api/exam/attempt/${attempt.id}/sync`, {
      headers: { Origin: EVIL_ORIGIN },
      data: answerPayload(1),
    })
    expect(res.status(), await res.text()).toBe(403)
    expect(await res.json()).toEqual({ error: "Cross-origin request rejected" })
    // The handler never ran, so nothing was persisted.
    expect(
      await prisma.examAttemptAnswer.count({ where: { attemptId: attempt.id } })
    ).toBe(0)
  })

  test("cross-origin mutation without a session cookie is not blocked by the CSRF gate", async ({
    browser,
  }) => {
    const attempt = await prisma.examAttempt.create({
      data: {
        userId,
        testId,
        status: "IN_PROGRESS",
        startedAt: new Date(Date.now() - 60 * 1000),
      },
    })

    const context = await browser.newContext()
    const res = await context.request.post(`/api/exam/attempt/${attempt.id}/sync`, {
      headers: { Origin: EVIL_ORIGIN },
      data: answerPayload(1),
    })
    // Unauthenticated, not CSRF-blocked: the route's own 401 answers.
    expect(res.status(), await res.text()).toBe(401)
    await context.close()
  })

  test("signature-authenticated webhooks are exempt from the origin check", async ({
    request,
  }) => {
    const res = await request.post("/api/webhooks/razorpay", {
      headers: {
        Origin: EVIL_ORIGIN,
        "Content-Type": "application/json",
        "x-razorpay-signature": "deadbeef",
      },
      data: { event: "payment.captured" },
    })
    expect(res.status(), await res.text()).not.toBe(403)
  })

  test("cross-origin reads are still allowed", async ({ request }) => {
    const res = await request.get("/api/auth/role", {
      headers: { Origin: EVIL_ORIGIN },
    })
    expect(res.status()).toBe(200)
    expect((await res.json()).role).toBe("STUDENT")
  })
})
