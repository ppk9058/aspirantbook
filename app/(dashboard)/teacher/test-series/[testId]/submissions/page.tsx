"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
    ChevronLeft,
    Search,
    ShieldAlert,
    CheckCircle2,
    XCircle,
    Eye,
    Download,
    Filter,
    Users,
    Clock,
    Award,
    X
} from "lucide-react"

interface StudentSubmission {
    id: string
    candidateName: string
    rollNo: string
    email: string
    submittedAt: string
    score: number
    totalMarks: number
    percentile: number
    rank: number
    accuracy: number
    timeSpentMin: number
    tabSwitches: number
    status: "GRADED" | "FLAGGED"
    answers: {
        qNo: number
        question: string
        userAnswer: string
        correctAnswer: string
        isCorrect: boolean
        marksAwarded: number
        timeSec: number
    }[]
}

const SAMPLE_SUBMISSIONS: StudentSubmission[] = [
    {
        id: "sub-1",
        candidateName: "Praveen Kumar",
        rollNo: "TS2026001",
        email: "praveen@aspirantbook.com",
        submittedAt: "Sep 25, 2026 • 09:42 PM",
        score: 112.5,
        totalMarks: 150,
        percentile: 94.2,
        rank: 1,
        accuracy: 86,
        timeSpentMin: 104,
        tabSwitches: 0,
        status: "GRADED",
        answers: [
            { qNo: 1, question: "If Nina celebrated her birthday on Tuesday, Jan 15, 1985...", userAnswer: "Option B (7 yrs)", correctAnswer: "Option C (6 yrs)", isCorrect: false, marksAwarded: -0.33, timeSec: 45 },
            { qNo: 2, question: "Which river flows through Deccan Plateau?", userAnswer: "Option B (Godavari)", correctAnswer: "Option B (Godavari)", isCorrect: true, marksAwarded: 1.0, timeSec: 28 },
            { qNo: 3, question: "First President of India...", userAnswer: "Option C (Dr. Rajendra Prasad)", correctAnswer: "Option C (Dr. Rajendra Prasad)", isCorrect: true, marksAwarded: 1.0, timeSec: 15 },
        ]
    },
    {
        id: "sub-2",
        candidateName: "Ananya Sharma",
        rollNo: "TS2026002",
        email: "ananya@example.com",
        submittedAt: "Sep 25, 2026 • 08:30 PM",
        score: 108.0,
        totalMarks: 150,
        percentile: 91.5,
        rank: 2,
        accuracy: 82,
        timeSpentMin: 112,
        tabSwitches: 1,
        status: "GRADED",
        answers: []
    },
    {
        id: "sub-3",
        candidateName: "Vikram Rathore",
        rollNo: "TS2026003",
        email: "vikram@example.com",
        submittedAt: "Sep 25, 2026 • 07:15 PM",
        score: 84.5,
        totalMarks: 150,
        percentile: 72.8,
        rank: 5,
        accuracy: 68,
        timeSpentMin: 118,
        tabSwitches: 3,
        status: "FLAGGED",
        answers: []
    }
]

