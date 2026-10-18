"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import {
    Search,
    Check,
    Globe,
    Zap,
    Plus,
    CheckCheck,
    Bookmark,
    ArrowRight,
    Award,
    Clock,
    FileText,
    Sparkles,
    ShieldCheck,
    HelpCircle,
    ChevronRight,
    X
} from "lucide-react"

import dynamic from "next/dynamic"
import { useSession } from "next-auth/react"
import { useGoal } from "@/components/providers/GoalProvider"
import GoalIcon from "@/components/layout/GoalIcon"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TestSeriesItem {
    id: string; slug?: string; title: string; category: string; description?: string
    goalId?: string; tags: string[]; highlights: string[]; totalTests: number
    freeTests: number; users: string; logoType: string; isFree: boolean; isPro: boolean
    languages: string
}

const CreateSeriesModal = dynamic(() => import("@/components/exam/CreateSeriesModal"), {
    ssr: false,
})


const CATEGORIES = [
    "All",
    "UPSC",
    "BPSC",
    "BPSC TRE",
    "Class 10",
    "Class 9",
    "Class 8",
    "Class 7",
    "Class 6",
    "Skill"
]

// Custom Exam Emblem SVGs matching official seals exactly
function ExamLogo({ logoType }: { logoType: string }) {
    if (logoType === "upsc") {
        return (
            <div className="w-11 h-11 rounded-full bg-white border border-gray-300 dark:border-gray-700 flex items-center justify-center p-1 shadow-xs">
                <svg className="w-8 h-8" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="47" fill="#FFFDF5" stroke="#1F2937" strokeWidth="2" />
                    {/* Ashoka Stambh Lion Capital Icon */}
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
            <div className="w-11 h-11 rounded-full bg-white border border-gray-300 dark:border-gray-700 flex items-center justify-center p-1 shadow-xs">
                <svg className="w-8 h-8" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="47" fill="#F8FAFC" stroke="#047857" strokeWidth="2.5" />
                    {/* Bodhi Tree & BPSC Emblem */}
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
            <div className="w-11 h-11 rounded-full bg-white border border-gray-300 dark:border-gray-700 flex items-center justify-center p-1 shadow-xs">
                <svg className="w-8 h-8" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="47" fill="#F8FAFC" stroke="#1E293B" strokeWidth="2.5" />
                    {/* UP Govt Bow-Arrow and Twin Fish */}
                    <path d="M28 42 Q50 26 72 42" fill="none" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" />
                    <line x1="50" y1="24" x2="50" y2="56" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M30 63 Q40 56 48 66 Q40 74 30 63 Z" fill="#2563EB" />
                    <path d="M70 63 Q60 56 52 66 Q60 74 70 63 Z" fill="#2563EB" />
                    <text x="50" y="91" textAnchor="middle" fontSize="8" fontWeight="900" fill="#0F172A">UPPSC</text>
                </svg>
            </div>
        )
    }

    if (logoType === "ncert") {
        return (
            <div className="w-11 h-11 rounded-full bg-white border border-gray-300 dark:border-gray-700 flex items-center justify-center p-1 shadow-xs">
                <svg className="w-8 h-8" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="47" fill="#FEFCE8" stroke="#854D0E" strokeWidth="2" strokeDasharray="3 2" />
                    {/* NCERT 3 Interlocking Birds */}
                    <circle cx="50" cy="38" r="13" fill="none" stroke="#713F12" strokeWidth="2.5" />
                    <circle cx="39" cy="57" r="13" fill="none" stroke="#713F12" strokeWidth="2.5" />
                    <circle cx="61" cy="57" r="13" fill="none" stroke="#713F12" strokeWidth="2.5" />
                    <text x="50" y="90" textAnchor="middle" fontSize="8.5" fontWeight="900" fill="#713F12">NCERT</text>
                </svg>
            </div>
        )
    }

    if (logoType === "sbi") {
        return (
            <div className="w-11 h-11 rounded-full bg-[#005B96] flex items-center justify-center p-1.5 shadow-xs">
                <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center relative">
                    <span className="text-[11px] font-black text-white tracking-tighter">SBI</span>
                    <div className="absolute -bottom-1.5 w-1.5 h-3 bg-[#005B96]" />
                </div>
            </div>
        )
    }

    if (logoType === "ssc") {
        return (
            <div className="w-11 h-11 rounded-full bg-[#C92A2A] border-2 border-[#FFE066] flex items-center justify-center p-1 shadow-xs">
                <div className="w-7 h-7 rounded-full bg-white flex flex-col items-center justify-center text-[#C92A2A]">
                    <span className="text-[9px] font-black leading-none">SSC</span>
                    <span className="text-[6px] font-bold text-amber-700 leading-none">★</span>
                </div>
            </div>
        )
    }

    if (logoType === "rrb") {
        return (
            <div className="w-11 h-11 rounded-full bg-[#D9381E] border-2 border-white shadow-xs flex items-center justify-center p-1">
                <div className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center bg-white/10">
                    <span className="text-[8px] font-black text-white tracking-tight">RRB</span>
                </div>
            </div>
        )
    }

    if (logoType === "upsssc") {
        return (
            <div className="w-11 h-11 rounded-full bg-[#1E293B] border border-gray-200 flex items-center justify-center shadow-xs">
                <div className="w-7 h-7 rounded-full border border-gray-400 flex flex-col items-center justify-center text-white">
                    <span className="text-[7px] font-bold">UP</span>
                    <span className="text-[6px] font-semibold text-emerald-400">PET</span>
                </div>
            </div>
        )
    }

    if (logoType === "ibps") {
        return (
            <div className="w-11 h-11 rounded-full bg-[#0284C7] border border-sky-300 flex items-center justify-center text-white shadow-xs">
                <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black tracking-tight">IBPS</span>
                    <span className="text-[6px] text-sky-200 font-medium -mt-0.5">PO/CLK</span>
                </div>
            </div>
        )
    }

    return (
        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#1448d8] to-[#00A8FF] text-white flex items-center justify-center shadow-xs font-black text-xs">
            TEST
        </div>
    )
}

