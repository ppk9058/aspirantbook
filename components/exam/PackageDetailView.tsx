"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
    ChevronLeft,
    BookOpen,
    Users,
    Clock,
    Award,
    ShieldAlert,
    CheckCircle2,
    Loader2,
    Lock,
    ExternalLink,
} from "lucide-react"
import Breadcrumbs from "@/components/layout/Breadcrumbs"
import { Checkbox } from "@/components/ui/checkbox"
import { GateControlPanel, GateState } from "@/components/admin/authwall/GateControlPanel"
import { ItemGateRowControl, ItemGateValue } from "@/components/admin/authwall/ItemGateRowControl"
import { BulkGateActionBar } from "@/components/admin/authwall/BulkGateActionBar"

interface PackageDetail {
    id: string
    slug: string
    title: string
    description: string | null
    category: string
    examName: string | null
    isPublished: boolean
    isGated?: boolean
    previewPercentage?: number
    seoMode?: "preview" | "bot-full"
    gateTitle?: string | null
    gateSubtitle?: string | null
    createdById: string | null
    createdAt: string
    metrics: {
        testsTotal: number
        testsPublished: number
        enrolled: number
        paid: number
        pass: number
        free: number
        attempts: number
        uniqueStudents: number
        avgScore: number
    }
    tests: {
        id: string
        title: string
        totalQuestions: number
        durationMinutes: number
        totalMarks: number
        isPublished: boolean
        gateMode?: string
        previewPercentage?: number | null
        attemptsCount: number
        avgScore: number
        topRanks: {
            rank: number
            name: string
            avatar: string | null
            score: number
            accuracy: number
            timeTakenSecs: number
        }[]
    }[]
}

interface PackageDetailViewProps {
    packageId: string
    basePath: string
    role: "TEACHER" | "ADMIN"
}

