import { Suspense } from "react"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import MyTestsHubClient, {
    InProgressTest,
    EnrolledTestSeries,
    AttemptRecord,
    BrowseSeriesItem,
} from "@/components/test-series/MyTestsHubClient"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "My Tests | aspirantbook",
    description: "Continue in-progress mock exams, access your enrolled test series, and review detailed score reports.",
}

export default async function MyTestsPage() {
    const session = await auth()
    const userId = session?.user?.id

    let inProgressTests: InProgressTest[] = []
    let enrolledSeries: EnrolledTestSeries[] = []
    let recentAttempts: AttemptRecord[] = []
    let catalogSeries: BrowseSeriesItem[] = []

    try {
        if (userId) {
            // ── 1. In-Progress attempts ──────────────────────────────────
            const dbInProgress = await prisma.examAttempt.findMany({
                where: { userId, status: "IN_PROGRESS" },
                include: { test: { include: { series: true } } },
                orderBy: { startedAt: "desc" },
                take: 5,
            })

            inProgressTests = dbInProgress.map((att) => {
                const elapsedMins = Math.round(
                    (Date.now() - new Date(att.startedAt).getTime()) / 60000
                )
                const totalDuration = att.test.durationMinutes || 120
                const remainingMins = Math.max(1, totalDuration - elapsedMins)

                return {
                    id: att.id,
                    attemptId: att.id,
                    testId: att.testId,
                    seriesId: att.test.series?.slug || att.test.seriesId,
                    title: att.test.title,
                    examName:
                        att.test.series?.examName ||
                        att.test.series?.category ||
                        "Competitive Exam",
                    category: att.test.series?.category || "Civil Services",
                    totalQuestions: att.test.totalQuestions || 150,
                    answeredQuestions: att.correctCount + att.wrongCount,
                    timeRemainingMins: remainingMins,
                    startedAt: new Date(att.startedAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                    attemptUrl: `/test-series/${att.test.series?.slug || att.testId}/${att.id}/attempt`,
                }
            })

            // ── 2. Enrolled series from ExamSeriesEnrollment table ───────
            const dbEnrollments = await prisma.examSeriesEnrollment.findMany({
                where: { userId, status: "ACTIVE" },
                include: {
                    series: {
                        include: { tests: { where: { isPublished: true }, select: { id: true, title: true, order: true } } }
                    },
                },
                orderBy: { enrolledAt: "desc" },
            })

            for (const enrollment of dbEnrollments) {
                const s = enrollment.series
                const slug = s.slug || s.id

                // Count how many tests this user has attempted in this series
                const attemptCount = await prisma.examAttempt.count({
                    where: { userId, test: { seriesId: s.id } },
                })

                // Next unattempted published test
                const attemptedTestIds = await prisma.examAttempt.findMany({
                    where: { userId, test: { seriesId: s.id } },
                    select: { testId: true },
                })
                const attemptedIds = new Set(attemptedTestIds.map((a) => a.testId))
                const nextTest = s.tests
                    .sort((a, b) => a.order - b.order)
                    .find((t) => !attemptedIds.has(t.id))

                const logoType: "bpsc" | "upsc" | "uppcs" | "general" =
                    slug.includes("bpsc") ? "bpsc"
                    : slug.includes("upsc") ? "upsc"
                    : slug.includes("uppcs") ? "uppcs"
                    : "general"

                enrolledSeries.push({
                    id: s.id,
                    slug,
                    title: s.title,
                    examName: s.examName || s.category,
                    category: s.category,
                    logoType,
                    totalTests: s.tests.length || s.totalTests || 0,
                    completedTests: attemptCount,
                    enrollType: enrollment.enrollType,
                    validUntil: enrollment.expiresAt
                        ? new Date(enrollment.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "Lifetime",
                    languages: s.languages || "English, Hindi",
                    nextTestTitle: nextTest?.title || "All tests completed",
                    nextTestUrl: nextTest
                        ? `/test-series/${slug}/${nextTest.id}/attempt`
                        : `/test-series/${slug}`,
                    viewAllUrl: `/test-series/${slug}`,
                    highlights: [],
                })
            }

            // ── 3. Completed attempts for Performance Hub ──────────────
            const dbCompleted = await prisma.examAttempt.findMany({
                where: {
                    userId,
                    status: { in: ["SUBMITTED", "TIMED_OUT"] },
                },
                include: { test: { include: { series: true } } },
                orderBy: { submittedAt: "desc" },
                take: 10,
            })

            recentAttempts = dbCompleted.map((att) => {
                const totalMarks = att.test.totalMarks || 150
                const score = att.score || 0
                const accuracy =
                    att.correctCount + att.wrongCount > 0
                        ? Math.round(
                              (att.correctCount /
                                  (att.correctCount + att.wrongCount)) *
                                  100
                          )
                        : 0
                const seriesSlug =
                    att.test.series?.slug || att.test.seriesId || "bpsc-72nd-2026"

                return {
                    id: att.id,
                    testId: att.testId,
                    title: att.test.title,
                    examName: att.test.series?.examName || att.test.series?.category || "Competitive Exam",
                    date: att.submittedAt
                        ? new Date(att.submittedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                          })
                        : "Recent",
                    score,
                    totalMarks,
                    percentile: att.percentile
                        ? Math.round(att.percentile * 10) / 10
                        : 0,
                    rank: att.allIndiaRank || 0,
                    totalCandidates: 1250,
                    accuracy,
                    timeSpentMins: Math.round((att.timeTakenSecs || 0) / 60),
                    correct: att.correctCount,
                    wrong: att.wrongCount,
                    skipped: att.skippedCount,
                    solutionUrl: `/test-series/${seriesSlug}/solutions?testId=${encodeURIComponent(att.testId)}&attemptId=${encodeURIComponent(att.id)}`,
                    reportUrl: `/test-series/${seriesSlug}/result?testId=${encodeURIComponent(att.testId)}&attemptId=${encodeURIComponent(att.id)}`,
                    leaderboardUrl: `/test-series/${seriesSlug}/leaderboard`,
                }
            })
        }

        // ── 4. Browse catalog (published, excluding already attempted series) ──
        const attemptedIds = new Set(enrolledSeries.map((s) => s.id))
        const dbCatalog = await prisma.examSeries.findMany({
            where: {
                isPublished: true,
                id: { notIn: [...attemptedIds] },
            },
            take: 8,
            orderBy: { createdAt: "desc" },
        })

        catalogSeries = dbCatalog.map((s) => {
            const slug = s.slug || s.id
            const logoType: "bpsc" | "upsc" | "uppcs" | "general" =
                slug.includes("bpsc")
                    ? "bpsc"
                    : slug.includes("upsc")
                    ? "upsc"
                    : slug.includes("uppcs")
                    ? "uppcs"
                    : "general"

            return {
                id: slug,
                title: s.title,
                category: s.category,
                examType: s.category,
                logoType,
                users:
                    s.usersCount > 0
                        ? `${(s.usersCount / 1000).toFixed(1)}k`
                        : "12.5k",
                totalTests: s.totalTests || 10,
                freeTests: s.freeTests || 2,
                languages: s.languages || "English, Hindi",
                highlights: [
                    "Full Length Simulated Mocks",
                    "Subject-Wise Sectional Tests",
                    "Official Previous Year Questions",
                ],
                description:
                    s.description ||
                    `${s.title} — strictly aligned with the latest exam pattern.`,
                url: `/test-series/${slug}`,
            }
        })
    } catch (err) {
        console.warn("/my-tests DB error, rendering empty states:", err)
    }

    return (
        <Suspense
            fallback={
                <div className="p-8 text-center text-xs text-slate-500">
                    Loading your tests…
                </div>
            }
        >
            <MyTestsHubClient
                inProgressTests={inProgressTests}
                enrolledSeries={enrolledSeries}
                recentAttempts={recentAttempts}
                catalogSeries={catalogSeries}
            />
        </Suspense>
    )
}
