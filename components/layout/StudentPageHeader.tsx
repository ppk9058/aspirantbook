"use client"

import React from "react"
import { useGoal } from "@/components/providers/GoalProvider"
import GoalIcon from "@/components/layout/GoalIcon"
import { formatActiveGoalLabel } from "@/lib/goals/active-goal-label"

interface StudentPageHeaderProps {
    title: string
    subtitle?: string
    showGoal?: boolean
}

export default function StudentPageHeader({
    title,
    subtitle,
    showGoal = true,
}: StudentPageHeaderProps) {
    const { selectedGoal, selectedGoals, isLoaded, openGoalModal } = useGoal()

    return (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5 dark:border-blue-900 dark:bg-blue-950/40">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-extrabold tracking-tight text-[#1448d8] sm:text-3xl dark:text-blue-300">
                        {title}
                    </h1>
                    {subtitle ? (
                        <p className="mt-0.5 text-xs text-slate-600 sm:text-sm dark:text-slate-300">
                            {subtitle}
                        </p>
                    ) : null}
                </div>

                {showGoal ? (
                    isLoaded ? (
                        <div className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-blue-200 bg-white p-3 shadow-2xs sm:w-auto sm:max-w-sm dark:border-blue-900 dark:bg-slate-900">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1448d8]/10 text-[#1448d8] dark:bg-blue-400/10 dark:text-blue-300">
                                <GoalIcon name={selectedGoal.icon} className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-extrabold text-slate-900 dark:text-white">
                                    {formatActiveGoalLabel(selectedGoals)}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Active goal
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={openGoalModal}
                                aria-label="Change exam goal"
                                className="min-h-[44px] shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-[#1448d8] transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1448d8] focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:min-h-[36px] dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200 dark:hover:bg-blue-900/60 dark:focus-visible:ring-blue-300 dark:focus-visible:ring-offset-slate-900"
                            >
                                Change goal
                            </button>
                        </div>
                    ) : (
                        <div
                            className="flex w-full animate-pulse items-center gap-3 rounded-xl border border-blue-200 bg-white p-3 shadow-2xs sm:w-auto sm:min-w-[230px] dark:border-blue-900 dark:bg-slate-900"
                            aria-label="Loading goal"
                        >
                            <div className="h-9 w-9 shrink-0 rounded-lg bg-blue-100 dark:bg-slate-800" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 w-24 rounded bg-blue-100 dark:bg-slate-800" />
                                <div className="h-2.5 w-32 rounded bg-blue-100 dark:bg-slate-800" />
                            </div>
                        </div>
                    )
                ) : null}
            </div>
        </div>
    )
}