export default function PackageDetailView({ packageId, basePath, role }: PackageDetailViewProps) {
    const [pkg, setPkg] = useState<PackageDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [statusCode, setStatusCode] = useState<number | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set())
    const [isSavingGate, setIsSavingGate] = useState(false)

    useEffect(() => {
        let isMounted = true
        setLoading(true)
        setError(null)

        fetch(`/api/exam/series/packages/${encodeURIComponent(packageId)}`)
            .then(async (res) => {
                setStatusCode(res.status)
                const data = await res.json()
                if (!res.ok) {
                    throw new Error(data.error || "Failed to load package")
                }
                if (isMounted) {
                    setPkg(data.package)
                }
            })
            .catch((err: any) => {
                if (isMounted) {
                    setError(err.message || "Failed to load package")
                }
            })
            .finally(() => {
                if (isMounted) setLoading(false)
            })

        return () => {
            isMounted = false
        }
    }, [packageId])

    // Save package gate changes
    const handleGateChange = async (updated: Partial<GateState>) => {
        if (!pkg) return
        const nextIsGated = updated.isGated !== undefined ? updated.isGated : (pkg.isGated ?? false)
        const nextPct = updated.previewPercentage !== undefined ? updated.previewPercentage : (pkg.previewPercentage ?? 20)
        const nextSeo = updated.seoMode !== undefined ? updated.seoMode : (pkg.seoMode ?? "preview")
        const nextTitle = updated.gateTitle !== undefined ? updated.gateTitle : (pkg.gateTitle || "")
        const nextSubtitle = updated.gateSubtitle !== undefined ? updated.gateSubtitle : (pkg.gateSubtitle || "")

        setPkg((prev) => prev ? {
            ...prev,
            isGated: nextIsGated,
            previewPercentage: nextPct,
            seoMode: nextSeo as any,
            gateTitle: nextTitle,
            gateSubtitle: nextSubtitle,
        } : null)

        setIsSavingGate(true)
        try {
            await fetch(`/api/exam/series/packages/${encodeURIComponent(packageId)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    isGated: nextIsGated,
                    previewPercentage: nextPct,
                    seoMode: nextSeo,
                    gateTitle: nextTitle || null,
                    gateSubtitle: nextSubtitle || null,
                }),
            })
        } catch (err) {
            console.error("Failed to save series gate settings:", err)
        } finally {
            setIsSavingGate(false)
        }
    }

    // Save single test gate changes
    const handleUpdateTestGate = async (testId: string, gate: ItemGateValue) => {
        if (!pkg) return

        setPkg((prev) => prev ? {
            ...prev,
            tests: prev.tests.map((t) =>
                t.id === testId
                    ? { ...t, gateMode: gate.gateMode, previewPercentage: gate.previewPercentage }
                    : t
            ),
        } : null)

        try {
            await fetch(`/api/exam/series/packages/${encodeURIComponent(packageId)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tests: [{ id: testId, gateMode: gate.gateMode, previewPercentage: gate.previewPercentage }],
                }),
            })
        } catch (err) {
            console.error("Failed to update test gate:", err)
        }
    }

    // Bulk update tests gate mode
    const handleBulkUpdateTests = async (
        testIds: string[],
        gateMode: "inherit" | "free" | "preview" | "locked",
        pct?: number | null
    ) => {
        if (!pkg) return

        setPkg((prev) => prev ? {
            ...prev,
            tests: prev.tests.map((t) =>
                testIds.includes(t.id)
                    ? { ...t, gateMode, previewPercentage: pct }
                    : t
            ),
        } : null)

        try {
            await fetch(`/api/exam/series/packages/${encodeURIComponent(packageId)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tests: testIds.map((id) => ({ id, gateMode, previewPercentage: pct })),
                }),
            })
        } catch (err) {
            console.error("Failed bulk update tests gate:", err)
        }
    }

    const toggleSelectTest = (testId: string) => {
        const next = new Set(selectedTestIds)
        if (next.has(testId)) next.delete(testId)
        else next.add(testId)
        setSelectedTestIds(next)
    }

    const toggleSelectAllTests = (checked: boolean) => {
        if (!pkg) return
        if (checked) {
            setSelectedTestIds(new Set(pkg.tests.map((t) => t.id)))
        } else {
            setSelectedTestIds(new Set())
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#060f1c] p-6 lg:p-10 flex flex-col items-center justify-center gap-3 text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin text-[#00A8FF]" />
                <p className="text-sm font-semibold">Loading package details...</p>
            </div>
        )
    }

    if (statusCode === 403) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#060f1c] p-6 lg:p-10 space-y-6">
                <div className="max-w-lg mx-auto my-16 p-8 rounded-3xl bg-white dark:bg-[#0a1628] border border-red-200 dark:border-red-900/40 text-center space-y-4 shadow-sm" data-testid="package-forbidden">
                    <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
                        <Lock className="h-6 w-6" />
                    </div>
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Access Denied (403)</h2>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                        {error || "You do not have permission to view or manage this series package."}
                    </p>
                    <Link
                        href={`${basePath}/packages`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-900 dark:text-white font-bold text-xs transition-colors min-h-[44px]"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Return to Packages</span>
                    </Link>
                </div>
            </div>
        )
    }

    if (statusCode === 404 || !pkg) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#060f1c] p-6 lg:p-10 space-y-6">
                <div className="max-w-lg mx-auto my-16 p-8 rounded-3xl bg-white dark:bg-[#0a1628] border border-gray-200 dark:border-gray-800 text-center space-y-4 shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                        <ShieldAlert className="h-6 w-6" />
                    </div>
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Package Not Found (404)</h2>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                        The requested package ID does not exist or has been removed.
                    </p>
                    <Link
                        href={`${basePath}/packages`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-900 dark:text-white font-bold text-xs transition-colors min-h-[44px]"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Return to Packages</span>
                    </Link>
                </div>
            </div>
        )
    }

    const allTestsSelected = pkg.tests.length > 0 && selectedTestIds.size === pkg.tests.length

    return (
        <div data-testid="package-detail" className="min-h-screen bg-gray-50 dark:bg-[#060f1c] p-4 sm:p-6 lg:p-10 space-y-6">
            {/* Breadcrumb Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Breadcrumbs />

                <div className="flex items-center gap-2">
                    <Link
                        href={`/test-series/${pkg.slug || pkg.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-[#0a1628] border border-gray-200 dark:border-gray-800 hover:border-[#00A8FF] text-gray-700 dark:text-gray-300 font-bold text-xs shadow-xs transition-colors min-h-[44px]"
                    >
                        <ExternalLink className="h-3.5 w-3.5 text-[#00A8FF]" />
                        <span>Public View</span>
                    </Link>
                </div>
            </div>

            {/* Package Header Card */}
            <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200 dark:border-gray-800 p-6 lg:p-8 shadow-xs">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase">
                            {pkg.category}
                        </span>
                        <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                pkg.isPublished
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            }`}
                        >
                            {pkg.isPublished ? "Published" : "Draft"}
                        </span>
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white mt-1">
                        {pkg.title}
                    </h1>
                    {pkg.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
                            {pkg.description}
                        </p>
                    )}
                </div>
            </div>

            {/* Centralized Authwall Gate Controls */}
            <GateControlPanel
                gate={{
                    isGated: pkg.isGated ?? false,
                    previewPercentage: pkg.previewPercentage ?? 20,
                    seoMode: (pkg.seoMode as any) || "preview",
                    gateTitle: pkg.gateTitle || "",
                    gateSubtitle: pkg.gateSubtitle || "",
                }}
                onChange={handleGateChange}
                items={pkg.tests.map((t) => ({
                    gateMode: t.gateMode || "inherit",
                    previewPercentage: t.previewPercentage,
                }))}
                disabled={isSavingGate}
                moduleName="Test Series Studio"
            />

            {/* Metrics Dashboard */}
            <div className="space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Package Metrics Overview
                </h2>

                <div className="grid grid-cols-2 min-[640px]:grid-cols-4 lg:grid-cols-7 gap-3">
                    {/* Tests total */}
                    <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xs">
                        <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                            <BookOpen className="h-3 w-3" /> Tests
                        </span>
                        <p className="text-xl font-black text-gray-900 dark:text-white mt-1" data-testid="metric-tests-total">
                            {pkg.metrics.testsPublished} / {pkg.metrics.testsTotal}
                        </p>
                        <span className="text-[10px] text-gray-400">published / total</span>
                    </div>

                    {/* Enrolled Total */}
                    <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xs">
                        <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                            <Users className="h-3 w-3" /> Enrolled
                        </span>
                        <p className="text-xl font-black text-gray-900 dark:text-white mt-1" data-testid="metric-enrolled">
                            {pkg.metrics.enrolled}
                        </p>
                        <span className="text-[10px] text-gray-400">active enrollments</span>
                    </div>

                    {/* Paid */}
                    <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xs">
                        <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Paid
                        </span>
                        <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1" data-testid="metric-paid">
                            {pkg.metrics.paid}
                        </p>
                        <span className="text-[10px] text-gray-400">purchased verified</span>
                    </div>

                    {/* Pass */}
                    <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xs">
                        <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                            <Award className="h-3 w-3 text-purple-500" /> Pass
                        </span>
                        <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1" data-testid="metric-pass">
                            {pkg.metrics.pass}
                        </p>
                        <span className="text-[10px] text-gray-400">pass subscription</span>
                    </div>

                    {/* Free */}
                    <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xs">
                        <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                            <Users className="h-3 w-3 text-sky-500" /> Free
                        </span>
                        <p className="text-xl font-black text-sky-600 dark:text-sky-400 mt-1" data-testid="metric-free">
                            {pkg.metrics.free}
                        </p>
                        <span className="text-[10px] text-gray-400">free tier</span>
                    </div>

                    {/* Submissions / Attempts */}
                    <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xs">
                        <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Attempts
                        </span>
                        <p className="text-xl font-black text-gray-900 dark:text-white mt-1" data-testid="metric-attempts">
                            {pkg.metrics.attempts}
                        </p>
                        <span className="text-[10px] text-gray-400" data-testid="metric-unique-students">
                            {pkg.metrics.uniqueStudents} students
                        </span>
                    </div>

                    {/* Class Average */}
                    <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xs">
                        <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                            <Award className="h-3 w-3" /> Class Avg
                        </span>
                        <p className="text-xl font-black text-sky-700 dark:text-sky-400 mt-1" data-testid="metric-avg-score">
                            {pkg.metrics.avgScore}
                        </p>
                        <span className="text-[10px] text-gray-400">first attempt avg</span>
                    </div>
                </div>
            </div>

            {/* Tests in this package */}
            <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden space-y-3">
                <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
                            Tests in this Package ({pkg.tests.length})
                        </h2>
                        <p className="text-xs text-gray-500">
                            Each test authors bilingual questions, timed attempts, and candidate ranking.
                        </p>
                    </div>
                </div>

                {/* Bulk Gate Action Bar for Tests */}
                <div className="px-5">
                    <BulkGateActionBar
                        totalItems={pkg.tests.length}
                        selectedCount={selectedTestIds.size}
                        allSelected={allTestsSelected}
                        onToggleSelectAll={toggleSelectAllTests}
                        onBulkSetFree={() => handleBulkUpdateTests(Array.from(selectedTestIds), "free", null)}
                        onBulkSetLocked={() => handleBulkUpdateTests(Array.from(selectedTestIds), "locked", 0)}
                        onBulkSetPreview={(pct) => handleBulkUpdateTests(Array.from(selectedTestIds), "preview", pct)}
                        onBulkResetInherit={() => handleBulkUpdateTests(Array.from(selectedTestIds), "inherit", null)}
                        onMakeFirstNFree={(n) => {
                            const firstN = pkg.tests.slice(0, n).map((t) => t.id)
                            handleBulkUpdateTests(firstN, "free", null)
                        }}
                    />
                </div>

                {pkg.tests.length === 0 ? (
                    <div className="py-16 text-center text-gray-500 space-y-2">
                        <BookOpen className="h-8 w-8 mx-auto text-gray-400" />
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No Tests Linked Yet</p>
                        <p className="text-xs">Create or link individual tests to this package to get started.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {pkg.tests.map((test) => {
                            const isSelected = selectedTestIds.has(test.id)

                            return (
                                <div key={test.id} className="p-5 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <div className="pt-0.5">
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleSelectTest(test.id)}
                                                    data-testid={`select-test-${test.id}`}
                                                />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
                                                        {test.title}
                                                    </h3>
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                            test.isPublished
                                                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                                                : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                                        }`}
                                                    >
                                                        {test.isPublished ? "Published" : "Draft"}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                                                    <span>{test.totalQuestions} Questions</span>
                                                    <span>•</span>
                                                    <span>{test.durationMinutes} Mins</span>
                                                    <span>•</span>
                                                    <span>{test.totalMarks} Marks</span>
                                                    <span>•</span>
                                                    <span>{test.attemptsCount} Attempts</span>
                                                    <span>•</span>
                                                    <span className="font-semibold text-sky-600 dark:text-sky-400">
                                                        Avg: {test.avgScore} pts
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {/* Item Gate Row Control */}
                                            <ItemGateRowControl
                                                value={{
                                                    gateMode: test.gateMode || "inherit",
                                                    previewPercentage: test.previewPercentage,
                                                }}
                                                onChange={(updated) => handleUpdateTestGate(test.id, updated)}
                                                coursePreviewPercentage={pkg.previewPercentage ?? 20}
                                                isCourseGated={pkg.isGated ?? false}
                                                compact
                                            />

                                            <Link
                                                href={`${basePath}/${test.id}/submissions`}
                                                className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-[#00A8FF] hover:text-white text-gray-900 dark:text-white dark:bg-gray-800 font-bold text-xs transition-colors flex items-center gap-1.5 min-h-[44px]"
                                            >
                                                <span>Submissions</span>
                                                <ExternalLink className="h-3 w-3" />
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Top Ranks preview */}
                                    {test.topRanks.length > 0 && (
                                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800/60">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                                                Top Qualifying Candidates
                                            </span>
                                            <div className="flex flex-wrap gap-2">
                                                {test.topRanks.map((r) => (
                                                    <div
                                                        key={r.rank}
                                                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-700/60 text-xs"
                                                    >
                                                        <span className="font-extrabold text-amber-700 dark:text-amber-400">
                                                            #{r.rank}
                                                        </span>
                                                        <span className="font-bold text-gray-900 dark:text-white">
                                                            {r.name}
                                                        </span>
                                                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                                                            {r.score} pts
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
