"use client"

import React from "react"
import { ChevronDown, Compass } from "lucide-react"
import { useGoal } from "@/components/providers/GoalProvider"
import GoalIcon from "@/components/layout/GoalIcon"

export default function GoalSelectorButton() {
    const { selectedGoal, selectedSubGoal, openGoalModal } = useGoal()

    return (
        <button
            onClick={openGoalModal}
            onMouseEnter={() => {
                void import("@/components/layout/GoalModal")
            }}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700/80 hover:border-gray-300 dark:hover:border-gray-600 transition-all text-left shadow-2xs group flex-shrink-0"
            title="Click to switch your Goal / Cohort"
            aria-label="Switch Goal"
        >
            <div className="w-6 h-6 rounded-lg bg-[#3AAFA9]/15 text-[#2d8a85] dark:text-[#3AAFA9] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <GoalIcon name={selectedGoal.icon} className="h-3.5 w-3.5" />
            </div>

            <div className="flex flex-col pr-1">
                <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 leading-none tracking-wider hidden sm:block">
                    Goal
                </span>
                <div className="flex items-center gap-1.5 mt-0.5 sm:mt-0">
                    <span className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white tracking-tight truncate max-w-[90px] sm:max-w-[130px]">
                        {selectedGoal.name}
                    </span>
                    {selectedSubGoal && (
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[80px] hidden md:inline">
                            • {selectedSubGoal.name.split(" ")[0]}
                        </span>
                    )}
                </div>
            </div>

            <ChevronDown className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors flex-shrink-0" />
        </button>
    )
}
