"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Users,
  Clock,
  Award,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  Lock,
  ExternalLink,
  Pencil,
  Trash2,
  Copy,
  Archive,
  RotateCcw,
  Plus,
  ArrowUpDown,
  MoveUp,
  MoveDown,
  Sparkles,
  Link2,
  AlertTriangle,
  Eye,
  Filter,
  X,
} from "lucide-react"
import Breadcrumbs from "@/components/layout/Breadcrumbs"
import { Checkbox } from "@/components/ui/checkbox"
import { GateControlPanel, GateState } from "@/components/admin/authwall/GateControlPanel"
import { ItemGateRowControl, ItemGateValue } from "@/components/admin/authwall/ItemGateRowControl"
import BulkGateActionBar from "@/components/admin/authwall/BulkGateActionBar"
import StatCard from "@/components/exam/StatCard"
import TestRowActions from "@/components/exam/TestRowActions"
import EditPackageModal from "@/components/exam/EditPackageModal"
import DeleteImpactDialog from "@/components/exam/DeleteImpactDialog"
import AttachTestModal from "@/components/exam/AttachTestModal"
import { METRIC_DEFINITIONS } from "@/lib/exam/metrics"
import { StatusBadge, AccessBadge, TypeBadge } from "@/lib/exam/labels"
import { toast } from "sonner"

interface PackageDetail {
  id: string
  slug: string
  title: string
  description: string | null
  category: string
  examName: string | null
  isPublished: boolean
  isArchived: boolean
  archivedAt?: string | null
  isFree?: boolean
  isPro?: boolean
  thumbnailUrl?: string | null
  logoType?: string | null
  languages?: string
  highlights?: string[]
  isGated?: boolean
  previewPercentage?: number
  seoMode?: "preview" | "bot-full"
  gateTitle?: string | null
  gateSubtitle?: string | null
  createdById: string | null
  createdAt: string
  updatedAt: string
  metrics: {
    testsTotal: number
    testsPublished: number
    testsDraft?: number
    testsScheduled?: number
    testsArchived?: number
    enrolled: number
    paid: number
    pass: number
    free: number
    attempts: number
    enrolledAttempts?: number
    guestAttempts?: number
    uniqueStudents: number
    avgScore: number
  }
  tests: {
    id: string
    title: string
    titleHi?: string | null
    totalQuestions: number
    durationMinutes: number
    totalMarks: number
    isPublished: boolean
    isArchived?: boolean
    order?: number
    gateMode?: string
    previewPercentage?: number | null
    accessMode?: "FREE" | "PRO"
    attemptsCount: number
    avgScore: number
    topRanks: {
      rank: number
      userId?: string
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
  const router = useRouter()
  const [pkg, setPkg] = useState<PackageDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusCode, setStatusCode] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Selection & bulk
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set())
  const [isSavingGate, setIsSavingGate] = useState(false)

  // Filter & Search inside tests
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [accessFilter, setAccessFilter] = useState<string>("ALL")
  const [sortField, setSortField] = useState<string>("order")
  const [sortAsc, setSortAsc] = useState<boolean>(true)

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [includeStaff, setIncludeStaff] = useState(false)
  const [lastBulkSnapshot, setLastBulkSnapshot] = useState<{
    testIds: string[]
    snapshots: any[]
    description: string
    timestamp: string
  } | null>(null)
  const [isRevertingBulk, setIsRevertingBulk] = useState(false)
  const [firstNPreviewCount, setFirstNPreviewCount] = useState<number | null>(null)
  const [isApplyingFirstN, setIsApplyingFirstN] = useState(false)

