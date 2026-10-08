"use client"

import React from "react"
import { Plus, Check, Target, X } from "lucide-react"
import { useGoal, Goal } from "@/components/providers/GoalProvider"
import GoalIcon from "@/components/layout/GoalIcon"

interface GoalSelectorBarProps {
    title?: string
    subtitle?: string
    className?: string
}

export function GoalSelectorBar({
    title = "Your Target Exams & Goals",
    subtitle = "Showing curated tests, courses, tutorials, and previous year papers matching your active targets",
    className = "",
}: GoalSelectorBarProps) {
    const {
        selectedGoals,
        selectedGoalIds,
        allGoalsConfig,
        openGoalModal,
        toggleGoal,
        isLoaded,
    } = useGoal()

    if (!isLoaded) return null

    return (
        <div
            data-testid="shared-goal-selector-bar"
            className={`bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3 ${className}`}
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                        <Target className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-extrabold text-gray-900 dark:text-white truncate">
                            {title}
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                            {subtitle}
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={openGoalModal}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800 text-xs font-bold transition-all shadow-2xs self-start sm:self-auto shrink-0"
                    aria-label="Add or switch exam targets"
                >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Add exam target</span>
                </button>
            </div>

            {/* Active Target Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {selectedGoals.map((g) => (
                    <span
                        key={g.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-700 shadow-2xs"
                    >
                        <GoalIcon name={g.icon} className="w-3.5 h-3.5" />
                        <span>{g.name}</span>
                        {selectedGoalIds.length > 1 && (
                            <button
                                type="button"
                                data-remove-goal={g.id}
                                onClick={() => toggleGoal(g)}
                                className="text-teal-500 hover:text-red-600 transition-colors ml-0.5 p-0.5"
                                title={`Remove ${g.name}`}
                                aria-label={`Remove ${g.name}`}
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </span>
                ))}
            </div>
        </div>
    )
}
