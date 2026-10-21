"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
  RotateCcw,
  Archive,
  Download,
  Calendar,
  X,
  ExternalLink,
  Loader2,
  HelpCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import CreateSeriesModal from "@/components/exam/CreateSeriesModal"
import PublishTestModal from "@/components/exam/PublishTestModal"
import StatCard from "@/components/exam/StatCard"
import TestRowActions from "@/components/exam/TestRowActions"
import BulkGateActionBar from "@/components/admin/authwall/BulkGateActionBar"
import FilterBar from "@/components/exam/FilterBar"
import { StatusBadge, AccessBadge, TypeBadge, formatTestType } from "@/lib/exam/labels"
import { METRIC_DEFINITIONS } from "@/lib/exam/metrics"
import { formatIstDateTime } from "@/lib/format-date"
import { toast } from "sonner"

interface ManageTestItem {
  id: string
  seriesId?: string
  seriesSlug?: string
  seriesTitle?: string
  title: string
  titleHi?: string | null
  category: string
  type: string
  accessMode: "FREE" | "PRO"
  questions: number
  duration: number
  marks: number
  attempts: number
  uniqueStudents?: number
  avgScore: number
  submittedCount?: number
  status: "PUBLISHED" | "DRAFT" | "LIVE" | "SCHEDULED" | "ARCHIVED"
  isArchived: boolean
  isLive: boolean
  liveStartAt?: string | null
  liveEndAt?: string | null
  order: number
  createdAt: string
}

