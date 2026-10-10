"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"
import {
    Sparkles,
    Search,
    Clock,
    FileQuestion,
    Award,
    Plus,
    Flame,
    CheckCircle2,
    Calendar,
    ChevronRight,
    Languages,
    BookOpen,
    Filter,
    LogIn,
} from "lucide-react"
import { TestActionButton } from "@/components/test-series/TestActionButton"
import { useGoal } from "@/components/providers/GoalProvider"
import { GoalSelectorBar } from "@/components/goals/GoalSelectorBar"
import { applyQuizGoalFilter } from "@/lib/goals/goal-filters"

interface QuizItem {
    id: string
    seriesId: string
    title: string
    titleHi?: string
    category: string
    testType?: string
    questions: number
    marks: number
    durationMinutes: number
    languages: string
    isFree: boolean
    attempts?: number
    isNew?: boolean
    isTeacherAuthored?: boolean
    tags?: string[]
}

export default function CurrentAffairsQuizzesClient() {
    const { data: session } = useSession()
    const { selectedGoal, selectedGoals, selectedGoalIds } = useGoal()
    const { openMobileAuth } = useMobileAuth()
    const [dbQuizzes, setDbQuizzes] = useState<QuizItem[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [activeFilter, setActiveFilter] = useState<"all" | "daily" | "weekly" | "special">("all")
    const [isLoading, setIsLoading] = useState(true)

    const isTeacherOrAdmin = session?.user?.role === "TEACHER" || session?.user?.role === "ADMIN"
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

    // Load from database API
    useEffect(() => {
        async function fetchDbQuizzes() {
            try {
                const res = await fetch("/api/exam/test/list?category=Current%20Affairs")
                if (res.ok) {
                    const json = await res.json()
                    if (json.data && Array.isArray(json.data)) {
                        setDbQuizzes(
                            json.data.map((t: any) => ({
                                id: t.id,
                                seriesId: t.seriesSlug || t.seriesId,
                                title: t.title,
                                titleHi: t.titleHi,
                                category: t.category,
                                testType: t.testType,
                                questions: t.questions,
                                marks: t.marks,
                                durationMinutes: t.durationMinutes,
                                languages: t.languages,
                                isFree: t.isFree,
                                attempts: t.attempts,
                            }))
                        )
                    }
                }
            } catch (err) {
                console.warn("Could not fetch DB quizzes", err)
            } finally {
                setIsLoading(false)
            }
        }
        fetchDbQuizzes()
    }, [selectedGoalIds])

    const allQuizzes = dbQuizzes

    // Filter by tab, search, and active goals
    const filteredQuizzes = useMemo(() => {
        const goalFiltered = selectedGoalIds.length > 0
            ? applyQuizGoalFilter(allQuizzes, selectedGoalIds)
            : allQuizzes

        return goalFiltered.filter((q) => {
            const matchesSearch =
                !searchQuery ||
                q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (q.titleHi && q.titleHi.includes(searchQuery))

            if (!matchesSearch) return false

            if (activeFilter === "daily") {
                return q.title.toLowerCase().includes("daily") || q.title.toLowerCase().includes("speed")
            }
            if (activeFilter === "weekly") {
                return q.title.toLowerCase().includes("weekly") || q.testType === "WEEKLY_QUIZ"
            }
            if (activeFilter === "special") {
                return (
                    q.title.toLowerCase().includes("special") ||
                    q.title.toLowerCase().includes("budget") ||
                    q.title.toLowerCase().includes("bpsc")
                )
            }
            return true
        })
    }, [allQuizzes, searchQuery, activeFilter, selectedGoalIds])

    return (
        <div className="space-y-8 pb-16">
            {/* Top Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#003B73] via-[#005B96] to-[#00A896] text-white p-6 sm:p-8 shadow-xl">
                <div className="absolute top-0 right-0 w-80 h-80 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 left-1/3 w-60 h-60 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs border border-white/20 text-xs font-bold uppercase tracking-wider text-teal-200">
                            <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" />
                            <span>Daily &amp; Weekly High-Yield Mocks</span>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                            Current Affairs &amp; Quizzes
                        </h1>
                        <p className="text-sm text-white/85 leading-relaxed">
                            Sharpen your general awareness with daily news speed tests, monthly editorial compilations, and bilingual practice quizzes tailored for UPSC, BPSC, SSC, and State PSC examinations.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                        {isTeacherOrAdmin && (
                            <Link
                                href="/admin/test-series/create"
                                className="px-5 py-3 rounded-2xl bg-white text-teal-800 font-bold text-xs sm:text-sm hover:bg-teal-50 transition-all shadow-md flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4 text-teal-600" />
                                <span>Create CA Quiz</span>
                            </Link>
                        )}
                        <Link
                            href="/my-tests"
                            onClick={(e) => handleAuthAction(e, "/test-series/my-tests")}
                            className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 backdrop-blur-xs"
                        >
                            <Award className="w-4 h-4 text-amber-300" />
                            <span>My Quiz History</span>
                        </Link>
                    </div>
                </div>

                {/* Key Metrics Pill Bar */}
                <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-1 gap-4 text-center">
                    <div>
                        <span className="text-xl sm:text-2xl font-black text-white">{allQuizzes.length}</span>
                        <p className="text-[11px] text-white/70 uppercase font-semibold">Quizzes from the database</p>
                    </div>
                </div>
            </div>

            {/* Shared Goal & Exam Target Bar */}
            <GoalSelectorBar
                title="Target Exams & Quizzes"
                subtitle="Showing daily and weekly quizzes matching your active targets"
            />

            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-gray-200/80 dark:border-gray-800 pb-4">
                {/* Horizontal Category Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    {[
                        { id: "all", label: "All Quizzes" },
                        { id: "daily", label: "Daily Speed Tests" },
                        { id: "weekly", label: "Weekly Roundups" },
                        { id: "special", label: "State & Economy Specials" },
                    ].map((tab) => {
                        const isSelected = activeFilter === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveFilter(tab.id as any)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                                    isSelected
                                        ? "bg-teal-600 text-white shadow-xs"
                                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                                }`}
                            >
                                {tab.label}
                            </button>
                        )
                    })}
                </div>

                {/* Search Input */}
                <div className="relative w-full md:w-80 shrink-0">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search current affairs quizzes…"
                        className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#05192D] text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                </div>
            </div>

            {/* Quizzes Grid */}
            {isLoading ? <div className="py-12 text-center text-sm text-gray-500">Loading quizzes…</div> : filteredQuizzes.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-[#05192D] rounded-3xl border border-gray-200 dark:border-gray-800 p-8 space-y-3">
                    <FileQuestion className="w-12 h-12 text-gray-400 mx-auto" />
                    <h3 className="font-extrabold text-gray-900 dark:text-white text-base">No quizzes available yet</h3>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                        No current affairs quizzes match your current filter or search query. Try changing filters or search terms.
                    </p>
                    <button
                        onClick={() => {
                            setActiveFilter("all")
                            setSearchQuery("")
                        }}
                        className="mt-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold"
                    >
                        Reset Filters
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredQuizzes.map((quiz) => {
                        const targetSeriesId = quiz.seriesId
                        if (!targetSeriesId) return null
                        const attemptHref = `/test-series/${targetSeriesId}/instructions?testId=${quiz.id}&title=${encodeURIComponent(
                            quiz.title
                        )}&questions=${quiz.questions}&marks=${quiz.marks}&duration=${quiz.durationMinutes}`

                            return (
                            <div
                                key={quiz.id}
                                data-testid="current-affairs-quiz-card"
                                className="group relative bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-teal-500/50 shadow-xs hover:shadow-xl transition-all duration-300 p-5 flex flex-col justify-between"
                            >
                                <div className="space-y-3">
                                    {/* Top Tags Row */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {quiz.isTeacherAuthored ? (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                                    Faculty Authored
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                                                    Current Affairs
                                                </span>
                                            )}
                                            {quiz.isFree && (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                                    Free
                                                </span>
                                            )}
                                        </div>

                                        <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                            <Languages className="w-3 h-3" />
                                            <span>En / हिं</span>
                                        </span>
                                    </div>

                                    {/* Quiz Title */}
                                    <div>
                                        <h3 className="font-extrabold text-base text-gray-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-2 leading-snug">
                                            {quiz.title}
                                        </h3>
                                        {quiz.titleHi && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                                                {quiz.titleHi}
                                            </p>
                                        )}
                                    </div>

                                    {/* Meta Row: Questions, Time, Marks */}
                                    <div className="pt-2 grid grid-cols-3 gap-2 py-2 border-y border-gray-100 dark:border-gray-800/80 text-center">
                                        <div>
                                            <span className="text-xs font-black text-gray-800 dark:text-gray-200">
                                                {quiz.questions}
                                            </span>
                                            <p className="text-[10px] text-gray-400 uppercase font-semibold">Questions</p>
                                        </div>
                                        <div>
                                            <span className="text-xs font-black text-gray-800 dark:text-gray-200">
                                                {quiz.durationMinutes}m
                                            </span>
                                            <p className="text-[10px] text-gray-400 uppercase font-semibold">Time</p>
                                        </div>
                                        <div>
                                            <span className="text-xs font-black text-gray-800 dark:text-gray-200">
                                                {quiz.marks}
                                            </span>
                                            <p className="text-[10px] text-gray-400 uppercase font-semibold">Marks</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Action */}
                                <div className="mt-5 pt-3 flex items-center justify-between gap-3">
                                    <span className="text-[11px] font-semibold text-gray-400">
                                        {typeof quiz.attempts === "number" ? `${quiz.attempts.toLocaleString()} attempted` : null}
                                    </span>
                                    <TestActionButton
                                        testId={quiz.id}
                                        seriesId={targetSeriesId}
                                        testTitle={quiz.title}
                                        returnPath="/quizzes"
                                        size="sm"
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
