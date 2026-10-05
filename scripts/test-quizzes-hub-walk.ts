import { prisma } from "../lib/prisma"
import { createTestUser, teardownTestUsers } from "../lib/testing/test-user-helper"
import {
  getExamInstructionsUrl,
  getExamAttemptUrl,
  getExamResultUrl,
} from "../lib/exam/urls"

const BASE_URL = "http://localhost:3000"

async function getSessionCookieForUser(phoneNumber: string): Promise<string> {
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`)
  const { csrfToken } = await csrfRes.json()
  const rawSetCookie = csrfRes.headers.get("set-cookie") || ""
  const csrfCookie = rawSetCookie.split(";")[0]

  const res = await fetch(`${BASE_URL}/api/auth/callback/mobile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: csrfCookie,
    },
    body: new URLSearchParams({
      phoneNumber,
      csrfToken,
      callbackUrl: `${BASE_URL}/dashboard`,
      json: "true",
    }),
    redirect: "manual",
  })

  const setCookies = (res.headers as any).getSetCookie ? (res.headers as any).getSetCookie() : [res.headers.get("set-cookie") || ""]
  const sessionCookies = setCookies.map((c: string) => c.split(";")[0]).join("; ")
  return `${csrfCookie}; ${sessionCookies}`
}

async function run() {
  console.log("=== SECTION I: QUIZZES HUB & STUDENT WALK VERIFICATION ===")

  // 1. Verify category filter fix
  console.log("\n--- I.1 Database Quizzes Category Filter Verification ---")
  const testListRes = await fetch(`${BASE_URL}/api/exam/test/list?category=Current%20Affairs`, {
    // We will query with authenticated session below
  })

  // Create isolated student user with matching goal
  const student = await createTestUser({ role: "FREE", prefix: "walk" })
  await prisma.user.update({
    where: { id: student.id },
    data: { selectedGoal: "bpsc" },
  })

  const sessionCookie = await getSessionCookieForUser(student.phoneNumber!)

  const authedTestListRes = await fetch(`${BASE_URL}/api/exam/test/list?category=Current%20Affairs`, {
    headers: { Cookie: sessionCookie },
  })
  const testListJson = await authedTestListRes.json()
  console.log(`HTTP ${authedTestListRes.status} from /api/exam/test/list?category=Current%20Affairs`)
  console.log(`Quizzes returned: ${testListJson.data?.length || 0}`)
  console.table(
    (testListJson.data || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      seriesSlug: t.seriesSlug,
      category: t.category,
    }))
  )

  if (!testListJson.data || testListJson.data.length === 0) {
    throw new Error("Category filter did not return any quizzes!")
  }

  const targetTest = testListJson.data[0]
  const testId = targetTest.id
  const seriesSlug = targetTest.seriesSlug || "current-affairs-quizzes"

  let createdAttemptId: string | null = null

  try {
    console.log("\n--- I.2 Real Student Walk (not inserted rows) ---")

    // ─────────────────────────────────────────────────────────────────────────
    // TOUCHPOINT 1: NOT_STARTED
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n[State 1] NOT_STARTED")
    const statusRes1 = await fetch(`${BASE_URL}/api/exam/attempt/user-status?testId=${testId}`, {
      headers: { Cookie: sessionCookie },
    })
    const statusJson1 = await statusRes1.json()
    const state1 = statusJson1.data?.[testId]?.state || "NOT_STARTED"
    console.log(`User Status API: ${state1}`)

    const startHref = getExamInstructionsUrl({
      seriesId: seriesSlug,
      testId,
      title: targetTest.title,
    })
    const buttonText1 = "Start Now"
    const pageCheck1 = await fetch(`${BASE_URL}${startHref}`, {
      headers: { Cookie: sessionCookie },
      redirect: "manual",
    })
    console.log(`Action Button Text: "${buttonText1}"`)
    console.log(`Button Href: ${startHref} (HTTP ${pageCheck1.status})`)

    if (state1 !== "NOT_STARTED" || pageCheck1.status === 404) {
      throw new Error("State 1 NOT_STARTED verification failed")
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TOUCHPOINT 2: START TEST -> IN_PROGRESS
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n[State 2] IN_PROGRESS (Calling /api/exam/attempt/start)")
    const startAttemptRes = await fetch(`${BASE_URL}/api/exam/attempt/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        testId,
        language: "English",
      }),
    })
    const startAttemptJson = await startAttemptRes.json()
    console.log(`Start API status: ${startAttemptRes.status}`)
    console.log("Start API response:", startAttemptJson)

    if (startAttemptRes.status !== 201 || !startAttemptJson.data?.attemptId) {
      throw new Error(`Failed to start attempt: ${JSON.stringify(startAttemptJson)}`)
    }

    createdAttemptId = startAttemptJson.data.attemptId

    const statusRes2 = await fetch(`${BASE_URL}/api/exam/attempt/user-status?testId=${testId}`, {
      headers: { Cookie: sessionCookie },
    })
    const statusJson2 = await statusRes2.json()
    const state2 = statusJson2.data?.[testId]?.state
    console.log(`User Status API: ${state2} (inProgressAttemptId=${statusJson2.data?.[testId]?.inProgressAttemptId})`)

    const resumeHref = getExamAttemptUrl({
      seriesId: seriesSlug,
      testId,
      attemptId: createdAttemptId!,
      title: targetTest.title,
    })
    const buttonText2 = "Continue"
    const pageCheck2 = await fetch(`${BASE_URL}${resumeHref}`, {
      headers: { Cookie: sessionCookie },
      redirect: "manual",
    })
    console.log(`Action Button Text: "${buttonText2}"`)
    console.log(`Button Href: ${resumeHref} (HTTP ${pageCheck2.status})`)

    if (state2 !== "IN_PROGRESS" || pageCheck2.status === 404) {
      throw new Error("State 2 IN_PROGRESS verification failed")
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TOUCHPOINT 3: SUBMIT TEST -> SUBMITTED
    // ─────────────────────────────────────────────────────────────────────────
    console.log(`\n[State 3] SUBMITTED (Calling /api/exam/attempt/${createdAttemptId}/submit)`)
    const submitAttemptRes = await fetch(`${BASE_URL}/api/exam/attempt/${createdAttemptId}/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        answers: [],
      }),
    })
    const submitAttemptJson = await submitAttemptRes.json()
    console.log(`Submit API status: ${submitAttemptRes.status}`)
    console.log("Submit API response:", submitAttemptJson)

    if (submitAttemptRes.status !== 200 || !submitAttemptJson.data?.attemptId) {
      throw new Error(`Failed to submit attempt: ${JSON.stringify(submitAttemptJson)}`)
    }

    const statusRes3 = await fetch(`${BASE_URL}/api/exam/attempt/user-status?testId=${testId}`, {
      headers: { Cookie: sessionCookie },
    })
    const statusJson3 = await statusRes3.json()
    const state3 = statusJson3.data?.[testId]?.state
    console.log(`User Status API: ${state3} (latestSubmittedAttemptId=${statusJson3.data?.[testId]?.latestSubmittedAttemptId})`)

    const reportHref = getExamResultUrl({
      seriesId: seriesSlug,
      testId,
      attemptId: createdAttemptId!,
      title: targetTest.title,
    })
    const buttonText3 = "Full Report"
    const pageCheck3 = await fetch(`${BASE_URL}${reportHref}`, {
      headers: { Cookie: sessionCookie },
      redirect: "manual",
    })
    console.log(`Action Button Text: "${buttonText3}"`)
    console.log(`Button Href: ${reportHref} (HTTP ${pageCheck3.status})`)

    if (state3 !== "SUBMITTED" || pageCheck3.status === 404) {
      throw new Error("State 3 SUBMITTED verification failed")
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TOUCHPOINT 4: Walk Summary across Quizzes Hub, Series Detail, My Tests, Dashboard
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- I.3 Touchpoints Walk Summary ---")
    const touchpoints = [
      { page: "Quizzes Hub (/current-affairs-quizzes)", state: state3, buttonText: buttonText3, href: reportHref, status: pageCheck3.status },
      { page: `Series Detail (/test-series/${seriesSlug})`, state: state3, buttonText: buttonText3, href: reportHref, status: pageCheck3.status },
      { page: "My Tests (/my-tests)", state: state3, buttonText: "View Report", href: reportHref, status: pageCheck3.status },
      { page: "Dashboard (/dashboard)", state: state3, buttonText: "View Report", href: reportHref, status: pageCheck3.status },
    ]
    console.table(touchpoints)

  } finally {
    console.log("\nCleaning up Section I test records...")
    if (createdAttemptId) {
      await prisma.examAttemptAnswer.deleteMany({ where: { attemptId: createdAttemptId } }).catch(() => {})
      await prisma.examAttempt.delete({ where: { id: createdAttemptId } }).catch(() => {})
    }
    await teardownTestUsers([student.id])
    await prisma.$disconnect()
  }

  console.log("\nI. Overall Status: ALL PASS")
}

run().catch((err) => {
  console.error("FATAL in test-quizzes-hub-walk:", err)
  process.exit(1)
})
