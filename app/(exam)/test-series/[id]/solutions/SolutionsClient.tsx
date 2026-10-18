"use client"

import { useState, useMemo, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"
import { sanitizeReturnPath } from "@/lib/utils/return-path"
import {
    ChevronLeft,
    ChevronRight,
    Bookmark,
    CheckCircle,
    XCircle,
    MinusCircle,
    Play,
    BookOpen,
    ArrowLeft,
    Video,
    RotateCcw,
    Sparkles,
    Check,
    BarChart3,
    Target,
    Clock,
    LayoutGrid,
    X
} from "lucide-react"

function formatQuestionText(text: string): string {
    if (!text) return ""
    if (text.includes("\n")) return text
    return text
        .replace(/(\s)(1\.\s)/g, "\n\n$2")
        .replace(/(\s)(2\.\s)/g, "\n$2")
        .replace(/(\s)(3\.\s)/g, "\n$3")
        .replace(/(\s)(4\.\s)/g, "\n$4")
        .replace(/(\s)(Which of the statements)/gi, "\n\n$2")
}

interface SolutionQuestion {
    id: number
    textEn: string
    textHi?: string
    optionsEn: string[]
    optionsHi?: string[]
    correctOption: number // 0-based
    userSelected: number | null
    status: "CORRECT" | "WRONG" | "SKIPPED"
    topperAccuracy: number // percentage
    explanationEn: string
    explanationHi?: string
    videoUrl?: string
    subject: string
    topic: string
}

interface AttemptMeta {
    hasAttempted: boolean
    score: number
    totalMarks: number
    totalQs: number
    correct: number
    wrong: number
    skipped: number
    elapsed: number
    percentile?: number
    testTitle?: string
    testId?: string
    seriesId?: string
    testType?: string
    seriesSlug?: string
    quizSlug?: string
}

interface SolutionsClientProps {
    seriesId: string
    attemptId?: string
    testId?: string
    rawReturnPath?: string
}

export function SolutionsClient({
    seriesId,
    attemptId,
    testId,
    rawReturnPath,
}: SolutionsClientProps) {
    const router = useRouter()
    const { data: session, status } = useSession()
    const { openMobileAuth } = useMobileAuth()
    const isTeacherOrAdmin = (session?.user as any)?.role === "TEACHER" || (session?.user as any)?.role === "ADMIN"

    useEffect(() => {
        if (status === "unauthenticated") {
            const currentUrl = typeof window !== "undefined" ? window.location.href : ""
            openMobileAuth({ actionType: "login", callbackUrl: currentUrl })
        }
    }, [status, openMobileAuth])

    const [currentIdx, setCurrentIdx] = useState(0)
    const [filter, setFilter] = useState<"ALL" | "WRONG" | "SKIPPED" | "CORRECT" | "BOOKMARKED">("ALL")
    const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([])
    const [showVideo, setShowVideo] = useState(false)
    const [lang, setLang] = useState<"EN" | "HI">("EN")
    const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState(false)

    const [questions, setQuestions] = useState<SolutionQuestion[]>([])
    const [examTitle, setExamTitle] = useState<string>("Solutions & Explanations")
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [attemptMeta, setAttemptMeta] = useState<AttemptMeta>({
        hasAttempted: false,
        score: 0,
        totalMarks: 0,
        totalQs: 0,
        correct: 0,
        wrong: 0,
        skipped: 0,
        elapsed: 0,
    })

    const isCurrentAffairs =
        attemptMeta.testType === "CURRENT_AFFAIRS" ||
        attemptMeta.seriesSlug === "current-affairs-system-series" ||
        seriesId === "current-affairs-system-series"

    const isPyq =
        attemptMeta.testType === "PREVIOUS_YEAR" ||
        attemptMeta.seriesSlug === "pyq-system-series" ||
        seriesId === "pyq-system-series"

    const defaultBackUrl = isCurrentAffairs
        ? "/current-affairs-quizzes"
        : isPyq
        ? "/pyqs"
        : `/test-series/${seriesId}`

    const safeReturnPath = sanitizeReturnPath(rawReturnPath, defaultBackUrl)
    const backTitle = isCurrentAffairs
        ? "Back to Current Affairs Quizzes"
        : isPyq
        ? "Back to Previous Papers"
        : "Back to Test Series"

    const backLabel = isCurrentAffairs
        ? "Back to Quizzes"
        : isPyq
        ? "Back to Previous Papers"
        : "Back to Test Series"

    useEffect(() => {
        let isMounted = true

        async function fetchRealSolutions() {
            // Case 1: Student or Teacher with a submitted attempt
            if (attemptId) {
                try {
                    const res = await fetch(`/api/exam/attempt/${encodeURIComponent(attemptId)}/result`)
                    if (!res.ok) {
                        const json = await res.json().catch(() => null)
                        if (res.status === 401) throw new Error("Please sign in to view solutions.")
                        if (res.status === 403) throw new Error(json?.error || "Access denied. Solutions are only available for your own submitted attempts.")
                        if (res.status === 404) throw new Error("Attempt not found.")
                        if (res.status === 409) throw new Error("This attempt has not been submitted yet.")
                        throw new Error(json?.error || "Failed to load test solutions.")
                    }

                    const json = await res.json()
                    if (!json.data || !Array.isArray(json.data.questionAnalysis)) {
                        throw new Error("Invalid solutions payload received.")
                    }

                    const data = json.data
                    const optionKeys = ["A", "B", "C", "D"]
                    const mapped: SolutionQuestion[] = data.questionAnalysis.map((qa: any, idx: number) => {
                        const isAttempted = Boolean(qa.selectedOption)
                        const status: "CORRECT" | "WRONG" | "SKIPPED" = !isAttempted
                            ? "SKIPPED"
                            : qa.isCorrect
                            ? "CORRECT"
                            : "WRONG"

                        const userSelected = qa.selectedOption ? optionKeys.indexOf(qa.selectedOption) : null
                        const correctOption = qa.correctOption ? optionKeys.indexOf(qa.correctOption) : 0

                        return {
                            id: idx + 1,
                            textEn: qa.questionEn || "",
                            textHi: qa.questionHi || undefined,
                            optionsEn: qa.options && qa.options.length > 0 ? qa.options : ["Option A", "Option B", "Option C", "Option D"],
                            optionsHi: qa.optionsHi || undefined,
                            correctOption: correctOption >= 0 ? correctOption : 0,
                            userSelected: userSelected !== null && userSelected >= 0 ? userSelected : null,
                            status,
                            topperAccuracy: 85,
                            explanationEn: qa.explanationEn || "Detailed solution not provided.",
                            explanationHi: qa.explanationHi || undefined,
                            videoUrl: qa.videoUrl || undefined,
                            subject: qa.subject || "General Studies",
                            topic: qa.topic || "Core Syllabus",
                        }
                    })

                    if (!isMounted) return

                    setQuestions(mapped)
                    setExamTitle(data.test?.title ? `${data.test.title} — Solutions & Explanations` : "Solutions & Explanations")
                    setAttemptMeta({
                        hasAttempted: true,
                        score: data.score ?? 0,
                        totalMarks: data.totalMarks ?? 0,
                        totalQs: mapped.length,
                        correct: data.correctCount ?? 0,
                        wrong: data.wrongCount ?? 0,
                        skipped: data.skippedCount ?? 0,
                        elapsed: data.timeTakenSecs ?? 0,
                        percentile: data.percentile,
                        testTitle: data.test?.title,
                        testId: data.test?.id || data.testId,
                        seriesId: data.test?.seriesId || seriesId,
                        testType: data.testType || data.test?.testType,
                        seriesSlug: data.seriesSlug || data.test?.series?.slug,
                        quizSlug: data.quizSlug,
                    })
                    setIsLoading(false)
                } catch (err: any) {
                    if (isMounted) {
                        setError(err.message || "Failed to load solutions.")
                        setIsLoading(false)
                    }
                }
                return
            }

            // Case 2: Teacher or Admin previewing a test's solutions without requiring an attempt
            if (testId && isTeacherOrAdmin) {
                try {
                    const res = await fetch(`/api/exam/teacher/${encodeURIComponent(testId)}/questions`)
                    if (!res.ok) {
                        const json = await res.json().catch(() => null)
                        throw new Error(json?.error || "Failed to load authorized teacher solutions view.")
                    }
                    const json = await res.json()
                    const t = json.data?.test
                    if (!t) throw new Error("Invalid test data.")

                    const allQuestions: any[] = []
                    if (Array.isArray(t.sections)) {
                        for (const sec of t.sections) {
                            if (Array.isArray(sec.questions)) allQuestions.push(...sec.questions)
                        }
                    }

                    const optionKeys = ["A", "B", "C", "D"]
                    const mapped: SolutionQuestion[] = allQuestions.map((q, idx) => {
                        const optionsEn = [q.optionAEn, q.optionBEn, q.optionCEn, q.optionDEn].filter(Boolean)
                        const optionsHi = [q.optionAHi, q.optionBHi, q.optionCHi, q.optionDHi].filter(Boolean)
                        const correctOption = q.correctOption ? optionKeys.indexOf(q.correctOption) : 0

                        return {
                            id: idx + 1,
                            textEn: q.questionEn || "",
                            textHi: q.questionHi || undefined,
                            optionsEn: optionsEn.length > 0 ? optionsEn : ["Option A", "Option B", "Option C", "Option D"],
                            optionsHi: optionsHi.length > 0 ? optionsHi : undefined,
                            correctOption: correctOption >= 0 ? correctOption : 0,
                            userSelected: null,
                            status: "SKIPPED",
                            topperAccuracy: 85,
                            explanationEn: q.explanationEn || "Detailed solution not provided.",
                            explanationHi: q.explanationHi || undefined,
                            subject: q.subject || "General Studies",
                            topic: "Core Syllabus",
                        }
                    })

                    if (!isMounted) return
                    setQuestions(mapped)
                    setExamTitle(`${t.title || "Test"} — Faculty Solutions Master View`)
                    setAttemptMeta({
                        hasAttempted: false,
                        score: 0,
                        totalMarks: t.totalMarks || mapped.length,
                        totalQs: mapped.length,
                        correct: 0,
                        wrong: 0,
                        skipped: mapped.length,
                        elapsed: 0,
                        testTitle: t.title,
                        testId: t.id,
                        seriesId: t.seriesId || seriesId,
                    })
                    setIsLoading(false)
                } catch (err: any) {
                    if (isMounted) {
                        setError(err.message || "Failed to load solutions.")
                        setIsLoading(false)
                    }
                }
                return
            }

            // Case 3: Missing attempt for student
            if (isMounted) {
                setError(
                    "No submitted attempt found for this test. Solutions and answer keys are only accessible after an attempt has been completed and submitted."
                )
                setIsLoading(false)
            }
        }

        fetchRealSolutions()
        return () => {
            isMounted = false
        }
    }, [attemptId, seriesId, testId, isTeacherOrAdmin])

    const filteredQuestions = questions.filter((q) => {
        if (filter === "WRONG") return q.status === "WRONG"
        if (filter === "SKIPPED") return q.status === "SKIPPED"
        if (filter === "CORRECT") return q.status === "CORRECT"
        if (filter === "BOOKMARKED") return bookmarkedIds.includes(q.id)
        return true
    })

    const currentQ = filteredQuestions[currentIdx] || filteredQuestions[0] || questions[0]

    const toggleBookmark = (id: number) => {
        setBookmarkedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        )
    }

    const wrongCount = questions.filter((q) => q.status === "WRONG").length
    const correctCount = questions.filter((q) => q.status === "CORRECT").length
    const skippedCount = questions.filter((q) => q.status === "SKIPPED").length

    if (status === "unauthenticated" || (!session?.user && status !== "loading")) {
        return (
            <div className="h-[100dvh] w-full max-w-full flex flex-col items-center justify-center bg-gray-50 p-6" style={{ fontFamily: "sans-serif" }}>
                <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-200 space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
                        <BookOpen className="w-7 h-7" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900">Sign In to View Solutions</h2>
                    <p className="text-xs text-gray-600 leading-relaxed">
                        Please sign in with your mobile number to view detailed question explanations, correct answers, and analysis.
                    </p>
                    <button
                        onClick={() => {
                            const currentUrl = typeof window !== "undefined" ? window.location.href : ""
                            openMobileAuth({ actionType: "login", callbackUrl: currentUrl })
                        }}
                        className="w-full min-h-[44px] py-3 px-6 rounded-xl bg-gradient-to-r from-[#00A8FF] to-[#0096e6] text-white font-bold text-sm shadow-md hover:shadow-[#00A8FF]/25 transition-all cursor-pointer"
                    >
                        Sign In with Mobile OTP
                    </button>
                </div>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="h-[100dvh] w-full max-w-full flex flex-col items-center justify-center bg-gray-50 gap-4" style={{ fontFamily: "sans-serif" }}>
                <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-bold text-gray-700">Loading solutions &amp; explanations...</p>
            </div>
        )
    }

    if (error || !questions || questions.length === 0) {
        return (
            <div className="h-[100dvh] w-full max-w-full flex flex-col items-center justify-center bg-gray-50 p-6" style={{ fontFamily: "sans-serif" }}>
                <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-200">
                    <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                        <XCircle className="w-7 h-7" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Solutions Not Available</h2>
                    <p className="text-xs text-gray-600 mb-6 leading-relaxed">
                        {error || "No submitted attempt found for this test. Solutions and answer keys are only accessible after an attempt has been completed and submitted."}
                    </p>
                    <button
                        onClick={() => router.push(safeReturnPath)}
                        className="min-h-[44px] px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition-colors cursor-pointer"
                    >
                        {backLabel}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-[100dvh] w-full max-w-full flex flex-col bg-white overflow-hidden" style={{ fontFamily: "sans-serif" }}>
            {/* ── TOP HEADER ────────────────────────────────────────── */}
            <header className="flex items-center justify-between px-3 sm:px-5 py-2 border-b border-gray-200 bg-white shrink-0 min-h-[52px]">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <button
                        onClick={() => {
                            if (rawReturnPath) {
                                router.push(safeReturnPath)
                            } else if (typeof window !== "undefined" && window.history.length > 1) {
                                router.back()
                            } else {
                                router.push(defaultBackUrl)
                            }
                        }}
                        className="min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                        title={backTitle}
                        aria-label={backTitle}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <span className="hidden xs:inline-block px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-black uppercase bg-[#00A8FF]/15 text-[#00A8FF] shrink-0">
                            SOLUTIONS
                        </span>
                        <div className="hidden xs:block w-px h-4 bg-gray-300 shrink-0" />
                        <span className="text-xs font-bold text-gray-800 truncate max-w-[130px] sm:max-w-xs md:max-w-md">
                            {examTitle}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {/* Language Switch */}
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden text-xs font-bold">
                        <button
                            onClick={() => setLang("EN")}
                            className={`min-h-[36px] sm:min-h-[40px] px-2.5 sm:px-3 py-1 cursor-pointer transition-colors ${lang === "EN" ? "bg-[#0ea5e9] text-white" : "bg-white text-gray-600"}`}
                        >
                            EN
                        </button>
                        <button
                            onClick={() => setLang("HI")}
                            className={`min-h-[36px] sm:min-h-[40px] px-2.5 sm:px-3 py-1 cursor-pointer transition-colors ${lang === "HI" ? "bg-[#0ea5e9] text-white" : "bg-white text-gray-600"}`}
                        >
                            HI
                        </button>
                    </div>

                    {attemptMeta.hasAttempted && attemptId && (
                        <Link
                            href={`/test-series/${attemptMeta.seriesId || seriesId}/result?attemptId=${encodeURIComponent(attemptId)}${rawReturnPath ? `&returnPath=${encodeURIComponent(rawReturnPath)}` : ""}`}
                            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 text-xs font-bold hover:bg-purple-100 transition-colors min-h-[40px]"
                        >
                            <BarChart3 className="h-3.5 w-3.5" />
                            <span>Detailed Analytics</span>
                        </Link>
                    )}

                    {attemptMeta.testId && (
                        <Link
                            href={isCurrentAffairs
                                ? `/current-affairs-quizzes/${encodeURIComponent(attemptMeta.quizSlug || attemptMeta.testId)}/instructions`
                                : `/test-series/${attemptMeta.seriesId || seriesId}/declaration?testId=${encodeURIComponent(attemptMeta.testId)}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors min-h-[36px] sm:min-h-[40px]"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span className="hidden xs:inline">Re-attempt</span>
                        </Link>
                    )}
                </div>
            </header>

            {/* ── FILTER CHIPS BAR ──────────────────────────────────── */}
            <div className="flex items-center gap-2 px-5 py-2 bg-gray-50 border-b border-gray-200 overflow-x-auto shrink-0">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">Filter:</span>

                <button
                    onClick={() => { setFilter("ALL"); setCurrentIdx(0); }}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        filter === "ALL" ? "bg-gray-900 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-100"
                    }`}
                >
                    All Questions ({questions.length})
                </button>

                <button
                    onClick={() => { setFilter("WRONG"); setCurrentIdx(0); }}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        filter === "WRONG"
                            ? "bg-red-500 text-white shadow-xs"
                            : "bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"
                    }`}
                >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Mistake Notebook ({wrongCount})</span>
                </button>

                <button
                    onClick={() => { setFilter("SKIPPED"); setCurrentIdx(0); }}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        filter === "SKIPPED"
                            ? "bg-amber-500 text-white shadow-xs"
                            : "bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-100"
                    }`}
                >
                    <MinusCircle className="h-3.5 w-3.5" />
                    <span>Skipped ({skippedCount})</span>
                </button>

                <button
                    onClick={() => { setFilter("CORRECT"); setCurrentIdx(0); }}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        filter === "CORRECT"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                    }`}
                >
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Correct ({correctCount})</span>
                </button>

                <button
                    onClick={() => { setFilter("BOOKMARKED"); setCurrentIdx(0); }}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        filter === "BOOKMARKED"
                            ? "bg-purple-600 text-white shadow-xs"
                            : "bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100"
                    }`}
                >
                    <Bookmark className="h-3.5 w-3.5" />
                    <span>Bookmarked ({bookmarkedIds.length})</span>
                </button>
            </div>

            {/* ── STUDENT PERFORMANCE / MODE RIBBON ─────────────────── */}
            {attemptMeta.hasAttempted ? (
                <div className="flex items-center justify-between px-5 py-2.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-900/50 text-xs shrink-0 flex-wrap gap-2 shadow-xs">
                    <div className="flex items-center gap-3">
                        <span className="font-extrabold uppercase tracking-wider text-[11px] text-teal-400 flex items-center gap-1.5">
                            <Target className="h-3.5 w-3.5" /> Student Attempt:
                        </span>
                        <span className="bg-white/10 px-2.5 py-0.5 rounded-full font-bold">
                            Score: <strong className="text-emerald-400">{attemptMeta.score.toFixed(2)}</strong> / {attemptMeta.totalMarks}
                        </span>
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                            ✓ {attemptMeta.correct} Correct
                        </span>
                        <span className="bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded font-bold">
                            ✗ {attemptMeta.wrong} Wrong
                        </span>
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-bold">
                            ○ {attemptMeta.skipped} Skipped
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-[11px] flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Time: {Math.floor(attemptMeta.elapsed / 60)}m {attemptMeta.elapsed % 60}s
                        </span>
                        <Link
                            href={`/test-series/${seriesId}/result?attemptId=${encodeURIComponent(attemptId || "")}${rawReturnPath ? `&returnPath=${encodeURIComponent(rawReturnPath)}` : ""}`}
                            className="text-[11px] font-bold text-sky-300 hover:text-sky-200 underline underline-offset-2 flex items-center gap-1"
                        >
                            View Leaderboard &amp; Report →
                        </Link>
                    </div>
                </div>
            ) : null}

            {/* ── MAIN BODY ─────────────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left/Center: Question + Detailed Solution */}
                <main className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 pb-24 lg:pb-8">
                    {filteredQuestions.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 space-y-3">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                <CheckCircle className="h-6 w-6" />
                            </div>
                            <h3 className="text-base font-bold text-gray-800">
                                {filter === "WRONG" ? "No Incorrect Questions!" : "No Questions Under This Filter"}
                            </h3>
                            <p className="text-xs text-gray-500 max-w-sm">
                                {filter === "WRONG"
                                    ? "Congratulations! You did not mark any question incorrectly under this paper."
                                    : "Try selecting a different filter category to inspect your questions and solutions."}
                            </p>
                            <button
                                onClick={() => { setFilter("ALL"); setCurrentIdx(0); }}
                                className="min-h-[44px] px-4 py-2 bg-[#0ea5e9] text-white rounded-lg text-xs font-bold hover:bg-[#0284c7] transition-colors cursor-pointer"
                            >
                                View All Questions
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Question Header Meta */}
                            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <span className="text-base font-extrabold text-gray-900">
                                        Question No. {currentQ.id}
                                    </span>
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1 border ${
                                            currentQ.status === "CORRECT"
                                                ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                                                : currentQ.status === "WRONG"
                                                ? "bg-red-100 border-red-300 text-red-800"
                                                : "bg-gray-100 border-gray-300 text-gray-700"
                                        }`}
                                    >
                                        {currentQ.status === "CORRECT" ? (
                                             <>
                                                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                                                <span>✓ Correct (+1.00)</span>
                                            </>
                                        ) : currentQ.status === "WRONG" ? (
                                            <>
                                                <XCircle className="h-3.5 w-3.5 text-red-600" />
                                                <span>✗ Incorrect (-0.33)</span>
                                            </>
                                        ) : (
                                            <>
                                                <MinusCircle className="h-3.5 w-3.5 text-gray-500" />
                                                <span>○ Unattempted (0.00)</span>
                                            </>
                                        )}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-semibold text-gray-400">
                                        Topper Accuracy: <strong className="text-emerald-600">{currentQ.topperAccuracy}%</strong>
                                    </span>

                                    <button
                                        onClick={() => toggleBookmark(currentQ.id)}
                                        className={`p-2 rounded-xl border transition-colors ${
                                            bookmarkedIds.includes(currentQ.id)
                                                ? "bg-purple-50 border-purple-300 text-purple-600"
                                                : "border-gray-200 text-gray-400 hover:text-gray-700"
                                        }`}
                                        title="Bookmark question"
                                    >
                                        <Bookmark className={`h-4 w-4 ${bookmarkedIds.includes(currentQ.id) ? "fill-current" : ""}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Student Attempt Verdict Banner */}
                            {attemptMeta.hasAttempted && (
                                <div className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between ${
                                    currentQ.status === "CORRECT"
                                        ? "bg-emerald-50/90 border-emerald-200 text-emerald-950"
                                        : currentQ.status === "WRONG"
                                        ? "bg-red-50/90 border-red-200 text-red-950"
                                        : "bg-slate-50 border-slate-200 text-slate-700"
                                }`}>
                                    <div className="flex items-center gap-2.5">
                                        {currentQ.status === "CORRECT" && (
                                            <>
                                                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                                    <Check className="h-3.5 w-3.5" />
                                                </div>
                                                <span>
                                                    You marked <strong>Option {["A", "B", "C", "D"][currentQ.userSelected!]}</strong> which is the <strong>Correct Answer</strong>! (+1.00 Mark)
                                                </span>
                                            </>
                                        )}
                                        {currentQ.status === "WRONG" && (
                                            <>
                                                <div className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0">
                                                    <XCircle className="h-3.5 w-3.5" />
                                                </div>
                                                <span>
                                                    You marked <strong>Option {["A", "B", "C", "D"][currentQ.userSelected!]}</strong> (Incorrect). The correct answer is <strong>Option {["A", "B", "C", "D"][currentQ.correctOption]}</strong>. (-0.33 Negative Mark)
                                                </span>
                                            </>
                                        )}
                                        {currentQ.status === "SKIPPED" && (
                                            <>
                                                <div className="w-5 h-5 rounded-full bg-gray-400 text-white flex items-center justify-center shrink-0">
                                                    <MinusCircle className="h-3.5 w-3.5" />
                                                </div>
                                                <span>
                                                    You skipped this question during the exam. The correct answer is <strong>Option {["A", "B", "C", "D"][currentQ.correctOption]}</strong>.
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Question Content */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-bold">
                                        {currentQ.subject}
                                    </span>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-xs text-gray-400 font-medium">{currentQ.topic}</span>
                                </div>

                                <p className="text-sm font-semibold text-gray-900 leading-relaxed whitespace-pre-line">
                                    {formatQuestionText(lang === "HI" && currentQ.textHi ? currentQ.textHi : currentQ.textEn)}
                                </p>
                            </div>

                            {/* Options list with exact student attempt indicators */}
                            <div className="space-y-3 max-w-2xl">
                                {(lang === "HI" && currentQ.optionsHi ? currentQ.optionsHi : currentQ.optionsEn).map((opt, i) => {
                                    const isCorrect = currentQ.correctOption === i
                                    const isUserSelected = currentQ.userSelected === i
                                    const isUserWrong = isUserSelected && !isCorrect
                                    const isUserRight = isUserSelected && isCorrect

                                    return (
                                        <div
                                            key={i}
                                            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all shadow-xs ${
                                                isUserRight
                                                    ? "border-emerald-500 bg-emerald-50/80 text-emerald-950 font-bold"
                                                    : isUserWrong
                                                    ? "border-red-400 bg-red-50/80 text-red-950 font-medium"
                                                    : isCorrect
                                                    ? "border-emerald-400 bg-emerald-50/40 text-emerald-950 font-semibold"
                                                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                                        isUserRight
                                                            ? "bg-emerald-600 text-white"
                                                            : isUserWrong
                                                            ? "bg-red-500 text-white"
                                                            : isCorrect
                                                            ? "bg-emerald-100 text-emerald-800 border border-emerald-400"
                                                            : "bg-gray-100 text-gray-600"
                                                    }`}
                                                >
                                                    {["A", "B", "C", "D"][i]}
                                                </div>
                                                <span className="text-sm leading-snug">{opt}</span>
                                            </div>

                                            <div className="shrink-0 ml-3">
                                                {isUserRight && (
                                                    <span className="px-2.5 py-1 rounded-md bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                                                        <CheckCircle className="h-3.5 w-3.5" /> Your Answer (Correct)
                                                    </span>
                                                )}
                                                {isUserWrong && (
                                                    <span className="px-2.5 py-1 rounded-md bg-red-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                                                        <XCircle className="h-3.5 w-3.5" /> Your Answer (Incorrect)
                                                    </span>
                                                )}
                                                {isCorrect && !isUserSelected && (
                                                    <span className="px-2.5 py-1 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                                        <Check className="h-3.5 w-3.5 text-emerald-600" /> Correct Answer
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* ── DETAILED EXPLANATION CARD ─────────────────────── */}
                            <div className="bg-gradient-to-br from-blue-50/60 to-indigo-50/40 rounded-2xl border border-blue-100 p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="h-5 w-5 text-[#00A8FF]" />
                                        <h3 className="text-sm font-extrabold text-gray-900">
                                            Detailed Step-by-Step Solution &amp; Analysis
                                        </h3>
                                    </div>

                                    {currentQ.videoUrl && (
                                        <button
                                            onClick={() => setShowVideo(!showVideo)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors"
                                        >
                                            <Video className="h-3.5 w-3.5" />
                                            <span>{showVideo ? "Hide Video" : "Watch Video Solution"}</span>
                                        </button>
                                    )}
                                </div>

                                {showVideo && (
                                    <div className="aspect-video w-full rounded-xl bg-black overflow-hidden shadow-lg">
                                        <iframe
                                            className="w-full h-full"
                                            src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
                                            title="Teacher Video Solution"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    </div>
                                )}

                                <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line font-medium bg-white/80 p-5 rounded-xl border border-blue-100/80">
                                    {lang === "HI" && currentQ.explanationHi ? currentQ.explanationHi : currentQ.explanationEn}
                                </div>
                            </div>
                        </>
                    )}
                </main>

                {/* Right: Question Navigation Palette (Desktop lg:flex) */}
                <aside className="hidden lg:flex w-64 border-l border-gray-200 bg-white flex-col shrink-0">
                    <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Questions ({filteredQuestions.length})
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Right
                            <span className="w-2 h-2 rounded-full bg-red-500 inline-block ml-1" /> Wrong
                            <span className="w-2 h-2 rounded-full bg-gray-300 inline-block ml-1" /> Skip
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3">
                        <div className="grid grid-cols-4 gap-2">
                            {filteredQuestions.map((q, idx) => {
                                const isCur = idx === currentIdx
                                const isWrong = q.status === "WRONG"
                                const isCorrect = q.status === "CORRECT"
                                const isBookmarked = bookmarkedIds.includes(q.id)

                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => setCurrentIdx(idx)}
                                        className={`relative aspect-square rounded-lg text-xs font-extrabold flex items-center justify-center transition-all cursor-pointer ${
                                            isCur
                                                ? "ring-2 ring-[#0ea5e9] ring-offset-2 scale-105"
                                                : "hover:opacity-90"
                                        } ${
                                            isCorrect
                                                ? "bg-emerald-500 text-white"
                                                : isWrong
                                                ? "bg-red-500 text-white"
                                                : "bg-gray-200 text-gray-700"
                                        }`}
                                    >
                                        {q.id}
                                        {isBookmarked && (
                                            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-purple-400 ring-1 ring-white" />
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Bottom nav buttons */}
                    <div className="p-3 border-t border-gray-200 grid grid-cols-2 gap-2">
                        <button
                            disabled={currentIdx === 0}
                            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                            className="min-h-[44px] py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40 flex items-center justify-center gap-1 cursor-pointer"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Prev
                        </button>
                        <button
                            disabled={currentIdx >= filteredQuestions.length - 1}
                            onClick={() => setCurrentIdx((i) => Math.min(filteredQuestions.length - 1, i + 1))}
                            className="min-h-[44px] py-2 rounded-lg bg-[#0ea5e9] text-white text-xs font-bold hover:bg-[#0284c7] disabled:opacity-40 flex items-center justify-center gap-1 cursor-pointer"
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </aside>
            </div>

            {/* ── MOBILE BOTTOM NAV BAR (lg:hidden) ────────────────── */}
            <nav
                className="lg:hidden fixed inset-x-0 bottom-0 z-30 bg-white border-t border-gray-200 px-3 py-2 flex items-center justify-between gap-2 shadow-lg"
                style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
            >
                <button
                    disabled={currentIdx === 0}
                    onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Prev</span>
                </button>

                <button
                    onClick={() => setIsMobilePaletteOpen(true)}
                    className="min-h-[44px] flex-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                    <LayoutGrid className="h-4 w-4 text-teal-600" />
                    <span>Q {currentQ ? currentQ.id : currentIdx + 1} ({currentIdx + 1}/{filteredQuestions.length})</span>
                </button>

                <button
                    disabled={currentIdx >= filteredQuestions.length - 1}
                    onClick={() => setCurrentIdx((i) => Math.min(filteredQuestions.length - 1, i + 1))}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0ea5e9] text-white text-xs font-bold hover:bg-[#0284c7] disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                </button>
            </nav>

            {/* ── MOBILE PALETTE BOTTOM SHEET (lg:hidden) ───────────── */}
            {isMobilePaletteOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div
                        className="fixed inset-0"
                        onClick={() => setIsMobilePaletteOpen(false)}
                    />
                    <div className="relative z-10 bg-white rounded-t-3xl max-h-[75dvh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-250">
                        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto my-2.5 shrink-0" />

                        <div className="px-5 py-2.5 border-b border-gray-100 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-sm font-extrabold text-gray-900">Question Palette</h3>
                                <p className="text-[11px] text-gray-500">{filteredQuestions.length} Questions in current filter</p>
                            </div>
                            <button
                                onClick={() => setIsMobilePaletteOpen(false)}
                                className="min-w-[44px] min-h-[44px] rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 cursor-pointer"
                                aria-label="Close question palette"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-around text-xs font-bold text-gray-600 shrink-0">
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Right</span>
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Wrong</span>
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-300" /> Skipped</span>
                        </div>

                        <div
                            className="flex-1 overflow-y-auto p-4"
                            style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
                        >
                            <div className="grid grid-cols-5 xs:grid-cols-6 sm:grid-cols-8 gap-2.5">
                                {filteredQuestions.map((q, idx) => {
                                    const isCur = idx === currentIdx
                                    const isWrong = q.status === "WRONG"
                                    const isCorrect = q.status === "CORRECT"
                                    const isBookmarked = bookmarkedIds.includes(q.id)

                                    return (
                                        <button
                                            key={q.id}
                                            onClick={() => {
                                                setCurrentIdx(idx)
                                                setIsMobilePaletteOpen(false)
                                            }}
                                            className={`relative min-h-[44px] min-w-[44px] aspect-square rounded-xl text-xs font-extrabold flex items-center justify-center transition-all cursor-pointer ${
                                                isCur
                                                    ? "ring-2 ring-[#0ea5e9] ring-offset-2 scale-105"
                                                    : "active:scale-95"
                                            } ${
                                                isCorrect
                                                    ? "bg-emerald-500 text-white shadow-xs"
                                                    : isWrong
                                                    ? "bg-red-500 text-white shadow-xs"
                                                    : "bg-gray-100 border border-gray-200 text-gray-700"
                                            }`}
                                        >
                                            {q.id}
                                            {isBookmarked && (
                                                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-purple-400 ring-1 ring-white" />
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
