"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
    Plus,
    Search,
    BookOpen,
    Users,
    Clock,
    FileText,
    CheckCircle,
    Eye,
    Pencil,
    Trash2,
    Award,
    Filter,
    ArrowUpRight,
    TrendingUp,
    Shield,
    BarChart3,
    Layers
} from "lucide-react"
import CreateSeriesModal from "@/components/exam/CreateSeriesModal"

interface ManageTestItem {
    id: string
    seriesId?: string
    title: string
    category: string
    type: string
    accessMode: "FREE" | "PRO"
    questions: number
    duration: number
    attempts: number
    avgScore: number
    status: "PUBLISHED" | "DRAFT" | "LIVE"
    createdAt: string
}

const SAMPLE_TESTS: ManageTestItem[] = [
    {
        id: "bpsc-ft-1",
        seriesId: "bpsc-72nd-2026",
        title: "72nd BPSC Prelims Full Mock Test 1 (New 4-Option Negative Marking)",
        category: "Civil Services",
        type: "Full Mock Test",
        accessMode: "FREE",
        questions: 150,
        duration: 120,
        attempts: 1240,
        avgScore: 84.5,
        status: "PUBLISHED",
        createdAt: "Sep 22, 2026",
    },
    {
        id: "bpsc-bb-1",
        seriesId: "bpsc-bihar-special-2026",
        title: "Blissful Bihar: Bihar Budget 2026-27 & Economic Survey High Yield",
        category: "Civil Services",
        type: "Chapter Test",
        accessMode: "PRO",
        questions: 30,
        duration: 30,
        attempts: 856,
        avgScore: 21.2,
        status: "PUBLISHED",
        createdAt: "Sep 23, 2026",
    },
    {
        id: "upsc-csat-1",
        seriesId: "upsc-prelims-2026",
        title: "UPSC CSE 2027: CSAT Speed Booster & Analytical Reasoning",
        category: "Civil Services",
        type: "Sectional Test",
        accessMode: "PRO",
        questions: 50,
        duration: 60,
        attempts: 412,
        avgScore: 32.8,
        status: "LIVE",
        createdAt: "Sep 24, 2026",
    },
    {
        id: "uppcs-mock-2",
        seriesId: "bpsc-72nd-2026",
        title: "UPPCS 2026 General Studies Paper 1 Comprehensive Test",
        category: "State PCS",
        type: "Full Mock Test",
        accessMode: "PRO",
        questions: 150,
        duration: 120,
        attempts: 0,
        avgScore: 0,
        status: "DRAFT",
        createdAt: "Sep 25, 2026",
    },
]

