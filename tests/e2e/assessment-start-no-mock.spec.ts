import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

import { test, expect } from "@playwright/test"
import { execFileSync } from "node:child_process"
import { createActor, loginAs, newNonce, prisma, slugFor } from "./test-series-e2e-helpers"

/**
 * B-003 / B-021 regression: the assessment start API must never serve the
 * hardcoded FIVE_STANDARD_QUESTIONS fallback, must 404 for unknown assessments,
 * 503 on database failure, and must persist timeSpent on the created attempt.
 *
 * The 503 case takes the Docker test database offline, so it is opt-in:
 *   DB_OUTAGE_TEST=1 BASE_URL=http://127.0.0.1:3045 npx playwright test tests/e2e/assessment-start-no-mock.spec.ts
 */

const BASE = process.env.BASE_URL || "http://127.0.0.1:3045"
const DB_CONTAINER = "trillionskill-test-db"
const runOutage = process.env.DB_OUTAGE_TEST === "1"

test.describe.configure({ mode: "serial" })

test.describe("B-003/B-021: assessment start API", () => {
  let nonce = ""
  let email = ""
  let assessmentId = ""
  let questionId = ""

  test.beforeAll(async () => {
    nonce = newNonce()
    const student = await createActor(nonce, "FREE", "assessment-start")
    email = student.email

    const assessment = await prisma.assessment.create({
      data: {
        title: `${nonce} Assessment`,
        slug: `${slugFor(nonce)}-assessment`,
        description: "Fixture assessment for the start API regression",
        duration: 10,
        passingScore: 60,
        technology: "Regression",
        isPublished: true,
        questions: {
          create: [
            {
              type: "MULTIPLE_CHOICE",
              question: "What is 2 + 2?",
              options: ["3", "4", "5", "6"],
              correctAnswer: "1",
              points: 10,
              order: 1,
            },
          ],
        },
      },
      include: { questions: true },
    })
    assessmentId = assessment.id
    questionId = assessment.questions[0].id
  })

  test.afterAll(async () => {
    try {
      await prisma.assessmentAttempt.deleteMany({ where: { assessmentId } })
      await prisma.assessment.deleteMany({ where: { id: assessmentId } })
      await prisma.user.deleteMany({ where: { email } })
    } catch (error) {
      console.error("[assessment-start] cleanup failed", error)
    }
  })

  test("starts a real attempt with the real questions and persists timeSpent", async ({ page }) => {
    await loginAs(page, email)
    await page.goto(`${BASE}/`)

    const result = await page.evaluate(
      async ({ base, id }) => {
        const res = await fetch(`${base}/api/assessments/${id}/start`, { method: "POST" })
        return { status: res.status, body: await res.json().catch(() => null) }
      },
      { base: BASE, id: assessmentId }
    )

    expect(result.status).toBe(200)
    expect(result.body?.attemptId).toBeTruthy()
    expect(result.body?.questions).toHaveLength(1)
    expect(result.body?.questions[0].id).toBe(questionId)
    expect(result.body?.questions[0].question).toBe("What is 2 + 2?")

    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: result.body.attemptId },
    })
    expect(attempt).not.toBeNull()
    expect(attempt?.timeSpent).toBe(0)
    expect(attempt?.score).toBe(0)
    expect(attempt?.passed).toBe(false)
  })

  test("returns 404 for an unknown assessment and never serves mock questions", async ({ page }) => {
    await loginAs(page, email)
    await page.goto(`${BASE}/`)

    const result = await page.evaluate(async (base) => {
      const res = await fetch(`${base}/api/assessments/does-not-exist-${Date.now()}/start`, {
        method: "POST",
      })
      return { status: res.status, body: await res.json().catch(() => null) }
    }, BASE)

    expect(result.status).toBe(404)
    expect(result.body?.error).toBe("Assessment not found")
    expect(result.body?.questions).toBeUndefined()
  })

  test("returns 503 instead of mock questions when the database is offline", async ({ page }) => {
    test.skip(!runOutage, "Set DB_OUTAGE_TEST=1 to run the database outage regression")
    test.setTimeout(180_000)

    await loginAs(page, email)
    await page.goto(`${BASE}/`)
    await prisma.$disconnect()

    stopDatabase()
    try {
      const result = await page.evaluate(
        async ({ base, id }) => {
          const res = await fetch(`${base}/api/assessments/${id}/start`, { method: "POST" })
          return { status: res.status, body: await res.json().catch(() => null) }
        },
        { base: BASE, id: assessmentId }
      )

      expect(result.status).toBe(503)
      expect(result.body?.error).toBe("Assessment service is temporarily unavailable")
      expect(result.body?.questions).toBeUndefined()
      expect(result.body?.attemptId).toBeUndefined()
    } finally {
      startDatabase()
    }
  })
})

function stopDatabase() {
  execFileSync("docker", ["stop", "-t", "1", DB_CONTAINER], { stdio: "inherit" })
}

function startDatabase() {
  try {
    execFileSync("docker", ["start", DB_CONTAINER], { stdio: "inherit" })
  } catch (error) {
    console.error("[db-outage] failed to start the test database", error)
  }
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    try {
      execFileSync("docker", ["exec", DB_CONTAINER, "pg_isready", "-U", "postgres"], {
        stdio: "ignore",
      })
      return
    } catch {
      execFileSync("sleep", ["1"])
    }
  }
  throw new Error("Test database did not become ready in time")
}
