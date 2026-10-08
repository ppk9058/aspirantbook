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

const CURATED_CA_QUIZZES: QuizItem[] = [
    {
        id: "ca-national-sep26",
        seriesId: "current-affairs-quizzes",
        title: "National & International Current Affairs Weekly Quiz (Sept 2026)",
        titleHi: "राष्ट्रीय एवं अंतर्राष्ट्रीय समसामयिकी साप्ताहिक क्विज (सितम्बर 2026)",
        category: "Current Affairs Quizzes",
        testType: "WEEKLY_QUIZ",
        questions: 10,
        marks: 20,
        durationMinutes: 15,
        languages: "English, Hindi",
        isFree: true,
        attempts: 1450,
        isNew: true,
        tags: ["national", "international", "weekly"],
    },
    {
        id: "ca-economy-budget",
        seriesId: "current-affairs-quizzes",
        title: "Economic Survey, Union Budget & RBI Monetary Policy Quiz",
        titleHi: "आर्थिक सर्वेक्षण, केंद्रीय बजट एवं आरबीआई मौद्रिक नीति क्विज",
        category: "Current Affairs Quizzes",
        testType: "SPECIAL_QUIZ",
        questions: 15,
        marks: 30,
        durationMinutes: 20,
        languages: "English, Hindi",
        isFree: true,
        attempts: 2190,
        isNew: false,
        tags: ["economy", "budget", "rbi"],
    },
    {
        id: "ca-bihar-special",
        seriesId: "current-affairs-quizzes",
        title: "72nd BPSC Current Affairs & Bihar Special Speed Test",
        titleHi: "72वीं बीपीएससी समसामयिकी एवं बिहार विशेष स्पीड टेस्ट",
        category: "Current Affairs Quizzes",
        testType: "STATE_SPECIAL",
        questions: 15,
        marks: 30,
        durationMinutes: 20,
        languages: "English, Hindi",
        isFree: true,
        attempts: 3820,
        isNew: true,
        tags: ["bpsc", "state", "bihar"],
    },
    {
        id: "ca-environment-scitech",
        seriesId: "current-affairs-quizzes",
        title: "Science, Tech, Defense & Climate Action Current Affairs",
        titleHi: "विज्ञान, प्रौद्योगिकी, रक्षा एवं पर्यावरण समसामयिकी क्विज",
        category: "Current Affairs Quizzes",
        testType: "TOPIC_TEST",
        questions: 10,
        marks: 20,
        durationMinutes: 15,
        languages: "English, Hindi",
        isFree: true,
        attempts: 980,
        isNew: false,
        tags: ["science", "defense", "environment"],
    },
]

export default function CurrentAffairsQuizzesClient() {
    const { data: session } = useSession()
    const { selectedGoal, selectedGoals, selectedGoalIds } = useGoal()
    const { openMobileAuth } = useMobileAuth()
    const [dbQuizzes, setDbQuizzes] = useState<QuizItem[]>([])
    const [localQuizzes, setLocalQuizzes] = useState<QuizItem[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [activeFilter, setActiveFilter] = useState<"all" | "daily" | "weekly" | "special" | "teacher">("all")
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
                                seriesId: t.seriesSlug || t.seriesId || "current-affairs-quizzes",
                                title: t.title,
                                titleHi: t.titleHi,
                                category: t.category || "Current Affairs Quizzes",
                                testType: t.testType,
                                questions: t.questions,
                                marks: t.marks,
                                durationMinutes: t.durationMinutes,
                                languages: t.languages || "English, Hindi",
                                isFree: t.isFree,
                                attempts: t.attempts || 120,
                                isNew: true,
                                tags: ["daily", "news"],
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

    // Load custom teacher-authored quizzes from localStorage
    useEffect(() => {
        try {
            const raw = localStorage.getItem("ts_custom_tests")
            if (raw) {
                const parsed = JSON.parse(raw)
                const caTests = parsed.filter(
                    (t: any) =>
                        (t.category || "").toLowerCase().includes("current affair") ||
                        (t.title || "").toLowerCase().includes("current affair") ||
                        (t.title || "").toLowerCase().includes("quiz")
                )
                setLocalQuizzes(
                    caTests.map((t: any) => ({
                        id: t.id,
                        seriesId: t.seriesId || "current-affairs-quizzes",
                        title: t.title,
                        titleHi: t.titleHi,
                        category: t.category || "Current Affairs Quizzes",
                        questions: t.questions || (t.questionsList ? t.questionsList.length : 5),
                        marks: t.marks || (t.questionsList ? t.questionsList.length : 5),
                        durationMinutes: t.durationMinutes || 10,
                        languages: t.languages || "English, Hindi",
                        isFree: t.isFree !== false,
                        attempts: t.attempts || 0,
                        isNew: true,
                        isTeacherAuthored: true,
                        tags: ["teacher", "daily"],
                    }))
                )
            }
        } catch (e) {
            console.warn("Could not parse local custom tests", e)
        }
    }, [])

    // Combine all sources, deduplicating by ID
    const allQuizzes = useMemo(() => {
        const map = new Map<string, QuizItem>()

        // 1. Curated defaults
        CURATED_CA_QUIZZES.forEach((q) => map.set(q.id, q))

        // 2. Database tests
        dbQuizzes.forEach((q) => map.set(q.id, q))

        // 3. LocalStorage tests (highest priority for newly created tests)
        localQuizzes.forEach((q) => map.set(q.id, q))

        return Array.from(map.values())
    }, [dbQuizzes, localQuizzes])

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
            if (activeFilter === "teacher") {
                return q.isTeacherAuthored === true
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
                <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div>
                        <span className="text-xl sm:text-2xl font-black text-white">{allQuizzes.length}</span>
                        <p className="text-[11px] text-white/70 uppercase font-semibold">Active Quizzes</p>
                    </div>
                    <div>
                        <span className="text-xl sm:text-2xl font-black text-teal-200">100% Free</span>
                        <p className="text-[11px] text-white/70 uppercase font-semibold">Public Access</p>
                    </div>
                    <div>
                        <span className="text-xl sm:text-2xl font-black text-white">Bilingual</span>
                        <p className="text-[11px] text-white/70 uppercase font-semibold">English &amp; Hindi</p>
                    </div>
                    <div>
                        <span className="text-xl sm:text-2xl font-black text-amber-300">Live CBT</span>
                        <p className="text-[11px] text-white/70 uppercase font-semibold">Instant Result &amp; Rank</p>
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
                        ...(localQuizzes.length > 0 ? [{ id: "teacher", label: "Faculty Authored" }] : []),
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
            {filteredQuizzes.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-[#05192D] rounded-3xl border border-gray-200 dark:border-gray-800 p-8 space-y-3">
                    <FileQuestion className="w-12 h-12 text-gray-400 mx-auto" />
                    <h3 className="font-extrabold text-gray-900 dark:text-white text-base">No quizzes found</h3>
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
                        const targetSeriesId = quiz.seriesId || "current-affairs-quizzes"
                        const attemptHref = `/test-series/${targetSeriesId}/instructions?testId=${quiz.id}&title=${encodeURIComponent(
                            quiz.title
                        )}&questions=${quiz.questions}&marks=${quiz.marks}&duration=${quiz.durationMinutes}`

                        return (
                            <div
                                key={quiz.id}
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
                                        {(quiz.attempts || 100).toLocaleString()}+ attempted
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
