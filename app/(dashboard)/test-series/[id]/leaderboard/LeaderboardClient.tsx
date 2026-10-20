"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"
import {
    Trophy,
    Search,
    ChevronLeft,
    Play
} from "lucide-react"

interface LeaderboardEntry {
    name: string
    avatar: string | null
    score: number
    rank: number
    correct: number
    wrong: number
    timeSecs: number
    percentile: number
    accuracy: number
    isCurrentUser?: boolean
}

export function LeaderboardClient({
    testId,
    initialTestTitle,
    seriesBackUrl,
}: {
    testId: string
    initialTestTitle?: string
    seriesBackUrl?: string
}) {
    const router = useRouter()
    const { data: session, status } = useSession()
    const { openMobileAuth } = useMobileAuth()

    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [testTitle, setTestTitle] = useState(initialTestTitle || "")
    const [toppers, setToppers] = useState<LeaderboardEntry[]>([])
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
    const [currentUserRank, setCurrentUserRank] = useState<LeaderboardEntry | null>(null)
    const [totalCandidates, setTotalCandidates] = useState(0)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (status === "unauthenticated") {
            const currentUrl = typeof window !== "undefined" ? window.location.href : ""
            openMobileAuth({ actionType: "login", callbackUrl: currentUrl })
        }
    }, [status, openMobileAuth])

    useEffect(() => {
        if (!session?.user) {
            setLoading(false)
            return
        }

        async function fetchLeaderboard() {
            try {
                const res = await fetch(`/api/exam/${encodeURIComponent(testId)}/leaderboard?search=${encodeURIComponent(search)}`)
                const json = await res.json()
                if (!res.ok) {
                    setError(json?.error || "Failed to load leaderboard.")
                    return
                }
                if (json.data) {
                    setTestTitle(json.data.testTitle || initialTestTitle || "")
                    setToppers(json.data.toppers || [])
                    setLeaderboard(json.data.leaderboard || [])
                    setCurrentUserRank(json.data.currentUserRank || null)
                    setTotalCandidates(json.data.totalCandidates || 0)
                    setError(null)
                }
            } catch (e) {
                console.error("Error fetching leaderboard", e)
                setError("Unable to load leaderboard. Please try again.")
            } finally {
                setLoading(false)
            }
        }
        fetchLeaderboard()
    }, [testId, search, session, initialTestTitle])

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60)
        const s = secs % 60
        return `${m}m ${s}s`
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#060f1c] flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white dark:bg-[#0a1628] rounded-3xl p-8 border border-gray-200 dark:border-gray-800 text-center shadow-xl space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                        <Trophy className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white">Rankings Unavailable</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {error}
                    </p>
                    <Link
                        href={seriesBackUrl || "/test-series"}
                        className="inline-block py-2.5 px-6 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs transition-colors"
                    >
                        Back to Test Series
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#060f1c] pb-24">
            {/* Top Navigation */}
            <div className="bg-white dark:bg-[#0a1628] border-b border-gray-200 dark:border-gray-800 px-6 py-4 sticky top-[60px] z-20 shadow-xs">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                if (seriesBackUrl) {
                                    router.push(seriesBackUrl)
                                } else {
                                    router.back()
                                }
                            }}
                            className="p-2 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            aria-label="Back"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-wider">
                                    LIVE AIR LEADERBOARD
                                </span>
                                <span className="text-xs text-gray-400 font-medium">• All India Percentile</span>
                            </div>
                            <h1 className="text-base sm:text-lg font-black text-gray-900 dark:text-white line-clamp-1">
                                {testTitle || "Leaderboard"}
                            </h1>
                        </div>
                    </div>

                    <Link
                        href={`/test-series/${encodeURIComponent(testId)}/declaration`}
                        className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00A8FF] to-[#0096e6] text-white text-xs font-bold shadow-md hover:shadow-[#00A8FF]/20 transition-all active:scale-[0.98]"
                    >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Re-Attempt Test</span>
                    </Link>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
                {/* ── TOP 3 PODIUM ───────────────────────────────────── */}
                <div className="bg-gradient-to-br from-[#003B73] via-[#005B96] to-[#00A896] rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <Trophy className="w-80 h-80" />
                    </div>

                    <div className="text-center max-w-xl mx-auto mb-8">
                        <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-extrabold uppercase tracking-widest text-cyan-200">
                            Hall of Fame
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black mt-2">All India Top Rankers</h2>
                        <p className="text-xs sm:text-sm text-cyan-100/90 mt-1">
                            Calculated across {totalCandidates.toLocaleString()} real candidate submissions based on NTA percentile logic.
                        </p>
                    </div>

                    {/* Podium Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end max-w-4xl mx-auto">
                        {/* 2nd Place */}
                        {toppers[1] && (
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-5 text-center flex flex-col items-center order-2 md:order-1 transition-transform hover:-translate-y-1">
                                <div className="w-14 h-14 rounded-full bg-gray-300 text-gray-800 font-black text-xl flex items-center justify-center border-4 border-white/40 shadow-lg mb-3">
                                    🥈
                                </div>
                                <span className="text-xs font-bold text-gray-200">AIR 2</span>
                                <h3 className="text-base font-extrabold text-white mt-0.5">{toppers[1].name}</h3>
                                <div className="mt-3 pt-3 border-t border-white/10 w-full flex justify-around text-xs">
                                    <div>
                                        <p className="text-[10px] text-white/70 uppercase">Score</p>
                                        <p className="font-black text-white">{toppers[1].score}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-white/70 uppercase">Accuracy</p>
                                        <p className="font-black text-[#00D084]">{toppers[1].accuracy}%</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 1st Place (Center & Taller) */}
                        {toppers[0] && (
                            <div className="bg-white/15 backdrop-blur-lg rounded-3xl border-2 border-amber-300 p-6 text-center flex flex-col items-center order-1 md:order-2 shadow-2xl relative transition-transform hover:-translate-y-1.5 md:-mt-6">
                                <div className="absolute -top-4 bg-gradient-to-r from-amber-400 to-amber-500 text-gray-950 font-black text-[11px] px-4 py-1 rounded-full uppercase tracking-wider shadow-md">
                                    ⭐ All India Topper
                                </div>
                                <div className="w-20 h-20 rounded-full bg-amber-400 text-gray-950 font-black text-3xl flex items-center justify-center border-4 border-white shadow-xl mb-3 mt-2">
                                    🥇
                                </div>
                                <span className="text-xs font-extrabold text-amber-300">AIR 1</span>
                                <h3 className="text-lg font-black text-white mt-0.5">{toppers[0].name}</h3>
                                <div className="mt-4 pt-3 border-t border-white/20 w-full flex justify-around text-xs">
                                    <div>
                                        <p className="text-[10px] text-white/70 uppercase">Score</p>
                                        <p className="font-black text-xl text-amber-300">{toppers[0].score}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-white/70 uppercase">Time</p>
                                        <p className="font-black text-white">{formatTime(toppers[0].timeSecs)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-white/70 uppercase">Accuracy</p>
                                        <p className="font-black text-emerald-300">{toppers[0].accuracy}%</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3rd Place */}
                        {toppers[2] && (
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-5 text-center flex flex-col items-center order-3 transition-transform hover:-translate-y-1">
                                <div className="w-14 h-14 rounded-full bg-amber-700/80 text-white font-black text-xl flex items-center justify-center border-4 border-white/40 shadow-lg mb-3">
                                    🥉
                                </div>
                                <span className="text-xs font-bold text-gray-200">AIR 3</span>
                                <h3 className="text-base font-extrabold text-white mt-0.5">{toppers[2].name}</h3>
                                <div className="mt-3 pt-3 border-t border-white/10 w-full flex justify-around text-xs">
                                    <div>
                                        <p className="text-[10px] text-white/70 uppercase">Score</p>
                                        <p className="font-black text-white">{toppers[2].score}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-white/70 uppercase">Accuracy</p>
                                        <p className="font-black text-[#00D084]">{toppers[2].accuracy}%</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── FILTER & LEADERBOARD TABLE ─────────────────────── */}
                <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    {/* Filter bar */}
                    <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold text-gray-900 dark:text-white">Rankings Table</span>
                            <span className="text-xs text-gray-400">({leaderboard.length} Candidates)</span>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            {/* Search */}
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search candidate name..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:border-[#00A8FF]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50/80 dark:bg-gray-900/40 text-gray-400 uppercase tracking-wider font-bold border-b border-gray-100 dark:border-gray-800">
                                <tr>
                                    <th className="py-4 px-6 text-center w-16">Rank</th>
                                    <th className="py-4 px-4">Candidate</th>
                                    <th className="py-4 px-4 text-center">Score</th>
                                    <th className="py-4 px-4 text-center">Accuracy</th>
                                    <th className="py-4 px-4 text-center">Correct / Wrong</th>
                                    <th className="py-4 px-4 text-center">Time Taken</th>
                                    <th className="py-4 px-6 text-right">Percentile</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                                {leaderboard.map((entry, idx) => (
                                    <tr
                                        key={`${entry.rank}-${entry.name}-${idx}`}
                                        className={`hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors ${
                                            entry.rank <= 3 ? "bg-amber-50/20 dark:bg-amber-900/5 font-semibold" : ""
                                        }`}
                                    >
                                        <td className="py-4 px-6 text-center">
                                            {entry.rank === 1 ? (
                                                <span className="w-7 h-7 rounded-full bg-amber-400 text-gray-900 font-black flex items-center justify-center mx-auto text-xs">
                                                    1
                                                </span>
                                            ) : entry.rank === 2 ? (
                                                <span className="w-7 h-7 rounded-full bg-gray-300 text-gray-800 font-black flex items-center justify-center mx-auto text-xs">
                                                    2
                                                </span>
                                            ) : entry.rank === 3 ? (
                                                <span className="w-7 h-7 rounded-full bg-amber-700/80 text-white font-black flex items-center justify-center mx-auto text-xs">
                                                    3
                                                </span>
                                            ) : (
                                                <span className="font-extrabold text-gray-500">#{entry.rank}</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-800 text-white font-bold flex items-center justify-center text-xs shrink-0">
                                                    {entry.name.charAt(0)}
                                                </div>
                                                <span className="font-extrabold text-gray-900 dark:text-white">
                                                    {entry.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-center font-black text-sm text-[#00A8FF]">
                                            {entry.score.toFixed(2)}
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                {entry.accuracy}%
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <span className="text-emerald-600 font-bold">+{entry.correct}</span>
                                            <span className="text-gray-300 mx-1">/</span>
                                            <span className="text-red-500 font-bold">-{entry.wrong}</span>
                                        </td>
                                        <td className="py-4 px-4 text-center font-mono text-gray-500">
                                            {formatTime(entry.timeSecs)}
                                        </td>
                                        <td className="py-4 px-6 text-right font-extrabold text-gray-900 dark:text-white">
                                            {entry.percentile}%ile
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ── STICKY YOUR RANK BAR ──────────────────────────────── */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0a1628] border-t border-gray-200 dark:border-gray-800 p-4 shadow-2xl z-30">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#00A8FF] to-[#00D084] flex items-center justify-center text-white font-black text-sm">
                            YOU
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500">Your Current Standing</p>
                            {currentUserRank && <p className="text-sm font-black text-gray-900 dark:text-white">Rank #{currentUserRank.rank}</p>}
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden sm:block text-right">
                            <p className="text-xs text-gray-400">Target Topper Score</p>
                            {toppers[0] && <p className="text-sm font-black text-amber-500">{toppers[0].score} pts</p>}
                        </div>

                        <Link
                            href={seriesBackUrl || `/test-series`}
                            className="px-5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors"
                        >
                            Back to Series
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