export default function TeacherTestSeriesManagePage() {
  const [tests, setTests] = useState<ManageTestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [packagesList, setPackagesList] = useState<any[]>([])

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTab, setSelectedTab] = useState<
    "ALL" | "PUBLISHED" | "LIVE" | "DRAFT" | "SCHEDULED" | "ARCHIVED"
  >("ALL")
  const [typeFilter, setTypeFilter] = useState("ALL")
  const [accessFilter, setAccessFilter] = useState("ALL")
  const [packageFilter, setPackageFilter] = useState("ALL")

  // Selection for bulk actions
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set())

  // Modals
  const [isCreatePackageModalOpen, setIsCreatePackageModalOpen] = useState(false)
  const [publishModalTest, setPublishModalTest] = useState<ManageTestItem | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isCreateDropdownOpen, setIsCreateDropdownOpen] = useState(false)
  const [emailDismissed, setEmailDismissed] = useState(true)

  const pathname = usePathname()
  const basePath = pathname.startsWith("/admin") ? "/admin/test-series" : "/teacher/test-series"
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === "ADMIN" || pathname.startsWith("/admin")
  const effectiveRole = isAdmin ? "ADMIN" : "TEACHER"

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem("ts_dismiss_email_banner")
      if (!dismissed) setEmailDismissed(false)
    } catch {
      // Ignore
    }
  }, [])

  const dismissEmailBanner = () => {
    setEmailDismissed(true)
    try {
      localStorage.setItem("ts_dismiss_email_banner", "true")
    } catch {
      // Ignore
    }
  }

  const loadAllTests = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const [testRes, pkgRes] = await Promise.all([
        fetch("/api/exam/test/list?archived=all&includeAll=true"),
        fetch("/api/exam/series/packages?archived=ACTIVE"),
      ])

      if (!testRes.ok) {
        const errJson = await testRes.json().catch(() => ({}))
        throw new Error(errJson.error || `Failed to fetch tests (${testRes.status})`)
      }
      if (!pkgRes.ok) {
        const errJson = await pkgRes.json().catch(() => ({}))
        throw new Error(errJson.error || `Failed to fetch packages (${pkgRes.status})`)
      }

      const testData = await testRes.json()
      const pkgData = await pkgRes.json()

      if (Array.isArray(pkgData.packages)) {
        setPackagesList(pkgData.packages)
      }

      const items: ManageTestItem[] = []
      if (testData.success && Array.isArray(testData.data)) {
        const now = new Date()

        testData.data.forEach((t: any) => {
          const qCount =
            typeof t.questions === "number"
              ? t.questions
              : typeof t.totalQuestions === "number"
              ? t.totalQuestions
              : 0
          const dMinutes =
            typeof t.durationMinutes === "number"
              ? t.durationMinutes
              : typeof t.duration === "number"
              ? t.duration
              : 60
          const attempts =
            typeof t.attempts === "number"
              ? t.attempts
              : typeof t.attemptsCount === "number"
              ? t.attemptsCount
              : 0

          let status: ManageTestItem["status"] = "DRAFT"
          if (t.isArchived) {
            status = "ARCHIVED"
          } else if (t.isPublished) {
            if (t.isLive) {
              const start = t.liveStartAt ? new Date(t.liveStartAt) : null
              const end = t.liveEndAt ? new Date(t.liveEndAt) : null
              if (start && start > now) {
                status = "SCHEDULED"
              } else if (end && end < now) {
                status = "PUBLISHED"
              } else {
                status = "LIVE"
              }
            } else {
              status = "PUBLISHED"
            }
          }

          items.push({
            id: t.id,
            seriesId: t.seriesId || "",
            seriesSlug: t.seriesSlug || t.series?.slug || "",
            seriesTitle: t.seriesTitle || t.series?.title || "",
            title: t.title,
            titleHi: t.titleHi,
            category: t.category || t.series?.category || "General Studies",
            type: t.testType || "FULL_MOCK",
            accessMode: t.accessMode === "FREE" ? "FREE" : "PRO",
            questions: qCount,
            duration: dMinutes,
            marks: t.totalMarks || t.marks || 100,
            attempts,
            uniqueStudents: t.uniqueStudents || (attempts > 0 ? 1 : 0),
            avgScore: typeof t.avgScore === "number" ? t.avgScore : 0,
            submittedCount: typeof t.submittedAttemptsCount === "number" ? t.submittedAttemptsCount : attempts,
            status,
            isArchived: Boolean(t.isArchived),
            isLive: Boolean(t.isLive),
            liveStartAt: t.liveStartAt,
            liveEndAt: t.liveEndAt,
            order: t.order ?? 0,
            createdAt: formatIstDateTime(t.createdAt),
          })
        })
      }
      setTests(items)
    } catch (err: any) {
      console.warn("Could not fetch DB tests:", err)
      setFetchError(err.message || "Failed to load tests and packages")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAllTests()
  }, [loadAllTests])

  // Bulk actions
  const handleBulkPublish = async () => {
    const ids = Array.from(selectedTestIds)
    if (ids.length === 0) return
    try {
      const res = await fetch("/api/exam/test/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testIds: ids, action: "publish" }),
      })
      if (!res.ok) throw new Error("Bulk publish failed")
      toast.success(`Published ${ids.length} test(s)`)
      loadAllTests()
      setSelectedTestIds(new Set())
    } catch (err: any) {
      toast.error(err.message || "Failed to publish tests")
    }
  }

  const handleBulkUnpublish = async () => {
    const ids = Array.from(selectedTestIds)
    if (ids.length === 0) return
    try {
      const res = await fetch("/api/exam/test/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testIds: ids, action: "unpublish" }),
      })
      if (!res.ok) throw new Error("Bulk unpublish failed")
      toast.success(`Unpublished ${ids.length} test(s)`)
      loadAllTests()
      setSelectedTestIds(new Set())
    } catch (err: any) {
      toast.error(err.message || "Failed to unpublish tests")
    }
  }

  const handleBulkArchive = async () => {
    const ids = Array.from(selectedTestIds)
    if (ids.length === 0) return
    try {
      const res = await fetch("/api/exam/test/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testIds: ids, action: "archive" }),
      })
      if (!res.ok) throw new Error("Bulk archive failed")
      toast.success(`Archived ${ids.length} test(s)`)
      loadAllTests()
      setSelectedTestIds(new Set())
    } catch (err: any) {
      toast.error(err.message || "Failed to archive tests")
    }
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedTestIds)
    if (ids.length === 0) return
    try {
      const res = await fetch("/api/exam/test/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testIds: ids, action: "delete" }),
      })
      if (!res.ok) throw new Error("Bulk delete failed")
      toast.success(`Processed deletion for ${ids.length} test(s)`)
      loadAllTests()
      setSelectedTestIds(new Set())
    } catch (err: any) {
      toast.error(err.message || "Failed to delete tests")
    }
  }

  const handleBulkSetFree = async () => {
    const ids = Array.from(selectedTestIds)
    if (ids.length === 0) return
    try {
      await fetch("/api/exam/test/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testIds: ids, action: "accessMode", payload: { accessMode: "FREE" } }),
      })
      toast.success(`Set ${ids.length} test(s) to Free Tier`)
      loadAllTests()
      setSelectedTestIds(new Set())
    } catch (err: any) {
      toast.error(err.message || "Failed to set access mode")
    }
  }

  const handleBulkSetLocked = async () => {
    const ids = Array.from(selectedTestIds)
    if (ids.length === 0) return
    try {
      await fetch("/api/exam/test/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testIds: ids, action: "accessMode", payload: { accessMode: "PRO" } }),
      })
      toast.success(`Set ${ids.length} test(s) to Pass Locked`)
      loadAllTests()
      setSelectedTestIds(new Set())
    } catch (err: any) {
      toast.error(err.message || "Failed to set access mode")
    }
  }

  const handleExportCsv = async () => {
    setIsExporting(true)
    try {
      const res = await fetch("/api/exam/test/export")
      if (!res.ok) throw new Error("Failed to export tests")
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `trillionskill-tests-${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Tests exported to CSV successfully")
    } catch (err: any) {
      toast.error(err.message || "CSV export failed")
    } finally {
      setIsExporting(false)
    }
  }

  // Filtered tests calculation
  const filteredTests = useMemo(() => {
    return tests.filter((t) => {
      const matchesTab =
        selectedTab === "ALL" ||
        (selectedTab === "PUBLISHED" && t.status === "PUBLISHED") ||
        (selectedTab === "LIVE" && t.status === "LIVE") ||
        (selectedTab === "DRAFT" && t.status === "DRAFT") ||
        (selectedTab === "SCHEDULED" && t.status === "SCHEDULED") ||
        (selectedTab === "ARCHIVED" && t.status === "ARCHIVED")

      const matchesSearch =
        !searchQuery ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.seriesTitle && t.seriesTitle.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesType = typeFilter === "ALL" || t.type === typeFilter
      const matchesAccess = accessFilter === "ALL" || t.accessMode === accessFilter

      const isUnassigned =
        !t.seriesSlug ||
        t.seriesSlug === "unassigned-tests-system-series" ||
        t.seriesTitle?.toLowerCase().includes("unassigned")

      const matchesPackage =
        packageFilter === "ALL" ||
        (packageFilter === "UNASSIGNED" && isUnassigned) ||
        t.seriesSlug === packageFilter ||
        t.seriesId === packageFilter

      return matchesTab && matchesSearch && matchesType && matchesAccess && matchesPackage
    })
  }, [tests, selectedTab, searchQuery, typeFilter, accessFilter, packageFilter])

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      ALL: tests.length,
      PUBLISHED: tests.filter((t) => t.status === "PUBLISHED").length,
      LIVE: tests.filter((t) => t.status === "LIVE").length,
      DRAFT: tests.filter((t) => t.status === "DRAFT").length,
      SCHEDULED: tests.filter((t) => t.status === "SCHEDULED").length,
      ARCHIVED: tests.filter((t) => t.status === "ARCHIVED").length,
    }
  }, [tests])

  // Metrics summary
  const metricsSummary = useMemo(() => {
    const nonArchived = tests.filter((t) => !t.isArchived)
    const totalSubmissions = tests.reduce((acc, curr) => acc + curr.attempts, 0)
    const totalSubmittedAttempts = tests.reduce((acc, curr) => acc + (curr.submittedCount ?? 0), 0)
    const uniqueStudents = tests.reduce((acc, curr) => acc + (curr.uniqueStudents ?? 0), 0)

    const overallAvgScore =
      totalSubmittedAttempts > 0
        ? Math.round(
            (tests.reduce((acc, curr) => acc + curr.avgScore * (curr.submittedCount ?? 0), 0) /
              totalSubmittedAttempts) *
              10
          ) / 10
        : null

    return {
      total: tests.length,
      published: nonArchived.filter((t) => t.status === "PUBLISHED").length,
      draft: nonArchived.filter((t) => t.status === "DRAFT").length,
      scheduled: nonArchived.filter((t) => t.status === "SCHEDULED").length,
      archived: tests.filter((t) => t.isArchived).length,
      submissions: totalSubmissions,
      uniqueStudents,
      avgScorePct: overallAvgScore,
    }
  }, [tests])

  const allSelected = filteredTests.length > 0 && selectedTestIds.size === filteredTests.length

  const toggleSelectTest = (id: string) => {
    const next = new Set(selectedTestIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedTestIds(next)
  }

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTestIds(new Set(filteredTests.map((t) => t.id)))
    } else {
      setSelectedTestIds(new Set())
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#060f1c] p-3 sm:p-6 lg:p-10 space-y-6 sm:space-y-8">
      {/* Email Verification Banner (Persistent dismiss) */}
      {!emailDismissed && (
        <div
          data-testid="email-verification-banner"
          className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50 flex items-center justify-between text-xs text-sky-800 dark:text-sky-300"
        >
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 shrink-0 text-[#00A8FF]" />
            <span>
              Authoring security enabled. Verify your teacher email in account settings to protect published mock exams.
            </span>
          </div>
          <button
            type="button"
            onClick={dismissEmailBanner}
            className="p-1 hover:bg-sky-100 dark:hover:bg-sky-900 rounded-lg min-h-[32px] min-w-[32px] flex items-center justify-center text-sky-700 dark:text-sky-400"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-400 text-xs font-bold uppercase tracking-wider">
              {isAdmin ? "Admin Authority" : "Teacher Studio"}
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400">• Exam Management</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white mt-1">
            Test Series Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create, author bilingual questions, manage marking schemes, access gating, and monitor candidate submissions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Packages Link */}
          <Link
            href={`${basePath}/packages`}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-800 dark:text-gray-200 font-bold text-xs shadow-xs transition-all min-h-[44px]"
          >
            <Layers className="h-4 w-4 text-[#00A8FF]" />
            <span>Packages ({packagesList.length})</span>
          </Link>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-800 dark:text-gray-200 font-bold text-xs shadow-xs transition-all min-h-[44px] cursor-pointer"
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5 text-emerald-500" />
            )}
            <span>Export CSV</span>
          </button>

          {/* Create Button Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCreateDropdownOpen(!isCreateDropdownOpen)}
              data-testid="create-test-dropdown-btn"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00A8FF] to-[#0080ff] hover:from-[#0096e6] hover:to-[#0070e6] text-white font-bold text-xs shadow-lg shadow-[#00A8FF]/20 transition-all cursor-pointer min-h-[44px]"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Create Test</span>
              <ChevronDown className="h-3.5 w-3.5 ml-0.5" />
            </button>

            {isCreateDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#0a1628] border border-gray-200 dark:border-gray-800 shadow-xl z-50 p-1.5 text-xs animate-in fade-in"
                onMouseLeave={() => setIsCreateDropdownOpen(false)}
              >
                <Link
                  href={`${basePath}/create`}
                  onClick={() => setIsCreateDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold min-h-[38px]"
                >
                  <Plus className="h-3.5 w-3.5 text-[#00A8FF]" />
                  <span>Blank Individual Test</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setIsCreateDropdownOpen(false)
                    setIsCreatePackageModalOpen(true)
                  }}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold min-h-[38px]"
                >
                  <Layers className="h-3.5 w-3.5 text-indigo-500" />
                  <span>New Series Package</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Packages Strip */}
      {packagesList.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0a1628] border border-gray-200 dark:border-gray-800 shadow-xs flex items-center justify-between gap-4 overflow-x-auto text-xs">
          <div className="flex items-center gap-2 shrink-0 font-bold text-gray-500">
            <Layers className="h-4 w-4 text-[#00A8FF]" />
            <span>Active Packages:</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {packagesList.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                href={`${basePath}/package/${p.slug || p.id}`}
                className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 hover:border-[#00A8FF] border border-gray-200/80 dark:border-gray-700/60 font-semibold text-gray-800 dark:text-gray-200 shrink-0 flex items-center gap-1.5"
              >
                <span>{p.title}</span>
                <span className="text-[10px] text-gray-400 font-mono">({p.metrics?.testsTotal || 0})</span>
              </Link>
            ))}
          </div>

          <Link
            href={`${basePath}/packages`}
            className="text-xs font-bold text-[#00A8FF] hover:underline shrink-0 flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 min-[640px]:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard
          label="Total Tests"
          value={loading || fetchError ? "-" : metricsSummary.total}
          subtext={loading ? "Loading..." : fetchError ? "Error loading" : `${metricsSummary.published} published`}
          icon={<BookOpen className="h-3.5 w-3.5 text-[#00A8FF]" />}
          tooltip={METRIC_DEFINITIONS.testsTotal.tooltip}
        />

        <StatCard
          label="Published"
          value={loading || fetchError ? "-" : metricsSummary.published}
          subtext={loading ? "Loading..." : fetchError ? "Error loading" : "live on portal"}
          valueColor="text-emerald-600 dark:text-emerald-400"
          icon={<CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
          tooltip={METRIC_DEFINITIONS.testsPublished.tooltip}
        />

        <StatCard
          label="Drafts"
          value={loading || fetchError ? "-" : metricsSummary.draft}
          subtext={loading ? "Loading..." : fetchError ? "Error loading" : "in-progress authoring"}
          valueColor="text-amber-600 dark:text-amber-400"
          icon={<Clock className="h-3.5 w-3.5 text-amber-500" />}
          tooltip={METRIC_DEFINITIONS.testsDraft.tooltip}
        />

        <StatCard
          label="Scheduled"
          value={loading || fetchError ? "-" : metricsSummary.scheduled}
          subtext={loading ? "Loading..." : fetchError ? "Error loading" : "pending start date"}
          valueColor="text-sky-600 dark:text-sky-400"
          icon={<Calendar className="h-3.5 w-3.5 text-sky-500" />}
          tooltip={METRIC_DEFINITIONS.testsScheduled.tooltip}
        />

        <StatCard
          label="Archived"
          value={loading || fetchError ? "-" : metricsSummary.archived}
          subtext={loading ? "Loading..." : fetchError ? "Error loading" : "hidden, preserved"}
          icon={<Archive className="h-3.5 w-3.5 text-neutral-400" />}
          tooltip={METRIC_DEFINITIONS.testsArchived.tooltip}
        />

        <StatCard
          label="Submissions"
          value={loading || fetchError ? "-" : metricsSummary.submissions.toLocaleString()}
          subtext={
            loading
              ? "Loading..."
              : fetchError
              ? "Error loading"
              : metricsSummary.avgScorePct !== null
              ? `Avg ${metricsSummary.avgScorePct}%`
              : "Awaiting attempts"
          }
          valueColor="text-purple-600 dark:text-purple-400"
          icon={<Users className="h-3.5 w-3.5 text-purple-500" />}
          tooltip={METRIC_DEFINITIONS.attempts.tooltip}
        />
      </div>

      {/* Error state with Retry button */}
      {fetchError && (
        <div
          data-testid="tests-error-banner"
          className="p-8 rounded-3xl bg-white dark:bg-[#0a1628] border border-red-200 dark:border-red-900/40 text-center space-y-4 shadow-sm"
        >
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Failed to Load Tests</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
            {fetchError}
          </p>
          <button
            type="button"
            onClick={loadAllTests}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00A8FF] hover:bg-[#0096e6] text-white font-bold text-xs transition-colors min-h-[44px] cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Filter Tabs, Search & Table */}
      <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden space-y-3">
        {/* Tab row & dropdown filters */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-3">
          {/* Status Tabs: horizontally scrollable line, no cut-off tabs */}
          <div className="overflow-x-auto no-scrollbar scroll-smooth">
            <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/80 min-w-max" data-scroll-x="true">
              {(["ALL", "PUBLISHED", "LIVE", "DRAFT", "SCHEDULED", "ARCHIVED"] as const).map((tab) => {
                const count = tabCounts[tab]
                const label =
                  tab === "ALL"
                    ? "All Tests"
                    : tab === "LIVE"
                    ? "Live Arena"
                    : tab.charAt(0) + tab.slice(1).toLowerCase()

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSelectedTab(tab)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] cursor-pointer shrink-0 whitespace-nowrap ${
                      selectedTab === tab
                        ? "bg-white dark:bg-[#071d33] text-gray-900 dark:text-white shadow-xs"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <span>{label}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-200/60 dark:bg-gray-700/60 font-mono">
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick Filters: Type / Tier / Package on a single row */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-nowrap pt-0.5 max-w-3xl">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex-1 min-w-[110px] px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs font-semibold focus:outline-hidden focus:border-[#00A8FF] min-h-[40px] truncate cursor-pointer"
            >
              <option value="ALL">All Types</option>
              <option value="FULL_MOCK">Full Test</option>
              <option value="CHAPTER_TEST">Chapter Test</option>
              <option value="SECTIONAL_TEST">Sectional Test</option>
              <option value="PREVIOUS_YEAR">PYQ Paper</option>
              <option value="LIVE_SPEED">Live Speed</option>
              <option value="CURRENT_AFFAIRS">Current Affairs Quiz</option>
            </select>

            <select
              value={accessFilter}
              onChange={(e) => setAccessFilter(e.target.value)}
              className="flex-1 min-w-[100px] px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs font-semibold focus:outline-hidden focus:border-[#00A8FF] min-h-[40px] truncate cursor-pointer"
            >
              <option value="ALL">All Tiers</option>
              <option value="FREE">Free Tier</option>
              <option value="PRO">Pass PRO</option>
            </select>

            <select
              value={packageFilter}
              onChange={(e) => setPackageFilter(e.target.value)}
              className="flex-1 min-w-[130px] px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs font-semibold focus:outline-hidden focus:border-[#00A8FF] min-h-[40px] truncate cursor-pointer"
            >
              <option value="ALL">All Packages</option>
              <option value="UNASSIGNED">Unassigned Tests</option>
              {packagesList.map((p) => (
                <option key={p.id} value={p.slug || p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search & Bulk action toolbar */}
        <div className="px-4 space-y-3">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tests or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs text-gray-900 dark:text-white placeholder-gray-500 focus:outline-hidden focus:border-[#00A8FF] min-h-[44px]"
            />
          </div>

          <BulkGateActionBar
            totalItems={filteredTests.length}
            selectedCount={selectedTestIds.size}
            allSelected={allSelected}
            onToggleSelectAll={toggleSelectAll}
            onBulkSetFree={handleBulkSetFree}
            onBulkSetLocked={handleBulkSetLocked}
            onBulkSetPreview={() => {}}
            onBulkResetInherit={() => {}}
            onMakeFirstNFree={() => {}}
            onBulkPublish={handleBulkPublish}
            onBulkUnpublish={handleBulkUnpublish}
            onBulkArchive={handleBulkArchive}
            onBulkDelete={handleBulkDelete}
            context="list"
          />
        </div>

        {/* Tests Table */}
        <div className="overflow-x-auto" data-scroll-x="true">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300 uppercase tracking-wider font-bold border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="py-3.5 px-4 w-10">
                  <span className="sr-only">Select</span>
                </th>
                <th className="py-3.5 px-4 min-w-[260px]">Test Title &amp; Created</th>
                <th className="py-3.5 px-4 min-w-[150px]">Package Link</th>
                <th className="py-3.5 px-4">Type &amp; Access</th>
                <th className="py-3.5 px-4">Questions</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Submissions</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right min-w-[140px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#00A8FF] mb-2" />
                    <span>Loading tests...</span>
                  </td>
                </tr>
              ) : filteredTests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-400 space-y-2">
                    <BookOpen className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-700" />
                    <p className="text-xs font-bold text-gray-600 dark:text-gray-300">No tests found</p>
                    <p className="text-[11px]">No tests match your current tab and search filters.</p>
                  </td>
                </tr>
              ) : (
                filteredTests.map((test) => {
                  const isSelected = selectedTestIds.has(test.id)
                  const isUnassigned =
                    !test.seriesSlug ||
                    test.seriesSlug === "unassigned-tests-system-series" ||
                    test.seriesTitle?.toLowerCase().includes("unassigned")

                  return (
                    <tr
                      key={test.id}
                      className={`hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors ${
                        test.isArchived ? "opacity-75 bg-gray-50/30 dark:bg-gray-900/30" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-4 px-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectTest(test.id)}
                          data-testid={`select-test-${test.id}`}
                        />
                      </td>

                      {/* Test Title with tooltip on hover & created timestamp */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5 max-w-sm">
                          <p
                            className="font-extrabold text-sm text-gray-900 dark:text-white line-clamp-1"
                            title={test.title}
                          >
                            {test.title}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-gray-500 flex-wrap">
                            <span className="font-semibold text-sky-700 dark:text-sky-400">
                              {test.category}
                            </span>
                            <span>•</span>
                            <span data-testid="test-created-at">Created {test.createdAt}</span>
                          </div>
                        </div>
                      </td>

                      {/* Package Link or Unassigned badge */}
                      <td className="py-4 px-4">
                        {isUnassigned ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            Unassigned
                          </span>
                        ) : (
                          <Link
                            href={`${basePath}/package/${test.seriesSlug || test.seriesId}`}
                            className="font-bold text-gray-800 dark:text-gray-200 hover:text-[#00A8FF] flex items-center gap-1 line-clamp-1"
                            title={test.seriesTitle}
                          >
                            <span className="line-clamp-1">{test.seriesTitle || "Package"}</span>
                            <ExternalLink className="h-3 w-3 shrink-0 text-gray-400" />
                          </Link>
                        )}
                      </td>

                      {/* Type & Access badges */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <TypeBadge type={test.type} />
                          <AccessBadge accessMode={test.accessMode} />
                        </div>
                      </td>

                      {/* Questions */}
                      <td className="py-4 px-4 font-bold text-gray-800 dark:text-gray-200">
                        {test.questions} Qs
                      </td>

                      {/* Duration */}
                      <td className="py-4 px-4 font-bold text-gray-800 dark:text-gray-200">
                        {test.duration} Mins
                      </td>

                      {/* Submissions & Avg Score */}
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

                      {/* Status */}
                      <td className="py-4 px-4">
                        <StatusBadge status={test.status} />
                      </td>

                      {/* Row Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {test.status === "DRAFT" && (
                            <button
                              type="button"
                              onClick={() => setPublishModalTest(test)}
                              data-testid="publish-row-button"
                              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 min-h-[44px] cursor-pointer shadow-xs shrink-0"
                              title="Publish Test"
                              aria-label={`Publish ${test.title}`}
                            >
                              <CheckCircle className="h-4 w-4" />
                              <span>Publish</span>
                            </button>
                          )}
                          <TestRowActions
                            test={test}
                            context="list"
                            basePath={basePath}
                            role={effectiveRole}
                            onChanged={loadAllTests}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Package Modal */}
      <CreateSeriesModal
        isOpen={isCreatePackageModalOpen}
        onClose={() => setIsCreatePackageModalOpen(false)}
        defaultCategory="UPSC"
        onCreated={() => {
          setIsCreatePackageModalOpen(false)
          loadAllTests()
        }}
      />

      {/* Publish Test Modal */}
      {publishModalTest && (
        <PublishTestModal
          isOpen={Boolean(publishModalTest)}
          onClose={() => setPublishModalTest(null)}
          testId={publishModalTest.id}
          testTitle={publishModalTest.title}
          reviewUrl={`${basePath}/${publishModalTest.id}/review`}
          onSuccess={() => {
            setPublishModalTest(null)
            loadAllTests()
          }}
        />
      )}
    </div>
  )
}
