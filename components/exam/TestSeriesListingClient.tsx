"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import Link from "next/link"
import {
    Search,
    Check,
    Zap,
    Plus,
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
import { useGoal, Goal } from "@/components/providers/GoalProvider"
import GoalIcon from "@/components/layout/GoalIcon"
import { cn, formatCount } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SHOW_PREMIUM_PLAN } from "@/lib/config/premium"
import PassPurchaseModal from "@/components/pass/PassPurchaseModal"
import { usePassPurchaseModal } from "@/lib/payments/usePassPurchaseModal"
import { usePassStatus } from "@/lib/auth/usePassStatus"

import {
    ExamLogo,
    TestSeriesGrid,
    type TestSeriesItem,
} from "@/components/exam/TestSeriesCards"

export type { TestSeriesItem }

const CreateSeriesModal = dynamic(() => import("@/components/exam/CreateSeriesModal"), {
    ssr: false,
})


import {
    getSeriesCacheKey,
    seriesModuleCache,
    SERIES_CACHE_TTL_MS,
} from "@/lib/exam/series-cache"
import { hasPersistedGoalSelection } from "@/lib/goals/goal-storage"

interface CategoryChip {
    id: string
    label: string
}

function isItemMatchingChip(item: TestSeriesItem, chipId: string): boolean {
    if (chipId === "All") return true
    const normalizedChip = chipId.trim().toLowerCase()
    const itemGoalId = (item.goalId || "").trim().toLowerCase()
    const itemCategorySlug = (item.category || "").trim().toLowerCase().replace(/\s+/g, "-")
    const itemCategoryRaw = (item.category || "").trim().toLowerCase()
    const itemSlug = (item.slug || item.id || "").trim().toLowerCase()
    const tags = Array.isArray(item.tags) ? item.tags.map(t => t.trim().toLowerCase()) : []

    // Exact matching only - no substring collision between "bpsc" and "bpsc-tre"
    return (
        itemGoalId === normalizedChip ||
        itemCategorySlug === normalizedChip ||
        itemCategoryRaw === normalizedChip ||
        tags.includes(normalizedChip) ||
        itemSlug === normalizedChip ||
        (normalizedChip === "bpsc" && itemSlug.startsWith("bpsc-") && !itemSlug.startsWith("bpsc-tre")) ||
        (normalizedChip !== "bpsc" && itemSlug.startsWith(`${normalizedChip}-`))
    )
}

