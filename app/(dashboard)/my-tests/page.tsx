import { Suspense } from "react"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import MyTestsHubClient, {
    InProgressTest,
    EnrolledTestSeries,
    AttemptRecord,
    BrowseSeriesItem,
} from "@/components/test-series/MyTestsHubClient"
import {
    getExamInstructionsUrl,
    getExamAttemptUrl,
    getExamResultUrl,
    getExamSolutionsUrl,
    getExamLeaderboardUrl,
} from "@/lib/exam/urls"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "My Tests | AspirantBook",
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
            // ── 1, 2, 3: Fetch in-progress, enrollments, and completed in parallel ──
            const [dbInProgress, dbEnrollments, dbCompleted] = await Promise.all([
                prisma.examAttempt.findMany({
                    where: {
                        userId,
                        status: "IN_PROGRESS",
                    },
                    include: { test: { include: { series: true } } },
                    orderBy: { startedAt: "desc" },
                    take: 5,
                }),
                prisma.examSeriesEnrollment.findMany({
                    where: { userId, status: "ACTIVE" },
                    include: {
                        series: {
                            include: { tests: { where: { isPublished: true }, select: { id: true, title: true, order: true } } }
                        },
                    },
                    orderBy: { enrolledAt: "desc" },
                }),
                prisma.examAttempt.findMany({
                    where: {
                        userId,
                        status: { in: ["SUBMITTED", "TIMED_OUT"] },
                    },
                    include: { test: { include: { series: true } } },
                    orderBy: { submittedAt: "desc" },
                    take: 50,
                }),
            ])

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
                    attemptUrl: getExamAttemptUrl({
                        seriesId: att.test.series?.slug || att.test.seriesId,
                        testId: att.testId,
                        attemptId: att.id,
                        title: att.test.title,
                    }),
                }
            })

            for (const enrollment of dbEnrollments) {
                const s = enrollment.series
                const slug = s.slug || s.id

                // Count how many tests this user has attempted in this series
                const [attemptCount, attemptedTestIds] = await Promise.all([
                    prisma.examAttempt.count({
                        where: { userId, test: { seriesId: s.id } },
                    }),
                    prisma.examAttempt.findMany({
                        where: { userId, test: { seriesId: s.id } },
                        select: { testId: true },
                    }),
                ])
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
                        ? getExamInstructionsUrl({
                            seriesId: slug,
                            testId: nextTest.id,
                            title: nextTest.title,
                        })
                        : `/test-series/${slug}`,
                    viewAllUrl: `/test-series/${slug}`,
                    highlights: [],
                })
            }

            // Group by testId: 1 card per test
            const testGroups = new Map<string, typeof dbCompleted>()
            for (const att of dbCompleted) {
                const group = testGroups.get(att.testId) || []
                group.push(att)
                testGroups.set(att.testId, group)
            }

            recentAttempts = Array.from(testGroups.entries()).map(([testId, attempts]) => {
                const latestAtt = attempts[0]
                const totalMarks = latestAtt.test.totalMarks || 150
                const latestScore = latestAtt.score || 0
                const bestScore = Math.max(...attempts.map((a) => a.score || 0))
                const seriesSlug =
                    latestAtt.test.series?.slug || latestAtt.test.seriesId || "bpsc-72nd-2026"

                const accuracy =
                    latestAtt.correctCount + latestAtt.wrongCount > 0
                        ? Math.round(
                              (latestAtt.correctCount /
                                  (latestAtt.correctCount + latestAtt.wrongCount)) *
                                  100
                          )
                        : 0

                const earlierAttempts = attempts.slice(1).map((ea) => {
                    const eaAccuracy =
                        ea.correctCount + ea.wrongCount > 0
                            ? Math.round(
                                  (ea.correctCount /
                                      (ea.correctCount + ea.wrongCount)) *
                                      100
                              )
                            : 0
                    return {
                        id: ea.id,
                        date: ea.submittedAt
                            ? new Date(ea.submittedAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                              })
                            : "Earlier",
                        score: ea.score || 0,
                        totalMarks: ea.test.totalMarks || 150,
                        percentile: ea.percentile ? Math.round(ea.percentile * 10) / 10 : 0,
                        rank: ea.allIndiaRank || 0,
                        accuracy: eaAccuracy,
                        solutionUrl: getExamSolutionsUrl({
                            seriesId: seriesSlug,
                            testId,
                            attemptId: ea.id,
                            title: ea.test?.title,
                        }),
                        reportUrl: getExamResultUrl({
                            seriesId: seriesSlug,
                            testId,
                            attemptId: ea.id,
                            title: ea.test?.title,
                        }),
                    }
                })

                return {
                    id: latestAtt.id,
                    testId,
                    title: latestAtt.test.title,
                    examName: latestAtt.test.series?.examName || latestAtt.test.series?.category || "Competitive Exam",
                    date: latestAtt.submittedAt
                        ? new Date(latestAtt.submittedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                          })
                        : "Recent",
                    score: latestScore,
                    bestScore,
                    latestScore,
                    attemptCount: attempts.length,
                    totalMarks,
                    percentile: latestAtt.percentile
                        ? Math.round(latestAtt.percentile * 10) / 10
                        : 0,
                    rank: latestAtt.allIndiaRank || 0,
                    totalCandidates: 0,
                    accuracy,
                    timeSpentMins: Math.round((latestAtt.timeTakenSecs || 0) / 60),
                    correct: latestAtt.correctCount,
                    wrong: latestAtt.wrongCount,
                    skipped: latestAtt.skippedCount,
                    solutionUrl: getExamSolutionsUrl({
                        seriesId: seriesSlug,
                        testId,
                        attemptId: latestAtt.id,
                        title: latestAtt.test.title,
                    }),
                    reportUrl: getExamResultUrl({
                        seriesId: seriesSlug,
                        testId,
                        attemptId: latestAtt.id,
                        title: latestAtt.test.title,
                    }),
                    leaderboardUrl: getExamLeaderboardUrl(testId),
                    earlierAttempts,
                }
            })
        }

        // ── 4. Browse catalog (published, excluding already attempted series & 0-test series) ──
        const attemptedIds = new Set(enrolledSeries.map((s) => s.id))
        const dbCatalog = await prisma.examSeries.findMany({
            where: {
                isPublished: true,
                id: { notIn: [...attemptedIds] },
                totalTests: { gt: 0 },
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
                        ? (s.usersCount >= 1000 ? `${(s.usersCount / 1000).toFixed(1)}k` : `${s.usersCount}`)
                        : "",
                totalTests: s.totalTests || 0,
                freeTests: s.freeTests || 0,
                isPro: Boolean(s.isPro),
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
