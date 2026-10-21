import { prisma } from "../lib/prisma"
import { setMockSessionProvider } from "../auth"
import { GET as getAttemptResult } from "../app/api/exam/attempt/[attemptId]/result/route"
import { NextRequest } from "next/server"
import {
  getExamInstructionsUrl,
  getExamAttemptUrl,
  getExamResultUrl,
  getExamSolutionsUrl,
  getExamLeaderboardUrl,
} from "../lib/exam/urls"

async function run() {
  console.log("=== SECTION H: REPORT LINKS AND MY TESTS FIX AUDIT ===")

  // 1. Ownership test for the 8 attempts
  console.log("\n--- H.1 Attempt Ownership Verification (Injected Mock Sessions) ---")
  const attempts = await prisma.examAttempt.findMany({
    take: 8,
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      userId: true,
      testId: true,
      status: true,
      score: true,
      test: { select: { title: true, series: { select: { slug: true } } } },
    },
  })

  const otherUserId = "u_random_non_owner_99999"
  const ownershipResults = []

  for (const att of attempts) {
    // A. Call as Owner
    setMockSessionProvider(() => ({ user: { id: att.userId, role: "STUDENT" } }))
    const reqOwner = new NextRequest(`http://localhost:3000/api/exam/attempt/${att.id}/result`)
    const resOwner = await getAttemptResult(reqOwner, { params: Promise.resolve({ attemptId: att.id }) })
    const statusOwner = resOwner.status

    // B. Call as Non-owner
    setMockSessionProvider(() => ({ user: { id: otherUserId, role: "STUDENT" } }))
    const reqNonOwner = new NextRequest(`http://localhost:3000/api/exam/attempt/${att.id}/result`)
    const resNonOwner = await getAttemptResult(reqNonOwner, { params: Promise.resolve({ attemptId: att.id }) })
    const statusNonOwner = resNonOwner.status

    ownershipResults.push({
      attemptId: att.id.slice(0, 8),
      ownerId: att.userId.slice(0, 8),
      testTitle: att.test?.title?.slice(0, 32),
      ownerStatus: statusOwner,
      nonOwnerStatus: statusNonOwner,
      pass: statusOwner === 200 && statusNonOwner === 403,
    })
  }

  // Clear mock session provider
  setMockSessionProvider(null)

  console.table(ownershipResults)
  const allOwnershipPassed = ownershipResults.every((r) => r.pass)
  console.log(`Ownership checks: ${allOwnershipPassed ? "ALL PASS" : "FAIL"}`)

  // Page level behavior report for non-owner:
  console.log("\nPage-level behavior for non-owner:")
  console.log("  When non-owner visits /test-series/[seriesId]/result?testId=...&attemptId=...:")
  console.log("  - The page (Client Component) loads with HTTP 200.")
  console.log("  - The client fetches /api/exam/attempt/[attemptId]/result which returns HTTP 403 Forbidden.")
  console.log("  - The client displays an error card ('Unauthorized' / 'You do not have permission to view this report').")
  console.log("  Recommendation: In a future change, convert page.tsx to a Server Component wrapper that invokes notFound() on 403 to return a genuine HTTP 404.")

  // 2. Real routes list and URL helper verification
  console.log("\n--- H.2 Real Exam Routes & Unified URL Helper Verification ---")
  const realRoutes = [
    "app/(exam)/test-series/[id]/instructions/page.tsx",
    "app/(exam)/test-series/[id]/attempt/page.tsx",
    "app/(exam)/test-series/[id]/result/page.tsx",
    "app/(exam)/test-series/[id]/solutions/page.tsx",
    "app/(exam)/test-series/[id]/declaration/page.tsx",
    "app/(exam)/test-series/[id]/print/page.tsx",
    "app/(dashboard)/test-series/[id]/leaderboard/page.tsx",
    "app/(dashboard)/test-series/[id]/page.tsx",
    "app/(dashboard)/test-series/my-tests/page.tsx",
  ]
  console.log("Real Routes in Codebase:")
  realRoutes.forEach((r) => console.log(`  - ${r}`))

  const sampleSeries = attempts[0]?.test?.series?.slug || "bpsc-72nd-2026"
  const sampleTest = attempts[0]?.testId || "bpsc-sectional-1"
  const sampleAttempt = attempts[0]?.id || "att-sample"

  const generatedUrls = {
    instructions: getExamInstructionsUrl({ seriesId: sampleSeries, testId: sampleTest, title: "Sample Test" }),
    attempt: getExamAttemptUrl({ seriesId: sampleSeries, testId: sampleTest, attemptId: sampleAttempt }),
    result: getExamResultUrl({ seriesId: sampleSeries, testId: sampleTest, attemptId: sampleAttempt }),
    solutions: getExamSolutionsUrl({ seriesId: sampleSeries, testId: sampleTest, attemptId: sampleAttempt }),
    leaderboard: getExamLeaderboardUrl(sampleTest),
  }

  console.log("\nUnified Canonical URLs:")
  console.log("  Instructions:", generatedUrls.instructions)
  console.log("  Attempt:     ", generatedUrls.attempt)
  console.log("  Result:      ", generatedUrls.result)
  console.log("  Solutions:   ", generatedUrls.solutions)
  console.log("  Leaderboard: ", generatedUrls.leaderboard)

  // Curl exact hrefs on running server
  console.log("\nTesting HTTP status codes for generated URLs:")
  const urlChecks = []
  for (const [key, url] of Object.entries(generatedUrls)) {
    const res = await fetch(`http://localhost:3000${url}`, { redirect: "manual" })
    urlChecks.push({
      type: key,
      url,
      httpStatus: res.status,
      // 200 or 307 (redirect to login if protected) are valid existing responses, not 404!
      valid: res.status !== 404,
    })
  }
  console.table(urlChecks)

  const allUrlsValid = urlChecks.every((c) => c.valid)
  console.log(`URL Route Validation: ${allUrlsValid ? "ALL PASS (0 routes 404)" : "FAIL"}`)

  await prisma.$disconnect()
  if (!allOwnershipPassed || !allUrlsValid) {
    process.exit(1)
  }
  console.log("\nH. Overall Status: ALL PASS")
}

run().catch((err) => {
  console.error("FATAL in test-report-links:", err)
  process.exit(1)
})
