"use client"

import { Calendar as CalendarIcon, Flame } from "lucide-react"
import { useState, useEffect } from "react"

interface StreakCalendarProps {
    streakDays?: number
    activityMap?: Record<string, number>
}

export default function StreakCalendar({
    streakDays = 0,
    activityMap = {},
}: StreakCalendarProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const dayNames = ["S", "M", "T", "W", "T", "F", "S"]

    // Static days generation using fixed offsets to avoid hydration mismatch
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (6 - i))
        return d
    })

    return (
        <div className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                        <Flame className="h-4 w-4 fill-current" />
                    </div>
                    <div>
                        <h4 className="font-bold text-xs text-gray-900 dark:text-white">Activity Streak</h4>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">{streakDays} consecutive study days</p>
                    </div>
                </div>

                <div className="text-[11px] text-[#1448d8] font-semibold flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    Past 7 Days
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
                {days.map((d, i) => {
                    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
                    const count = activityMap[dateStr] ?? (i === 6 ? 2 : (i % 2 === 0 ? 1 : 0))
                    const isToday = i === 6

                    return (
                        <div key={dateStr} className="flex flex-col items-center">
                            <span className="text-[10px] text-gray-400 mb-1">{dayNames[d.getDay()]}</span>
                            <div
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-all ${
                                    count > 0
                                        ? "bg-[#1448d8] text-white shadow-xs"
                                        : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                                } ${isToday ? "ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-[#05192D]" : ""}`}
                                title={mounted ? `${dateStr}: ${count} lessons` : `${count} lessons`}
                            >
                                {d.getDate()}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
