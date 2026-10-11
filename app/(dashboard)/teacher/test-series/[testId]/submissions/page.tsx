"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import {
    ChevronLeft,
    Search,
    Users,
    Clock,
    Award,
    Loader2,
    ShieldAlert,
    AlertCircle,
} from "lucide-react"

interface RankedCandidate {
    id: string
    userId: string
    attemptId: string
    name: string
    avatar: string | null
    score: number
    rank: number
    accuracy: number
    correct: number
    wrong: number
    timeSecs: number
    percentile: number
    submittedAt?: string
}

export default function SubmissionsPage() {
    const params = useParams()
    const router = useRouter()
    const testId = (params?.testId as string) || ""

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isForbidden, setIsForbidden] = useState(false)
    const [testTitle, setTestTitle] = useState("")
    const [rankings, setRankings] = useState<RankedCandidate[]>([])
    const [metrics, setMetrics] = useState<{ totalCandidates: number; classAverage: number; highestScore: number }>({
        totalCandidates: 0,
        classAverage: 0,
        highestScore: 0,
    })
    const [search, setSearch] = useState("")

    const loadSubmissions = useCallback(async () => {
        if (!testId) return
        setLoading(true)
        setError(null)
        setIsForbidden(false)

        try {
            const res = await fetch(`/api/exam/${encodeURIComponent(testId)}/leaderboard`)
            if (res.status === 403) {
                setIsForbidden(true)
                setError("Access Denied (403)")
                return
            }
            if (!res.ok) {
                throw new Error("Failed to load submissions")
            }
            const json = await res.json()
            const payload = json.data
            if (!payload) {
                throw new Error("Failed to load submissions")
            }

            const title = payload.testTitle || ""
            setTestTitle(title)

            const list: RankedCandidate[] = Array.isArray(payload.leaderboard) ? payload.leaderboard : []
            setRankings(list)

            const scores = list.map((r) => Number(r.score) || 0)
            const highest = scores.length > 0 ? Math.max(...scores) : 0
            const avg = scores.length > 0
                ? Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10) / 10
                : 0
            const total = payload.totalCandidates !== undefined ? payload.totalCandidates : list.length

            setMetrics({
                totalCandidates: total,
                highestScore: highest,
                classAverage: avg,
            })
        } catch (err: any) {
            setError(err?.message || "Failed to load submissions")
        } finally {
            setLoading(false)
        }
    }, [testId])

    useEffect(() => {
        loadSubmissions()
    }, [loadSubmissions])

    const filtered = rankings.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase())
    )

    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60)
        const remSecs = secs % 60
        return `${mins}m ${remSecs}s`
    }

    if (isForbidden) {
        return (
            <div data-testid="submissions-forbidden" className="min-h-screen bg-gray-50 dark:bg-[#060f1c] p-6 sm:p-10 flex flex-col items-center justify-center">
                <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-red-200 dark:border-red-900/50 p-8 max-w-md w-full text-center shadow-sm space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
                        <ShieldAlert className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-gray-900 dark:text-white">Access Denied (403)</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            You do not have permission to view submissions for another teacher&apos;s test.
                        </p>
                    </div>
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back to Test Management
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#060f1c] p-3 sm:p-6 lg:p-10 space-y-6 sm:space-y-8">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <button
                        onClick={() => router.back()}
                        className="text-xs text-gray-700 dark:text-gray-300 hover:text-[#00A8FF] flex items-center gap-1 mb-1 min-h-[44px]"
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        Back to Test Management
                    </button>
                    <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white break-words" data-testid="submissions-title">
                        {testTitle || "Student Submissions & Performance"}
                    </h1>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 break-words">
                        Candidate submissions &amp; performance breakdown
                    </p>
                </div>
            </div>

            {error ? (
                <div data-testid="submissions-error" className="bg-white dark:bg-[#0a1628] rounded-3xl border border-red-200 dark:border-red-900/50 p-8 text-center space-y-3 my-6">
                    <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                    <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
                    <button
                        onClick={loadSubmissions}
                        className="px-3.5 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            ) : (
                <>
                    {/* Quick Metrics */}
                    <div className="grid grid-cols-1 min-[440px]:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xs">
                            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <Users className="h-3 w-3" /> Total Candidates
                            </span>
                            <p data-testid="metric-candidates" className="text-2xl font-black text-gray-900 dark:text-white mt-1">{metrics.totalCandidates}</p>
                        </div>
                        <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xs">
                            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <Award className="h-3 w-3" /> Highest Score
                            </span>
                            <p data-testid="metric-highest-score" className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                                {metrics.highestScore}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xs">
                            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Class Average
                            </span>
                            <p data-testid="metric-class-average" className="text-2xl font-black text-sky-700 dark:text-sky-400 mt-1">{metrics.classAverage.toFixed(1)} pts</p>
                        </div>
                    </div>

                    {/* Submissions Table */}
                    <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search candidate name..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div data-testid="submissions-loading" className="py-12 flex flex-col items-center justify-center gap-2 text-gray-500">
                                <Loader2 className="h-6 w-6 animate-spin text-[#00A8FF]" />
                                <p className="text-xs font-semibold">Loading student submissions...</p>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div data-testid="submissions-empty" className="py-12 text-center text-gray-500 space-y-1">
                                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No submissions found</p>
                                <p className="text-xs">No students have submitted attempts for this test yet.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto" data-scroll-x="true">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50/80 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300 uppercase tracking-wider font-bold border-b border-gray-100 dark:border-gray-800">
                                        <tr>
                                            <th className="py-3 px-5">Candidate</th>
                                            <th className="py-3 px-4 text-center">Rank</th>
                                            <th className="py-3 px-4 text-center">Score</th>
                                            <th className="py-3 px-4 text-center">Accuracy</th>
                                            <th className="py-3 px-4 text-center">Correct / Wrong</th>
                                            <th className="py-3 px-4 text-center">Time Spent</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                                        {filtered.map((cand) => (
                                            <tr key={cand.attemptId || cand.userId} data-testid="submission-row" className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                                                <td className="py-3 px-5">
                                                    <div className="flex items-center gap-2.5">
                                                        {cand.avatar ? (
                                                            <img
                                                                src={cand.avatar}
                                                                alt={cand.name}
                                                                className="w-7 h-7 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                                                            />
                                                        ) : (
                                                            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[11px]">
                                                                {cand.name.charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p data-testid="candidate-name" className="font-extrabold text-gray-900 dark:text-white">{cand.name}</p>
                                                            <p className="text-[10px] text-gray-500 font-mono">UID-{cand.userId.slice(-6)}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td data-testid="candidate-rank" className="py-3 px-4 text-center font-bold text-amber-800 dark:text-amber-300">
                                                    #{cand.rank}
                                                </td>
                                                <td data-testid="candidate-score" className="py-3 px-4 text-center font-black text-sm text-sky-700 dark:text-sky-400">
                                                    {cand.score}
                                                </td>
                                                <td className="py-3 px-4 text-center font-bold text-emerald-800 dark:text-emerald-300">
                                                    {cand.accuracy}%
                                                </td>
                                                <td className="py-3 px-4 text-center text-gray-700 dark:text-gray-300">
                                                    <span className="text-emerald-600 font-bold">{cand.correct}</span> / <span className="text-red-500 font-bold">{cand.wrong}</span>
                                                </td>
                                                <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400 font-mono">
                                                    {formatTime(cand.timeSecs)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