export default function SubmissionsPage() {
    const params = useParams()
    const router = useRouter()
    const testId = (params?.testId as string) || "bpsc-ft-1"

    const [submissions] = useState<StudentSubmission[]>(SAMPLE_SUBMISSIONS)
    const [search, setSearch] = useState("")
    const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmission | null>(null)

    const filtered = submissions.filter(
        (s) =>
            s.candidateName.toLowerCase().includes(search.toLowerCase()) ||
            s.rollNo.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#060f1c] p-6 lg:p-10 space-y-8">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <button
                        onClick={() => router.back()}
                        className="text-xs text-gray-500 hover:text-[#00A8FF] flex items-center gap-1 mb-1"
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        Back to Test Management
                    </button>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                        Student Submissions &amp; Answer Sheets
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Test ID: <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{testId}</span> • 72nd BPSC Prelims Mock Test 1
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => alert("Exporting CSV report...")}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition-colors"
                    >
                        <Download className="h-4 w-4" />
                        Export Gradebook (CSV)
                    </button>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xs">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Submissions</span>
                    <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{submissions.length}</p>
                </div>
                <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xs">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Highest Score</span>
                    <p className="text-2xl font-black text-emerald-500 mt-1">112.5 <span className="text-xs text-gray-400">/ 150</span></p>
                </div>
                <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xs">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Class Average</span>
                    <p className="text-2xl font-black text-[#00A8FF] mt-1">101.6 pts</p>
                </div>
                <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xs">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Integrity Alerts</span>
                    <p className="text-2xl font-black text-amber-500 mt-1">1 Flagged</p>
                </div>
            </div>

            {/* Submissions Table */}
            <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by student name or roll..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50/80 dark:bg-gray-900/40 text-gray-400 uppercase tracking-wider font-bold border-b border-gray-100 dark:border-gray-800">
                            <tr>
                                <th className="py-3 px-5">Candidate</th>
                                <th className="py-3 px-4">Roll No</th>
                                <th className="py-3 px-4">Submitted At</th>
                                <th className="py-3 px-4 text-center">Score</th>
                                <th className="py-3 px-4 text-center">Rank</th>
                                <th className="py-3 px-4 text-center">Accuracy</th>
                                <th className="py-3 px-4 text-center">Tab Switches</th>
                                <th className="py-3 px-5 text-right">Answer Sheet</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                            {filtered.map((sub) => (
                                <tr key={sub.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                                    <td className="py-3 px-5">
                                        <div>
                                            <p className="font-extrabold text-gray-900 dark:text-white">{sub.candidateName}</p>
                                            <p className="text-[10px] text-gray-400">{sub.email}</p>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 font-mono font-bold text-gray-600 dark:text-gray-300">
                                        {sub.rollNo}
                                    </td>
                                    <td className="py-3 px-4 text-gray-500">{sub.submittedAt}</td>
                                    <td className="py-3 px-4 text-center font-black text-sm text-[#00A8FF]">
                                        {sub.score}
                                    </td>
                                    <td className="py-3 px-4 text-center font-bold text-amber-500">
                                        #{sub.rank}
                                    </td>
                                    <td className="py-3 px-4 text-center font-bold text-emerald-600">
                                        {sub.accuracy}%
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        {sub.tabSwitches > 0 ? (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-600 flex items-center justify-center gap-1 mx-auto w-fit">
                                                <ShieldAlert className="h-3 w-3" />
                                                {sub.tabSwitches} switches
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">0</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-5 text-right">
                                        <button
                                            onClick={() => setSelectedSubmission(sub)}
                                            className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-[#00A8FF] hover:text-white text-gray-700 font-bold text-xs transition-colors"
                                        >
                                            Inspect Responses
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Answer Sheet Slide-Over Modal */}
            {selectedSubmission && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200 dark:border-gray-800 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-900/40">
                            <div>
                                <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                                    Candidate Response Sheet: {selectedSubmission.candidateName}
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Roll No: {selectedSubmission.rollNo} • Score: {selectedSubmission.score} / {selectedSubmission.totalMarks}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedSubmission(null)}
                                className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {selectedSubmission.answers.length > 0 ? (
                                selectedSubmission.answers.map((ans) => (
                                    <div
                                        key={ans.qNo}
                                        className={`p-4 rounded-xl border text-xs space-y-2 ${
                                            ans.isCorrect
                                                ? "border-emerald-200 bg-emerald-50/30"
                                                : "border-red-200 bg-red-50/30"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between font-bold">
                                            <span>Question {ans.qNo}</span>
                                            <span className={ans.isCorrect ? "text-emerald-600" : "text-red-500"}>
                                                {ans.isCorrect ? `+${ans.marksAwarded}` : ans.marksAwarded} Marks ({ans.timeSec}s)
                                            </span>
                                        </div>
                                        <p className="text-gray-800 dark:text-gray-200 font-medium">{ans.question}</p>
                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200/50">
                                            <div>
                                                <span className="text-[10px] text-gray-400 uppercase font-bold">Candidate Answer</span>
                                                <p className={`font-bold ${ans.isCorrect ? "text-emerald-700" : "text-red-600"}`}>{ans.userAnswer}</p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-gray-400 uppercase font-bold">Correct Key</span>
                                                <p className="font-bold text-gray-900 dark:text-white">{ans.correctAnswer}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center py-8 text-gray-400 text-xs">No detailed answers logged for this attempt.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