export default function TeacherTestSeriesManagePage() {
    const [tests, setTests] = useState<ManageTestItem[]>(SAMPLE_TESTS)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedTab, setSelectedTab] = useState<"ALL" | "PUBLISHED" | "DRAFT" | "LIVE">("ALL")
    const [statusFilter, setStatusFilter] = useState("ALL")
    const [isCreatePackageModalOpen, setIsCreatePackageModalOpen] = useState(false)

    useEffect(() => {
        const loadAllTests = async () => {
            const items: ManageTestItem[] = []

            // 1. Fetch from server DB
            try {
                const res = await fetch("/api/exam/test/list")
                const data = await res.json()
                if (data.success && Array.isArray(data.data)) {
                    data.data.forEach((t: any) => {
                        items.push({
                            id: t.id,
                            seriesId: t.seriesId || (t.title?.toLowerCase().includes("upsc") ? "upsc-prelims-2026" : "bpsc-72nd-2026"),
                            title: t.title,
                            category: t.series?.category || t.series?.title || (t.title?.toLowerCase().includes("upsc") ? "UPSC" : "Civil Services"),
                            type: t.testType || "Full Mock",
                            accessMode: t.accessMode === "FREE" ? "FREE" : "PRO",
                            questions: t.totalQuestions || 100,
                            duration: t.durationMinutes || 120,
                            attempts: t.attemptsCount || 0,
                            avgScore: 0,
                            status: t.isLive ? "LIVE" : "PUBLISHED",
                            createdAt: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "Recent",
                        })
                    })
                }
            } catch (err) {
                console.warn("Could not fetch DB tests:", err)
            }

            // 2. Load from localStorage
            try {
                const stored = localStorage.getItem("ts_custom_tests")
                if (stored) {
                    const parsed = JSON.parse(stored)
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        parsed.forEach((t: any) => {
                            if (!items.some((existing) => existing.id === t.id)) {
                                items.push({
                                    id: t.id,
                                    seriesId: t.seriesId || (t.category?.toLowerCase().includes("upsc") || t.title?.toLowerCase().includes("upsc") ? "upsc-prelims-2026" : "bpsc-72nd-2026"),
                                    title: t.title || "Teacher Authored Mock Test",
                                    category: t.category || "Civil Services",
                                    type: "Teacher Full Mock",
                                    accessMode: t.isFree ? "FREE" : "PRO",
                                    questions: t.questions || (t.questionsList ? t.questionsList.length : 5),
                                    duration: t.durationMinutes || 10,
                                    attempts: t.attempts || 0,
                                    avgScore: 0,
                                    status: "PUBLISHED",
                                    createdAt: "Today",
                                })
                            }
                        })
                    }
                }
            } catch (e) {}

            if (items.length > 0) {
                setTests((prev) => {
                    const existingIds = new Set(items.map((m) => m.id))
                    return [...items, ...prev.filter((p) => !existingIds.has(p.id))]
                })
            }
        }

        loadAllTests()
    }, [])

    const filteredTests = tests.filter((t) => {
        const matchesTab = selectedTab === "ALL" || t.status === selectedTab
        const matchesSearch =
            t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.category.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesTab && matchesSearch
    })

    const totalAttempts = tests.reduce((acc, curr) => acc + curr.attempts, 0)
    const publishedCount = tests.filter((t) => t.status === "PUBLISHED").length

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this test?")) {
            setTests((prev) => prev.filter((t) => t.id !== id))
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#060f1c] p-3 sm:p-6 lg:p-10 space-y-8">
            {/* Top Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-400 text-xs font-bold uppercase tracking-wider">
                            Teacher Studio
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">• Exam Management</span>
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white mt-1">
                        Test Series Management
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Create, author bilingual questions, manage marking schemes, and monitor student test performance.
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={() => setIsCreatePackageModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-800 dark:text-gray-200 font-bold text-sm shadow-xs transition-all cursor-pointer"
                    >
                        <Layers className="h-4 w-4 text-[#00A8FF]" />
                        <span>+ New Series Package (Flash Card)</span>
                    </button>
                    <Link
                        href="/teacher/test-series/create"
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00A8FF] to-[#0080ff] hover:from-[#0096e6] hover:to-[#0070e6] text-white font-bold text-sm shadow-lg shadow-[#00A8FF]/20 transition-all active:scale-[0.98]"
                    >
                        <Plus className="h-4 w-4 stroke-[3]" />
                        <span>Create Individual Test</span>
                    </Link>
                </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Tests</span>
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-[#00A8FF] flex items-center justify-center">
                            <BookOpen className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <span className="text-2xl font-black text-gray-900 dark:text-white">{tests.length}</span>
                        <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold ml-2">Active</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Submissions</span>
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-[#00D084] flex items-center justify-center">
                            <Users className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <span className="text-2xl font-black text-gray-900 dark:text-white">{totalAttempts.toLocaleString()}</span>
                        <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold ml-2">Students</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Published Tests</span>
                        <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-[#9333EA] flex items-center justify-center">
                            <CheckCircle className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <span className="text-2xl font-black text-gray-900 dark:text-white">{publishedCount}</span>
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-semibold ml-2">Live on Student Portal</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Avg Class Score</span>
                        <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-[#F59E0B] flex items-center justify-center">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <span className="text-2xl font-black text-gray-900 dark:text-white">68.4%</span>
                        <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold ml-2">Healthy</span>
                    </div>
                </div>
            </div>

            {/* Filter & Table Area */}
            <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                {/* Filter Toolbar */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Tabs */}
                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/80 self-stretch sm:self-auto overflow-x-auto no-scrollbar" data-scroll-x="true">
                        {(["ALL", "PUBLISHED", "LIVE", "DRAFT"] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setSelectedTab(tab)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                    selectedTab === tab
                                        ? "bg-white dark:bg-[#071d33] text-gray-900 dark:text-white shadow-xs"
                                        : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                                }`}
                            >
                                {tab === "ALL" ? "All Tests" : tab.charAt(0) + tab.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search tests or categories..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs text-gray-900 dark:text-white placeholder-gray-500 focus:outline-hidden focus:border-[#00A8FF]"
                        />
                    </div>
                </div>

                {/* Tests Table */}
                <div className="overflow-x-auto" data-scroll-x="true">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50/80 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300 uppercase tracking-wider font-bold border-b border-gray-100 dark:border-gray-800">
                            <tr>
                                <th className="py-4 px-6">Test Title</th>
                                <th className="py-4 px-4">Type & Mode</th>
                                <th className="py-4 px-4">Questions</th>
                                <th className="py-4 px-4">Duration</th>
                                <th className="py-4 px-4">Submissions</th>
                                <th className="py-4 px-4">Status</th>
                                <th className="py-4 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                            {filteredTests.map((test) => (
                                <tr key={test.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                    <td className="py-4 px-6">
                                        <div className="space-y-0.5">
                                            <p className="font-extrabold text-sm text-gray-900 dark:text-white line-clamp-1">
                                                {test.title}
                                            </p>
                                            <div className="flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-400">
                                                <span className="font-semibold text-sky-700 dark:text-sky-400">{test.category}</span>
                                                <span>•</span>
                                                <span>Created {test.createdAt}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-1.5">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                                {test.type}
                                            </span>
                                            <span
                                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                                    test.accessMode === "FREE"
                                                        ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                                                        : "bg-amber-500/15 text-amber-900 dark:text-amber-300"
                                                }`}
                                            >
                                                {test.accessMode}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 font-bold text-gray-800 dark:text-gray-200">
                                        {test.questions} Qs
                                    </td>
                                    <td className="py-4 px-4 font-bold text-gray-800 dark:text-gray-200">
                                        {test.duration} Mins
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="space-y-0.5">
                                            <span className="font-bold text-gray-900 dark:text-white">
                                                {test.attempts.toLocaleString()}
                                            </span>
                                            {test.avgScore > 0 && (
                                                <p className="text-[10px] text-gray-400">Avg: {test.avgScore} pts</p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ${
                                                test.status === "PUBLISHED"
                                                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                                    : test.status === "LIVE"
                                                    ? "bg-sky-500/10 text-sky-500 border border-sky-500/20 animate-pulse"
                                                    : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                                            }`}
                                        >
                                            <span
                                                className={`w-1.5 h-1.5 rounded-full ${
                                                    test.status === "PUBLISHED"
                                                        ? "bg-emerald-500"
                                                        : test.status === "LIVE"
                                                        ? "bg-sky-500"
                                                        : "bg-gray-400"
                                                }`}
                                            />
                                            {test.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                href={`/test-series/${test.seriesId || (test.category?.toLowerCase().includes("upsc") ? "upsc-prelims-2026" : "bpsc-72nd-2026")}?testId=${test.id}`}
                                                target="_blank"
                                                className="px-2.5 py-1 rounded-lg border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs font-bold transition-colors flex items-center gap-1"
                                                title="Open in Student View"
                                            >
                                                <span>Student View</span>
                                                <ArrowUpRight className="h-3 w-3" />
                                            </Link>
                                            <Link
                                                href={`/test-series/${test.id}/attempt?testId=${test.id}&title=${encodeURIComponent(test.title)}&questions=${test.questions}&marks=150&duration=${test.duration}`}
                                                target="_blank"
                                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-[#00A8FF] hover:border-[#00A8FF]/40 transition-colors"
                                                title="Preview CBT Arena"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Link>
                                            <Link
                                                href={`/test-series/${test.id}/leaderboard`}
                                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-emerald-500 hover:border-emerald-500/40 transition-colors"
                                                title="View Live Leaderboard"
                                            >
                                                <BarChart3 className="h-4 w-4" />
                                            </Link>
                                            <Link
                                                href="/teacher/test-series/create"
                                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-purple-500 hover:border-purple-500/40 transition-colors"
                                                title="Edit in Studio"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(test.id)}
                                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-red-500 hover:border-red-500/40 transition-colors"
                                                title="Delete Test"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Test Series Package Modal */}
            <CreateSeriesModal
                isOpen={isCreatePackageModalOpen}
                onClose={() => setIsCreatePackageModalOpen(false)}
                defaultCategory="UPSC"
                onCreated={() => {
                    // Refreshes view
                }}
            />
        </div>
    )
}
