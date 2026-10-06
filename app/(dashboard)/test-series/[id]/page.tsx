"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
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
    ChevronDown,
    ChevronUp,
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
    BookOpen
} from "lucide-react"
import {
    TEST_SERIES_DATA,
    getTestSeriesById,
    getDefaultTestSectionsForSeries,
    TestSeriesItem
} from "@/lib/test-series-data"
import EnrollButton from "@/components/test-series/EnrollButton"
import { TestActionButton } from "@/components/test-series/TestActionButton"
import { useGoal } from "@/components/providers/GoalProvider"

interface TestItem {
    id: string
    title: string
    questions: number
    marks: number
    durationMinutes: number
    languages: string
    isFree: boolean
    attempts?: number
    isLocalDraft?: boolean
}

interface TestSection {
    id: string
    title: string
    hindiTitle?: string
    count: number
    tests: TestItem[]
}

export default function TestSeriesDetailPage() {
    const params = useParams()
    const router = useRouter()
    const seriesId = (params?.id as string) || "bpsc-72nd-2026"
    const { data: session } = useSession()
    const { selectedGoal } = useGoal()
    const canCreate =
        session?.user?.role === "TEACHER" || session?.user?.role === "ADMIN"

    const initialStatic = getTestSeriesById(seriesId)
    const [seriesNotFound, setSeriesNotFound] = useState(!initialStatic && !seriesId.startsWith("es_"))
    const [seriesLoading, setSeriesLoading] = useState(false)
    const [customSeriesPackage, setCustomSeriesPackage] = useState<TestSeriesItem | null>(initialStatic || null)
    const [allSeriesList, setAllSeriesList] = useState<any[]>([])
    const [submittedAttempts, setSubmittedAttempts] = useState<Record<string, string>>({})
    const [testStatusMap, setTestStatusMap] = useState<Record<string, any>>({})
    const [statusLoading, setStatusLoading] = useState(true)

    useEffect(() => {
        let isMounted = true
        try {
            fetch("/api/exam/series/list")
                .then((res) => res.json())
                .then((json) => {
                    if (!isMounted) return
                    if (json.success && Array.isArray(json.data)) {
                        setAllSeriesList(json.data)
                        const found = json.data.find((s: any) => s.id === seriesId || s.id.toLowerCase() === seriesId.toLowerCase() || s.slug === seriesId)
                        if (found) {
                            setCustomSeriesPackage(found)
                        } else {
                            const staticSeries = getTestSeriesById(seriesId)
                            if (staticSeries) {
                                setCustomSeriesPackage(staticSeries)
                            } else {
                                setSeriesNotFound(true)
                            }
                        }
                    } else {
                        const staticSeries = getTestSeriesById(seriesId)
                        if (staticSeries) {
                            setCustomSeriesPackage(staticSeries)
                        } else {
                            setSeriesNotFound(true)
                        }
                    }
                    setSeriesLoading(false)
                })
                .catch(() => {
                    if (isMounted) {
                        setSeriesNotFound(true)
                        setSeriesLoading(false)
                    }
                })
        } catch (e) {
            setSeriesNotFound(true)
            setSeriesLoading(false)
        }

        return () => {
            isMounted = false
        }
    }, [seriesId])

    const currentSeries: TestSeriesItem | null = customSeriesPackage || getTestSeriesById(seriesId) || null

    const [activeTab, setActiveTab] = useState<"mock" | "pyp">("mock")
    const [isAdded, setIsAdded] = useState(false)
    const [customTests, setCustomTests] = useState<TestItem[]>([])
    const [expandedSections, setExpandedSections] = useState<string[]>([
        "teacher-tests",
        "sectional-tests",
        "full-tests",
        "chapter-tests",
        "blissful-bihar",
        "pyps"
    ])
    const [isPassModalOpen, setIsPassModalOpen] = useState(false)
    const [shareCopied, setShareCopied] = useState(false)
    const [selectedTestToAttempt, setSelectedTestToAttempt] = useState<TestItem | null>(null)

    // Load tests from database API AND localStorage on mount
    useEffect(() => {
        let isMounted = true

        const loadAllTests = async () => {
            const combined: any[] = []

            // 1. Fetch user's submitted attempts for this series to govern solutions access
            try {
                const userRes = await fetch(`/api/exam/attempt/user-status?seriesId=${encodeURIComponent(seriesId)}`)
                if (userRes.ok) {
                    const userJson = await userRes.json()
                    if (userJson.success) {
                        if (userJson.data) {
                            if (isMounted) setTestStatusMap(userJson.data)
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

            // 2. Fetch from database API
            try {
                const res = await fetch(`/api/exam/test/list?seriesId=${encodeURIComponent(seriesId)}`)
                const json = await res.json()
                if (json.success && Array.isArray(json.data)) {
                    combined.push(...json.data.map((t: any) => ({ ...t, isLocalDraft: false })))
                }
            } catch (apiErr) {
                console.warn("Could not fetch DB tests", apiErr)
            }

            // 3. Read unsaved drafts from localStorage (tagged as local drafts, not synced)
            try {
                const stored = localStorage.getItem("ts_custom_tests")
                if (stored) {
                    const parsed = JSON.parse(stored)
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const isUpsc = seriesId.includes("upsc")
                        const isBpsc = seriesId.includes("bpsc")
                        const matchingLocal = parsed.filter((t: any) => {
                            if (t.seriesId) return t.seriesId === seriesId || t.seriesSlug === seriesId
                            const titleLower = (t.title || "").toLowerCase()
                            const catLower = (t.category || "").toLowerCase()
                            if (isUpsc) return titleLower.includes("upsc") || catLower.includes("upsc")
                            if (isBpsc) return titleLower.includes("bpsc") || catLower.includes("bpsc")
                            return false
                        })
                        combined.push(...matchingLocal.map((t: any) => ({ ...t, isLocalDraft: true })))
                    }
                }
            } catch (err) {}

            // Deduplicate by ID
            const seen = new Set<string>()
            const unique: TestItem[] = []
            for (const t of combined) {
                if (t.id && !seen.has(t.id)) {
                    seen.add(t.id)
                    unique.push({
                        id: t.id,
                        title: t.title || "Teacher Authored Mock Test",
                        questions: t.questions || (t.questionsList ? t.questionsList.length : 5),
                        marks: t.marks || (t.questionsList ? t.questionsList.length : 5),
                        durationMinutes: t.durationMinutes || 10,
                        languages: t.languages || "English, Hindi",
                        isFree: t.isFree ?? true,
                        attempts: t.attempts || 0,
                        isLocalDraft: !!t.isLocalDraft,
                    })
                }
            }

            if (isMounted && unique.length > 0) {
                setCustomTests(unique)
            }
        }

        loadAllTests()
        window.addEventListener("storage", loadAllTests)
        return () => {
            isMounted = false
            window.removeEventListener("storage", loadAllTests)
        }
    }, [seriesId])

    const toggleSection = (sectionId: string) => {
        setExpandedSections((prev) =>
            prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
        )
    }

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
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white">Test Series Not Found</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                    The requested test series does not exist or has been removed.
                </p>
                <Link
                    href="/test-series"
                    className="px-6 py-2.5 rounded-xl bg-[#00A8FF] hover:bg-[#0096e6] text-white font-bold text-sm shadow-md transition-colors"
                >
                    Back to All Test Series
                </Link>
            </div>
        )
    }

    // Data corresponding to the selected series
    const seriesData = {
        title: currentSeries.title,
        examName: `${currentSeries.category} Exam`,
        lastUpdated: "Sep 26, 2026",
        totalTests: currentSeries.totalTests,
        freeTests: currentSeries.freeTests,
        users: currentSeries.users,
        languages: currentSeries.languages,
        highlights: currentSeries.highlights
    }

    const testSections: TestSection[] = getDefaultTestSectionsForSeries(seriesId)

    const userGoalKey = (selectedGoal?.id || "").toLowerCase()
    const moreTestSeries = (allSeriesList.length > 0 ? allSeriesList : TEST_SERIES_DATA)
        .filter((s) => s.id !== currentSeries.id && (s.slug ? s.slug !== seriesId : true))
        .sort((a, b) => {
            const aCat = (a.category || "").toLowerCase()
            const bCat = (b.category || "").toLowerCase()
            const aMatches = aCat.includes(userGoalKey) || userGoalKey.includes(aCat)
            const bMatches = bCat.includes(userGoalKey) || userGoalKey.includes(bCat)
            if (aMatches && !bMatches) return -1
            if (!aMatches && bMatches) return 1
            return 0
        })
        .slice(0, 4)
        .map((s) => ({
            id: s.id,
            title: s.title,
            totalTests: s.totalTests || 10,
            freeTests: s.freeTests || 2,
            href: `/test-series/${s.slug || s.id}`
        }))

    return (
        <div className="w-full max-w-full min-w-0 overflow-x-hidden space-y-6 sm:space-y-8 pb-40 sm:pb-32 lg:pb-12">
            {/* Breadcrumb Navigation - hidden on mobile */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Link href="/" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                    Home
                </Link>
                <ChevronRight className="h-3 w-3" />
                <Link href="/test-series" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                    {seriesData.examName}
                </Link>
                <ChevronRight className="h-3 w-3" />
                <span className="text-gray-900 dark:text-white font-medium truncate max-w-xs sm:max-w-md">
                    {seriesData.title}
                </span>
            </div>

            {/* Hero Card & Pass Widget Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Hero Card */}
                <div className="lg:col-span-8 bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-8 shadow-xs space-y-5">
                    {/* Header Title & Seal: Stack vertically under sm (640px) */}
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
                            <h1 className="text-lg sm:text-2xl lg:text-3xl font-black text-gray-900 dark:text-white leading-snug break-words">
                                {seriesData.title}
                            </h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 pt-0.5">
                                <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                <span>Last updated on {seriesData.lastUpdated}</span>
                            </p>
                        </div>
                    </div>

                    {/* Key Stats Strip */}
                    <div className="flex flex-wrap items-center gap-3 pt-2 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 text-xs text-gray-700 dark:text-gray-300">
                        {seriesData.highlights.map((point, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <span className="text-gray-400 font-bold">•</span>
                                <span className="truncate">{point}</span>
                            </div>
                        ))}
                    </div>

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

                {/* Right Sticky Pass Widget (Exact Testbook Pass Style) */}
                <div className="lg:col-span-4 bg-gradient-to-b from-[#003B73] via-[#005B96] to-[#00A896] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border border-white/10 sticky top-[76px]">
                    <div className="mb-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-700 text-white uppercase tracking-wider shadow-xs">
                            NEW
                        </span>
                    </div>

                    <div className="space-y-2 mb-4">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <span className="text-xl font-black tracking-tight text-white">aspirantbook</span>
                            <span className="px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-xs text-[10px] font-black tracking-widest uppercase">
                                PASS
                            </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-extrabold text-white leading-snug">
                            Unlock All Test Series of All Exams with Pass!
                        </h3>
                    </div>

                    <div className="space-y-2 text-xs font-semibold text-white/95 pb-5 border-b border-white/20">
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

                    <button
                        onClick={() => setIsPassModalOpen(true)}
                        className="w-full mt-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm shadow-md transition-all active:scale-[0.99] cursor-pointer text-center"
                    >
                        Get Pass
                    </button>
                </div>
            </div>

            {/* Test Series Content On Scrolling */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-4">
                {/* Main Tests Area (Left / Center Column) */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Section Title & Sub-tabs */}
                    <div className="space-y-3">
                        <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight">
                            {seriesData.title} All Tests ({seriesData.totalTests})
                        </h2>

                        {/* Filter Tabs: Mock Tests vs PYPs + Teacher Create Test action */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setActiveTab("mock")}
                                    className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                        activeTab === "mock"
                                            ? "bg-sky-700 text-white shadow-xs"
                                            : "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15"
                                    }`}
                                >
                                    Mock Tests
                                </button>

                                <button
                                    onClick={() => setActiveTab("pyp")}
                                    className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
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
                                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-colors flex items-center gap-1.5"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>Add Test to this Series</span>
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Test Sections Accordions */}
                    <div className="space-y-4">
                        {[
                            ...(customTests.length > 0
                                ? [
                                      {
                                          id: "teacher-tests",
                                          title: "Teacher Authored & Live Class Tests",
                                          count: customTests.filter((t) => !t.isLocalDraft).length,
                                          tests: customTests,
                                      },
                                  ]
                                : []),
                            ...testSections,
                        ]
                            .filter((section) => (activeTab === "pyp" ? section.id === "pyps" : section.id !== "pyps"))
                            .map((section) => {
                                const isExpanded = expandedSections.includes(section.id)

                                return (
                                    <div
                                        key={section.id}
                                        className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#071d33] overflow-hidden shadow-xs"
                                    >
                                        {/* Section Accordion Trigger */}
                                        <button
                                            onClick={() => toggleSection(section.id)}
                                            className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors cursor-pointer min-w-0"
                                        >
                                            <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${section.id === "teacher-tests" ? "bg-emerald-500 animate-pulse" : "bg-[#00A8FF]"}`} />
                                                <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white break-words">
                                                    {section.title}
                                                </h3>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold flex-shrink-0">
                                                    ({section.count})
                                                </span>
                                                {section.id === "teacher-tests" && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 uppercase flex-shrink-0">
                                                        Faculty Authored
                                                    </span>
                                                )}
                                            </div>

                                            {isExpanded ? (
                                                <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0 ml-1" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0 ml-1" />
                                            )}
                                        </button>

                                        {/* Tests List inside section */}
                                        {isExpanded && (
                                            <div className="divide-y divide-gray-100 dark:divide-gray-800/80 border-t border-gray-100 dark:border-gray-800">
                                                {section.tests.map((test) => {
                                                    const isLocal = !!test.isLocalDraft
                                                    const userAttemptId = submittedAttempts[test.id]
                                                    const isTeacherOrAdmin = session?.user?.role === "TEACHER" || session?.user?.role === "ADMIN"
                                                    const canViewSolutions = !isLocal && (!!userAttemptId || isTeacherOrAdmin)
                                                    const solutionsHref = userAttemptId
                                                        ? `/test-series/${currentSeries.id}/solutions?testId=${encodeURIComponent(test.id)}&attemptId=${encodeURIComponent(userAttemptId)}`
                                                        : `/test-series/${currentSeries.id}/solutions?testId=${encodeURIComponent(test.id)}`

                                                    return (
                                                        <div
                                                            key={test.id}
                                                            className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${section.id === "teacher-tests" ? "bg-emerald-50/30 dark:bg-emerald-950/10 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20" : "hover:bg-gray-50/40 dark:hover:bg-white/5"}`}
                                                        >
                                                            <div className="space-y-1.5 min-w-0 flex-1">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-snug break-words">
                                                                        {test.title}
                                                                    </h4>
                                                                    {isLocal ? (
                                                                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 uppercase">
                                                                             Draft (only on this device)
                                                                        </span>
                                                                    ) : section.id === "teacher-tests" ? (
                                                                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-500/30 uppercase">
                                                                            Live Test
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 uppercase">
                                                                            Curriculum Sample
                                                                        </span>
                                                                    )}
                                                                    {currentSeries.isPro && (test.isFree || (test as any).accessMode === "FREE" || (test as any).isFreeSample) ? (
                                                                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 uppercase">
                                                                            Free sample
                                                                        </span>
                                                                    ) : test.isFree ? (
                                                                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 uppercase">
                                                                            Free
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 uppercase">
                                                                            <Lock className="h-2.5 w-2.5" />
                                                                            Pro
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-500 dark:text-gray-400">
                                                                    <span>{test.questions} Questions</span>
                                                                    <span>•</span>
                                                                    <span>{test.marks} Marks</span>
                                                                    <span>•</span>
                                                                    <span>{test.durationMinutes} Mins</span>
                                                                    <span>•</span>
                                                                    <span>{test.languages}</span>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-shrink-0">
                                                                {section.id === "teacher-tests" ? (
                                                                    isLocal ? (
                                                                        <span className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold select-none cursor-not-allowed">
                                                                            Draft (only on this device)
                                                                        </span>
                                                                    ) : (
                                                                        <>
                                                                            {canViewSolutions && (
                                                                                <Link
                                                                                    href={solutionsHref}
                                                                                    className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-emerald-600 hover:border-emerald-500/40 transition-colors flex items-center justify-center cursor-pointer"
                                                                                    title="View Solutions"
                                                                                    aria-label="View Solutions"
                                                                                >
                                                                                    <BookOpen className="h-4 w-4" />
                                                                                </Link>
                                                                            )}
                                                                            <Link
                                                                                href={`/test-series/${test.id}/leaderboard`}
                                                                                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-sky-600 hover:border-sky-500/40 transition-colors flex items-center justify-center cursor-pointer"
                                                                                title="View Leaderboard"
                                                                                aria-label="View Leaderboard"
                                                                            >
                                                                                <BarChart3 className="h-4 w-4" />
                                                                            </Link>
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
                                                                        </>
                                                                    )
                                                                ) : (
                                                                    <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold select-none">
                                                                        Upcoming / Outline
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                    </div>
                </div>

                {/* Right Sidebar: "More Testseries for you" (Real Published Series not yet enrolled) */}
                {moreTestSeries.length > 0 && (
                    <div className="lg:col-span-4 space-y-4">
                        <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                            More Testseries for you
                        </h3>

                        <div className="space-y-3">
                            {moreTestSeries.map((item) => (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    className="block p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#071d33] hover:shadow-md transition-all group"
                                >
                                    <div className="flex items-center justify-between gap-3 min-w-0">
                                        <div className="space-y-1 min-w-0 flex-1">
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-[#00A8FF] transition-colors leading-snug break-words">
                                                {item.title}
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
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
                            <h3 className="text-2xl font-black">₹399 / Year</h3>
                            <p className="text-xs text-white/80">Unlimited access to 700+ Government Exam Mock Test Series.</p>
                        </div>

                        <div className="space-y-2.5 text-xs text-gray-700 dark:text-gray-300">
                            <div className="flex items-center gap-2 font-semibold">
                                <Check className="h-4 w-4 text-[#00D084]" />
                                <span>Unlock all 283 tests of 72nd BPSC CCE</span>
                            </div>
                            <div className="flex items-center gap-2 font-semibold">
                                <Check className="h-4 w-4 text-[#00D084]" />
                                <span>70,000+ Mock Tests for UPSC, BPSC, UPPSC & State Exams</span>
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
                            Subscribe Now - ₹399
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
        </div>
    )
}