export default function TestSeriesListingClient({
    initialSeries = [],
}: {
    initialSeries?: TestSeriesItem[]
}) {
    const { data: session } = useSession()
    const canCreate = session?.user?.role === "TEACHER" || session?.user?.role === "ADMIN"
    const {
        selectedGoal,
        selectedGoals,
        selectedGoalIds,
        selectGoal,
        toggleGoal,
        openGoalModal,
        isLoaded,
        allGoalsConfig,
    } = useGoal()
    const [selectedCategory, setSelectedCategory] = useState<string>("All")
    const prevGoalIdRef = useRef<string | null>(null)

    // Reset category chip to All when active goals change
    useEffect(() => {
        if (!isLoaded) return
        const currentKey = selectedGoalIds.slice().sort().join(",")
        if (currentKey && currentKey !== prevGoalIdRef.current) {
            prevGoalIdRef.current = currentKey
            setSelectedCategory("All")
        }
    }, [selectedGoalIds, isLoaded])

    // Keep a list of exam targets available in the switcher
    // Includes currently selected goals, plus popular goals (UPSC, BPSC, etc.) so user can toggle them directly
    const availableTargets = useMemo(() => {
        const map = new Map<string, Goal>()
        // 1. Add all currently selected goals
        selectedGoals.forEach((g) => {
            if (g && g.id) map.set(g.id.toLowerCase(), g)
        })
        // 2. Add common popular exam targets from config
        const popular = (allGoalsConfig?.popularGoals || []) as Goal[]
        popular.forEach((g) => {
            if (g && g.id && !map.has(g.id.toLowerCase())) {
                map.set(g.id.toLowerCase(), g)
            }
        })
        return Array.from(map.values())
    }, [selectedGoals, allGoalsConfig?.popularGoals])

    const [searchQuery, setSearchQuery] = useState<string>("")
    const [filterByGoal, setFilterByGoal] = useState<boolean>(true)
    const [savedSeries, setSavedSeries] = useState<string[]>([])
    const [activeModalSeries, setActiveModalSeries] = useState<TestSeriesItem | null>(null)
    // Database-backed pass entitlement (never session role / localStorage).
    // While it is loading the surfaces below show a neutral state.
    const passStatus = usePassStatus()
    const passPending = passStatus.isLoading || passStatus.error

    const {
        isOpen: isPassModalOpen,
        openPassModal,
        closePassModal,
    } = usePassPurchaseModal({ hasActivePass: passStatus.hasActivePass })
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [seriesPackages, setSeriesPackages] = useState<TestSeriesItem[]>(initialSeries)
    const [seriesLoading, setSeriesLoading] = useState(initialSeries.length === 0)
    // Server-rendered series are already on screen (and in the crawler HTML).
    // The first client effect keeps them and only personalises - a goal-filtered
    // refetch - when this visitor actually saved an exam target.
    const skipInitialFetchRef = useRef(initialSeries.length > 0)

    // Dynamic mistake notebook / solutions link based on selected goal
    const pyqSolutionLink = useMemo(() => {
        const gid = selectedGoal?.id?.toLowerCase() || ""
        if (gid === "bpsc") return "/test-series/bpsc-72nd-2026/solutions"
        if (gid === "upsc") return "/test-series/upsc-prelims-2026/solutions"
        if (gid === "ssc" || gid === "govt-exams") return "/test-series/ssc-cgl-2026/solutions"
        if (gid === "class-10") return "/test-series/class-10-boards-2026/solutions"
        if (gid === "skills") return "/test-series/skills-dsa-faang-2026/solutions"
        return "/test-series/bpsc-72nd-2026/solutions"
    }, [selectedGoal?.id])

    useEffect(() => {
        if (!isLoaded) return
        if (skipInitialFetchRef.current) {
            skipInitialFetchRef.current = false
            // No saved target: the server-rendered catalogue is the final list,
            // so guests and crawlers never trigger a redundant refetch.
            if (!hasPersistedGoalSelection()) return
        }
        let active = true

        const activeGoalsParam = selectedGoalIds.length > 0
            ? selectedGoalIds.join(",")
            : (selectedGoal?.id || "")
        const goalQuery = activeGoalsParam ? `goal=${encodeURIComponent(activeGoalsParam)}` : ""
        const url = filterByGoal
            ? `/api/exam/series/list${goalQuery ? `?${goalQuery}` : ""}`
            : "/api/exam/series/list?includeAll=true"

        const cacheKey = getSeriesCacheKey(session?.user?.id, selectedGoalIds, filterByGoal)
        const cached = seriesModuleCache.get(cacheKey)

        if (cached && Date.now() - cached.timestamp < SERIES_CACHE_TTL_MS) {
            setSeriesPackages(cached.data)
            setSeriesLoading(false)
            return () => { active = false }
        }

        setSeriesLoading(true)
        fetch(url)
            .then((res) => res.json())
            .then((json) => {
                if (active && json.success && Array.isArray(json.data)) {
                    seriesModuleCache.set(cacheKey, { data: json.data, timestamp: Date.now() })
                    setSeriesPackages(json.data)
                }
            })
            .catch((error) => {
                if (!active) return
                // Never blank the catalogue on a failed personalisation call:
                // keep what is on screen (the server-rendered list), so a goal
                // refetch error can not remove cards the crawler already saw.
                console.error("[test-series] goal-filtered refetch failed; keeping the current list", error)
            })
            .finally(() => { if (active) setSeriesLoading(false) })
        return () => { active = false }
    }, [isLoaded, selectedGoalIds, filterByGoal, selectedGoal?.id, session?.user?.id])

    const dynamicChips = useMemo<CategoryChip[]>(() => {
        const chips: CategoryChip[] = [{ id: "All", label: "All" }]

        if (filterByGoal) {
            // Mode A: One chip per selected target in selectedGoals
            selectedGoals.forEach((g) => {
                if (!g || !g.id) return
                const gid = g.id.toLowerCase()
                // Count series matching this target exactly
                const count = seriesPackages.filter((item) => isItemMatchingChip(item, gid)).length
                // Hide chips with zero tests
                if (count > 0) {
                    chips.push({
                        id: gid,
                        label: g.name,
                    })
                }
            })
        } else {
            // Mode B: When "Show all exam tests" is active, build chips from categories actually present in fetched series
            const categoryMap = new Map<string, string>() // normalizedId -> displayLabel
            seriesPackages.forEach((item) => {
                const label = item.category || item.examName || "General"
                const normalizedId = (item.goalId || label).toLowerCase().replace(/\s+/g, "-")
                if (!categoryMap.has(normalizedId)) {
                    categoryMap.set(normalizedId, label)
                }
            })

            categoryMap.forEach((label, id) => {
                const count = seriesPackages.filter((item) => isItemMatchingChip(item, id)).length
                if (count > 0) {
                    chips.push({ id, label })
                }
            })
        }

        return chips
    }, [filterByGoal, selectedGoals, seriesPackages])

    // If the selected chip disappears after the goal or target set changes (e.g. a target is removed), reset to "All"
    useEffect(() => {
        if (selectedCategory !== "All") {
            const stillExists = dynamicChips.some(
                (c) => c.id.toLowerCase() === selectedCategory.toLowerCase()
            )
            if (!stillExists) {
                setSelectedCategory("All")
            }
        }
    }, [dynamicChips, selectedCategory])

    const filteredSeries = useMemo(() => {
        return seriesPackages.filter((item) => {
            // Hide series with 0 tests from public/student listings
            if (item.totalTests <= 0) return false

            const matchesCategory =
                selectedCategory === "All" ||
                isItemMatchingChip(item, selectedCategory)

            const matchesSearch =
                searchQuery.trim() === "" ||
                item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (Array.isArray(item.highlights) && item.highlights.some((h) => h.toLowerCase().includes(searchQuery.toLowerCase())))

            return matchesCategory && matchesSearch
        })
    }, [selectedCategory, searchQuery, seriesPackages])

    const toggleSave = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setSavedSeries((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        )
    }

    return (
        <div className="space-y-4 sm:space-y-5">
            {/* Top Navigation Bar: Explore vs My Tests vs Leaderboards */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800">
                <div data-scroll-x="true" className="w-full sm:w-auto flex items-center gap-1.5 p-1 rounded-2xl bg-gray-100 dark:bg-gray-800/80 overflow-x-auto no-scrollbar snap-x">
                    <span className="shrink-0 px-3.5 sm:px-5 py-2 rounded-xl text-xs font-black bg-white dark:bg-[#071d33] text-sky-700 dark:text-sky-400 shadow-xs cursor-default whitespace-nowrap snap-start select-none">
                        Explore Test Series
                    </span>
                    <Link
                        href="/test-series/my-tests"
                        className="shrink-0 flex items-center gap-1.5 px-3.5 sm:px-5 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors whitespace-nowrap snap-start select-none"
                    >
                        <span>My Tests &amp; Performance</span>
                    </Link>
                    <Link
                        href="/test-series/bpsc-72nd-2026/leaderboard"
                        className="shrink-0 flex items-center gap-1.5 px-3.5 sm:px-5 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors whitespace-nowrap snap-start select-none"
                    >
                        <span>Live AIR Leaderboards</span>
                    </Link>
                </div>

                <Link
                    href="/my-tests"
                    className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline shrink-0 select-none"
                >
                    <span>My Mistake Notebook →</span>
                </Link>
            </div>

            {/* Unified Active Exam Target Card */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 via-indigo-500/10 to-blue-500/10 border border-teal-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* LEFT: Exam Icon Tile */}
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-[#1448d8] to-[#1DB954] text-white flex items-center justify-center font-bold text-base sm:text-lg shadow-xs shrink-0">
                        <GoalIcon name={selectedGoal.icon} className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>

                    {/* CENTER */}
                    <div className="min-w-0 flex-1 space-y-1">
                        {/* Top row: Multi-target chips + "Change or add exam" dropdown */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {selectedGoals.map((g) => {
                                const isOnlyTarget = selectedGoals.length <= 1
                                return (
                                    <div
                                        key={g.id}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 text-[11px] font-bold text-teal-900 dark:text-teal-200 select-none"
                                    >
                                        <span>{g.name}</span>
                                        <button
                                            type="button"
                                            disabled={isOnlyTarget}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                if (isOnlyTarget) return
                                                toggleGoal(g)
                                            }}
                                            title={isOnlyTarget ? "At least one exam target is required." : `Remove ${g.name}`}
                                            aria-label={isOnlyTarget ? "At least one exam target is required." : `Remove ${g.name}`}
                                            className={cn(
                                                "rounded-xs p-0.5 transition-colors focus:outline-none",
                                                isOnlyTarget
                                                    ? "opacity-40 cursor-not-allowed text-teal-700/60 dark:text-teal-400/50"
                                                    : "cursor-pointer hover:bg-teal-200/80 dark:hover:bg-teal-900 text-teal-800 dark:text-teal-300 hover:text-teal-950 dark:hover:text-white"
                                            )}
                                        >
                                            <X className="h-3 w-3 stroke-[2.5]" />
                                        </button>
                                    </div>
                                )
                            })}

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        className="text-xs font-bold text-teal-800 dark:text-teal-300 hover:text-teal-950 dark:hover:text-teal-100 hover:underline flex items-center gap-0.5 cursor-pointer rounded-md px-1 py-0.5 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
                                        aria-label="Change or add exam targets"
                                    >
                                        <span>Change or add exam</span>
                                        <ChevronRight className="h-3 w-3" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="start"
                                    className="w-64 max-w-[calc(100vw-32px)] p-1.5 shadow-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#071d33] rounded-xl z-50"
                                >
                                    <div className="px-2 py-1 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Target Exams
                                    </div>
                                    <div className="max-h-60 overflow-y-auto space-y-0.5 py-0.5">
                                        {availableTargets.map((g) => {
                                            const isChecked = selectedGoalIds.includes(g.id.toLowerCase())
                                            const isOnlyChecked = isChecked && selectedGoalIds.length <= 1

                                            return (
                                                <DropdownMenuItem
                                                    key={g.id}
                                                    onSelect={(e) => {
                                                        e.preventDefault()
                                                        if (isOnlyChecked) return
                                                        toggleGoal(g)
                                                    }}
                                                    className={cn(
                                                        "flex items-center justify-between px-2.5 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors select-none",
                                                        isChecked
                                                            ? "bg-teal-50/80 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200"
                                                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div
                                                            className={cn(
                                                                "h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                                                                isChecked
                                                                    ? "bg-teal-600 border-teal-600 text-white"
                                                                    : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                                                            )}
                                                        >
                                                            {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                                                        </div>
                                                        <GoalIcon name={g.icon} className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
                                                        <span className="truncate">{g.name}</span>
                                                    </div>
                                                    {isOnlyChecked && (
                                                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal ml-2">
                                                            Required
                                                        </span>
                                                    )}
                                                </DropdownMenuItem>
                                            )
                                        })}
                                    </div>
                                    <DropdownMenuSeparator className="my-1 border-gray-100 dark:border-gray-800" />
                                    <DropdownMenuItem
                                        onClick={openGoalModal}
                                        className="flex items-center gap-2 px-2.5 py-2 text-xs font-bold text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg cursor-pointer select-none"
                                    >
                                        <Plus className="h-4 w-4 shrink-0" />
                                        <span>Add exam target</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Title */}
                        <h2 className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white truncate mt-0.5">
                            {selectedGoals.length > 1
                                ? "Your Exam Targets"
                                : `${selectedGoal.fullName || selectedGoal.name} Curated Mocks`}
                        </h2>

                        {/* Subtitle */}
                        <p className="text-[11px] text-gray-700 dark:text-gray-300 truncate mt-0.5">
                            {selectedGoals.length > 1
                                ? "Curated test series and mock exams for your active targets"
                                : "Curated test series and mock exams for your active target"}
                        </p>
                    </div>
                </div>

                {/* RIGHT: single action */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-teal-500/10">
                    {canCreate && (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-black shadow-xs transition-all flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer select-none"
                        >
                            <Plus className="h-4 w-4 stroke-[3]" />
                            <span>Create Series Package</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setFilterByGoal(!filterByGoal)}
                        className="text-xs font-bold text-teal-800 dark:text-teal-300 hover:text-teal-950 dark:hover:text-teal-100 hover:underline text-left sm:text-center py-1 sm:px-2 cursor-pointer select-none rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 shrink-0"
                    >
                        {filterByGoal
                            ? "Show all exam tests →"
                            : selectedGoals.length > 1
                                ? "Show only your targets →"
                                : `Show only ${selectedGoal.name} →`}
                    </button>
                </div>
            </div>

            {/* Teacher Authored Tests Available Notification Banner */}
            {/* Top Pass Hero Banner - Compact & Clean (Premium only).
                Hidden for pass holders and never rendered as "Get Pass" while
                the database value is still loading. */}
            {SHOW_PREMIUM_PLAN && !passStatus.hasActivePass && (
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

                    <div className="shrink-0 flex items-center gap-3">
                        <span className="text-xs sm:text-sm font-black text-amber-300">
                            ₹499 / year
                        </span>
                        <button
                            onClick={(e) => openPassModal(e.currentTarget)}
                            disabled={passPending}
                            aria-busy={passPending}
                            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5 min-h-[44px] ${passPending ? "opacity-70 cursor-wait" : "cursor-pointer"}`}
                        >
                            <span>{passPending ? "Checking access…" : "Get Pass"}</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </div>
            )}

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

            {/* Dynamic Category Chips Row (36 to 40px height) */}
            <div className="flex flex-wrap items-center gap-2 py-0.5">
                {dynamicChips.map((chip) => {
                    const isSelected =
                        selectedCategory === chip.id ||
                        selectedCategory.toLowerCase() === chip.id.toLowerCase()

                    return (
                        <button
                            key={chip.id}
                            type="button"
                            onClick={() => setSelectedCategory(chip.id)}
                            className={cn(
                                "flex-shrink-0 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#071d33] min-h-[38px] h-9 sm:h-10 flex items-center justify-center",
                                isSelected
                                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                                    : "bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                            )}
                        >
                            {chip.label}
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
                                {searchQuery
                                    ? `No test series matched your search "${searchQuery}".`
                                    : selectedCategory !== "All"
                                        ? `No test series for ${dynamicChips.find(c => c.id.toLowerCase() === selectedCategory.toLowerCase())?.label || selectedCategory} yet.`
                                        : filterByGoal
                                            ? `No test series for ${selectedGoals.length > 1 ? "your targets" : selectedGoal?.name || "your target"} yet.`
                                            : "No test series available yet."}
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                                {selectedCategory !== "All" && (
                                    <button
                                        onClick={() => {
                                            setSelectedCategory("All")
                                            setSearchQuery("")
                                        }}
                                        className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                                    >
                                        View All Series
                                    </button>
                                )}
                                {filterByGoal && (
                                    <button
                                        onClick={() => {
                                            setSelectedCategory("All")
                                            setSearchQuery("")
                                            setFilterByGoal(false)
                                        }}
                                        className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl cursor-pointer"
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
                        <TestSeriesGrid
                            series={filteredSeries}
                            savedSeries={savedSeries}
                            onToggleSave={toggleSave}
                        />
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
                            {SHOW_PREMIUM_PLAN && !passStatus.hasActivePass && (
                                <button
                                    onClick={() => {
                                        setActiveModalSeries(null)
                                        openPassModal()
                                    }}
                                    disabled={passPending}
                                    aria-busy={passPending}
                                    className={`py-3 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm text-center shadow-md transition-colors ${passPending ? "opacity-70 cursor-wait" : ""}`}
                                >
                                    {passPending ? "Checking access…" : "Unlock Full Pass"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Pass Membership Modal (Premium only) */}
            {SHOW_PREMIUM_PLAN && (
                <PassPurchaseModal
                    isOpen={isPassModalOpen}
                    onClose={closePassModal}
                />
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
