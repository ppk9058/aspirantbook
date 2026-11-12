"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  Search,
  FileText,
  Lock,
  Zap,
  CheckCircle2,
  AlertCircle,
  X,
  Upload,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { GateControlPanel } from "@/components/admin/authwall/GateControlPanel"
import {
  StudioStatusTabs,
  useStudioSelection,
  StudioBulkActionBar,
  StudioRowMenu,
  StudioDeleteImpactDialog,
} from "@/components/admin/studio"
import { toast } from "sonner"

interface Paper {
  id: string
  title: string
  slug: string
  year: number
  stage: string
  shift?: string | null
  subject?: string | null
  paperPdfUrl: string
  solutionPdfUrl?: string | null
  accessType: string
  unlockPrice: number
  hasCbtMode: boolean
  cbtTestId?: string | null
  downloadCount: number
  attemptCount: number
  status: string
  category: { name: string; slug: string; badgeColor?: string | null }
  subExam?: { name: string; slug: string } | null
  _count: { leads: number; unlocks: number }
  isGated?: boolean
  previewPercentage?: number
  seoMode?: "preview" | "bot-full"
  gateTitle?: string | null
  gateSubtitle?: string | null
}

interface Category {
  id: string
  name: string
  slug: string
}

type PyqStatusTab = "ALL" | "PUBLISHED" | "DRAFT" | "ARCHIVED"

