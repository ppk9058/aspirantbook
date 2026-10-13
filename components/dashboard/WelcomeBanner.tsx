"use client"

import { Sparkles, Flame, PlayCircle } from "lucide-react"
import Link from "next/link"

interface WelcomeBannerProps {
    user: {
        name: string | null
        level: number
        xp: number
        streak: number
    } | null
}

export default function WelcomeBanner({ user }: WelcomeBannerProps) {
    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return "Good morning"
        if (hour < 18) return "Good afternoon"
        return "Good evening"
    }

    const currentLevel = user?.level || 1
    const currentXP = user?.xp || 0
    const xpForCurrentLevel = (currentLevel - 1) * 100
    const xpForNextLevel = currentLevel * 100
    const xpInCurrentLevel = Math.max(0, currentXP - xpForCurrentLevel)
    const xpNeededForLevel = Math.max(1, xpForNextLevel - xpForCurrentLevel)
    const xpPercentage = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForLevel) * 100))
    const streak = user?.streak || 0

    return (
        <div className="relative overflow-hidden bg-gradient-to-r from-teal-50 via-cyan-50 to-indigo-50 dark:from-[#05192D] dark:via-[#0a2540] dark:to-[#0d2f52] rounded-2xl p-6 sm:p-7 text-gray-900 dark:text-white shadow-lg border border-teal-100 dark:border-transparent">
            {/* Subtle brand glow circles */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-[#1448d8]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 right-32 w-56 h-56 bg-[#1DB954]/15 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Left side - Greeting and XP Progress */}
                <div className="flex-1 max-w-xl">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1DB954]/20 border border-[#1DB954]/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-3">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Level {currentLevel} Learner</span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                        {getGreeting()}, {user?.name ? user.name.split(" ")[0] : "Learner"}!
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        Ready to level up your engineering & AI skillset today?
                    </p>

                    {/* XP Progress Bar */}
                    <div className="mt-4 max-w-sm">
                        <div className="flex justify-between text-xs mb-1.5 text-gray-600 dark:text-gray-300">
                            <span className="font-semibold text-gray-900 dark:text-white">{currentXP} XP</span>
                            <span>{xpForNextLevel - currentXP} XP to Level {currentLevel + 1}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#1448d8] to-[#1DB954] transition-all duration-300 rounded-full"
                                style={{ width: `${xpPercentage}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Right side - Streak and Direct CTA */}
                <div className="flex items-center gap-6 self-start md:self-center border-t md:border-t-0 md:border-l border-gray-200 dark:border-white/10 pt-4 md:pt-0 md:pl-6">
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-3xl sm:text-4xl font-black text-gray-900 dark:text-white">
                            <Flame className="h-7 w-7 sm:h-8 sm:w-8 text-orange-500 fill-orange-500" />
                            <span>{streak}</span>
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-300 uppercase tracking-wider font-semibold mt-0.5">
                            Day Streak
                        </div>
                    </div>

                    <Link
                        href="/courses"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#1448d8] to-[#0f37a8] hover:from-[#0f37a8] hover:to-[#0b297c] text-white font-semibold text-xs transition-all shadow-sm hover:shadow active:scale-95"
                    >
                        <PlayCircle className="h-4 w-4" />
                        <span>Resume Lesson</span>
                    </Link>
                </div>
            </div>
        </div>
    )
}
