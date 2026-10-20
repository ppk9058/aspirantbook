"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter, notFound } from "next/navigation"
import { useSession } from "next-auth/react"
import {
    Clock,
    Users,
    Globe,
    Share2,
    Check,
    Plus,
    CheckCheck,
    Lock,
    Play,
    ArrowRight,
    Search,
    X,
    Bookmark,
    Shield,
    FileText,
    HelpCircle,
    ChevronRight,
    Award,
    AlertCircle,
    BarChart3,
    BookOpen,
    Sparkles,
} from "lucide-react"
import { isPurchaseAllowedInApp } from "@/lib/native/platform"
import { AvailableOnWebsite } from "@/components/native/AvailableOnWebsite"
import EnrollButton from "@/components/test-series/EnrollButton"
import { TestActionButton } from "@/components/test-series/TestActionButton"
import { useGoal } from "@/components/providers/GoalProvider"
import { AuthwallGate } from "@/components/authwall/AuthwallGate"
import { AuthwallUnlockToast } from "@/components/authwall/AuthwallUnlockToast"
import { TEST_TYPE_LABELS } from "@/lib/exam/labels"

interface TestItem {
    id: string
    title: string
    questions: number
    marks: number
    durationMinutes: number
    languages: string
    isFree: boolean
    attempts?: number
    testType?: string
    isLockedForGuest?: boolean
    syllabus?: string | null
    syllabusHi?: string | null
    isLive?: boolean
    liveStartAt?: string | null
    liveEndAt?: string | null
    createdById?: string | null
}

interface TestSection {
    id: string
    title: string
    hindiTitle?: string
    count: number
    tests: TestItem[]
}

interface TestSeriesDetailClientProps {
    initialSeries?: any
}

