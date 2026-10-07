"use client"

import React from "react"
import { ChevronDown, Plus } from "lucide-react"
import { useGoal } from "@/components/providers/GoalProvider"
import GoalIcon from "@/components/layout/GoalIcon"

export default function GoalSelectorButton() {
    const { selectedGoal, selectedGoals, selectedGoalIds, isLoaded, openGoalModal } = useGoal()

    if (!isLoaded) {
        return (
            <div
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80 shadow-2xs min-w-0 animate-pulse"
                aria-label="Loading Goal..."
            >
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gray-200 dark:bg-gray-700" />
                <div className="flex flex-col pr-0.5 sm:pr-1 min-w-0">
                    <span className="text-[10px] uppercase font-bold text-gray-300 dark:text-gray-600 leading-none hidden sm:block">
                        Goals
                    </span>
                    <div className="h-3 w-14 sm:w-20 bg-gray-200 dark:bg-gray-700 rounded-sm mt-1" />
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
            </div>
        )
    }

    const multiCount = selectedGoalIds.length > 1 ? ` +${selectedGoalIds.length - 1}` : ""

    return (
        <button
            onClick={openGoalModal}
            onMouseEnter={() => {
                void import("@/components/layout/GoalModal")
            }}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700/80 hover:border-gray-300 dark:hover:border-gray-600 transition-all text-left shadow-2xs group min-w-0"
            title="Click to add or switch your Target Exams & Goals"
            aria-label="Switch or Add Goals"
        >
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-[#3AAFA9]/15 text-[#2d8a85] dark:text-[#3AAFA9] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <GoalIcon name={selectedGoal.icon} className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </div>

            <div className="flex flex-col pr-0.5 sm:pr-1 min-w-0">
                <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 leading-none tracking-wider hidden sm:block">
                    Target {selectedGoalIds.length > 1 ? `(${selectedGoalIds.length})` : "Goal"}
                </span>
                <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5 sm:mt-0 min-w-0">
                    <span className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white tracking-tight truncate max-w-[85px] sm:max-w-[140px]">
                        {selectedGoal.name}{multiCount}
                    </span>
                </div>
            </div>

            <ChevronDown className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors flex-shrink-0" />
        </button>
    )
}
