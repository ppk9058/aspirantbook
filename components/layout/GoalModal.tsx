"use client"

import React, { useState, useMemo, useEffect } from "react"
import { createPortal } from "react-dom"
import {
    ArrowLeft,
    X,
    Search,
    ChevronRight,
    Check,
    Sparkles,
    ChevronDown,
    Flame,
    Plus,
} from "lucide-react"
import { useGoal, Goal } from "@/components/providers/GoalProvider"
import GoalIcon from "@/components/layout/GoalIcon"

export default function GoalModal() {
    const {
        selectedGoal,
        selectedGoals,
        selectedGoalIds,
        allGoalsConfig,
        isGoalModalOpen,
        closeGoalModal,
        selectGoal,
        toggleGoal,
    } = useGoal()

    const [mounted, setMounted] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [isOtherOfferingsOpen, setIsOtherOfferingsOpen] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Prevent body scrolling when modal is open
    useEffect(() => {
        if (isGoalModalOpen) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = ""
        }
        return () => {
            document.body.style.overflow = ""
        }
    }, [isGoalModalOpen])

    // Reset search when modal opens/closes
    useEffect(() => {
        if (!isGoalModalOpen) {
            setSearchQuery("")
        }
    }, [isGoalModalOpen])

    // Keyboard support: Escape closes modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isGoalModalOpen) {
                closeGoalModal()
            }
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [isGoalModalOpen, closeGoalModal])

    // Filter popular goals
    const filteredPopular = useMemo(() => {
        if (!isGoalModalOpen) return allGoalsConfig.popularGoals
        if (!searchQuery.trim()) return allGoalsConfig.popularGoals
        const q = searchQuery.toLowerCase()
        return allGoalsConfig.popularGoals.filter(
            g =>
                g.name.toLowerCase().includes(q) ||
                (g.fullName && g.fullName.toLowerCase().includes(q)) ||
                g.tags.some(t => t.toLowerCase().includes(q))
        )
    }, [allGoalsConfig.popularGoals, searchQuery, isGoalModalOpen])

    // Filter categories & goals
    const filteredCategories = useMemo(() => {
        if (!isGoalModalOpen) return allGoalsConfig.categories
        if (!searchQuery.trim()) return allGoalsConfig.categories
        const q = searchQuery.toLowerCase()
        return allGoalsConfig.categories
            .map(cat => {
                const matchingGoals = cat.goals.filter(
                    g =>
                        g.name.toLowerCase().includes(q) ||
                        (g.tagline && g.tagline.toLowerCase().includes(q)) ||
                        g.tags.some(t => t.toLowerCase().includes(q))
                )
                const categoryMatches =
                    cat.title.toLowerCase().includes(q) ||
                    cat.description.toLowerCase().includes(q)

                return {
                    ...cat,
                    goals: categoryMatches ? cat.goals : matchingGoals,
                }
            })
            .filter(cat => cat.goals.length > 0)
    }, [allGoalsConfig.categories, searchQuery, isGoalModalOpen])

    if (!isGoalModalOpen || !mounted) return null

    const handleGoalClick = (goal: Goal, e: React.MouseEvent) => {
        // Multi-select toggle
        toggleGoal(goal)
    }

    const isGoalSelected = (goalId: string) => {
        return selectedGoalIds.includes(goalId.toLowerCase())
    }

    return createPortal(
        <div
            onClick={(e) => {
                if (e.target === e.currentTarget) closeGoalModal()
            }}
            className="fixed inset-0 z-[999999] overflow-y-auto bg-slate-950/75 backdrop-blur-md flex flex-col items-center justify-start sm:justify-center p-3 sm:p-6 pt-6 sm:pt-8 animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
        >
            {/* Modal Dialog Card */}
            <div className="relative w-full max-w-4xl h-[85vh] max-h-[85vh] m-auto bg-white dark:bg-[#07172B] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="shrink-0 px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#07172B] z-10 shadow-2xs">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-[#3AAFA9]/10 text-[#3AAFA9]">
                            <Sparkles className="h-4 w-4" />
                        </div>

                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                                    Select your Target Exams &amp; Goals
                                </h2>
                                <span className="bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                    Multi-Select Active
                                </span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                                Click any exam target to add or remove it from your curriculum filter ({selectedGoalIds.length} selected)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={closeGoalModal}
                            className="px-3.5 py-1.5 rounded-xl bg-[#3AAFA9] hover:bg-[#2d8a85] text-white text-xs font-bold transition-colors"
                        >
                            Done
                        </button>
                        <button
                            onClick={closeGoalModal}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Selected Targets Bar */}
                {selectedGoals.length > 0 && (
                    <div className="shrink-0 px-5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
                            Active Targets:
                        </span>
                        {selectedGoals.map((g) => (
                            <span
                                key={g.id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-700 shrink-0"
                            >
                                <Check className="h-3 w-3 stroke-[3]" />
                                <span>{g.name}</span>
                                {selectedGoalIds.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            toggleGoal(g)
                                        }}
                                        className="hover:text-red-600 ml-0.5"
                                        title={`Remove ${g.name}`}
                                    >
                                        &times;
                                    </button>
                                )}
                            </span>
                        ))}
                    </div>
                )}

                {/* Main Goal Selection View */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search your exam, class, or goal (e.g. UPSC, 10th, BPSC, SSC, AI)..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3AAFA9] focus:bg-white dark:focus:bg-slate-900 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Section 1: Popular Exams (Prominent Highlighted Cards) */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />
                            <span>Popular Exams &amp; Classes</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {filteredPopular.map(goal => {
                                const isSelected = isGoalSelected(goal.id)
                                return (
                                    <button
                                        key={goal.id}
                                        onClick={(e) => handleGoalClick(goal, e)}
                                        className={`relative group p-4 rounded-2xl border text-left transition-all overflow-hidden ${
                                            isSelected
                                                ? "bg-teal-50/90 dark:bg-teal-950/50 border-teal-500 shadow-sm ring-2 ring-teal-500"
                                                : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-teal-400 hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-800/80"
                                        }`}
                                    >
                                        {/* Selection indicator pill */}
                                        {isSelected ? (
                                            <span className="absolute top-2.5 right-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-[#3AAFA9] text-white">
                                                <Check className="h-3 w-3 stroke-[3]" />
                                            </span>
                                        ) : (
                                            <span className="absolute top-2.5 right-2.5 flex items-center justify-center w-5 h-5 rounded-full border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 group-hover:border-teal-400 group-hover:text-teal-500">
                                                <Plus className="h-3 w-3" />
                                            </span>
                                        )}

                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-200 mb-3 group-hover:scale-105 transition-transform shadow-xs">
                                            <GoalIcon name={goal.icon} className="h-5 w-5" />
                                        </div>

                                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight group-hover:text-[#3AAFA9] transition-colors">
                                            {goal.name}
                                        </h4>

                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                                            {goal.fullName || goal.category}
                                        </p>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Section 2: All Exams by Category */}
                    <div className="space-y-4 pt-2">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            All Categories
                        </h3>

                        <div className="space-y-4">
                            {filteredCategories.map(cat => (
                                <div
                                    key={cat.id}
                                    className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 bg-white dark:bg-slate-900/40 space-y-3"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                            <GoalIcon name={cat.icon} className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                                                {cat.title}
                                            </h4>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                {cat.description}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1">
                                        {cat.goals.map(g => {
                                            const isSelected = isGoalSelected(g.id)
                                            return (
                                                <button
                                                    key={g.id}
                                                    onClick={(e) => {
                                                        const fullGoal =
                                                            allGoalsConfig.popularGoals.find(
                                                                pg => pg.id === g.id
                                                            ) || {
                                                                ...g,
                                                                category: cat.title,
                                                            }
                                                        handleGoalClick(fullGoal as Goal, e)
                                                    }}
                                                    className={`p-3 rounded-xl border text-left transition-all ${
                                                        isSelected
                                                            ? "bg-teal-50 dark:bg-teal-950/40 border-teal-500 text-teal-900 dark:text-teal-200 shadow-2xs ring-1 ring-teal-500"
                                                            : "bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-teal-400"
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                                                            {g.name}
                                                        </span>
                                                        {isSelected ? (
                                                            <Check className="h-3 w-3 text-teal-600 stroke-[3]" />
                                                        ) : (
                                                            <Plus className="h-3 w-3 text-slate-400" />
                                                        )}
                                                    </div>
                                                    {g.tagline && (
                                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
                                                            {g.tagline}
                                                        </span>
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Section 3: Other Offerings (Collapsible Tray) */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                            onClick={() => setIsOtherOfferingsOpen(!isOtherOfferingsOpen)}
                            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                        >
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-amber-500" />
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    Other Offerings &amp; Foundation Series ({allGoalsConfig.otherOfferings?.length || 3})
                                </span>
                            </div>
                            <ChevronDown
                                className={`h-4 w-4 text-slate-400 transition-transform ${
                                    isOtherOfferingsOpen ? "rotate-180" : ""
                                }`}
                            />
                        </button>

                        {isOtherOfferingsOpen && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 animate-in fade-in duration-200">
                                {allGoalsConfig.otherOfferings?.map(offering => (
                                    <div
                                        key={offering.id}
                                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-1"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                {offering.badge}
                                            </span>
                                        </div>
                                        <h5 className="font-bold text-xs text-slate-900 dark:text-white pt-1">
                                            {offering.title}
                                        </h5>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {offering.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}
