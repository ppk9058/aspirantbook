"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
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
    Layers,
    AlertCircle,
    RotateCcw
} from "lucide-react"
import CreateSeriesModal from "@/components/exam/CreateSeriesModal"
import PublishTestModal from "@/components/exam/PublishTestModal"
import { formatIstDateTime } from "@/lib/format-date"

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
    submittedCount?: number
    status: "PUBLISHED" | "DRAFT" | "LIVE"
    createdAt: string
}

export default function TeacherTestSeriesManagePage() {
    const [tests, setTests] = useState<ManageTestItem[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedTab, setSelectedTab] = useState<"ALL" | "PUBLISHED" | "DRAFT" | "LIVE">("ALL")
    const [statusFilter, setStatusFilter] = useState("ALL")
    const [isCreatePackageModalOpen, setIsCreatePackageModalOpen] = useState(false)
    const [publishModalTest, setPublishModalTest] = useState<ManageTestItem | null>(null)

    const loadAllTests = useCallback(async () => {
        const items: ManageTestItem[] = []

        // 1. Fetch from server DB
        try {
            const res = await fetch("/api/exam/test/list")
            const data = await res.json()
            if (data.success && Array.isArray(data.data)) {
                data.data.forEach((t: any) => {
                    const qCount = typeof t.questions === "number" ? t.questions : (typeof t.totalQuestions === "number" ? t.totalQuestions : 0)
                    const dMinutes = typeof t.durationMinutes === "number" ? t.durationMinutes : (typeof t.duration === "number" ? t.duration : 60)
                    const attempts = typeof t.attempts === "number" ? t.attempts : (typeof t.attemptsCount === "number" ? t.attemptsCount : 0)

                    items.push({
                        id: t.id,
                        seriesId: t.seriesSlug || t.seriesId || "",
                        title: t.title,
                        category: t.category || t.series?.category || "General Studies",
                        type: t.testType || "Full Mock",
                        accessMode: t.accessMode === "FREE" ? "FREE" : "PRO",
                        questions: qCount,
                        duration: dMinutes,
                        attempts,
                        avgScore: typeof t.avgScore === "number" ? t.avgScore : 0,
                        submittedCount: typeof t.submittedAttemptsCount === "number" ? t.submittedAttemptsCount : (typeof t.avgScore === "number" && t.avgScore > 0 ? attempts : 0),
                        status: t.isPublished ? (t.isLive ? "LIVE" : "PUBLISHED") : "DRAFT",
                        createdAt: formatIstDateTime(t.createdAt),
                    })
                })
            }
        } catch (err) {
            console.warn("Could not fetch DB tests:", err)
        }

        setTests(items)
    }, [])

    useEffect(() => {
        loadAllTests()
    }, [loadAllTests])

    const filteredTests = tests.filter((t) => {
        const matchesTab = selectedTab === "ALL" || t.status === selectedTab
        const matchesSearch =
            t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.category.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesTab && matchesSearch
    })

    const totalAttempts = tests.reduce((acc, curr) => acc + curr.attempts, 0)
    const publishedCount = tests.filter((t) => t.status === "PUBLISHED").length
    const totalSubmittedAttempts = tests.reduce((acc, curr) => acc + (curr.submittedCount ?? 0), 0)
    const overallAvgScore = totalSubmittedAttempts > 0
        ? Math.round((tests.reduce((acc, curr) => acc + (curr.avgScore * (curr.submittedCount ?? 0)), 0) / totalSubmittedAttempts) * 10) / 10
        : null

    const pathname = usePathname()
    const basePath = pathname.startsWith("/admin") ? "/admin/test-series" : "/teacher/test-series"

    const { data: session } = useSession()
    const isAdmin = (session?.user as any)?.role === "ADMIN" || pathname.startsWith("/admin")

    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [pendingForceDelete, setPendingForceDelete] = useState<{ id: string; title: string; attemptsCount: number } | null>(null)

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this test? All questions and attempts will be removed.")) {
            return
        }
        setDeletingId(id)
        setDeleteError(null)
        try {
            const res = await fetch(`/api/exam/test/${encodeURIComponent(id)}`, {
                method: "DELETE",
            })
            const data = await res.json()
            if (res.status === 409) {
                if (isAdmin && (data.attemptsCount || 0) > 0) {
                    setPendingForceDelete({
                        id,
                        title: tests.find((t) => t.id === id)?.title || "Test",
                        attemptsCount: data.attemptsCount,
                    })
                    return
                }
                throw new Error(data.error || "Cannot delete test with existing attempts.")
            }
            if (!res.ok || !data.success) {
                throw new Error(data.error || `Failed to delete test (status ${res.status})`)
            }
            setTests((prev) => prev.filter((t) => t.id !== id))
        } catch (err: any) {
            console.error("Delete test error:", err)
            setDeleteError(err.message || "Failed to delete test. Please retry.")
        } finally {
            setDeletingId(null)
        }
    }

    const handleConfirmForceDelete = async () => {
        if (!pendingForceDelete) return
        const id = pendingForceDelete.id
        setDeletingId(id)
        setDeleteError(null)
        try {
            const res = await fetch(`/api/exam/test/${encodeURIComponent(id)}?force=true`, {
                method: "DELETE",
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                throw new Error(data.error || `Failed to force delete test (status ${res.status})`)
            }
            setTests((prev) => prev.filter((t) => t.id !== id))
            setPendingForceDelete(null)
        } catch (err: any) {
            console.error("Force delete test error:", err)
            setDeleteError(err.message || "Failed to force delete test.")
        } finally {
            setDeletingId(null)
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
                    <Link
                        href={`${basePath}/packages`}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-800 dark:text-gray-200 font-bold text-sm shadow-xs transition-all min-h-[44px]"
                    >
                        <Layers className="h-4 w-4 text-[#00A8FF]" />
                        <span>View Packages</span>
                    </Link>
                    <button
                        onClick={() => setIsCreatePackageModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-800 dark:text-gray-200 font-bold text-sm shadow-xs transition-all cursor-pointer min-h-[44px]"
                    >
                        <Plus className="h-4 w-4 text-[#00A8FF]" />
                        <span>+ New Series Package</span>
                    </button>
                    <Link
                        href={`${basePath}/create`}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00A8FF] to-[#0080ff] hover:from-[#0096e6] hover:to-[#0070e6] text-white font-bold text-sm shadow-lg shadow-[#00A8FF]/20 transition-all active:scale-[0.98] min-h-[44px]"
                    >
                        <Plus className="h-4 w-4 stroke-[3]" />
                        <span>Create Individual Test</span>
                    </Link>
                </div>
            </div>

            {/* Delete Error Feedback Banner */}
            {deleteError && (
                <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl text-xs flex items-center justify-between gap-3 text-red-700 dark:text-red-300">
                    <div className="flex items-center gap-2 min-w-0">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                        <span className="font-semibold break-words">{deleteError}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setDeleteError(null)}
                        className="px-3 py-1.5 rounded-xl border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 font-bold shrink-0 min-h-[36px] cursor-pointer"
                    >
                        Dismiss
                    </button>
                </div>
            )}

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
                        <span className="text-2xl font-black text-gray-900 dark:text-white">
                            {overallAvgScore !== null ? `${overallAvgScore} pts` : "—"}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold ml-2">
                            {totalAttempts > 0 ? (totalSubmittedAttempts > 0 ? "Class average" : "Awaiting submissions") : "No submissions yet"}
                        </span>
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
                                <th className="py-4 px-6 text-right min-w-[340px]">Actions</th>
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
                                                <span data-testid="test-created-at">
                                                    {test.createdAt === "—" ? "—" : `Created ${test.createdAt}`}
                                                </span>
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
                                    <td className="py-4 px-6 text-right min-w-[340px]">
                                        <div className="flex items-center justify-end gap-2 flex-wrap">
                                            {test.status === "DRAFT" && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPublishModalTest(test)}
                                                    data-testid="publish-row-button"
                                                    className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 min-h-[44px] cursor-pointer shadow-xs shrink-0"
                                                    title="Publish Test"
                                                    aria-label={`Publish ${test.title}`}
                                                >
                                                    <CheckCircle className="h-4 w-4" />
                                                    <span>Publish</span>
                                                </button>
                                            )}
                                            <Link
                                                href={`/test-series/${test.seriesId || "upsc-prelims-2026"}?testId=${test.id}`}
                                                target="_blank"
                                                className="px-2.5 py-1 rounded-lg border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs font-bold transition-colors flex items-center gap-1"
                                                title="Open in Student View"
                                            >
                                                <span>Student View</span>
                                                <ArrowUpRight className="h-3 w-3" />
                                            </Link>
                                            <Link
                                                href={`/test-series/${test.seriesId || test.id}/attempt?testId=${test.id}&title=${encodeURIComponent(test.title)}&questions=${test.questions}&duration=${test.duration}`}
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
                                                href={`${basePath}/${test.id}/submissions`}
                                                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-purple-600 hover:border-purple-500/40 transition-colors flex items-center justify-center min-h-[44px] min-w-[44px]"
                                                title="View Submissions"
                                                aria-label="View Submissions"
                                            >
                                                <Users className="h-4 w-4" />
                                            </Link>
                                            <Link
                                                href={`${basePath}/${test.id}/review`}
                                                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-sky-600 hover:border-sky-500/40 transition-colors flex items-center justify-center min-h-[44px] min-w-[44px]"
                                                title="Review Questions"
                                                aria-label="Review Questions"
                                            >
                                                <FileText className="h-4 w-4" />
                                            </Link>
                                            <Link
                                                href={`${basePath}/${test.id}/edit`}
                                                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-sky-600 hover:border-sky-500/40 transition-colors flex items-center justify-center min-h-[44px] min-w-[44px]"
                                                title="Edit Test"
                                                aria-label="Edit Test"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Link>
                                            <button
                                                disabled={deletingId === test.id}
                                                onClick={() => handleDelete(test.id)}
                                                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-red-500 hover:border-red-500/40 transition-colors disabled:opacity-40 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                                                title="Delete Test"
                                                aria-label="Delete Test"
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
                    setIsCreatePackageModalOpen(false)
                    loadAllTests()
                }}
            />

            {/* Admin Force Delete Confirmation Modal */}
            {pendingForceDelete && (
                <div
                    data-testid="force-delete-modal"
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                >
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 shrink-0">
                                <AlertCircle className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-gray-900 dark:text-white">
                                    Confirm Force Deletion
                                </h3>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    Warning: This test has <strong className="text-red-600 dark:text-red-400 font-bold">{pendingForceDelete.attemptsCount} student attempt(s)</strong>. Force deleting will permanently erase candidate records, answers, and scores.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setPendingForceDelete(null)}
                                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer min-h-[44px]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmForceDelete}
                                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer min-h-[44px]"
                            >
                                Force Delete ({pendingForceDelete.attemptsCount} attempts)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {publishModalTest && (
                <PublishTestModal
                    isOpen={Boolean(publishModalTest)}
                    onClose={() => setPublishModalTest(null)}
                    testId={publishModalTest.id}
                    testTitle={publishModalTest.title}
                    reviewUrl={`${basePath}/${publishModalTest.id}/review`}
                    onSuccess={() => {
                        const targetId = publishModalTest.id
                        setTests((prev) =>
                            prev.map((t) => (t.id === targetId ? { ...t, status: "PUBLISHED" } : t))
                        )
                        setPublishModalTest(null)
                    }}
                />
            )}
        </div>
    )
}