export function PyqPapersListClient({
  initialPapers,
  categories,
  basePath = "/admin",
}: {
  initialPapers: Paper[]
  categories: Category[]
  basePath?: string
}) {
  const [papers, setPapers] = useState<Paper[]>(initialPapers)
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<PyqStatusTab>("ALL")
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL")
  const [selectedYear, setSelectedYear] = useState<string>("ALL")
  const [selectedStage, setSelectedStage] = useState<string>("ALL")
  const [selectedAccess, setSelectedAccess] = useState<string>("ALL")
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Delete dialog state
  const [paperToDelete, setPaperToDelete] = useState<Paper | null>(null)

  const availableYears = useMemo(
    () => Array.from(new Set(papers.map((p) => p.year))).sort((a, b) => b - a),
    [papers]
  )

  // Status counts calculation
  const statusCounts = useMemo(() => {
    const counts = {
      ALL: papers.length,
      PUBLISHED: 0,
      DRAFT: 0,
      ARCHIVED: 0,
    }
    for (const p of papers) {
      const s = p.status ? p.status.toUpperCase() : "DRAFT"
      if (s === "PUBLISHED") counts.PUBLISHED++
      else if (s === "ARCHIVED") counts.ARCHIVED++
      else counts.DRAFT++
    }
    return counts
  }, [papers])

  const tabs = useMemo(
    () => [
      { id: "ALL" as const, label: "All Papers", count: statusCounts.ALL },
      { id: "PUBLISHED" as const, label: "Published", count: statusCounts.PUBLISHED },
      { id: "DRAFT" as const, label: "Drafts", count: statusCounts.DRAFT },
      { id: "ARCHIVED" as const, label: "Archived", count: statusCounts.ARCHIVED },
    ],
    [statusCounts]
  )

  // Edit modal state
  const [editingPaper, setEditingPaper] = useState<Paper | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editSubject, setEditSubject] = useState("")
  const [editYear, setEditYear] = useState<number>(2024)
  const [editStage, setEditStage] = useState("PRELIMS")
  const [editCbtTestId, setEditCbtTestId] = useState("")
  const [editHasCbtMode, setEditHasCbtMode] = useState(false)
  const [editIsGated, setEditIsGated] = useState(false)
  const [editPreviewPercentage, setEditPreviewPercentage] = useState(20)
  const [editSeoMode, setEditSeoMode] = useState<"preview" | "bot-full">("preview")
  const [editGateTitle, setEditGateTitle] = useState("")
  const [editGateSubtitle, setEditGateSubtitle] = useState("")
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isUploadingReplace, setIsUploadingReplace] = useState(false)
  const [isUploadingSolution, setIsUploadingSolution] = useState(false)

  const openEditModal = (paper: Paper) => {
    setActionError(null)
    setEditingPaper(paper)
    setEditTitle(paper.title)
    setEditSubject(paper.subject || "")
    setEditYear(paper.year)
    setEditStage(paper.stage)
    setEditCbtTestId(paper.cbtTestId || "")
    setEditHasCbtMode(paper.hasCbtMode || false)
    setEditIsGated(paper.isGated ?? false)
    setEditPreviewPercentage(paper.previewPercentage ?? 20)
    setEditSeoMode(paper.seoMode ?? "preview")
    setEditGateTitle(paper.gateTitle || "")
    setEditGateSubtitle(paper.gateSubtitle || "")
  }

  const handleToggleArchive = async (paper: Paper) => {
    const isCurrentlyArchived = paper.status === "ARCHIVED"
    const targetStatus = isCurrentlyArchived ? "PUBLISHED" : "ARCHIVED"
    setTogglingId(paper.id)
    setActionError(null)

    try {
      const res = await fetch(`/api/admin/pyqs/papers/${paper.id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !isCurrentlyArchived }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to update archive status")
      }
      setPapers((prev) =>
        prev.map((p) => (p.id === paper.id ? { ...p, status: targetStatus } : p))
      )
      const msg = isCurrentlyArchived
        ? `Restored "${paper.title}" successfully`
        : `Archived "${paper.title}" successfully`
      setSuccessMsg(msg)
      toast.success(msg)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setActionError(err.message || "Failed to update archive state")
      toast.error(err.message || "Failed to update archive state")
    } finally {
      setTogglingId(null)
    }
  }

  const handleTogglePublish = async (paper: Paper) => {
    setTogglingId(paper.id)
    setActionError(null)
    const newStatus = paper.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"

    try {
      const res = await fetch(`/api/admin/pyqs/papers/${paper.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update publish status")
      }
      setPapers((prev) =>
        prev.map((p) => (p.id === paper.id ? { ...p, status: newStatus } : p))
      )
      setSuccessMsg(`Status updated to ${newStatus}`)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setActionError(err.message || "Toggle failed")
    } finally {
      setTogglingId(null)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingPaper) return
    setIsSavingEdit(true)
    setActionError(null)

    try {
      const res = await fetch(`/api/admin/pyqs/papers/${editingPaper.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          subject: editSubject.trim() || undefined,
          year: Number(editYear),
          stage: editStage,
          hasCbtMode: editHasCbtMode,
          cbtTestId: editCbtTestId.trim() || null,
          isGated: editIsGated,
          previewPercentage: editPreviewPercentage,
          seoMode: editSeoMode,
          gateTitle: editGateTitle.trim() || null,
          gateSubtitle: editGateSubtitle.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update paper")
      }
      const updated = await res.json()
      setPapers((prev) =>
        prev.map((p) => (p.id === editingPaper.id ? { ...p, ...updated } : p))
      )
      setSuccessMsg("Paper updated successfully!")
      setTimeout(() => setSuccessMsg(null), 3000)
      setEditingPaper(null)
    } catch (err: any) {
      setActionError(err.message || "Failed to save edits")
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleReplacePdf = async (e: React.ChangeEvent<HTMLInputElement>, isSolution = false) => {
    const file = e.target.files?.[0]
    if (!file || !editingPaper) return

    if (isSolution) setIsUploadingSolution(true)
    else setIsUploadingReplace(true)
    setActionError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", "pyq")

      const uploadRes = await fetch("/api/admin/pyqs/upload", {
        method: "POST",
        body: formData,
      })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed")

      const patchPayload = isSolution
        ? { solutionPdfUrl: uploadData.url }
        : { paperPdfUrl: uploadData.url, pdfFileSizeKb: uploadData.fileSizeKb }

      const res = await fetch(`/api/admin/pyqs/papers/${editingPaper.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchPayload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to link replaced PDF")
      }
      const updated = await res.json()
      setPapers((prev) =>
        prev.map((p) => (p.id === editingPaper.id ? { ...p, ...updated } : p))
      )
      setEditingPaper((prev) => (prev ? { ...prev, ...updated } : null))
      setSuccessMsg(isSolution ? "Solution PDF updated!" : "Paper PDF replaced successfully!")
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setActionError(err.message || "PDF replacement failed")
    } finally {
      if (isSolution) setIsUploadingSolution(false)
      else setIsUploadingReplace(false)
      e.target.value = ""
    }
  }

  // Filter logic
  const filteredPapers = useMemo(() => {
    return papers.filter((paper) => {
      // Status tab filter
      if (activeTab === "PUBLISHED" && paper.status !== "PUBLISHED") return false
      if (activeTab === "DRAFT" && paper.status !== "DRAFT") return false
      if (activeTab === "ARCHIVED" && paper.status !== "ARCHIVED") return false

      const matchSearch =
        paper.title.toLowerCase().includes(search.toLowerCase()) ||
        paper.year.toString().includes(search) ||
        (paper.subExam?.name && paper.subExam.name.toLowerCase().includes(search.toLowerCase()))

      const matchCategory =
        selectedCategory === "ALL" || paper.category.name.toUpperCase() === selectedCategory.toUpperCase()

      const matchYear = selectedYear === "ALL" || paper.year.toString() === selectedYear

      const matchStage = selectedStage === "ALL" || paper.stage === selectedStage

      const matchAccess = selectedAccess === "ALL" || paper.accessType === selectedAccess

      return matchSearch && matchCategory && matchYear && matchStage && matchAccess
    })
  }, [papers, activeTab, search, selectedCategory, selectedYear, selectedStage, selectedAccess])

  // Bulk selection hook
  const {
    selectedIds,
    selectedCount,
    allSelected,
    isSelected,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
  } = useStudioSelection({
    items: filteredPapers,
    getItemId: (p) => p.id,
  })

  // Bulk actions
  const handleBulkAction = async (action: "publish" | "unpublish" | "archive" | "restore" | "delete") => {
    if (selectedIds.length === 0) return
    setActionError(null)

    try {
      const res = await fetch("/api/admin/pyqs/papers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperIds: selectedIds, action }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || `Bulk ${action} failed`)
      }

      if (action === "delete") {
        setPapers((prev) => prev.filter((p) => !selectedIds.includes(p.id)))
        toast.success(`Deleted ${data.affected} paper(s)`)
      } else {
        const nextStatus =
          action === "publish" || action === "restore"
            ? "PUBLISHED"
            : action === "unpublish"
            ? "DRAFT"
            : "ARCHIVED"
        setPapers((prev) =>
          prev.map((p) =>
            selectedIds.includes(p.id) ? { ...p, status: nextStatus } : p
          )
        )
        toast.success(`Updated status for ${data.affected} paper(s)`)
      }
      clearSelection()
    } catch (err: any) {
      setActionError(err.message || "Bulk action failed")
      toast.error(err.message || "Bulk action failed")
    }
  }

  // Delete impact dialog confirmation
  const handleConfirmHardDelete = async () => {
    if (!paperToDelete) return
    const id = paperToDelete.id

    const res = await fetch(`/api/admin/pyqs/papers/${id}`, { method: "DELETE" })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || "Failed to delete paper")
    }

    setPapers((prev) => prev.filter((p) => p.id !== id))
    toast.success(`Deleted paper "${paperToDelete.title}"`)
    setPaperToDelete(null)
  }

  const handleConfirmArchiveInstead = async () => {
    if (!paperToDelete) return
    await handleToggleArchive(paperToDelete)
    setPaperToDelete(null)
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div
      data-hydrated={mounted ? "true" : undefined}
      className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden space-y-3"
    >
      {/* Top Header & Filters */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-3">
        {/* Status Tabs with counts */}
        <StudioStatusTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as PyqStatusTab)}
        />

        {/* Search & dropdown filters */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search papers by title, year, sub-exam..."
              aria-label="Search papers"
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#071d33] text-gray-900 dark:text-white placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 min-h-[40px] transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by Exam Category"
              className="px-3 py-2 text-xs font-medium rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 min-h-[40px]"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Year Filter */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              aria-label="Filter by Exam Year"
              className="px-3 py-2 text-xs font-medium rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 min-h-[40px]"
            >
              <option value="ALL">All Years</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr.toString()}>
                  {yr}
                </option>
              ))}
            </select>

            {/* Stage Filter */}
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              aria-label="Filter by Exam Stage"
              className="px-3 py-2 text-xs font-medium rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 min-h-[40px]"
            >
              <option value="ALL">All Stages</option>
              <option value="PRELIMS">Prelims</option>
              <option value="MAINS">Mains</option>
              <option value="INTERVIEW">Interview / Theory</option>
            </select>

            {/* Access Filter */}
            <select
              value={selectedAccess}
              onChange={(e) => setSelectedAccess(e.target.value)}
              aria-label="Filter by Access Mode"
              className="px-3 py-2 text-xs font-medium rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 min-h-[40px]"
            >
              <option value="ALL">All Pricing</option>
              <option value="FREE">Free</option>
              <option value="PAID">Paid Unlock</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Bar when items selected */}
        <StudioBulkActionBar
          totalItems={filteredPapers.length}
          selectedCount={selectedCount}
          allSelected={allSelected}
          onToggleSelectAll={toggleSelectAll}
          itemLabel="paper"
          onBulkPublish={() => handleBulkAction("publish")}
          onBulkUnpublish={() => handleBulkAction("unpublish")}
          onBulkArchive={() => handleBulkAction("archive")}
          onBulkRestore={() => handleBulkAction("restore")}
          onBulkDelete={() => handleBulkAction("delete")}
        />
      </div>

      {actionError && (
        <div className="m-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {successMsg && (
        <div className="m-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
          <thead className="bg-gray-50/80 dark:bg-[#071d33] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th className="py-3 px-3 w-10 text-center">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => toggleSelectAll(Boolean(checked))}
                  aria-label="Select all papers"
                  data-testid="select-all-papers-table"
                />
              </th>
              <th className="py-3 px-4">Exam Paper & Year</th>
              <th className="py-3 px-4">Category & Sub-Type</th>
              <th className="py-3 px-4">Stage & Shift</th>
              <th className="py-3 px-4">Pricing & Mode</th>
              <th className="py-3 px-4 text-center">Downloads / Leads</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredPapers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No PYQ papers found</p>
                  <p className="text-xs text-gray-400 mt-0.5">Try adjusting your filters or upload a new paper.</p>
                </td>
              </tr>
            ) : (
              filteredPapers.map((paper) => {
                const isSelectedRow = isSelected(paper.id)
                return (
                  <tr
                    key={paper.id}
                    className={`hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors ${
                      isSelectedRow ? "bg-sky-50/40 dark:bg-sky-950/20" : ""
                    }`}
                  >
                    {/* Row Checkbox */}
                    <td className="py-3.5 px-3 text-center">
                      <Checkbox
                        checked={isSelectedRow}
                        onCheckedChange={() => toggleSelect(paper.id)}
                        aria-label={`Select ${paper.title}`}
                        data-testid={`select-paper-${paper.id}`}
                      />
                    </td>

                    {/* Title & Year */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1">
                        {paper.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                          {paper.year}
                        </span>
                        {paper.paperPdfUrl && (
                          <a
                            href={paper.paperPdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-orange-600 dark:text-orange-400 hover:text-orange-700 flex items-center gap-1 font-medium"
                          >
                            <FileText className="w-3 h-3" />
                            View PDF
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Category & Sub-Exam */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-900/50">
                        {paper.category.name}
                      </span>
                      {paper.subject && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                          {paper.subject}
                        </span>
                      )}
                      {paper.subExam && (
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-1 truncate max-w-[150px]">
                          ↳ {paper.subExam.name}
                        </div>
                      )}
                    </td>

                    {/* Stage & Shift */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          paper.stage === "PRELIMS"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50"
                            : paper.stage === "MAINS"
                            ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-900/50"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50"
                        }`}
                      >
                        {paper.stage}
                      </span>
                      {paper.shift && <div className="text-[11px] text-gray-400 mt-1">{paper.shift}</div>}
                    </td>

                    {/* Pricing & Mode */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {paper.accessType === "PAID" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                            <Lock className="w-3 h-3 text-amber-600" />₹{paper.unlockPrice}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            FREE
                          </span>
                        )}
                      </div>
                      {paper.isGated && (
                        <div className="flex items-center gap-1 text-[11px] text-purple-700 dark:text-purple-400 font-semibold mt-1">
                          <Lock className="w-3 h-3 text-purple-600" />
                          Gated ({paper.previewPercentage ?? 20}%)
                        </div>
                      )}
                      {paper.hasCbtMode && (
                        <div className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
                          <Zap className="w-3 h-3 text-indigo-500" />
                          CBT Simulator Live
                        </div>
                      )}
                    </td>

                    {/* Downloads & Leads */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {paper.downloadCount.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {paper._count?.leads || 0} leads • {paper._count?.unlocks || 0} unlocks
                      </div>
                    </td>

                    {/* Status badge */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleTogglePublish(paper)}
                        disabled={togglingId === paper.id}
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors disabled:opacity-50 cursor-pointer ${
                          paper.status === "PUBLISHED"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 hover:bg-emerald-200"
                            : paper.status === "ARCHIVED"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 hover:bg-amber-200"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200"
                        }`}
                        title="Click to toggle status (PUBLISHED / DRAFT)"
                        aria-label={`Toggle publish status for ${paper.title}`}
                      >
                        {togglingId === paper.id ? "Saving..." : paper.status}
                      </button>
                    </td>

                    {/* Row Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {paper.hasCbtMode || paper.cbtTestId ? (
                          <Link
                            href={`${basePath}/test-series`}
                            className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
                            title="Manage test"
                            aria-label={`Manage test for ${paper.title}`}
                          >
                            <Zap className="w-4 h-4" />
                          </Link>
                        ) : (
                          <Link
                            href={`${basePath}/test-series/create?type=PYQ&paperId=${paper.id}`}
                            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
                            title="Create CBT test"
                            aria-label={`Create test for ${paper.title}`}
                          >
                            <Zap className="w-4 h-4" />
                          </Link>
                        )}

                        <StudioRowMenu
                          itemId={paper.id}
                          itemTitle={paper.title}
                          isArchived={paper.status === "ARCHIVED"}
                          onEdit={() => openEditModal(paper)}
                          viewHref={paper.paperPdfUrl || undefined}
                          onToggleArchive={() => handleToggleArchive(paper)}
                          onDelete={() => setPaperToDelete(paper)}
                          isProcessing={togglingId === paper.id}
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

      {/* Delete Impact Dialog */}
      {paperToDelete && (
        <StudioDeleteImpactDialog
          isOpen={Boolean(paperToDelete)}
          onClose={() => setPaperToDelete(null)}
          itemType="PYQ Paper"
          itemName={paperToDelete.title}
          itemId={paperToDelete.id}
          impactMetrics={[
            {
              label: "Phone Leads",
              count: paperToDelete._count?.leads || 0,
              icon: <FileText className="w-3.5 h-3.5 text-sky-500" />,
            },
            {
              label: "Paid Unlocks",
              count: paperToDelete._count?.unlocks || 0,
              icon: <Lock className="w-3.5 h-3.5 text-amber-500" />,
            },
          ]}
          hasDependencies={
            (paperToDelete._count?.leads || 0) > 0 ||
            (paperToDelete._count?.unlocks || 0) > 0
          }
          dependencyNotice="This PYQ paper has collected phone leads or verified paid unlocks. Hard deletion is blocked to protect transaction and lead records. Archiving safely hides it from students while preserving data."
          isArchivedAlready={paperToDelete.status === "ARCHIVED"}
          onConfirmArchive={handleConfirmArchiveInstead}
          onConfirmHardDelete={handleConfirmHardDelete}
        />
      )}

      {/* Edit Modal (preserved with authwall GateControlPanel) */}
      {editingPaper && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a1628] rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto space-y-4 text-xs text-gray-700 dark:text-gray-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Edit PYQ Paper Details</h3>
              <button
                onClick={() => setEditingPaper(null)}
                aria-label="Close edit dialog"
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Paper Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#071d33] min-h-[40px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Subject</label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    placeholder="e.g. General Studies, History"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#071d33] min-h-[40px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Exam Year</label>
                  <input
                    type="number"
                    value={editYear}
                    onChange={(e) => setEditYear(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#071d33] min-h-[40px]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Stage</label>
                <select
                  value={editStage}
                  onChange={(e) => setEditStage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#071d33] min-h-[40px]"
                >
                  <option value="PRELIMS">Prelims</option>
                  <option value="MAINS">Mains</option>
                  <option value="INTERVIEW">Interview / Theory</option>
                </select>
              </div>

              {/* CBT Link */}
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-indigo-900 dark:text-indigo-200">CBT Simulation Mode</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editHasCbtMode}
                      onChange={(e) => setEditHasCbtMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">Linked Test ID</label>
                  <input
                    type="text"
                    value={editCbtTestId}
                    onChange={(e) => setEditCbtTestId(e.target.value)}
                    placeholder="e.g. clabc1234567..."
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#071d33] font-mono text-xs min-h-[38px]"
                  />
                </div>
              </div>

              {/* Authwall Gate Control Panel */}
              <div className="pt-2">
                <GateControlPanel
                  gate={{
                    isGated: editIsGated,
                    previewPercentage: editPreviewPercentage,
                    seoMode: editSeoMode,
                    gateTitle: editGateTitle,
                    gateSubtitle: editGateSubtitle,
                  }}
                  onChange={(gateData) => {
                    if (gateData.isGated !== undefined) setEditIsGated(gateData.isGated)
                    if (gateData.previewPercentage !== undefined) setEditPreviewPercentage(gateData.previewPercentage)
                    if (gateData.seoMode !== undefined) setEditSeoMode(gateData.seoMode)
                    if (gateData.gateTitle !== undefined) setEditGateTitle(gateData.gateTitle || "")
                    if (gateData.gateSubtitle !== undefined) setEditGateSubtitle(gateData.gateSubtitle || "")
                  }}
                  moduleName="PYQ Papers"
                />
              </div>

              {/* Replace PDFs */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
                <div className="font-semibold text-gray-900 dark:text-white">Replace File Attachments</div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer min-h-[44px]">
                    <Upload className="w-3.5 h-3.5 text-gray-500" />
                    <span>{isUploadingReplace ? "Uploading..." : "Replace Question PDF"}</span>
                    <input
                      type="file"
                      accept=".pdf"
                      disabled={isUploadingReplace}
                      onChange={(e) => handleReplacePdf(e, false)}
                      className="hidden"
                    />
                  </label>
                  <label className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer min-h-[44px]">
                    <Upload className="w-3.5 h-3.5 text-gray-500" />
                    <span>{isUploadingSolution ? "Uploading..." : "Replace Solution PDF"}</span>
                    <input
                      type="file"
                      accept=".pdf"
                      disabled={isUploadingSolution}
                      onChange={(e) => handleReplacePdf(e, true)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setEditingPaper(null)}
                className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[40px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold disabled:opacity-50 min-h-[40px]"
              >
                {isSavingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PyqPapersListClient