  const loadPackage = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/exam/series/packages/${encodeURIComponent(packageId)}`)
      setStatusCode(res.status)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to load package")
      }
      setPkg(data.package)
      if (data.package?.slug && data.package.slug !== packageId && packageId !== data.package.id) {
        router.replace(`${basePath}/package/${data.package.slug}`)
      }
    } catch (err: any) {
      setError(err.message || "Failed to load package")
    } finally {
      setLoading(false)
    }
  }, [packageId, basePath, router])

  useEffect(() => {
    loadPackage()
  }, [loadPackage])

  // Save package gate changes
  const handleGateChange = async (updated: Partial<GateState>) => {
    if (!pkg) return
    const nextIsGated = updated.isGated !== undefined ? updated.isGated : (pkg.isGated ?? false)
    const nextPct =
      updated.previewPercentage !== undefined ? updated.previewPercentage : (pkg.previewPercentage ?? 20)
    const nextSeo = updated.seoMode !== undefined ? updated.seoMode : (pkg.seoMode ?? "preview")
    const nextTitle = updated.gateTitle !== undefined ? updated.gateTitle : (pkg.gateTitle || "")
    const nextSubtitle = updated.gateSubtitle !== undefined ? updated.gateSubtitle : (pkg.gateSubtitle || "")

    setPkg((prev) =>
      prev
        ? {
            ...prev,
            isGated: nextIsGated,
            previewPercentage: nextPct,
            seoMode: nextSeo as any,
            gateTitle: nextTitle,
            gateSubtitle: nextSubtitle,
          }
        : null
    )

    setIsSavingGate(true)
    try {
      await fetch(`/api/exam/series/packages/${encodeURIComponent(pkg.slug || packageId)}`, {
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
      toast.success("Gate settings updated")
    } catch (err) {
      console.error("Failed to save series gate settings:", err)
      toast.error("Failed to save gate settings")
    } finally {
      setIsSavingGate(false)
    }
  }

  // Save single test gate changes
  const handleUpdateTestGate = async (testId: string, gate: ItemGateValue) => {
    if (!pkg) return

    setPkg((prev) =>
      prev
        ? {
            ...prev,
            tests: prev.tests.map((t) =>
              t.id === testId
                ? { ...t, gateMode: gate.gateMode, previewPercentage: gate.previewPercentage }
                : t
            ),
          }
        : null
    )

    try {
      await fetch(`/api/exam/series/packages/${encodeURIComponent(pkg.slug || packageId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tests: [{ id: testId, gateMode: gate.gateMode, previewPercentage: gate.previewPercentage }],
        }),
      })
      toast.success("Test access mode updated")
    } catch (err) {
      console.error("Failed to update test gate:", err)
      toast.error("Failed to update test access mode")
    }
  }

  // Bulk update tests gate mode
  const handleBulkUpdateTests = async (
    testIds: string[],
    gateMode: "inherit" | "free" | "preview" | "locked",
    pct?: number | null
  ) => {
    if (!pkg) return

    setPkg((prev) =>
      prev
        ? {
            ...prev,
            tests: prev.tests.map((t) =>
              testIds.includes(t.id) ? { ...t, gateMode, previewPercentage: pct } : t
            ),
          }
        : null
    )

    try {
      await fetch(`/api/exam/series/packages/${encodeURIComponent(pkg.slug || packageId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tests: testIds.map((id) => ({ id, gateMode, previewPercentage: pct })),
        }),
      })
      toast.success(`Updated access settings for ${testIds.length} test(s)`)
    } catch (err) {
      console.error("Failed bulk update tests gate:", err)
      toast.error("Bulk access update failed")
    }
  }

  // Quick Action: Make First N Tests Free
  const handleMakeFirstNTestsFree = (n: number) => {
    if (!pkg || pkg.tests.length === 0) return
    const firstN = pkg.tests.slice(0, n).map((t) => t.id)
    if (firstN.length > 0) {
      handleBulkUpdateTests(firstN, "free", null)
    }
  }

  // Bulk Actions
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
      loadPackage()
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
      loadPackage()
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
      loadPackage()
      setSelectedTestIds(new Set())
    } catch (err: any) {
      toast.error(err.message || "Failed to archive tests")
    }
  }

  const handleBulkRemove = async () => {
    const ids = Array.from(selectedTestIds)
    if (ids.length === 0) return
    try {
      const res = await fetch("/api/exam/test/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testIds: ids, action: "detach" }),
      })
      if (!res.ok) throw new Error("Bulk remove failed")
      toast.success(`Detached ${ids.length} test(s) to unassigned pool`)
      loadPackage()
      setSelectedTestIds(new Set())
    } catch (err: any) {
      toast.error(err.message || "Failed to remove tests from package")
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
      loadPackage()
      setSelectedTestIds(new Set())
    } catch (err: any) {
      toast.error(err.message || "Failed to delete tests")
    }
  }

  // Restore package
  const handleRestorePackage = async () => {
    if (!pkg) return
    setIsRestoring(true)
    try {
      const res = await fetch(`/api/exam/series/packages/${encodeURIComponent(pkg.slug || pkg.id)}/restore`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to restore package")
      toast.success(`Package "${pkg.title}" restored successfully!`)
      loadPackage()
    } catch (err: any) {
      toast.error(err.message || "Failed to restore package")
    } finally {
      setIsRestoring(false)
    }
  }

  // Duplicate package
  const handleDuplicatePackage = async () => {
    if (!pkg) return
    setIsDuplicating(true)
    try {
      const res = await fetch(`/api/exam/series/packages/${encodeURIComponent(pkg.slug || pkg.id)}/duplicate`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to duplicate package")
      toast.success(`Duplicated package "${pkg.title}" as draft!`)
      router.push(`${basePath}/package/${data.data.slug}`)
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate package")
    } finally {
      setIsDuplicating(false)
    }
  }

  // Confirm and apply Make First N Tests Free with undo capability
  const handleConfirmFirstNFree = async () => {
    if (!pkg || firstNPreviewCount === null || firstNPreviewCount <= 0) return
    setIsApplyingFirstN(true)
    const targetTests = pkg.tests.slice(0, firstNPreviewCount)
    const testIds = targetTests.map((t) => t.id)
    const snapshots = targetTests.map((t) => ({
      id: t.id,
      gateMode: t.gateMode || "inherit",
      previewPercentage: t.previewPercentage ?? null,
      accessMode: t.accessMode || "PRO",
    }))

    try {
      const res = await fetch("/api/exam/test/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testIds,
          action: "quick_first_n_free",
        }),
      })
      if (!res.ok) throw new Error("Failed to apply free access")

      const appliedCount = firstNPreviewCount
      setFirstNPreviewCount(null)
      const snapshotRecord = {
        testIds,
        snapshots,
        description: `Made first ${appliedCount} test(s) free`,
        timestamp: new Date().toLocaleTimeString(),
      }
      setLastBulkSnapshot(snapshotRecord)

      toast.success(`Made first ${appliedCount} test(s) free!`, {
        duration: 20000,
        action: {
          label: "Undo",
          onClick: () => handleUndoBulkChange(snapshotRecord),
        },
      })
      loadPackage()
    } catch (err: any) {
      toast.error(err.message || "Failed to apply free access")
    } finally {
      setIsApplyingFirstN(false)
    }
  }

  // Revert last bulk change handler
  const handleUndoBulkChange = async (snapshotRecord = lastBulkSnapshot) => {
    if (!snapshotRecord) return
    setIsRevertingBulk(true)
    try {
      const undoRes = await fetch("/api/exam/test/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testIds: snapshotRecord.testIds,
          action: "revert_states",
          payload: {
            snapshots: snapshotRecord.snapshots,
            expectedState: { gateMode: "free", accessMode: "FREE" },
          },
        }),
      })
      const data = await undoRes.json()
      if (!undoRes.ok) throw new Error(data.error || "Failed to revert")
      toast.info("Reverted tests to previous access settings")
      setLastBulkSnapshot(null)
      loadPackage()
    } catch (err: any) {
      toast.error(err.message || "Failed to revert")
    } finally {
      setIsRevertingBulk(false)
    }
  }

  // Reorder test up / down
  const handleMoveTest = async (testId: string, direction: "up" | "down") => {
    if (!pkg) return
    const testsList = [...pkg.tests]
    const idx = testsList.findIndex((t) => t.id === testId)
    if (idx === -1) return

    const targetIdx = direction === "up" ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= testsList.length) return

    // Swap positions
    const temp = testsList[idx]
    testsList[idx] = testsList[targetIdx]
    testsList[targetIdx] = temp

    // Optimistically update
    setPkg({ ...pkg, tests: testsList })

    try {
      const res = await fetch("/api/exam/test/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageIdOrSlug: pkg.slug || pkg.id,
          testIdsInOrder: testsList.map((t) => t.id),
        }),
      })
      if (!res.ok) throw new Error("Failed to persist order")
      toast.success("Test order updated")
    } catch (err: any) {
      toast.error("Failed to reorder tests")
      loadPackage()
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

  // Filtered & sorted tests
  const filteredTests = useMemo(() => {
    if (!pkg) return []
    let list = pkg.tests.filter((t) => {
      const matchesSearch =
        !searchQuery ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.titleHi && t.titleHi.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PUBLISHED" && t.isPublished && !t.isArchived) ||
        (statusFilter === "DRAFT" && !t.isPublished && !t.isArchived) ||
        (statusFilter === "ARCHIVED" && Boolean(t.isArchived))

      const matchesAccess =
        accessFilter === "ALL" ||
        (accessFilter === "FREE" && (t.gateMode === "free" || !pkg.isGated)) ||
        (accessFilter === "LOCKED" && t.gateMode === "locked") ||
        (accessFilter === "INHERIT" && (!t.gateMode || t.gateMode === "inherit"))

      return matchesSearch && matchesStatus && matchesAccess
    })

    // Sorting
    list.sort((a, b) => {
      if (sortField === "title") {
        return sortAsc ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)
      }
      if (sortField === "questions") {
        return sortAsc ? a.totalQuestions - b.totalQuestions : b.totalQuestions - a.totalQuestions
      }
      if (sortField === "attempts") {
        return sortAsc ? a.attemptsCount - b.attemptsCount : b.attemptsCount - a.attemptsCount
      }
      if (sortField === "avgScore") {
        return sortAsc ? a.avgScore - b.avgScore : b.avgScore - a.avgScore
      }
      // default: order
      const orderA = a.order ?? 0
      const orderB = b.order ?? 0
      return sortAsc ? orderA - orderB : orderB - orderA
    })

    return list
  }, [pkg, searchQuery, statusFilter, accessFilter, sortField, sortAsc])

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
        <div
          className="max-w-lg mx-auto my-16 p-8 rounded-3xl bg-white dark:bg-[#0a1628] border border-red-200 dark:border-red-900/40 text-center space-y-4 shadow-sm"
          data-testid="package-forbidden"
        >
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

  if (error && statusCode !== 404 && statusCode !== 403) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#060f1c] p-6 lg:p-10 space-y-6">
        <div
          data-testid="package-error-state"
          className="max-w-lg mx-auto my-16 p-8 rounded-3xl bg-white dark:bg-[#0a1628] border border-red-200 dark:border-red-900/40 text-center space-y-4 shadow-sm"
        >
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Failed to Load Package</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            {error || "An error occurred while fetching package data from the server."}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={loadPackage}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00A8FF] hover:bg-[#0096e6] text-white font-bold text-xs transition-colors min-h-[44px] cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Retry</span>
            </button>
            <Link
              href={`${basePath}/packages`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-900 dark:text-white font-bold text-xs transition-colors min-h-[44px]"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Return to Packages</span>
            </Link>
          </div>
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
  const isArchived = Boolean(pkg.isArchived)

  // Resolved inherit gate label
  const resolvedInheritLabel = pkg.isGated
    ? `Inherit (Package: Gated ${pkg.previewPercentage ?? 20}%)`
    : "Inherit (Package: Open)"

  return (
    <div
      data-testid="package-detail"
      className="min-h-screen bg-gray-50 dark:bg-[#060f1c] p-3 sm:p-6 lg:p-10 space-y-6"
    >
      {/* Top Header & Breadcrumb Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`${basePath}/packages`}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
            aria-label="Back to Packages"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-500 font-medium flex-wrap">
            <Link href={basePath} className="hover:text-[#00A8FF] transition-colors">
              Test Series Studio
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <Link href={`${basePath}/packages`} className="hover:text-[#00A8FF] transition-colors">
              Packages
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span className="font-bold text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-xs" aria-current="page">
              {pkg.title}
            </span>
          </nav>
        </div>

        {/* Global Package Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Public View link */}
          <Link
            href={`/test-series/${pkg.slug || pkg.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#0a1628] border border-gray-200 dark:border-gray-800 hover:border-[#00A8FF] text-gray-700 dark:text-gray-300 font-bold text-xs shadow-xs transition-colors min-h-[44px]"
          >
            <ExternalLink className="h-3.5 w-3.5 text-[#00A8FF]" />
            <span>Public View</span>
          </Link>

          {/* Preview Modes */}
          <Link
            href={`/test-series/${pkg.slug || pkg.id}?preview=guest`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-xs min-h-[44px]"
          >
            <Eye className="h-3.5 w-3.5 text-gray-400" />
            <span>Preview</span>
          </Link>

          {/* Duplicate Package */}
          <button
            type="button"
            onClick={handleDuplicatePackage}
            disabled={isDuplicating}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#0a1628] border border-gray-200 dark:border-gray-800 hover:border-gray-300 text-gray-700 dark:text-gray-300 font-bold text-xs shadow-xs transition-colors min-h-[44px] cursor-pointer"
          >
            {isDuplicating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-indigo-500" />
            )}
            <span>Duplicate</span>
          </button>

          {/* Edit Package Button */}
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            data-testid="edit-package-btn"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#00A8FF] to-[#0080ff] hover:from-[#0096e6] hover:to-[#0070e6] text-white font-bold text-xs shadow-lg shadow-[#00A8FF]/20 transition-all cursor-pointer min-h-[44px]"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit Package</span>
          </button>
        </div>
      </div>

      {/* Archived Status Banner */}
      {isArchived && (
        <div
          data-testid="package-archived-banner"
          className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2.5">
            <Archive className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-extrabold text-sm">This package is currently Archived</p>
              <p className="text-amber-700/80 dark:text-amber-400/80">
                It is hidden from all public catalogs and rankings entry points. Student purchase records, attempts, and rankings remain safely preserved.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRestorePackage}
            disabled={isRestoring}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors min-h-[40px] cursor-pointer"
          >
            {isRestoring ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            <span>Restore Package</span>
          </button>
        </div>
      )}

      {/* Package Header Card */}
      <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200 dark:border-gray-800 p-6 lg:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase">
                {pkg.category}
              </span>
              <StatusBadge status={isArchived ? "ARCHIVED" : pkg.isPublished ? "PUBLISHED" : "DRAFT"} />
              <span
                data-testid="package-header-tests-badge"
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-700 dark:text-sky-400"
              >
                {pkg.metrics.testsTotal} {pkg.metrics.testsTotal === 1 ? "test" : "tests"}
              </span>
              {pkg.isFree && <AccessBadge accessMode="FREE" />}
              {pkg.isPro && <AccessBadge accessMode="PRO" />}
            </div>

            <h1 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white mt-1">
              {pkg.title}
            </h1>

            {pkg.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-3xl leading-relaxed">
                {pkg.description}
              </p>
            )}

            {pkg.highlights && pkg.highlights.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {pkg.highlights.map((h, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/80 px-2.5 py-1 rounded-lg"
                  >
                    <Sparkles className="h-3 w-3 text-[#00A8FF]" />
                    <span>{h}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
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
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Package Metrics Overview
          </h2>
          {role === "ADMIN" && (
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-500">
              <input
                type="checkbox"
                checked={includeStaff}
                onChange={(e) => setIncludeStaff(e.target.checked)}
                className="rounded text-[#00A8FF] h-3.5 w-3.5"
              />
              <span>Include staff/test accounts</span>
            </label>
          )}
        </div>

        <div className="grid grid-cols-2 min-[640px]:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* Tests published / total with draft count */}
          <StatCard
            label="Tests"
            value={`${pkg.metrics.testsPublished} / ${pkg.metrics.testsTotal}`}
            subtext={`published / total${
              pkg.metrics.testsDraft && pkg.metrics.testsDraft > 0
                ? ` · ${pkg.metrics.testsDraft} draft${pkg.metrics.testsDraft > 1 ? "s" : ""}`
                : ""
            }`}
            icon={<BookOpen className="h-3.5 w-3.5 text-sky-500" />}
            tooltip={METRIC_DEFINITIONS.testsTotal.tooltip}
            testId="metric-tests-total"
          />

          {/* Enrolled Total */}
          <StatCard
            label="Enrolled"
            value={pkg.metrics.enrolled}
            subtext="active package enrollments"
            icon={<Users className="h-3.5 w-3.5 text-indigo-500" />}
            tooltip={METRIC_DEFINITIONS.enrolled.tooltip}
            testId="metric-enrolled"
          />

          {/* Paid */}
          <StatCard
            label="Paid"
            value={pkg.metrics.paid}
            subtext="verified purchases"
            valueColor="text-emerald-600 dark:text-emerald-400"
            icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
            tooltip={METRIC_DEFINITIONS.paid.tooltip}
            testId="metric-paid"
          />

          {/* Pass */}
          <StatCard
            label="Pass"
            value={pkg.metrics.pass}
            subtext="pass subscription"
            valueColor="text-purple-600 dark:text-purple-400"
            icon={<Award className="h-3.5 w-3.5 text-purple-500" />}
            tooltip={METRIC_DEFINITIONS.pass.tooltip}
            testId="metric-pass"
          />

          {/* Free */}
          <StatCard
            label="Free"
            value={pkg.metrics.free}
            subtext="free tier access"
            valueColor="text-sky-600 dark:text-sky-400"
            icon={<Users className="h-3.5 w-3.5 text-sky-500" />}
            tooltip={METRIC_DEFINITIONS.free.tooltip}
            testId="metric-free"
          />

          {/* Total Submissions / Attempts */}
          <StatCard
            label="Total Attempts"
            value={pkg.metrics.attempts}
            subtext={`${pkg.metrics.enrolledAttempts ?? 0} enrolled · ${pkg.metrics.guestAttempts ?? 0} guest`}
            icon={<Clock className="h-3.5 w-3.5 text-amber-500" />}
            tooltip={METRIC_DEFINITIONS.attempts.tooltip}
            testId="metric-attempts"
          />

          {/* Guest / Unenrolled Attempts */}
          <StatCard
            label="Guest Attempts"
            value={pkg.metrics.guestAttempts ?? 0}
            subtext="open / trial attempts"
            icon={<Users className="h-3.5 w-3.5 text-gray-400" />}
            tooltip={METRIC_DEFINITIONS.guestAttempts.tooltip}
            testId="metric-guest-attempts"
          />

          {/* Unique Students */}
          <StatCard
            label="Unique Students"
            value={`${pkg.metrics.uniqueStudents} students`}
            subtext="distinct test takers"
            icon={<Users className="h-3.5 w-3.5 text-blue-500" />}
            tooltip={METRIC_DEFINITIONS.uniqueStudents.tooltip}
            testId="metric-unique-students"
          />

          {/* Class Average */}
          <StatCard
            label="Class Avg"
            value={pkg.metrics.attempts > 0 ? pkg.metrics.avgScore : "-"}
            subtext={pkg.metrics.attempts > 0 ? "first attempt avg %" : "Awaiting attempts"}
            valueColor="text-sky-700 dark:text-sky-400"
            icon={<Award className="h-3.5 w-3.5 text-[#00A8FF]" />}
            tooltip={METRIC_DEFINITIONS.avgScorePct.tooltip}
            testId="metric-avg-score"
          />
        </div>
      </div>

      {/* Tests in this package */}
      <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden space-y-3">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
              Tests in this Package ({pkg.tests.length})
            </h2>
            <p className="text-xs text-gray-500">
              Author bilingual questions, timed candidate runs, access gating, and ranking analytics.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsAttachModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#071d33] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs shadow-xs min-h-[44px]"
            >
              <Link2 className="h-3.5 w-3.5 text-indigo-500" />
              <span>Link Existing Test</span>
            </button>

            <Link
              href={`${basePath}/create?seriesId=${pkg.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00A8FF] hover:bg-[#0096e6] text-white font-bold text-xs shadow-xs transition-colors min-h-[44px]"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Test</span>
            </Link>
          </div>
        </div>

        {/* Search, Filter & Bulk Controls */}
        <div className="px-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <input
                type="text"
                placeholder="Search tests in this package..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs focus:outline-hidden focus:border-[#00A8FF] min-h-[40px]"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs font-semibold focus:outline-hidden focus:border-[#00A8FF] min-h-[40px]"
              >
                <option value="ALL">All Status</option>
                <option value="PUBLISHED">Published Only</option>
                <option value="DRAFT">Drafts Only</option>
                <option value="ARCHIVED">Archived</option>
              </select>

              <select
                value={accessFilter}
                onChange={(e) => setAccessFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs font-semibold focus:outline-hidden focus:border-[#00A8FF] min-h-[40px]"
              >
                <option value="ALL">All Access</option>
                <option value="FREE">Free Tier</option>
                <option value="LOCKED">Locked</option>
                <option value="INHERIT">Inherit Package</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400 font-semibold">Sort by:</span>
              <button
                type="button"
                onClick={() => setSortAsc(!sortAsc)}
                className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center"
                title={sortAsc ? "Sort ascending" : "Sort descending"}
              >
                <ArrowUpDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Bulk Gate & Action Bar for Tests */}
          <BulkGateActionBar
            totalItems={pkg.tests.length}
            selectedCount={selectedTestIds.size}
            allSelected={allTestsSelected}
            onToggleSelectAll={toggleSelectAllTests}
            onBulkSetFree={() => handleBulkUpdateTests(Array.from(selectedTestIds), "free", null)}
            onBulkSetLocked={() => handleBulkUpdateTests(Array.from(selectedTestIds), "locked", 0)}
            onBulkSetPreview={(pct) => handleBulkUpdateTests(Array.from(selectedTestIds), "preview", pct)}
            onBulkResetInherit={() => handleBulkUpdateTests(Array.from(selectedTestIds), "inherit", null)}
            onMakeFirstNFree={handleMakeFirstNTestsFree}
            onBulkPublish={handleBulkPublish}
            onBulkUnpublish={handleBulkUnpublish}
            onBulkArchive={handleBulkArchive}
            onBulkRemoveFromPackage={handleBulkRemove}
            onBulkDelete={handleBulkDelete}
            context="package"
          />
        </div>

        {pkg.tests.length === 0 ? (
          <div className="py-16 text-center text-gray-500 space-y-3">
            <BookOpen className="h-8 w-8 mx-auto text-gray-400" />
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No Tests Linked Yet</p>
            <p className="text-xs max-w-sm mx-auto text-gray-400">
              Create a fresh test with bilingual questions, or link an unassigned test from your studio library.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsAttachModalOpen(true)}
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 font-bold text-xs min-h-[40px]"
              >
                Link Test
              </button>
              <Link
                href={`${basePath}/create?seriesId=${pkg.id}`}
                className="px-4 py-2 rounded-xl bg-[#00A8FF] text-white font-bold text-xs min-h-[40px] flex items-center"
              >
                Create Test
              </Link>
            </div>
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="py-12 text-center text-gray-400 space-y-2">
            <p className="text-xs font-semibold">No tests match your current search and filter settings.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("")
                setStatusFilter("ALL")
                setAccessFilter("ALL")
              }}
              className="text-xs font-bold text-[#00A8FF] hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredTests.map((test, idx) => {
              const isSelected = selectedTestIds.has(test.id)

              return (
                <div
                  key={test.id}
                  className={`p-4 sm:p-5 hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors space-y-3 ${
                    test.isArchived ? "opacity-75 bg-gray-50/40 dark:bg-gray-900/40" : ""
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div className="pt-0.5">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectTest(test.id)}
                          data-testid={`select-test-${test.id}`}
                        />
                      </div>

                      {/* Reorder controls */}
                      <div className="flex flex-col gap-0.5 shrink-0 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleMoveTest(test.id, "up")}
                          disabled={idx === 0}
                          title="Move test up"
                          aria-label={`Move test "${test.title}" up`}
                          className="p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:pointer-events-none rounded"
                        >
                          <MoveUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveTest(test.id, "down")}
                          disabled={idx === filteredTests.length - 1}
                          title="Move test down"
                          aria-label={`Move test "${test.title}" down`}
                          className="p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:pointer-events-none rounded"
                        >
                          <MoveDown className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Test Title & Metadata */}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-mono text-gray-400 font-bold">
                            #{idx + 1}
                          </span>
                          <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
                            {test.title}
                          </h3>
                          {test.titleHi && (
                            <span className="text-xs text-gray-400 font-medium">
                              ({test.titleHi})
                            </span>
                          )}
                          <StatusBadge
                            status={test.isArchived ? "ARCHIVED" : test.isPublished ? "PUBLISHED" : "DRAFT"}
                          />
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                          <span>{test.totalQuestions} Questions</span>
                          <span>•</span>
                          <span>{test.durationMinutes} Mins</span>
                          <span>•</span>
                          <span>{test.totalMarks} Marks</span>
                          <span>•</span>
                          <span>{test.attemptsCount} Attempts</span>
                          <span>•</span>
                          <span
                            className="font-semibold text-sky-600 dark:text-sky-400"
                            title={`Test Average: ${test.avgScore} out of ${test.totalMarks} marks (${test.totalMarks > 0 ? Math.round((test.avgScore / test.totalMarks) * 100) : 0}%)`}
                          >
                            Test Avg: {test.avgScore} pts ({test.totalMarks > 0 ? Math.round((test.avgScore / test.totalMarks) * 100) : 0}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right-side controls */}
                    <div className="flex items-center gap-3 flex-wrap justify-end">
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

                      {/* Unified TestRowActions */}
                      <TestRowActions
                        test={test}
                        context="package"
                        basePath={basePath}
                        role={role}
                        packageIdOrSlug={pkg.slug || pkg.id}
                        onChanged={loadPackage}
                      />
                    </div>
                  </div>

                  {/* Top Ranks preview */}
                  {test.topRanks && test.topRanks.length > 0 && (
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800/60">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Top Qualifying Candidates
                        </span>
                        <Link
                          href={`${basePath}/${test.id}/submissions`}
                          className="text-[11px] font-bold text-[#00A8FF] hover:underline"
                        >
                          View full ranking →
                        </Link>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {test.topRanks.map((r: any) => (
                          <div
                            key={r.rank}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-700/60 text-xs"
                          >
                            <span className="font-extrabold text-amber-700 dark:text-amber-400">
                              #{r.rank}
                            </span>
                            <Link
                              href={
                                role === "ADMIN" && r.userId
                                  ? `/admin/users/${r.userId}`
                                  : r.userId
                                  ? `/profile/${r.userId}`
                                  : "#"
                              }
                              className="font-bold text-gray-900 dark:text-white hover:text-[#00A8FF] hover:underline transition-colors"
                              title={`View ${r.name}'s profile`}
                            >
                              {r.name}
                            </Link>
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

      {/* Recent Activity & Bulk Change Reversion */}
      <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#00A8FF]" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Recent Package Activity</h3>
          </div>
          {lastBulkSnapshot && (
            <button
              type="button"
              onClick={() => handleUndoBulkChange(lastBulkSnapshot)}
              disabled={isRevertingBulk}
              data-testid="revert-last-bulk-change-btn"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold text-xs transition-colors min-h-[38px] cursor-pointer self-start sm:self-auto"
            >
              {isRevertingBulk ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              <span>Revert last bulk change</span>
            </button>
          )}
        </div>

        {lastBulkSnapshot ? (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/40 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-semibold text-gray-900 dark:text-white">
                {lastBulkSnapshot.description}
              </span>
              <span className="text-gray-500">({lastBulkSnapshot.testIds.length} test{lastBulkSnapshot.testIds.length > 1 ? "s" : ""} modified)</span>
            </div>
            <span className="text-[11px] text-gray-400 font-mono shrink-0">{lastBulkSnapshot.timestamp}</span>
          </div>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">
            Package modified at {new Date(pkg.updatedAt).toLocaleTimeString()}. Dual audit logs (logContentAudit + prisma.auditLog) are tracked for every mutation.
          </p>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/5 dark:bg-red-950/10 rounded-3xl border border-red-200 dark:border-red-900/40 p-6 space-y-4">
        <div>
          <h3 className="text-sm font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wider">
            Danger Zone
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Carefully delete or archive this package. Dependent student records, payments, and attempt scores will be protected.
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="text-xs font-bold text-gray-900 dark:text-white">Delete or Archive Package</p>
            <p className="text-[11px] text-gray-500">
              {pkg.metrics.attempts > 0 || pkg.metrics.enrolled > 0
                ? "This package has learner attempts or enrollments and will be archived to protect learner records."
                : "No learner dependencies detected. This will permanently delete the package and its tests."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsDeleteDialogOpen(true)}
            data-testid="delete-package-btn"
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors min-h-[44px] cursor-pointer"
          >
            Delete Package
          </button>
        </div>
      </div>

      {/* Edit Package Modal */}
      <EditPackageModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        pkg={pkg}
        basePath={basePath}
        onUpdated={(updated) => {
          setPkg((prev) => (prev ? { ...prev, ...updated } : null))
          loadPackage()
        }}
      />

      {/* Delete / Archive Impact Dialog */}
      <DeleteImpactDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        itemType="package"
        itemName={pkg.title}
        itemId={pkg.id}
        impact={{
          testsCount: pkg.tests.length,
          attemptsCount: pkg.metrics.attempts,
          enrolledCount: pkg.metrics.enrolled,
          paidCount: pkg.metrics.paid,
        }}
        isArchivedAlready={isArchived}
        onConfirmArchive={async () => {
          const res = await fetch(`/api/exam/series/packages/${encodeURIComponent(pkg.slug || pkg.id)}`, {
            method: "DELETE",
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || "Failed to archive package")
          toast.success(data.message || `Package "${pkg.title}" archived successfully`)
          router.push(`${basePath}/packages`)
        }}
        onConfirmHardDelete={async () => {
          const res = await fetch(`/api/exam/series/packages/${encodeURIComponent(pkg.slug || pkg.id)}`, {
            method: "DELETE",
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || "Failed to delete package")
          toast.success(data.message || `Package "${pkg.title}" deleted`)
          router.push(`${basePath}/packages`)
        }}
      />

      {/* Link Existing Test Modal */}
      <AttachTestModal
        isOpen={isAttachModalOpen}
        onClose={() => setIsAttachModalOpen(false)}
        packageId={pkg.slug || pkg.id}
        existingTestIds={new Set(pkg.tests.map((t) => t.id))}
        onTestAttached={loadPackage}
      />

      {/* First N Free Confirmation & Preview Dialog */}
      {firstNPreviewCount !== null && pkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200 dark:border-gray-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-[#00A8FF]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                    Make First {firstNPreviewCount} Test{firstNPreviewCount > 1 ? "s" : ""} Free
                  </h3>
                  <p className="text-xs text-gray-500">
                    Preview of tests that will be made 100% free for students
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFirstNPreviewCount(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Tests that will become Free (100% full preview):
              </p>
              {pkg.tests.slice(0, firstNPreviewCount).map((t, idx) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 text-xs"
                >
                  <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[280px]">
                    {idx + 1}. {t.title}
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                    → Free (100%)
                  </span>
                </div>
              ))}

              {pkg.tests.length > firstNPreviewCount && (
                <p className="text-xs text-gray-500 italic pt-2">
                  + {pkg.tests.length - firstNPreviewCount} remaining test(s) will stay unchanged.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setFirstNPreviewCount(null)}
                disabled={isApplyingFirstN}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[40px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmFirstNFree}
                disabled={isApplyingFirstN}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#00A8FF] to-blue-600 hover:from-sky-500 hover:to-blue-500 shadow-md flex items-center gap-2 min-h-[40px] cursor-pointer"
              >
                {isApplyingFirstN ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <span>Confirm & Make Free</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
