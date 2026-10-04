"use client"

import { Target, Flame, CheckCircle, ArrowRight } from "lucide-react"
import Link from "next/link"

interface DailyGoalCardProps {
    streak: number
    minutesSpentToday?: number
    goalMinutes?: number
}

export default function DailyGoalCard({
    streak = 0,
    minutesSpentToday = 15,
    goalMinutes = 30,
}: DailyGoalCardProps) {
    const percentage = Math.min(100, Math.round((minutesSpentToday / goalMinutes) * 100))
    const isCompleted = percentage >= 100

    return (
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-[#05192D] dark:to-[#0a2540] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Left Info */}
                <div className="flex items-start gap-3.5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isCompleted
                            ? "bg-[#1DB954]/20 text-[#1DB954]"
                            : "bg-[#3AAFA9]/15 text-[#3AAFA9]"
                    }`}>
                        {isCompleted ? <CheckCircle className="h-6 w-6" /> : <Target className="h-6 w-6" />}
                    </div>

                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                                {isCompleted ? "Daily Goal Achieved! 🎉" : "Today's Study Goal"}
                            </h3>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-800">
                                <Flame className="h-3 w-3 fill-current" />
                                {streak} day{streak === 1 ? "" : "s"}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {minutesSpentToday} mins studied of your {goalMinutes} min daily target.
                        </p>
                    </div>
                </div>

                {/* Right Progress & Quick Action */}
                <div className="flex items-center gap-4 sm:self-center">
                    <div className="w-28 sm:w-36">
                        <div className="flex justify-between text-[11px] font-medium mb-1 text-gray-600 dark:text-gray-300">
                            <span>Progress</span>
                            <span className="font-bold text-[#3AAFA9]">{percentage}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#3AAFA9] to-[#1DB954] transition-all duration-500 rounded-full"
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                    </div>

                    <Link
                        href="/courses"
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#3AAFA9] hover:bg-[#2d8a85] rounded-lg transition-colors whitespace-nowrap"
                    >
                        <span>Learn</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
            </div>
        </div>
    )
}