function TestCardItem({
    test,
    currentSeries,
    submittedAttempts,
    session,
    testStatusMap,
    statusLoading,
    setIsPassModalOpen,
}: {
    test: TestItem
    currentSeries: any
    submittedAttempts: Record<string, string>
    session: any
    testStatusMap: Record<string, any>
    statusLoading: boolean
    setIsPassModalOpen: (open: boolean) => void
}) {
    const [syllabusLang, setSyllabusLang] = useState<"en" | "hi">("en")

    const userAttemptId = submittedAttempts[test.id]
    const isAdmin = session?.user?.role === "ADMIN"
    const isAuthorTeacher = session?.user?.role === "TEACHER" && test.createdById === session?.user?.id
    const isStaffWithAccess = isAdmin || isAuthorTeacher

    // Check live window
    const now = new Date()
    const isLiveActive = Boolean(
        test.isLive && test.liveEndAt && now < new Date(test.liveEndAt)
    )

    // Access decisions
    const canViewSolutions = isStaffWithAccess || (!!userAttemptId && !isLiveActive)
    const solutionsLockedReason = !session?.user
        ? "Sign in and submit the test to view solutions"
        : !userAttemptId && !isStaffWithAccess
        ? "Submit the test to view solutions"
        : isLiveActive
        ? `Available after live test ends${test.liveEndAt ? ` at ${new Date(test.liveEndAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}`
        : ""

    const canViewLeaderboard = isStaffWithAccess || (!!userAttemptId && !isLiveActive)
    const leaderboardLockedReason = !session?.user
        ? "Sign in and submit the test to view rankings"
        : !userAttemptId && !isStaffWithAccess
        ? "Submit the test to view rankings"
        : isLiveActive
        ? `Available after live test ends${test.liveEndAt ? ` at ${new Date(test.liveEndAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}`
        : ""

    const solutionsHref = userAttemptId
        ? `/test-series/${currentSeries.id}/solutions?testId=${encodeURIComponent(test.id)}&attemptId=${encodeURIComponent(userAttemptId)}`
        : `/test-series/${currentSeries.id}/solutions?testId=${encodeURIComponent(test.id)}`

    const hasEnglish = Boolean(test.syllabus?.trim())
    const hasHindi = Boolean(test.syllabusHi?.trim())
    const hasSyllabus = hasEnglish || hasHindi
    const hasBothLanguages = hasEnglish && hasHindi

    const displayedSyllabus =
        hasBothLanguages
            ? syllabusLang === "hi"
                ? test.syllabusHi
                : test.syllabus
            : hasEnglish
            ? test.syllabus
            : test.syllabusHi

    return (
        <div className="p-4 sm:p-5 space-y-3 transition-colors hover:bg-gray-50/40 dark:hover:bg-white/5">
            {/* Row 1: Title and All Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-wrap min-w-0 flex-1">
                    <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-snug break-words">
                        {test.title}
                    </h4>
                    {currentSeries.isPro && (test.isFree || (test as any).accessMode === "FREE" || (test as any).isFreeSample) ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 uppercase shrink-0">
                            Free sample
                        </span>
                    ) : test.isFree ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 uppercase shrink-0">
                            Free
                        </span>
                    ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 uppercase shrink-0">
                            <Lock className="h-2.5 w-2.5" />
                            Pro
                        </span>
                    )}
                </div>

                <div className="w-full sm:w-auto flex items-center justify-end flex-wrap gap-2 shrink-0">
                    {canViewSolutions ? (
                        <Link
                            href={solutionsHref}
                            className="min-h-[44px] px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/40 text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                            title="View Solutions"
                        >
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Solutions</span>
                        </Link>
                    ) : (
                        <button
                            type="button"
                            disabled
                            className="min-h-[44px] px-3 py-2 rounded-xl border border-gray-200/70 dark:border-gray-800 text-gray-400 dark:text-gray-600 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-not-allowed opacity-60 shrink-0"
                            title={solutionsLockedReason}
                        >
                            <Lock className="h-3.5 w-3.5" />
                            <span>Solutions</span>
                        </button>
                    )}

                    {canViewLeaderboard ? (
                        <Link
                            href={`/test-series/${test.id}/leaderboard`}
                            className="min-h-[44px] px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-500/40 text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                            title="View Leaderboard"
                        >
                            <BarChart3 className="h-3.5 w-3.5 text-sky-600" />
                            <span>Rankings</span>
                        </Link>
                    ) : (
                        <button
                            type="button"
                            disabled
                            className="min-h-[44px] px-3 py-2 rounded-xl border border-gray-200/70 dark:border-gray-800 text-gray-400 dark:text-gray-600 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-not-allowed opacity-60 shrink-0"
                            title={leaderboardLockedReason}
                        >
                            <Lock className="h-3.5 w-3.5" />
                            <span>Rankings</span>
                        </button>
                    )}

                    <TestActionButton
                        testId={test.id}
                        seriesId={currentSeries.id}
                        testTitle={test.title}
                        status={testStatusMap[test.id]}
                        loading={statusLoading}
                        returnPath={`/test-series/${currentSeries.id}`}
                        isLocked={!test.isFree}
                        onUnlockClick={() => setIsPassModalOpen(true)}
                        isFreeSample={Boolean(currentSeries.isPro && (test.isFree || (test as any).accessMode === "FREE" || (test as any).isFreeSample))}
                    />
                </div>
            </div>

            {/* Row 2: Meta Row */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-500 dark:text-gray-400 font-medium">
                <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-gray-400" />
                    <span>{test.questions} Questions</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                    <Award className="h-3.5 w-3.5 text-gray-400" />
                    <span>{test.marks} Marks</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    <span>{test.durationMinutes} Mins</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5 text-gray-400" />
                    <span>{test.languages}</span>
                </span>
                {Boolean(test.attempts) && (
                    <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <Users className="h-3.5 w-3.5" />
                            <span>{test.attempts} Attempts</span>
                        </span>
                    </>
                )}
            </div>

            {/* Row 3: Full Syllabus directly inside card (hidden if no syllabus) */}
            {hasSyllabus && displayedSyllabus && (
                <div className="bg-gray-50/80 dark:bg-white/5 rounded-xl p-3.5 sm:p-4 border border-gray-100/90 dark:border-gray-800/70 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                            <BookOpen className="h-4 w-4 text-[#00A8FF]" />
                            <span className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                                Syllabus
                            </span>
                        </div>
                        {hasBothLanguages && (
                            <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-white dark:bg-gray-800 text-xs font-semibold">
                                <button
                                    type="button"
                                    onClick={() => setSyllabusLang("en")}
                                    className={`px-3 py-1.5 min-h-[36px] rounded-md transition-colors cursor-pointer inline-flex items-center justify-center ${
                                        syllabusLang === "en"
                                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                                            : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                    }`}
                                >
                                    English
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSyllabusLang("hi")}
                                    className={`px-3 py-1.5 min-h-[36px] rounded-md transition-colors cursor-pointer inline-flex items-center justify-center ${
                                        syllabusLang === "hi"
                                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                                            : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                    }`}
                                >
                                    हिन्दी
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="text-[15px] sm:text-base text-foreground/90 leading-relaxed sm:leading-7 whitespace-pre-line break-words">
                        {displayedSyllabus}
                    </div>
                </div>
            )}
        </div>
    )
}

export default function TestSeriesDetailClient({ initialSeries }: TestSeriesDetailClientProps = {}) {
    const params = useParams()
    const router = useRouter()
    const seriesId = params?.id as string
    const { data: session } = useSession()
    const { selectedGoal, isLoaded } = useGoal()
    const canCreate =
        session?.user?.role === "TEACHER" || session?.user?.role === "ADMIN"

    const [seriesNotFound, setSeriesNotFound] = useState(false)
    const [seriesLoading, setSeriesLoading] = useState(!initialSeries)
    const [customSeriesPackage, setCustomSeriesPackage] = useState<any | null>(initialSeries || null)
    const [moreTestSeries, setMoreTestSeries] = useState<any[]>([])
    const [submittedAttempts, setSubmittedAttempts] = useState<Record<string, string>>({})
    const [testStatusMap, setTestStatusMap] = useState<Record<string, any>>({})
    const [statusLoading, setStatusLoading] = useState(true)

    // Load recommendations from dedicated server recommendations endpoint once GoalProvider is hydrated
    useEffect(() => {
        let isMounted = true
        if (!seriesId || !isLoaded) return

        const goalParam = selectedGoal?.id ? `&goal=${encodeURIComponent(selectedGoal.id)}` : ""
        fetch(`/api/exam/series/recommendations?seriesId=${encodeURIComponent(seriesId)}${goalParam}`)
            .then((res) => res.json())
            .then((json) => {
                if (isMounted && json.success && Array.isArray(json.data)) {
                    const activeGoalId = selectedGoal?.id?.toLowerCase()
                    const filtered = activeGoalId
                        ? json.data.filter((item: any) => {
                            const gid = (item.goalId || item.category || "").toLowerCase()
                            const tags = Array.isArray(item.tags) ? item.tags.map((t: string) => t.toLowerCase()) : []
                            return gid === activeGoalId || tags.includes(activeGoalId) || item.category?.toLowerCase() === activeGoalId
                        })
                        : json.data
                    setMoreTestSeries(filtered)
                }
            })
            .catch(() => {})

        return () => {
            isMounted = false
        }
    }, [seriesId, selectedGoal?.id, isLoaded])

    // Fallback if initialSeries wasn't provided directly
    useEffect(() => {
        if (customSeriesPackage) {
            setSeriesLoading(false)
            return
        }
        let isMounted = true
        fetch("/api/exam/series/list?includeAll=true")
            .then((res) => res.json())
            .then((json) => {
                if (!isMounted) return
                if (json.success && Array.isArray(json.data)) {
                    const found = json.data.find(
                        (s: any) =>
                            s.id === seriesId ||
                            s.id?.toLowerCase() === seriesId?.toLowerCase() ||
                            s.slug === seriesId ||
                            s.slug?.toLowerCase() === seriesId?.toLowerCase()
                    )
                    if (found) {
                        setCustomSeriesPackage(found)
                        setSeriesNotFound(false)
                    } else {
                        setSeriesNotFound(true)
                    }
                } else {
                    setSeriesNotFound(true)
                }
                setSeriesLoading(false)
            })
            .catch(() => {
                if (isMounted) {
                    setSeriesNotFound(true)
                    setSeriesLoading(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [seriesId, customSeriesPackage])

    const currentSeries = customSeriesPackage

    // Synchronize breadcrumbs with real package title
    useEffect(() => {
        if (currentSeries?.title && seriesId && typeof window !== "undefined") {
            window.dispatchEvent(
                new CustomEvent("update-breadcrumb-title", {
                    detail: { segment: seriesId, title: currentSeries.title },
                })
            )
        }
    }, [currentSeries?.title, seriesId])

    const [activeTab, setActiveTab] = useState<"mock" | "pyp">("mock")
    const [isAdded, setIsAdded] = useState(false)
    const [tests, setTests] = useState<TestItem[]>([])
    const [isPassModalOpen, setIsPassModalOpen] = useState(false)
    const [shareCopied, setShareCopied] = useState(false)
    const [selectedTestToAttempt, setSelectedTestToAttempt] = useState<TestItem | null>(null)

    // Load tests from the database API on mount
    useEffect(() => {
        let isMounted = true

        const loadAllTests = async () => {
            const fetchUserStatus = async () => {
                try {
                    setStatusLoading(true)
                    const userRes = await fetch(`/api/exam/attempt/user-status?seriesId=${encodeURIComponent(seriesId)}`)
                    if (userRes.ok) {
                        const userJson = await userRes.json()
                        if (userJson.success) {
                            if (userJson.data && isMounted) {
                                setTestStatusMap(userJson.data)
                            }
                            if (Array.isArray(userJson.attempts)) {
                                const map: Record<string, string> = {}
                                for (const att of userJson.attempts) {
                                    if (att.testId && att.id && !map[att.testId]) {
                                        map[att.testId] = att.id
                                    }
                                }
                                if (isMounted) setSubmittedAttempts(map)
                            } else if (userJson.data) {
                                const map: Record<string, string> = {}
                                for (const [tId, val] of Object.entries<any>(userJson.data)) {
                                    if (val.latestSubmittedAttemptId) {
                                        map[tId] = val.latestSubmittedAttemptId
                                    }
                                }
                                if (isMounted) setSubmittedAttempts(map)
                            }
                        }
                    }
                } catch (err) {
                    console.warn("Could not fetch user attempt status", err)
                } finally {
                    if (isMounted) setStatusLoading(false)
                }
            }

            const fetchDbTests = async () => {
                const combined: any[] = []
                try {
                    const res = await fetch(`/api/exam/test/list?seriesId=${encodeURIComponent(seriesId)}`)
                    const json = await res.json()
                    if (json.success && Array.isArray(json.data)) {
                        combined.push(...json.data)
                    }
                } catch (apiErr) {
                    console.warn("Could not fetch DB tests", apiErr)
                }

                // Deduplicate by ID
                const seen = new Set<string>()
                const unique: TestItem[] = []
                for (const t of combined) {
                    if (t.id && !seen.has(t.id)) {
                        seen.add(t.id)
                        unique.push({
                            id: t.id,
                            title: t.title,
                            questions: t.questions,
                            marks: t.marks,
                            durationMinutes: t.durationMinutes,
                            languages: t.languages,
                            isFree: t.isFree,
                            attempts: t.attempts,
                            testType: t.testType,
                            isLockedForGuest: Boolean(t.isLockedForGuest),
                            syllabus: t.syllabus || null,
                            syllabusHi: t.syllabusHi || null,
                        })
                    }
                }

                if (isMounted) {
                    setTests(unique)
                }
            }

            await Promise.all([fetchUserStatus(), fetchDbTests()])
        }

        loadAllTests()
        return () => {
            isMounted = false
        }
    }, [seriesId])

    const handleShare = () => {
        if (typeof window !== "undefined" && navigator?.clipboard) {
            navigator.clipboard.writeText(window.location.href)
            setShareCopied(true)
            setTimeout(() => setShareCopied(false), 2000)
        }
    }

    if (seriesLoading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-[#00A8FF] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500 font-semibold">Loading Test Series...</p>
            </div>
        )
    }

    if (seriesNotFound || !currentSeries) {
        notFound()
    }

    // Data corresponding to the selected series
    const seriesData = {
        title: currentSeries.title,
        examName: currentSeries.examName || currentSeries.category,
        totalTests: currentSeries.totalTests,
        freeTests: currentSeries.freeTests,
        users: currentSeries.users,
        languages: currentSeries.languages,
        highlights: (currentSeries.highlights || []) as string[]
    }

    const sectionGroups = new Map<string, TestItem[]>()
    for (const test of tests) {
        const key = test.testType === "PREVIOUS_YEAR" ? "pyps" : test.testType || "tests"
        sectionGroups.set(key, [...(sectionGroups.get(key) || []), test])
    }
    const testSections: TestSection[] = Array.from(sectionGroups, ([id, tests]) => ({
        id,
        title: id === "pyps" ? "Previous Year Papers" : (TEST_TYPE_LABELS[id] || id.replaceAll("_", " ")),
        count: tests.length,
        tests,
    }))

    return (
        <div className="w-full max-w-full min-w-0 overflow-x-hidden pb-32 lg:pb-12">
            {/* Unified 2-Column Grid: Left Column flows continuously, Right Column is sticky */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
                {/* Left Column: Header Card, Package Sections, Tests List */}
                <div className="lg:col-span-8 space-y-4 sm:space-y-5 min-w-0">
                    {/* Header Hero Card */}
                    <div className="bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 rounded-3xl p-4 sm:p-6 shadow-xs space-y-3.5 sm:space-y-4 overflow-hidden">
                        {/* Visual Banner at top of header card */}
                        {currentSeries.bannerUrl && (
                            <div className="w-full h-40 sm:h-52 md:h-60 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-xs relative">
                                <img
                                    src={currentSeries.bannerUrl}
                                    alt={seriesData.title}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}

                        {/* Header Title & Seal */}
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-white dark:bg-gray-800 border-2 border-emerald-600/30 flex items-center justify-center p-1 sm:p-1.5 shadow-xs flex-shrink-0">
                                {currentSeries.logoType === "upsc" ? (
                                    <svg className="w-7 h-7 sm:w-9 sm:h-9" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="47" fill="#FFFDF5" stroke="#1F2937" strokeWidth="2.5" />
                                        <path d="M50 14 C44 14 40 18 40 23 C40 27 43 30 45 32 C41 33 37 37 37 42 C37 47 41 51 45 53 L45 61 L33 61 C31 61 30 63 30 65 L30 68 L70 68 L70 65 C70 63 69 61 67 61 L55 61 L55 53 C59 51 63 47 63 42 C63 37 59 33 55 32 C57 30 60 27 60 23 C60 18 56 14 50 14 Z" fill="#1F2937" />
                                        <circle cx="50" cy="74" r="5" fill="none" stroke="#003B73" strokeWidth="2" />
                                        <path d="M28 80 L72 80 L68 86 L32 86 Z" fill="#B45309" />
                                        <text x="50" y="95" textAnchor="middle" fontSize="9" fontWeight="900" fill="#111827">UPSC</text>
                                    </svg>
                                ) : currentSeries.logoType === "ncert" ? (
                                    <svg className="w-7 h-7 sm:w-9 sm:h-9" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="47" fill="#F8FAFC" stroke="#2563EB" strokeWidth="2.5" />
                                        <path d="M25 65 L50 25 L75 65 Z" fill="#2563EB" />
                                        <circle cx="50" cy="48" r="8" fill="#FBBF24" />
                                        <text x="50" y="85" textAnchor="middle" fontSize="9" fontWeight="900" fill="#1E40AF">NCERT</text>
                                    </svg>
                                ) : (
                                    <svg className="w-7 h-7 sm:w-9 sm:h-9" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="47" fill="#F8FAFC" stroke="#047857" strokeWidth="2.5" />
                                        <path d="M50 16 C38 23 34 36 41 48 C43 52 47 55 49 60 C51 55 55 52 57 48 C64 36 60 23 50 16 Z" fill="#047857" />
                                        <circle cx="33" cy="38" r="4.5" fill="#D97706" />
                                        <circle cx="67" cy="38" r="4.5" fill="#D97706" />
                                        <rect x="47" y="60" width="6" height="15" fill="#78350F" />
                                        <rect x="28" y="75" width="44" height="4.5" rx="2" fill="#047857" />
                                        <text x="50" y="92" textAnchor="middle" fontSize="9" fontWeight="900" fill="#064E3B">{currentSeries.category || "TEST"}</text>
                                    </svg>
                                )}
                            </div>

                            <div className="space-y-1 min-w-0 flex-1">
                                <h1 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white leading-snug break-words">
                                    {seriesData.title}
                                </h1>
                            </div>
                        </div>

                        {/* Key Stats Strip */}
                        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                            <span className="font-bold text-gray-900 dark:text-white">{seriesData.totalTests} Total Tests</span>
                            <span className="text-gray-300 dark:text-gray-700">|</span>
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-extrabold border border-emerald-500/30 text-xs">
                                {seriesData.freeTests} FREE TESTS
                            </span>
                            <span className="text-gray-300 dark:text-gray-700">|</span>
                            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                <Users className="h-3.5 w-3.5 text-gray-400" />
                                <span>{seriesData.users} Users</span>
                            </span>
                            <span className="text-gray-300 dark:text-gray-700">|</span>
                            <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                                <Globe className="h-3.5 w-3.5" />
                                <span>{seriesData.languages}</span>
                            </span>
                        </div>

                        {/* Highlights 3-column / 2-column Grid */}
                        {seriesData.highlights.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1 text-xs text-gray-700 dark:text-gray-300">
                                {seriesData.highlights.map((point, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="text-gray-400 font-bold">•</span>
                                        <span className="truncate">{point}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Actions: Enroll & Share */}
                        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                            <EnrollButton
                                seriesId={seriesId}
                                isFree={currentSeries?.isFree ?? (currentSeries?.isPro ? false : true)}
                                size="md"
                            />

                            <button
                                onClick={handleShare}
                                className="min-h-[44px] px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 font-semibold text-xs sm:text-sm transition-colors cursor-pointer flex items-center gap-2"
                            >
                                <Share2 className="h-4 w-4 text-emerald-600" />
                                <span>{shareCopied ? "Link Copied!" : "Share"}</span>
                            </button>

                            {canCreate && (
                                <Link
                                    href={`/teacher/test-series/create?seriesId=${seriesId}&category=${encodeURIComponent(currentSeries.category)}`}
                                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>+ Create Test in Studio</span>
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Extended Series Details: Syllabus, Key Features, Why This Series */}
                    {(currentSeries.syllabus?.trim() || (Array.isArray(currentSeries.keyFeatures) && currentSeries.keyFeatures.filter(Boolean).length > 0) || currentSeries.whyThisSeries?.trim()) && (
                        <div className="bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 rounded-3xl p-4 sm:p-6 shadow-xs space-y-5">
                            {/* Key Features */}
                            {Array.isArray(currentSeries.keyFeatures) && currentSeries.keyFeatures.filter(Boolean).length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Award className="h-5 w-5 text-emerald-600" />
                                        <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                                            Key Features of this Test Series
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                                        {currentSeries.keyFeatures.filter(Boolean).map((feat: string, idx: number) => (
                                            <div key={idx} className="flex items-start gap-2.5 p-3 rounded-2xl bg-gray-50/80 dark:bg-white/5 border border-gray-100 dark:border-gray-800/80 text-xs text-gray-800 dark:text-gray-200">
                                                <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                                <span className="font-semibold leading-relaxed">{feat}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Series Syllabus */}
                            {currentSeries.syllabus?.trim() && (
                                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="h-5 w-5 text-[#00A8FF]" />
                                        <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                                            Test Series Syllabus &amp; Curriculum Outline
                                        </h3>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-sky-50/40 dark:bg-sky-950/20 border border-sky-100/60 dark:border-sky-900/40 text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line">
                                        {currentSeries.syllabus}
                                    </div>
                                </div>
                            )}

                            {/* Why This Test Series */}
                            {currentSeries.whyThisSeries?.trim() && (
                                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="h-5 w-5 text-amber-500" />
                                        <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                                            Why Choose This Test Series?
                                        </h3>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-100/60 dark:border-amber-900/40 text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line">
                                        {currentSeries.whyThisSeries}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Section Title & Sub-tabs */}
                    <div className="space-y-2.5 pt-1">
                        <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight">
                            {seriesData.title} All Tests ({seriesData.totalTests})
                        </h2>

                        {/* Filter Tabs: Full Tests vs PYPs + Teacher Create Test action */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setActiveTab("mock")}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                        activeTab === "mock"
                                            ? "bg-sky-700 text-white shadow-xs"
                                            : "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15"
                                    }`}
                                >
                                    Full Tests
                                </button>

                                <button
                                    onClick={() => setActiveTab("pyp")}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                        activeTab === "pyp"
                                            ? "bg-sky-700 text-white shadow-xs"
                                            : "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15"
                                    }`}
                                >
                                    PYPs
                                </button>
                            </div>

                            {canCreate && (
                                <Link
                                    href={`/teacher/test-series/create?seriesId=${currentSeries.id}&category=${encodeURIComponent(currentSeries.category)}`}
                                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-colors flex items-center gap-1.5"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>Add Test to this Series</span>
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Test Sections (Non-interactive headers, cards always visible) */}
                    <div className="space-y-4">
                        {testSections
                            .filter((section) => (activeTab === "pyp" ? section.id === "pyps" : section.id !== "pyps"))
                            .map((section) => (
                                <div
                                    key={section.id}
                                    className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#071d33] overflow-hidden shadow-xs"
                                >
                                    {/* Non-interactive Section Header */}
                                    <div className="px-4 py-3 sm:px-5 sm:py-3.5 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-white/[0.02]">
                                        <div className="w-2 h-2 rounded-full flex-shrink-0 bg-[#00A8FF]" />
                                        <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                                            {section.title} ({section.count})
                                        </h3>
                                    </div>

                                    {/* Tests List inside section */}
                                    <div className="divide-y divide-gray-100 dark:divide-gray-800/80">
                                        {section.tests.map((test) => (
                                            <TestCardItem
                                                key={test.id}
                                                test={test}
                                                currentSeries={currentSeries}
                                                submittedAttempts={submittedAttempts}
                                                session={session}
                                                testStatusMap={testStatusMap}
                                                statusLoading={statusLoading}
                                                setIsPassModalOpen={setIsPassModalOpen}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                    </div>

                    {Boolean(currentSeries.isGated && !session?.user?.id) && (
                        <div className="mt-6">
                            <AuthwallGate
                                title={currentSeries.gateTitle}
                                subtitle={currentSeries.gateSubtitle}
                                moduleName="Test Series"
                                totalItemsCount={currentSeries.totalTests}
                                previewCount={currentSeries.freeTests}
                                effectivePercentage={currentSeries.previewPercentage}
                            />
                        </div>
                    )}
                </div>

                {/* Right Sticky Column (Get Pass card + More Testseries for you) */}
                <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-[76px] min-w-0">
                    {/* Pass Widget */}
                    <div className="bg-gradient-to-b from-[#003B73] via-[#005B96] to-[#00A896] text-white rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden border border-white/10">
                        <div className="mb-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-700 text-white uppercase tracking-wider shadow-xs">
                                NEW
                            </span>
                        </div>

                        <div className="space-y-1.5 mb-4">
                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                                <span className="text-lg sm:text-xl font-black tracking-tight text-white">aspirantbook</span>
                                <span className="px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-xs text-[10px] font-black tracking-widest uppercase">
                                    PASS
                                </span>
                            </div>
                            <h3 className="text-sm sm:text-base font-extrabold text-white leading-snug">
                                Unlock All Test Series of All Exams with Pass!
                            </h3>
                        </div>

                        <div className="space-y-2 text-xs font-semibold text-white/95 pb-4 border-b border-white/20">
                            <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-[#00D084] stroke-[3]" />
                                <span>Mock Tests</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-[#00D084] stroke-[3]" />
                                <span>Live Tests</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-[#00D084] stroke-[3]" />
                                <span>Study Notes</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-[#00D084] stroke-[3]" />
                                <span>Doubt Support</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-[#00D084] stroke-[3]" />
                                <span>PYPs</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-[#00D084] stroke-[3]" />
                                <span>Re-Attempt Mode</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-[#00D084] stroke-[3]" />
                                <span>Unlimited Practice</span>
                            </div>
                        </div>

                        {!isPurchaseAllowedInApp() ? (
                            <div className="mt-4">
                                <AvailableOnWebsite fullWidth size="md" url={`/test-series/${initialSeries.slug || initialSeries.id}`} />
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsPassModalOpen(true)}
                                className="w-full mt-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-[0.99] cursor-pointer text-center min-h-[44px]"
                            >
                                Get Pass
                            </button>
                        )}
                    </div>

                    {/* Right Sidebar: "More Testseries for you" (Filtered by target goal) */}
                    {moreTestSeries.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white tracking-tight">
                                More Testseries for you
                            </h3>

                            <div className="space-y-2.5">
                                {moreTestSeries.map((item) => (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        className="block p-3.5 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#071d33] hover:shadow-md transition-all group"
                                    >
                                        <div className="flex items-center justify-between gap-3 min-w-0">
                                            <div className="space-y-1 min-w-0 flex-1">
                                                <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white group-hover:text-[#00A8FF] transition-colors leading-snug break-words">
                                                    {item.title}
                                                </h4>
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                                    <span>{item.totalTests} Total Tests</span>
                                                    <span className="mx-1.5">•</span>
                                                    <span className={item.freeTests > 0 ? "text-emerald-700 dark:text-emerald-400 font-bold" : ""}>
                                                        {item.freeTests} Free Tests
                                                    </span>
                                                </p>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-sky-600 transition-transform group-hover:translate-x-0.5 flex-shrink-0" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Test Simulation / Start Test Dialog */}
            {selectedTestToAttempt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0">
                    <div className="bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
                        <div className="flex items-start justify-between">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                                    Live Test Simulation
                                </span>
                                <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                                    {selectedTestToAttempt.title}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedTestToAttempt(null)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 text-center">
                            <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">Questions</span>
                                <p className="text-base font-black text-gray-900 dark:text-white">
                                    {selectedTestToAttempt.questions}
                                </p>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">Total Marks</span>
                                <p className="text-base font-black text-gray-900 dark:text-white">
                                    {selectedTestToAttempt.marks}
                                </p>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">Time Limit</span>
                                <p className="text-base font-black text-gray-900 dark:text-white">
                                    {selectedTestToAttempt.durationMinutes} Mins
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                            <p className="font-bold text-gray-800 dark:text-gray-200">General Guidelines:</p>
                            <ul className="space-y-1 list-disc pl-4 text-gray-500 dark:text-gray-400">
                                <li>Each question carries 1 mark. Negative marking applies as per official exam guidelines.</li>
                                <li>The test will automatically submit once time limit expires.</li>
                                <li>You can switch between English and Hindi during the examination.</li>
                            </ul>
                        </div>

                        <div className="flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                            <button
                                onClick={() => setSelectedTestToAttempt(null)}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs"
                            >
                                Cancel
                            </button>
                            <Link
                                href={`/test-series/${seriesId}/instructions?testId=${encodeURIComponent(selectedTestToAttempt?.id ?? "")}`}
                                className="flex-1 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs text-center shadow-md transition-colors"
                            >
                                Start Test Now →
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Pass Membership Modal */}
            {isPassModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0">
                    <div className="bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6">
                        <div className="flex items-start justify-between">
                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                                <span className="text-xl font-black text-gray-900 dark:text-white">aspirantbook</span>
                                <span className="px-2 py-0.5 rounded-md bg-emerald-700 text-[10px] font-black text-white tracking-widest uppercase">
                                    PASS PRO
                                </span>
                            </div>
                            <button
                                onClick={() => setIsPassModalOpen(false)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#003B73] to-[#00A896] text-white space-y-2">
                            <p className="text-xs uppercase font-extrabold tracking-wider text-cyan-200">All-In-One Pass</p>
                            
                            <p className="text-xs text-white/80">Unlimited access to Government Exam test series.</p>
                        </div>

                        <div className="space-y-2.5 text-xs text-gray-700 dark:text-gray-300">
                            <div className="flex items-center gap-2 font-semibold">
                                <Check className="h-4 w-4 text-[#00D084]" />
                                <span>Access test series based on your subscription.</span>
                            </div>
                            <div className="flex items-center gap-2 font-semibold">
                                <Check className="h-4 w-4 text-[#00D084]" />
                                <span>Mock tests for UPSC, BPSC, UPPSC & State exams</span>
                            </div>
                            <div className="flex items-center gap-2 font-semibold">
                                <Check className="h-4 w-4 text-[#00D084]" />
                                <span>All India Rank & State-level percentile leaderboards</span>
                            </div>
                            <div className="flex items-center gap-2 font-semibold">
                                <Check className="h-4 w-4 text-[#00D084]" />
                                <span>Unlimited Re-attempts on all Mocks</span>
                            </div>
                        </div>

                        <Link
                            href="/subscription"
                            className="block w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm text-center shadow-lg transition-transform active:scale-[0.99]"
                        >
                            Subscribe Now
                        </Link>
                    </div>
                </div>
            )}

            {/* Mobile Sticky Action Bar above bottom nav */}
            <div className="sm:hidden fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] left-0 right-0 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-30 shadow-lg flex items-center justify-between gap-3 select-none">
                <div className="min-w-0 flex-1">
                    <div className="text-xs font-black truncate text-slate-900 dark:text-white">
                        {seriesData.title}
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                        {seriesData.freeTests} Free Tests Available
                    </div>
                </div>
                <div className="shrink-0">
                    <EnrollButton
                        seriesId={seriesId}
                        isFree={currentSeries?.isFree ?? (currentSeries?.isPro ? false : true)}
                        size="sm"
                    />
                </div>
            </div>

            <AuthwallUnlockToast />
        </div>
    )
}