export default function TestSeriesPage() {
    const { data: session } = useSession()
    const canCreate = session?.user?.role === "TEACHER" || session?.user?.role === "ADMIN"
    const { selectedGoal, selectedGoals, selectedGoalIds, selectGoal, openGoalModal } = useGoal()
    const [selectedCategory, setSelectedCategory] = useState<string>("All")
    const [searchQuery, setSearchQuery] = useState<string>("")
    const [filterByGoal, setFilterByGoal] = useState<boolean>(true)
    const [savedSeries, setSavedSeries] = useState<string[]>([])
    const [activeModalSeries, setActiveModalSeries] = useState<TestSeriesItem | null>(null)
    const [isPassModalOpen, setIsPassModalOpen] = useState(false)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [seriesPackages, setSeriesPackages] = useState<TestSeriesItem[]>([])
    const [seriesLoading, setSeriesLoading] = useState(true)

    // Dynamic mistake notebook / solutions link based on selected goal
    const pyqSolutionLink = useMemo(() => {
        const gid = selectedGoal.id.toLowerCase()
        if (gid === "bpsc") return "/test-series/bpsc-72nd-2026/solutions"
        if (gid === "upsc") return "/test-series/upsc-prelims-2026/solutions"
        if (gid === "ssc" || gid === "govt-exams") return "/test-series/ssc-cgl-2026/solutions"
        if (gid === "class-10") return "/test-series/class-10-boards-2026/solutions"
        if (gid === "skills") return "/test-series/skills-dsa-faang-2026/solutions"
        return "/test-series/bpsc-72nd-2026/solutions"
    }, [selectedGoal.id])

    useEffect(() => {
        let active = true
        const goalQuery = selectedGoal?.id ? `goal=${encodeURIComponent(selectedGoal.id)}` : ""
        const url = filterByGoal
            ? `/api/exam/series/list${goalQuery ? `?${goalQuery}` : ""}`
            : "/api/exam/series/list?includeAll=true"
        fetch(url)
            .then((res) => res.json())
            .then((json) => { if (active && json.success && Array.isArray(json.data)) setSeriesPackages(json.data) })
            .catch(() => { if (active) setSeriesPackages([]) })
            .finally(() => { if (active) setSeriesLoading(false) })
        return () => { active = false }
    }, [selectedGoalIds, filterByGoal, selectedGoal?.id])

    const filteredSeries = useMemo(() => {
        let list = seriesPackages

        // Goal-based filtering / curation when viewing "All" (multi-goal OR logic)
        if (filterByGoal && selectedGoals.length > 0 && selectedCategory === "All") {
            const goalMatches = list.filter((item) => {
                const iGoal = (item.goalId || "").toLowerCase()
                const iTags = (item.tags || []).map(t => t.toLowerCase())
                const text = `${item.title} ${item.description || ""} ${item.category}`.toLowerCase()

                return selectedGoals.some((g) => {
                    const gid = g.id.toLowerCase()
                    const gName = g.name.toLowerCase()

                    if (gid === "upsc") {
                        if (text.includes("bpsc") || text.includes("bihar")) return false
                        return (iGoal === "upsc" || iTags.includes("upsc") || text.includes("upsc") || text.includes("civil services"))
                    }

                    if (iGoal === gid) return true

                    if (gid === "bpsc") {
                        return iGoal === "bpsc" || iTags.includes("bpsc") || text.includes("bpsc") || text.includes("bihar")
                    }
                    if (gid === "ssc" || gid === "govt-exams") {
                        return iGoal === "ssc" || iGoal === "govt-exams" || iTags.includes("ssc") || iTags.includes("govt-exams") ||
                            text.includes("ssc") || text.includes("cgl") || text.includes("banking") || text.includes("railway")
                    }
                    if (gid === "class-10") {
                        return iGoal === "class-10" || item.category === "Class 10" || text.includes("class 10") || text.includes("10th")
                    }
                    if (gid === "class-9") {
                        return iGoal === "class-9" || item.category === "Class 9" || text.includes("class 9") || text.includes("9th")
                    }
                    if (gid === "class-8") {
                        return iGoal === "class-8" || item.category === "Class 8" || text.includes("class 8") || text.includes("8th")
                    }
                    if (gid === "class-7") {
                        return iGoal === "class-7" || item.category === "Class 7" || text.includes("class 7") || text.includes("7th")
                    }
                    if (gid === "class-6") {
                        return iGoal === "class-6" || item.category === "Class 6" || text.includes("class 6") || text.includes("6th")
                    }
                    if (gid === "skills") {
                        return iGoal === "skills" || item.category === "Skill" || text.includes("coding") || text.includes("programming") || text.includes("python") || text.includes("dsa")
                    }

                    return iTags.includes(gid) || text.includes(gid) || text.includes(gName)
                })
            })

            list = goalMatches
        }

        return list.filter((item) => {
            const matchesCategory =
                selectedCategory === "All" ||
                item.category.toLowerCase() === selectedCategory.toLowerCase()

            const matchesSearch =
                item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.highlights.some((h) => h.toLowerCase().includes(searchQuery.toLowerCase()))

            return matchesCategory && matchesSearch
        })
    }, [selectedCategory, searchQuery, filterByGoal, selectedGoals, seriesPackages])

    const toggleSave = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setSavedSeries((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        )
    }

    return (
        <div className="space-y-6 pb-36 sm:pb-28 lg:pb-12">
            {/* Top Navigation Bar: Explore vs My Tests vs Leaderboards */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800">
                <div data-scroll-x="true" className="w-full sm:w-auto flex items-center gap-1.5 p-1 rounded-2xl bg-gray-100 dark:bg-gray-800/80 overflow-x-auto no-scrollbar snap-x">
                    <span className="shrink-0 px-3.5 sm:px-5 py-2 rounded-xl text-xs font-black bg-white dark:bg-[#071d33] text-sky-700 dark:text-sky-400 shadow-xs cursor-default whitespace-nowrap snap-start">
                        Explore Test Series
                    </span>
                    <Link
                        href="/test-series/my-tests"
                        className="shrink-0 flex items-center gap-1.5 px-3.5 sm:px-5 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors whitespace-nowrap snap-start"
                    >
                        <span>My Tests &amp; Performance</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    </Link>
                    <Link
                        href="/test-series/bpsc-72nd-2026/leaderboard"
                        className="shrink-0 flex items-center gap-1.5 px-3.5 sm:px-5 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors whitespace-nowrap snap-start"
                    >
                        <span>Live AIR Leaderboards</span>
                    </Link>
                </div>

                <Link
                    href="/my-tests"
                    className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline shrink-0"
                >
                    <span>My Mistake Notebook →</span>
                </Link>
            </div>

            {/* Unified Active Exam Target Card */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 via-indigo-500/10 to-blue-500/10 border border-teal-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    {/* LEFT: Exam Icon Tile */}
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-[#1448d8] to-[#1DB954] text-white flex items-center justify-center font-bold text-base sm:text-lg shadow-xs shrink-0">
                        <GoalIcon name={selectedGoal.icon} className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>

                    {/* CENTER */}
                    <div className="min-w-0 flex-1">
                        {/* Top row: badge + "Change ›" dropdown */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-800 dark:text-teal-300 border border-teal-500/30">
                                {selectedGoal.name}
                            </span>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 hover:underline flex items-center gap-0.5 cursor-pointer rounded-md px-1 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                                        aria-label="Change active exam target"
                                    >
                                        <span>Change</span>
                                        <ChevronRight className="h-3 w-3" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-56 p-1.5 shadow-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#071d33] rounded-xl z-50">
                                    <div className="px-2 py-1 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Active Targets
                                    </div>
                                    {selectedGoals.map((g) => {
                                        const isActive = selectedGoal.id === g.id
                                        return (
                                            <DropdownMenuItem
                                                key={g.id}
                                                onClick={() => {
                                                    selectGoal(g)
                                                }}
                                                className={`flex items-center justify-between px-2.5 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                                                    isActive
                                                        ? "bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300"
                                                        : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <GoalIcon name={g.icon} className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
                                                    <span className="truncate">{g.name}</span>
                                                </div>
                                                {isActive && (
                                                    <Check className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0 ml-2" />
                                                )}
                                            </DropdownMenuItem>
                                        )
                                    })}
                                    <DropdownMenuSeparator className="my-1 border-gray-100 dark:border-gray-800" />
                                    <DropdownMenuItem
                                        onClick={openGoalModal}
                                        className="flex items-center gap-2 px-2.5 py-2 text-xs font-bold text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg cursor-pointer"
                                    >
                                        <Plus className="h-4 w-4 shrink-0" />
                                        <span>Add exam target</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Title */}
                        <h2 className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white truncate mt-0.5">
                            {selectedGoal.fullName || selectedGoal.name} Curated Mocks
                        </h2>

                        {/* Subtitle */}
                        <p className="text-[11px] text-gray-600 dark:text-gray-400 truncate mt-0.5">
                            Curated test series and mock exams for your active target
                        </p>
                    </div>
                </div>

                {/* RIGHT: single action */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-teal-500/10">
                    {canCreate && (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-black shadow-xs transition-all flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
                        >
                            <Plus className="h-4 w-4 stroke-[3]" />
                            <span>Create Series Package</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setFilterByGoal(!filterByGoal)}
                        className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 hover:underline text-left sm:text-center py-1 sm:px-2 cursor-pointer rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    >
                        {filterByGoal ? "Show all exam tests →" : `Show only ${selectedGoal.name} →`}
                    </button>
                </div>
            </div>

            {/* Teacher Authored Tests Available Notification Banner */}
            {/* Top Pass Hero Banner - Compact & Clean */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#003B73] via-[#005B96] to-[#00A896] text-white shadow-lg p-4 sm:p-6 border border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                    <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-700 text-white uppercase tracking-wider">
                                PASS
                            </span>
                            <span className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                                Unlock All Exam Test Series with Pass
                            </span>
                        </div>
                        <p className="text-xs text-white/80 line-clamp-1">
                            Full-length mocks, sectional tests, AI analytics, AIR leaderboards
                        </p>
                    </div>

                    <div className="shrink-0">
                        <button
                            onClick={() => setIsPassModalOpen(true)}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px]"
                        >
                            <span>Get Pass</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Section Header with Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                    Test Series by Categories
                </h1>

                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search Test Series"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-9 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#071d33] text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00A8FF]/40 shadow-2xs transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Category Pills Row with data-scroll-x */}
            <div data-scroll-x="true" className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat
                    return (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                                isSelected
                                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                                    : "bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                            }`}
                        >
                            {cat}
                        </button>
                    )
                })}
            </div>

            {/* Full-width Test Series Grid */}
            <div className="w-full">
                    {seriesLoading ? (
                        <div className="p-12 text-center text-sm text-gray-500">Loading test series…</div>
                    ) : filteredSeries.length === 0 ? (
                        <div className="bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center shadow-xs">
                            <HelpCircle className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                            <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
                                No Test Series Found
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                                {seriesPackages.length === 0 ? "No test series available yet." : `No test series matched your search "${searchQuery}" in category "${selectedCategory}".`}
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                                {filterByGoal && (
                                    <button
                                        onClick={() => setFilterByGoal(false)}
                                        className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                                    >
                                        Show all exam tests
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setSelectedCategory("All")
                                        setSearchQuery("")
                                    }}
                                    className="px-4 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-xl cursor-pointer"
                                >
                                    Reset Filters
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                            {filteredSeries.map((item) => {
                                const isSaved = savedSeries.includes(item.id)

                                return (
                                    <div
                                        key={item.id}
                                        className="rounded-2xl border border-gray-200/90 dark:border-gray-800 bg-white dark:bg-[#071d33] shadow-xs hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col justify-between group"
                                    >
                                        {/* Card Top Header with Soft Lavender / Purple Gradient */}
                                        <div className="bg-gradient-to-b from-[#F3ECFF] via-[#F8F5FF] to-white dark:from-[#1E1938] dark:to-[#071d33] p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800/80">
                                            {/* Top Row: Exam Logo + User Count Badge */}
                                            <div className="flex items-center justify-between gap-2 mb-3.5">
                                                <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-900 shadow-2xs border border-purple-100 dark:border-purple-900/40 p-0.5 flex items-center justify-center flex-shrink-0">
                                                    <ExamLogo logoType={item.logoType} />
                                                </div>

                                                <div className="bg-white/95 dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 px-2.5 py-1 rounded-full text-[11px] font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1 shadow-2xs">
                                                    <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
                                                    <span>{item.users} Users</span>
                                                </div>
                                            </div>

                                            {/* Title */}
                                            <h3 className="text-sm sm:text-[15px] font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 min-h-[42px] group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors">
                                                {item.title}
                                            </h3>

                                            {/* Total Tests | Free Tests Row */}
                                            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-2 flex items-center gap-1.5 flex-wrap">
                                                <span>{item.totalTests} Total Tests</span>
                                                <span className="text-gray-400">|</span>
                                                <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">
                                                    {item.freeTests} Free Tests
                                                </span>
                                            </div>

                                            {/* Language Indicator */}
                                            <div className="flex items-center gap-1.5 text-xs text-sky-700 dark:text-sky-400 font-semibold mt-2">
                                                <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                                                <span className="truncate">{item.languages}</span>
                                            </div>
                                        </div>

                                        {/* Card Body: Highlights List */}
                                        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                                            <ul className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300 font-medium">
                                                {item.highlights.map((point, idx) => (
                                                    <li key={idx} className="flex items-start gap-2">
                                                        <span className="text-gray-400 font-bold leading-none mt-1">•</span>
                                                        <span className="line-clamp-1">{point}</span>
                                                    </li>
                                                ))}
                                            </ul>

                                            {/* Bottom Action Buttons: View Test Series + Add Button */}
                                            <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800/80">
                                                <Link
                                                    href={`/test-series/${item.id}`}
                                                    className="flex-1 py-2.5 px-4 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs sm:text-sm text-center shadow-xs transition-colors cursor-pointer flex items-center justify-center min-h-[44px]"
                                                >
                                                    View Test Series
                                                </Link>

                                                <button
                                                    onClick={(e) => toggleSave(item.id, e)}
                                                    className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                                                        isSaved
                                                            ? "border-emerald-700 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                                            : "border-sky-700 text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/20"
                                                    }`}
                                                    title={isSaved ? "Saved to your list" : "Save Test Series"}
                                                    aria-label="Add to saved test series"
                                                >
                                                    {isSaved ? (
                                                        <CheckCheck className="h-4 w-4 stroke-[2.5]" />
                                                    ) : (
                                                        <Plus className="h-4 w-4 stroke-[2.5]" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
            </div>

            {/* Test Series Detail Modal */}
            {activeModalSeries && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0">
                    <div className="bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <ExamLogo logoType={activeModalSeries.logoType} />
                                <div>
                                    <span className="text-[10px] font-black uppercase text-sky-700 dark:text-sky-400 tracking-wider">
                                        {activeModalSeries.category}
                                    </span>
                                    <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                                        {activeModalSeries.title}
                                    </h3>
                                </div>
                            </div>
                            <button
                                onClick={() => setActiveModalSeries(null)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                            {activeModalSeries.description}
                        </p>

                        <div className="grid grid-cols-3 gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 text-center">
                            <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">Total Tests</span>
                                <p className="text-lg font-black text-gray-900 dark:text-white">{activeModalSeries.totalTests}</p>
                            </div>
                            <div>
                                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase">Free Tests</span>
                                <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">{activeModalSeries.freeTests}</p>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">Active Learners</span>
                                <p className="text-lg font-black text-gray-900 dark:text-white">{activeModalSeries.users}</p>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                                Test Series Inclusions
                            </h4>
                            <div className="space-y-2">
                                {activeModalSeries.highlights.map((h, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 text-xs font-semibold text-gray-800 dark:text-gray-200"
                                    >
                                        <Check className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                                        <span>{h}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                            <Link
                                href={`/test-series/${activeModalSeries.id}`}
                                className="flex-1 py-3 px-4 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-sm text-center shadow-md transition-colors"
                            >
                                Start Free Mock Test
                            </Link>
                            <button
                                onClick={() => {
                                    setActiveModalSeries(null)
                                    setIsPassModalOpen(true)
                                }}
                                className="py-3 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm text-center shadow-md transition-colors"
                            >
                                Unlock Full Pass
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pass Membership Modal */}
            {isPassModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0">
                    <div className="bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
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

                            <p className="text-xs text-white/80">Unlimited access to UPSC, BPSC, School & Skill test series.</p>
                        </div>

                        <div className="space-y-2.5 text-xs text-gray-700 dark:text-gray-300">
                            <div className="flex items-center gap-2 font-semibold">
                                <Check className="h-4 w-4 text-[#00D084]" />
                                <span>Mock tests for UPSC, BPSC, School & Skill exams</span>
                            </div>
                            <div className="flex items-center gap-2 font-semibold">
                                <Check className="h-4 w-4 text-[#00D084]" />
                                <span>Previous Year Papers with instant detailed solutions</span>
                            </div>
                            <div className="flex items-center gap-2 font-semibold">
                                <Check className="h-4 w-4 text-[#00D084]" />
                                <span>National Percentile and All India Rank Leaderboards</span>
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

            {/* Create Test Series Package Modal */}
            {canCreate && isCreateModalOpen && (
                <CreateSeriesModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    defaultCategory={selectedCategory === "All" ? "UPSC" : selectedCategory}
                    onCreated={(newSeries) => {
                        setSeriesPackages((prev) => [newSeries, ...prev.filter((p) => p.id !== newSeries.id)])
                    }}
                />
            )}
        </div>
    )
}
