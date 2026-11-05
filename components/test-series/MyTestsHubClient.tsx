"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"
import {
    Play,
    Clock,
    CheckCircle2,
    XCircle,
    Trophy,
    TrendingUp,
    BookOpen,
    AlertCircle,
    Bookmark,
    Target,
    ChevronRight,
    Sparkles,
    Compass,
    Layers,
    ClipboardCheck,
    Check,
    ArrowRight,
    ChevronDown,
    ChevronUp,
    LogIn,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────
export interface InProgressTest {
    id: string
    attemptId: string
    testId: string
    seriesId?: string
    title: string
    examName: string
    category: string
    totalQuestions: number
    answeredQuestions: number
    timeRemainingMins: number
    startedAt: string
    attemptUrl: string
}

export interface EnrolledTestSeries {
    id: string
    slug: string
    title: string
    examName: string
    category: string
    logoType: "bpsc" | "upsc" | "uppcs" | "general"
    totalTests: number
    completedTests: number
    enrollType?: string
    validUntil: string
    languages: string
    nextTestTitle: string
    nextTestUrl: string
    viewAllUrl: string
    highlights: string[]
}

export interface AttemptRecord {
    id: string
    testId: string
    title: string
    examName: string
    date: string
    score: number
    totalMarks: number
    percentile: number
    rank: number
    totalCandidates?: number
    accuracy: number
    timeSpentMins: number
    correct: number
    wrong: number
    skipped: number
    solutionUrl: string
    reportUrl: string
    leaderboardUrl: string
    attemptCount?: number
    bestScore?: number
    latestScore?: number
    earlierAttempts?: Array<{
        id: string
        date: string
        score: number
        totalMarks: number
        percentile: number
        rank: number
        accuracy: number
        reportUrl: string
        solutionUrl: string
    }>
}

export interface BrowseSeriesItem {
    id: string
    title: string
    category: string
    examType: string
    logoType: "bpsc" | "upsc" | "uppcs" | "general"
    users: string
    totalTests: number
    freeTests: number
    isPro?: boolean
    languages: string
    highlights: string[]
    description: string
    url: string
}

interface Props {
    inProgressTests: InProgressTest[]
    enrolledSeries: EnrolledTestSeries[]
    recentAttempts: AttemptRecord[]
    catalogSeries: BrowseSeriesItem[]
}

// ─── Exam Badge SVG ───────────────────────────────────────────────────────────
function ExamBadge({ logoType }: { logoType: string }) {
    if (logoType === "upsc") {
        return (
            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                <svg className="w-7 h-7" viewBox="0 0 100 100" aria-label="UPSC">
                    <circle cx="50" cy="50" r="47" fill="#FFFDF5" stroke="#1F2937" strokeWidth="2" />
                    <path d="M50 14 C44 14 40 18 40 23 C40 27 43 30 45 32 C41 33 37 37 37 42 C37 47 41 51 45 53 L45 61 L33 61 C31 61 30 63 30 65 L30 68 L70 68 L70 65 C70 63 69 61 67 61 L55 61 L55 53 C59 51 63 47 63 42 C63 37 59 33 55 32 C57 30 60 27 60 23 C60 18 56 14 50 14 Z" fill="#1F2937" />
                    <circle cx="50" cy="74" r="5" fill="none" stroke="#003B73" strokeWidth="2" />
                    <path d="M28 80 L72 80 L68 86 L32 86 Z" fill="#B45309" />
                    <text x="50" y="95" textAnchor="middle" fontSize="9" fontWeight="900" fill="#111827">UPSC</text>
                </svg>
            </div>
        )
    }
    if (logoType === "bpsc") {
        return (
            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                <svg className="w-7 h-7" viewBox="0 0 100 100" aria-label="BPSC">
                    <circle cx="50" cy="50" r="47" fill="#F8FAFC" stroke="#047857" strokeWidth="2.5" />
                    <path d="M50 16 C38 23 34 36 41 48 C43 52 47 55 49 60 C51 55 55 52 57 48 C64 36 60 23 50 16 Z" fill="#047857" />
                    <circle cx="33" cy="38" r="4.5" fill="#D97706" />
                    <circle cx="67" cy="38" r="4.5" fill="#D97706" />
                    <rect x="47" y="60" width="6" height="15" fill="#78350F" />
                    <rect x="28" y="75" width="44" height="4.5" rx="2" fill="#047857" />
                    <text x="50" y="92" textAnchor="middle" fontSize="9" fontWeight="900" fill="#064E3B">BPSC</text>
                </svg>
            </div>
        )
    }
    if (logoType === "uppcs") {
        return (
            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                <svg className="w-7 h-7" viewBox="0 0 100 100" aria-label="UPPSC">
                    <circle cx="50" cy="50" r="47" fill="#F8FAFC" stroke="#1E293B" strokeWidth="2.5" />
                    <path d="M28 42 Q50 26 72 42" fill="none" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" />
                    <line x1="50" y1="24" x2="50" y2="56" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M30 63 Q40 56 48 66 Q40 74 30 63 Z" fill="#2563EB" />
                    <path d="M70 63 Q60 56 52 66 Q60 74 70 63 Z" fill="#2563EB" />
                    <text x="50" y="91" textAnchor="middle" fontSize="8" fontWeight="900" fill="#0F172A">UPPSC</text>
                </svg>
            </div>
        )
    }
    return (
        <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
            <ClipboardCheck className="w-5 h-5" />
        </div>
    )
}

const WEAK_TOPICS = [
    { topic: "Constitutional Amendments & Emergency Provisions", subject: "Polity", accuracy: 38, mistakes: 8, recAction: "Review Articles 352–360" },
    { topic: "Modern Indian History – Tribal Revolts (1857–1947)", subject: "History", accuracy: 44, mistakes: 6, recAction: "Read NCERT Class 12 Ch. 8" },
    { topic: "Clocks, Calendars & Speed-Time-Distance", subject: "Reasoning", accuracy: 48, mistakes: 5, recAction: "Practice 15 Speed Drills" },
]

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MyTestsHubClient({
    inProgressTests,
    enrolledSeries,
    recentAttempts,
    catalogSeries,
}: Props) {
    const router = useRouter()
    const { data: session } = useSession()
    const { openMobileAuth } = useMobileAuth()
    const isGuest = !session?.user

    const handleAuthAction = (e: React.MouseEvent, targetUrl: string) => {
        if (isGuest) {
            e.preventDefault()
            e.stopPropagation()
            openMobileAuth({
                actionType: "login",
                callbackUrl: targetUrl,
            })
            return false
        }
        return true
    }

    const [perfTab, setPerfTab] = useState<"ATTEMPTS" | "WEAK_AREAS" | "BOOKMARKS">("ATTEMPTS")
    const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({})

    const toggleTestExpand = (testId: string) => {
        setExpandedTests((prev) => ({ ...prev, [testId]: !prev[testId] }))
    }

    const totalTestsTaken = recentAttempts.length
    const avgPercentile = totalTestsTaken
        ? Math.round(recentAttempts.reduce((s, a) => s + a.percentile, 0) / totalTestsTaken)
        : 0
    const totalMistakes = recentAttempts.reduce((s, a) => s + a.wrong, 0)
    const bestRank = recentAttempts.length ? Math.min(...recentAttempts.map((a) => a.rank)) : 0

    return (
        <div className="space-y-8 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">

            {/* ══════════════════════════════════════════════════════════════
                SECTION 1 — TEST IN PROGRESS
            ══════════════════════════════════════════════════════════════ */}
            {inProgressTests.length > 0 && (
                <section aria-labelledby="heading-in-progress">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                        </span>
                        <h2 id="heading-in-progress" className="text-base font-black text-slate-900 dark:text-white">
                            Test in Progress
                        </h2>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[11px] font-black">
                            {inProgressTests.length}
                        </span>
                    </div>

                    <div className="space-y-3">
                        {inProgressTests.map((test) => {
                            const pct = Math.round((test.answeredQuestions / test.totalQuestions) * 100)
                            return (
                                <div
                                    key={test.id}
                                    className="rounded-2xl border-2 border-amber-400/50 bg-gradient-to-r from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-900 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                                >
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[11px] font-black">
                                                <Clock className="w-3 h-3" /> In Progress
                                            </span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                                {test.examName} • Started {test.startedAt}
                                            </span>
                                        </div>
                                        <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-snug truncate">
                                            {test.title}
                                        </p>
                                        <div className="space-y-1 max-w-sm">
                                            <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                                <span>{test.answeredQuestions}/{test.totalQuestions} answered</span>
                                                <span className="text-amber-600 dark:text-amber-400 font-bold">{test.timeRemainingMins} min left</span>
                                            </div>
                                            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.max(pct, 4)}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                    <Link
                                        href={test.attemptUrl}
                                        onClick={(e) => handleAuthAction(e, test.attemptUrl)}
                                        className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm shadow-sm transition-all active:scale-[0.98] min-h-[44px]"
                                    >
                                        <Play className="w-4 h-4 fill-current" />
                                        Continue
                                    </Link>
                                </div>
                            )
                        })}
                    </div>
                </section>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SECTION 2 — ENROLLED / BOUGHT TESTS  (horizontal cards)
            ══════════════════════════════════════════════════════════════ */}
            <section aria-labelledby="heading-enrolled">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <h2 id="heading-enrolled" className="text-base font-black text-slate-900 dark:text-white">
                            Enrolled &amp; Bought Test Series
                        </h2>
                        {enrolledSeries.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-[11px] font-black">
                                {enrolledSeries.length}
                            </span>
                        )}
                    </div>
                    <Link
                        href="/test-series"
                        className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline"
                    >
                        Browse all →
                    </Link>
                </div>

                {isGuest ? (
                    <div className="rounded-2xl border-2 border-teal-100 dark:border-teal-900/40 bg-teal-50/40 dark:bg-teal-950/20 p-8 text-center space-y-4">
                        <div className="w-14 h-14 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center mx-auto">
                            <LogIn className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">To see your enrolled tests &amp; series, login</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                                Sign in with your mobile number to view active test enrollments and your test passes.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={(e) => handleAuthAction(e, "/my-tests")}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-colors min-h-[44px]"
                            >
                                <LogIn className="w-4 h-4" />
                                Login with Mobile
                            </button>
                            <Link
                                href="/test-series"
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors min-h-[44px]"
                            >
                                <Compass className="w-4 h-4" />
                                Browse Catalog
                            </Link>
                        </div>
                    </div>
                ) : enrolledSeries.length === 0 ? (
                    /* ── Empty state ── */
                    <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-8 text-center space-y-4">
                        <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mx-auto">
                            <Layers className="w-7 h-7 text-slate-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No test series enrolled yet</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                                You have not started or enrolled in any test series. Explore our high-yield mock tests and start practising.
                            </p>
                        </div>
                        <Link
                            href="/test-series"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm transition-colors min-h-[44px]"
                        >
                            <Compass className="w-4 h-4" />
                            Browse Tests
                        </Link>
                    </div>
                ) : (
                    /* ── Horizontal card list ── */
                    <div className="space-y-3">
                        {enrolledSeries.map((series) => {
                            const pct = Math.round((series.completedTests / (series.totalTests || 1)) * 100)
                            return (
                                <div
                                    key={series.id}
                                    onClick={() => router.push(series.viewAllUrl)}
                                    role="link"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault()
                                            router.push(series.viewAllUrl)
                                        }
                                    }}
                                    className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 py-4 shadow-xs hover:border-teal-400/50 hover:shadow-md transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-teal-500"
                                >
                                    {/* Left: badge + info */}
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <ExamBadge logoType={series.logoType} />
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-[10px] font-black uppercase">
                                                    {series.category}
                                                </span>
                                                {series.enrollType && series.enrollType !== "FREE" && (
                                                    <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase">
                                                        {series.enrollType === "PASS" ? "✦ PASS" : "PURCHASED"}
                                                    </span>
                                                )}
                                                <span className="text-[11px] text-slate-600 dark:text-slate-400">
                                                    {series.languages}
                                                </span>
                                            </div>
                                            <p className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-1">
                                                {series.title}
                                            </p>
                                            {/* progress mini-bar */}
                                            <div className="flex items-center gap-2 max-w-xs">
                                                <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.max(pct, 2)}%` }} />
                                                </div>
                                                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold whitespace-nowrap">
                                                    {series.completedTests}/{series.totalTests} done
                                                </span>
                                            </div>
                                            {series.nextTestTitle !== "No upcoming test" && (
                                                <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                                                    Next: <span className="font-semibold text-teal-700 dark:text-teal-400">{series.nextTestTitle}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: action buttons */}
                                    <div className="flex items-center gap-2 shrink-0 sm:flex-col sm:items-end lg:flex-row">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                if (handleAuthAction(e, series.nextTestUrl)) {
                                                    router.push(series.nextTestUrl)
                                                }
                                            }}
                                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-all active:scale-[0.98] min-h-[40px] whitespace-nowrap cursor-pointer shadow-xs"
                                        >
                                            <Play className="w-3.5 h-3.5 fill-current" />
                                            Start Next Test
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                router.push(series.viewAllUrl)
                                            }}
                                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors min-h-[40px] whitespace-nowrap cursor-pointer"
                                        >
                                            All Tests
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                )}
            </section>

            {/* ══════════════════════════════════════════════════════════════
                SECTION 3 — PERFORMANCE HUB  (matching attached image)
            ══════════════════════════════════════════════════════════════ */}
            <section
                className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-6"
                aria-labelledby="heading-perf"
            >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300 text-[11px] font-bold uppercase tracking-wider">
                                STUDENT PERFORMANCE HUB
                            </span>
                            <span className="text-xs text-slate-600 dark:text-slate-400">• Analytics &amp; Reports</span>
                        </div>
                        <h2 id="heading-perf" className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                            My Test Series &amp; Attempt History
                        </h2>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                            Track your score progression, benchmark against All-India toppers, and review your Mistake Notebook.
                        </p>
                    </div>
                    <Link
                        href="/test-series"
                        className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-sm shadow-md transition-all min-h-[44px]"
                    >
                        <Play className="w-4 h-4 fill-current" />
                        Take More Mocks
                    </Link>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-5 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider truncate">Tests Attempted</span>
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sky-800 dark:text-sky-300 flex items-center justify-center shrink-0">
                                <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
                            <span className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">{totalTestsTaken}</span>
                            <span className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 font-semibold">Completed</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-5 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider truncate">Avg Percentile</span>
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center shrink-0">
                                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
                            <span className="text-xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400">
                                {totalTestsTaken ? `${avgPercentile}%ile` : "—"}
                            </span>
                            {totalTestsTaken > 0 && <span className="text-[11px] sm:text-xs text-emerald-700 dark:text-emerald-400 font-bold">Top Tier</span>}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-5 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider truncate">Best AIR</span>
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center shrink-0">
                                <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
                            <span className="text-xl sm:text-3xl font-black text-amber-500">
                                {bestRank > 0 ? `#${bestRank}` : "—"}
                            </span>
                            {bestRank > 0 && <span className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400">Rank</span>}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-5 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider truncate">Mistakes</span>
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center shrink-0">
                                <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
                            <span className="text-xl sm:text-3xl font-black text-red-600 dark:text-red-400">{totalMistakes}</span>
                            <span className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 font-semibold">Review</span>
                        </div>
                    </div>
                </div>

                {/* Performance sub-tabs */}
                <div data-scroll-x="true" className="w-full sm:w-auto flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/60 max-w-md overflow-x-auto no-scrollbar snap-x">
                    {(["ATTEMPTS", "WEAK_AREAS", "BOOKMARKS"] as const).map((tab) => {
                        const labels: Record<string, string> = {
                            ATTEMPTS: `Attempted (${recentAttempts.length})`,
                            WEAK_AREAS: `Weak Areas (${WEAK_TOPICS.length})`,
                            BOOKMARKS: "Bookmarks (14)",
                        }
                        return (
                            <button
                                key={tab}
                                onClick={() => setPerfTab(tab)}
                                className={`shrink-0 flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition-all min-h-[44px] flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer snap-start ${
                                    perfTab === tab
                                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                                        : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                {tab === "WEAK_AREAS" && <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                                {labels[tab]}
                            </button>
                        )
                    })}
                </div>

                {/* TAB: Attempted Mocks */}
                {perfTab === "ATTEMPTS" && (
                    isGuest ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-sky-100 dark:border-sky-900/40 p-10 text-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-sky-50 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
                                <LogIn className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">To see your mock test reports &amp; attempt history, login</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs mx-auto">
                                Sign in with your mobile OTP to track your score progression, accuracy, and All-India Rank.
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={(e) => handleAuthAction(e, "/my-tests")}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold min-h-[44px]"
                                >
                                    <LogIn className="w-4 h-4" />
                                    Login with Mobile
                                </button>
                                <Link href="/test-series" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold min-h-[44px]">
                                    Take a Mock Test
                                </Link>
                            </div>
                        </div>
                    ) : recentAttempts.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
                            <BookOpen className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No test attempts yet</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs mx-auto">
                                Attempt a mock test to see your score, percentile, and All-India Rank here.
                            </p>
                            <Link href="/test-series" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold min-h-[44px]">
                                Take a Mock Test
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {recentAttempts.map((attempt) => {
                                const isExpanded = !!expandedTests[attempt.testId]
                                const hasEarlier = attempt.earlierAttempts && attempt.earlierAttempts.length > 0

                                return (
                                    <div
                                        key={attempt.id}
                                        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs hover:border-sky-500/40 transition-all space-y-4"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="space-y-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-sky-800 dark:text-sky-300 text-[10px] font-black uppercase">
                                                        {attempt.examName}
                                                    </span>
                                                    {attempt.attemptCount && attempt.attemptCount > 1 ? (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                                            {attempt.attemptCount} Attempts
                                                        </span>
                                                    ) : null}
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">• Completed on {attempt.date}</span>
                                                </div>
                                                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white line-clamp-2">
                                                    {attempt.title}
                                                </h3>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                                                <Link
                                                    href={attempt.solutionUrl}
                                                    onClick={(e) => handleAuthAction(e, attempt.solutionUrl)}
                                                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors min-h-[44px] flex items-center"
                                                >
                                                    Mistake Notebook
                                                </Link>
                                                <Link
                                                    href={attempt.leaderboardUrl}
                                                    onClick={(e) => handleAuthAction(e, attempt.leaderboardUrl)}
                                                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-purple-700 dark:text-purple-400 transition-colors min-h-[44px] flex items-center"
                                                >
                                                    View AIR #{attempt.rank || "—"}
                                                </Link>
                                                <Link
                                                    href={attempt.reportUrl}
                                                    onClick={(e) => handleAuthAction(e, attempt.reportUrl)}
                                                    className="px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-extrabold transition-all min-h-[44px] flex items-center"
                                                >
                                                    Full Report →
                                                </Link>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">LATEST / BEST</p>
                                                <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                                                    {attempt.score} <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">/ {attempt.totalMarks}</span>
                                                    {attempt.bestScore !== undefined && attempt.bestScore !== attempt.score && (
                                                        <span className="text-xs text-emerald-600 ml-1.5 font-bold">(Best: {attempt.bestScore})</span>
                                                    )}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-slate-400">PERCENTILE</p>
                                                <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                                                    {attempt.percentile > 0 ? `${attempt.percentile}%ile` : "—"}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400">ALL INDIA RANK</p>
                                                <p className="text-base font-black text-amber-500 mt-0.5">
                                                    {attempt.rank > 0 ? <>#{attempt.rank}{attempt.totalCandidates && attempt.totalCandidates > 0 ? <span className="text-xs text-slate-600 dark:text-slate-400 font-normal"> / {attempt.totalCandidates}</span> : null}</> : "—"}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400">ACCURACY</p>
                                                <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">{attempt.accuracy}%</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400">BREAKDOWN</p>
                                                <p className="text-xs font-bold mt-1">
                                                    <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">+{attempt.correct}</span>
                                                    <span className="text-slate-300 mx-1">/</span>
                                                    <span className="text-rose-600 dark:text-rose-400 font-extrabold">-{attempt.wrong}</span>
                                                    <span className="text-slate-300 mx-1">/</span>
                                                    <span className="text-slate-600 dark:text-slate-400">{attempt.skipped} skip</span>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Expandable Earlier Attempts */}
                                        {hasEarlier && (
                                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                                                <button
                                                    onClick={() => toggleTestExpand(attempt.testId)}
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-400 hover:underline cursor-pointer py-1"
                                                >
                                                    <span>{isExpanded ? "Hide" : "View"} Earlier Attempts ({attempt.earlierAttempts!.length})</span>
                                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                </button>

                                                {isExpanded && (
                                                    <div className="mt-2 space-y-2 pl-2 border-l-2 border-sky-500/30">
                                                        {attempt.earlierAttempts!.map((ea, idx) => (
                                                            <div
                                                                key={ea.id || idx}
                                                                className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <span className="font-semibold text-slate-600 dark:text-slate-400">{ea.date}</span>
                                                                    <span className="font-black text-slate-900 dark:text-white">Score: {ea.score}/{ea.totalMarks}</span>
                                                                    <span className="text-emerald-600 font-bold">{ea.percentile}%ile</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Link
                                                                        href={ea.reportUrl}
                                                                        className="text-sky-600 hover:text-sky-700 font-bold px-2 py-1"
                                                                    >
                                                                        Report →
                                                                    </Link>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )
                )}

                {/* TAB: Weak Areas */}
                {perfTab === "WEAK_AREAS" && (
                    recentAttempts.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center">
                            <Sparkles className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No weak areas identified yet</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Attempt tests for AI to diagnose your knowledge gaps.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/5 p-4 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">AI Knowledge Gap Diagnostic</h4>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                                        Analyzed your test attempts — here are sub-topics where you lost marks due to negative marking or conceptual gaps.
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {WEAK_TOPICS.map((item, i) => (
                                    <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] font-black uppercase">
                                                Accuracy: {item.accuracy}%
                                            </span>
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{item.subject}</span>
                                        </div>
                                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">{item.topic}</h4>
                                        <p className="text-xs text-red-600 dark:text-red-400">Lost marks on {item.mistakes} questions</p>
                                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs">
                                            <p className="font-bold text-slate-700 dark:text-slate-300">Action:</p>
                                            <p className="text-slate-600 dark:text-slate-400 mt-0.5">{item.recAction}</p>
                                        </div>
                                        <Link href="/test-series" className="block text-center py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-h-[40px] flex items-center justify-center">
                                            Practice Drills →
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                )}

                {/* TAB: Bookmarks */}
                {perfTab === "BOOKMARKS" && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-4">
                        <div className="w-14 h-14 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 flex items-center justify-center mx-auto">
                            <Bookmark className="w-7 h-7" />
                        </div>
                        <div className="max-w-sm mx-auto">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white">14 Bookmarked Questions</h3>
                            <p className="text-xs text-slate-500 mt-1">Questions you bookmarked during CBT attempts, saved for quick revision.</p>
                        </div>
                        {recentAttempts.length > 0 ? (
                            <Link href={recentAttempts[0].solutionUrl} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors min-h-[44px]">
                                Open Latest Solutions
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                        ) : (
                            <Link href="/test-series" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors min-h-[44px]">
                                Attempt a Test to View Solutions
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                        )}
                    </div>
                )}
            </section>

            {/* ══════════════════════════════════════════════════════════════
                SECTION 4 — BROWSE TESTS
            ══════════════════════════════════════════════════════════════ */}
            {catalogSeries.length > 0 && (
                <section className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4" aria-labelledby="heading-browse">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Discover More Mocks</span>
                            <h2 id="heading-browse" className="text-base font-black text-slate-900 dark:text-white mt-0.5">Browse Test Series</h2>
                        </div>
                        <Link href="/test-series" className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 dark:text-sky-400 hover:underline">
                            Full Catalog <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {catalogSeries.map((item) => (
                            <div key={item.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs hover:border-emerald-400/50 hover:shadow-md transition-all flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <ExamBadge logoType={item.logoType} />
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-black">
                                        {item.isPro ? `${item.freeTests} Free Sample` : `${item.freeTests} Free`}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">{item.category}</span>
                                    <h3 className="text-xs font-extrabold text-slate-900 dark:text-white line-clamp-2 mt-0.5">{item.title}</h3>
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">{item.totalTests} tests{item.users ? ` • ${item.users} enrolled` : ""}</p>
                                </div>
                                <Link href={item.url} className="w-full inline-flex items-center justify-center gap-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-700 dark:hover:bg-emerald-700 text-slate-800 dark:text-slate-200 hover:text-white text-xs font-bold transition-all min-h-[44px]">
                                    Explore <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}
