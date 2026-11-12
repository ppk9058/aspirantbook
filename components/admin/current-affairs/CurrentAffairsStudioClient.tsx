"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Plus,
  X,
  AlertCircle,
  Calendar,
  Globe,
  Loader2,
  Lock,
  Archive,
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

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export interface CurrentAffairsPdfItem {
  id: string
  title: string
  titleHi?: string | null
  month: number
  year: number
  pdfUrlEn?: string | null
  pdfUrlHi?: string | null
  fileSizeKbEn?: number | null
  fileSizeKbHi?: number | null
  status: string
  downloadCount: number
  createdById?: string | null
  createdBy?: {
    id: string
    name: string | null
    email: string | null
  } | null
  createdAt: string | Date
  updatedAt?: string | Date
  isGated?: boolean
  previewPercentage?: number
  seoMode?: "preview" | "bot-full"
  gateTitle?: string | null
  gateSubtitle?: string | null
}

interface CurrentAffairsStudioClientProps {
  initialItems: CurrentAffairsPdfItem[]
  basePath: string
  userRole: string
  userId: string
}

type CurrentAffairsTab = "ALL" | "PUBLISHED" | "DRAFT" | "ARCHIVED"

export function CurrentAffairsStudioClient({
  initialItems,
  basePath: _basePath,
  userRole,
  userId: _userId,
}: CurrentAffairsStudioClientProps) {
  const [items, setItems] = useState<CurrentAffairsPdfItem[]>(initialItems)
  const [activeTab, setActiveTab] = useState<CurrentAffairsTab>("ALL")
  const [search, setSearch] = useState("")
  const [filterYear, setFilterYear] = useState<string>("ALL")
  const [filterMonth, setFilterMonth] = useState<string>("ALL")

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CurrentAffairsPdfItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Delete dialog state
  const [itemToDelete, setItemToDelete] = useState<CurrentAffairsPdfItem | null>(null)

  // Form Fields
  const [formTitle, setFormTitle] = useState("")
  const [formTitleHi, setFormTitleHi] = useState("")
  const [formMonth, setFormMonth] = useState<number>(new Date().getMonth() + 1)
  const [formYear, setFormYear] = useState<number>(new Date().getFullYear())
  const [formStatus, setFormStatus] = useState<"PUBLISHED" | "DRAFT">("PUBLISHED")
  const [enPdfUrl, setEnPdfUrl] = useState<string | null>(null)
  const [hiPdfUrl, setHiPdfUrl] = useState<string | null>(null)
  const [enFileSizeKb, setEnFileSizeKb] = useState<number | null>(null)
  const [hiFileSizeKb, setHiFileSizeKb] = useState<number | null>(null)

  // Authwall Gate Form Fields
  const [formIsGated, setFormIsGated] = useState<boolean>(false)
  const [formPreviewPercentage, setFormPreviewPercentage] = useState<number>(20)
  const [formSeoMode, setFormSeoMode] = useState<"preview" | "bot-full">("preview")
  const [formGateTitle, setFormGateTitle] = useState<string>("")
  const [formGateSubtitle, setFormGateSubtitle] = useState<string>("")

  // Upload States
  const [isUploadingEn, setIsUploadingEn] = useState(false)
  const [isUploadingHi, setIsUploadingHi] = useState(false)

  // Status counts calculation
  const statusCounts = useMemo(() => {
    const counts = {
      ALL: items.length,
      PUBLISHED: 0,
      DRAFT: 0,
      ARCHIVED: 0,
    }
    for (const item of items) {
      const s = (item.status || "DRAFT").toUpperCase()
      if (s === "PUBLISHED") counts.PUBLISHED++
      else if (s === "ARCHIVED") counts.ARCHIVED++
      else counts.DRAFT++
    }
    return counts
  }, [items])

  const tabs = useMemo(
    () => [
      { id: "ALL" as const, label: "All Documents", count: statusCounts.ALL },
      { id: "PUBLISHED" as const, label: "Published", count: statusCounts.PUBLISHED },
      { id: "DRAFT" as const, label: "Drafts", count: statusCounts.DRAFT },
      { id: "ARCHIVED" as const, label: "Archived", count: statusCounts.ARCHIVED },
    ],
    [statusCounts]
  )

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const s = (item.status || "DRAFT").toUpperCase()
      if (activeTab === "PUBLISHED" && s !== "PUBLISHED") return false
      if (activeTab === "DRAFT" && s !== "DRAFT") return false
      if (activeTab === "ARCHIVED" && s !== "ARCHIVED") return false

      if (search.trim()) {
        const q = search.toLowerCase()
        const titleMatch = item.title.toLowerCase().includes(q)
        const titleHiMatch = item.titleHi?.toLowerCase().includes(q)
        const monthName = MONTHS[item.month - 1]?.toLowerCase()
        if (!titleMatch && !titleHiMatch && !monthName?.includes(q)) return false
      }
      if (filterYear !== "ALL" && item.year.toString() !== filterYear) return false
      if (filterMonth !== "ALL" && item.month.toString() !== filterMonth) return false
      return true
    })
  }, [items, activeTab, search, filterYear, filterMonth])

  // Unique years for filter dropdown
  const years = useMemo(
    () => Array.from(new Set(items.map((i) => i.year))).sort((a, b) => b - a),
    [items]
  )

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
    items: filteredItems,
    getItemId: (item) => item.id,
  })

  // Format File Size
  const formatKb = (kb?: number | null) => {
    if (!kb) return null
    if (kb >= 1024) {
      return `${(kb / 1024).toFixed(1)} MB`
    }
    return `${Math.round(kb)} KB`
  }

  // Open Modal Helpers
  const openCreateModal = () => {
    setEditingItem(null)
    setFormTitle("")
    setFormTitleHi("")
    setFormMonth(new Date().getMonth() + 1)
    setFormYear(new Date().getFullYear())
    setFormStatus("PUBLISHED")
    setEnPdfUrl(null)
    setHiPdfUrl(null)
    setEnFileSizeKb(null)
    setHiFileSizeKb(null)
    setFormIsGated(false)
    setFormPreviewPercentage(20)
    setFormSeoMode("preview")
    setFormGateTitle("")
    setFormGateSubtitle("")
    setFormError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (item: CurrentAffairsPdfItem) => {
    setEditingItem(item)
    setFormTitle(item.title)
    setFormTitleHi(item.titleHi || "")
    setFormMonth(item.month)
    setFormYear(item.year)
    setFormStatus(item.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT")
    setFormIsGated(item.isGated ?? false)
    setFormPreviewPercentage(item.previewPercentage ?? 20)
    setFormSeoMode(item.seoMode ?? "preview")
    setFormGateTitle(item.gateTitle || "")
    setFormGateSubtitle(item.gateSubtitle || "")
    setEnPdfUrl(item.pdfUrlEn || null)
    setHiPdfUrl(item.pdfUrlHi || null)
    setEnFileSizeKb(item.fileSizeKbEn || null)
    setHiFileSizeKb(item.fileSizeKbHi || null)
    setFormError(null)
    setIsModalOpen(true)
  }

  // Handle PDF Upload
  const handleUploadFile = async (file: File, lang: "en" | "hi") => {
    if (lang === "en") setIsUploadingEn(true)
    if (lang === "hi") setIsUploadingHi(true)
    setFormError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", "current-affairs")

      const res = await fetch("/api/admin/current-affairs/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "File upload failed")

      if (lang === "en") {
        setEnPdfUrl(data.url)
        setEnFileSizeKb(data.fileSizeKb)
      } else {
        setHiPdfUrl(data.url)
        setHiFileSizeKb(data.fileSizeKb)
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to upload PDF file")
    } finally {
      if (lang === "en") setIsUploadingEn(false)
      if (lang === "hi") setIsUploadingHi(false)
    }
  }

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!enPdfUrl && !hiPdfUrl) {
      setFormError("Please upload at least one PDF (English or Hindi edition).")
      return
    }

    setIsSubmitting(true)

    try {
      if (editingItem) {
        const res = await fetch(`/api/admin/current-affairs/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formTitle,
            titleHi: formTitleHi,
            month: formMonth,
            year: formYear,
            status: formStatus,
            pdfUrlEn: enPdfUrl,
            pdfUrlHi: hiPdfUrl,
            fileSizeKbEn: enFileSizeKb,
            fileSizeKbHi: hiFileSizeKb,
            isGated: formIsGated,
            previewPercentage: formPreviewPercentage,
            seoMode: formSeoMode,
            gateTitle: formGateTitle.trim() || null,
            gateSubtitle: formGateSubtitle.trim() || null,
          }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to update Current Affairs")

        setItems((prev) => prev.map((item) => (item.id === editingItem.id ? data.data : item)))
        toast.success("Document updated successfully")
        setIsModalOpen(false)
      } else {
        const res = await fetch("/api/admin/current-affairs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formTitle,
            titleHi: formTitleHi,
            month: formMonth,
            year: formYear,
            status: formStatus,
            pdfUrlEn: enPdfUrl,
            pdfUrlHi: hiPdfUrl,
            fileSizeKbEn: enFileSizeKb,
            fileSizeKbHi: hiFileSizeKb,
            isGated: formIsGated,
            previewPercentage: formPreviewPercentage,
            seoMode: formSeoMode,
            gateTitle: formGateTitle.trim() || null,
            gateSubtitle: formGateSubtitle.trim() || null,
          }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to create Current Affairs")

        setItems((prev) => [data.data, ...prev])
        toast.success("Document uploaded successfully")
        setIsModalOpen(false)
      }
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = async (item: CurrentAffairsPdfItem) => {
    const nextStatus = item.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"
    try {
      const res = await fetch(`/api/admin/current-affairs/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to toggle status")

      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: nextStatus } : i)))
      toast.success(`Document status set to ${nextStatus}`)
    } catch (err: any) {
      toast.error(err.message || "Failed to change status")
    }
  }

  const handleToggleArchive = async (item: CurrentAffairsPdfItem) => {
    const isCurrentlyArchived = item.status === "ARCHIVED"
    const nextStatus = isCurrentlyArchived ? "PUBLISHED" : "ARCHIVED"
    try {
      const res = await fetch(`/api/admin/current-affairs/${item.id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !isCurrentlyArchived }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update archive status")

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: nextStatus } : i))
      )
      toast.success(
        isCurrentlyArchived
          ? `Restored "${item.title}" successfully`
          : `Archived "${item.title}" successfully`
      )
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle archive state")
    }
  }

  // Bulk actions
  const handleBulkAction = async (action: "publish" | "unpublish" | "archive" | "restore") => {
    if (selectedIds.length === 0) return
    try {
      const res = await fetch("/api/admin/current-affairs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Bulk ${action} failed`)

      const nextStatus =
        action === "publish" || action === "restore"
          ? "PUBLISHED"
          : action === "unpublish"
          ? "DRAFT"
          : "ARCHIVED"

      setItems((prev) =>
        prev.map((i) => (selectedIds.includes(i.id) ? { ...i, status: nextStatus } : i))
      )
      toast.success(`Updated status for ${data.affected} document(s)`)
      clearSelection()
    } catch (err: any) {
      toast.error(err.message || "Bulk action failed")
    }
  }

  // Delete impact dialog confirmation (archive is the safe option)
  const handleConfirmArchive = async () => {
    if (!itemToDelete) return
    await handleToggleArchive(itemToDelete)
    setItemToDelete(null)
  }

  const totalDownloads = items.reduce((acc, curr) => acc + (curr.downloadCount || 0), 0)
  const publishedCount = items.filter((i) => i.status === "PUBLISHED").length

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Current Affairs Studio</h1>
          <p className="text-sm text-muted-foreground">
            Upload and manage monthly Current Affairs PDF digests in English & Hindi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/current-affairs-quizzes"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg border border-border bg-background hover:bg-muted/60 transition-colors min-h-[40px]"
          >
            <Eye className="w-4 h-4 text-muted-foreground" />
            Student View
          </Link>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm min-h-[40px] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Upload Monthly PDF
          </button>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card">
          <span className="text-xs font-medium text-muted-foreground">Total Monthly PDFs</span>
          <p className="text-2xl font-bold text-foreground mt-1">{statusCounts.ALL}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <span className="text-xs font-medium text-muted-foreground">Published</span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{statusCounts.PUBLISHED}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <span className="text-xs font-medium text-muted-foreground">Drafts</span>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{statusCounts.DRAFT}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <span className="text-xs font-medium text-muted-foreground">Total Downloads</span>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{totalDownloads}</p>
        </div>
      </div>

      {/* Filter Tabs, Search & Bulk Actions Bar */}
      <div className="bg-card p-4 rounded-xl border border-border space-y-3">
        {/* Status Tabs with counts */}
        <StudioStatusTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as CurrentAffairsTab)}
        />

        {/* Filters & Search row */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between pt-1">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by title, month..."
              aria-label="Search current affairs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[40px]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Year Filter */}
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              aria-label="Filter by Year"
              className="px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none min-h-[40px]"
            >
              <option value="ALL">All Years</option>
              {years.map((y) => (
                <option key={y} value={y.toString()}>
                  {y}
                </option>
              ))}
            </select>

            {/* Month Filter */}
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              aria-label="Filter by Month"
              className="px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none min-h-[40px]"
            >
              <option value="ALL">All Months</option>
              {MONTHS.map((m, idx) => (
                <option key={m} value={(idx + 1).toString()}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk Action Bar */}
        <StudioBulkActionBar
          totalItems={filteredItems.length}
          selectedCount={selectedCount}
          allSelected={allSelected}
          onToggleSelectAll={toggleSelectAll}
          itemLabel="document"
          onBulkPublish={() => handleBulkAction("publish")}
          onBulkUnpublish={() => handleBulkAction("unpublish")}
          onBulkArchive={() => handleBulkAction("archive")}
          onBulkRestore={() => handleBulkAction("restore")}
        />
      </div>

      {/* Table / List */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 px-4">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <h3 className="text-base font-semibold text-foreground">No Current Affairs PDFs found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Get started by uploading monthly digests for competitive exams in English or Hindi.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 min-h-[40px]"
            >
              <Plus className="w-4 h-4" />
              Upload First PDF
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(checked) => toggleSelectAll(Boolean(checked))}
                      aria-label="Select all documents"
                      data-testid="select-all-ca-table"
                    />
                  </th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Language Formats</th>
                  <th className="py-3 px-4">Downloads</th>
                  <th className="py-3 px-4">Status</th>
                  {userRole === "ADMIN" && <th className="py-3 px-4">Author</th>}
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((item) => {
                  const isSelectedRow = isSelected(item.id)
                  const primaryPdf = item.pdfUrlEn || item.pdfUrlHi
                  const primaryViewUrl = item.pdfUrlEn
                    ? `/api/current-affairs/file/${item.id}?lang=en`
                    : item.pdfUrlHi
                    ? `/api/current-affairs/file/${item.id}?lang=hi`
                    : undefined

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        isSelectedRow ? "bg-primary/5" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-3 text-center">
                        <Checkbox
                          checked={isSelectedRow}
                          onCheckedChange={() => toggleSelect(item.id)}
                          aria-label={`Select ${item.title}`}
                          data-testid={`select-ca-${item.id}`}
                        />
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary shrink-0" />
                          <span className="font-semibold text-foreground">
                            {MONTHS[item.month - 1]} {item.year}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="max-w-md">
                          <p className="font-medium text-foreground">{item.title}</p>
                          {item.titleHi && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {item.titleHi}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {item.pdfUrlEn ? (
                            <a
                              href={`/api/current-affairs/file/${item.id}?lang=en`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 hover:underline"
                            >
                              <span>EN</span>
                              {item.fileSizeKbEn && (
                                <span className="text-[10px] opacity-75">({formatKb(item.fileSizeKbEn)})</span>
                              )}
                            </a>
                          ) : null}
                          {item.pdfUrlHi ? (
                            <a
                              href={`/api/current-affairs/file/${item.id}?lang=hi`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 hover:underline"
                            >
                              <span>HI</span>
                              {item.fileSizeKbHi && (
                                <span className="text-[10px] opacity-75">({formatKb(item.fileSizeKbHi)})</span>
                              )}
                            </a>
                          ) : null}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <Download className="w-3.5 h-3.5" />
                          <span>{item.downloadCount}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(item)}
                          title="Click to toggle publish status"
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                            item.status === "PUBLISHED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200"
                              : item.status === "ARCHIVED"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200"
                          }`}
                        >
                          {item.status === "PUBLISHED" ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              Published
                            </>
                          ) : item.status === "ARCHIVED" ? (
                            <>
                              <Archive className="w-3 h-3" />
                              Archived
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              Draft
                            </>
                          )}
                        </button>
                        {item.isGated && (
                          <div className="flex items-center gap-1 text-[11px] text-purple-700 dark:text-purple-300 font-semibold mt-1">
                            <Lock className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                            Gated ({item.previewPercentage ?? 20}%)
                          </div>
                        )}
                      </td>

                      {userRole === "ADMIN" && (
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-muted-foreground">
                          {item.createdBy?.name || item.createdBy?.email || "Admin"}
                        </td>
                      )}

                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <StudioRowMenu
                            itemId={item.id}
                            itemTitle={item.title}
                            isArchived={item.status === "ARCHIVED"}
                            onEdit={() => openEditModal(item)}
                            viewHref={primaryViewUrl}
                            onToggleArchive={() => handleToggleArchive(item)}
                            onDelete={() => setItemToDelete(item)}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Impact Dialog (Archive is the safe option) */}
      {itemToDelete && (
        <StudioDeleteImpactDialog
          isOpen={Boolean(itemToDelete)}
          onClose={() => setItemToDelete(null)}
          itemType="Current Affairs Document"
          itemName={itemToDelete.title}
          itemId={itemToDelete.id}
          impactMetrics={[
            {
              label: "Student Downloads",
              count: itemToDelete.downloadCount || 0,
              icon: <Download className="w-3.5 h-3.5 text-blue-500" />,
            },
          ]}
          hasDependencies={true}
          dependencyNotice="Archiving is the safe option to prevent broken download links and preserve learner study history. The document will be immediately hidden from student portals while retaining administrative access."
          isArchivedAlready={itemToDelete.status === "ARCHIVED"}
          onConfirmArchive={handleConfirmArchive}
        />
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
              <h2 className="text-lg font-bold text-foreground">
                {editingItem ? "Edit Current Affairs PDF" : "Upload Monthly Current Affairs"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-md min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Title (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Current Affairs Digest - January 2026"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[40px]"
                />
              </div>

              {/* Title Hindi */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Title (Hindi - Optional)
                </label>
                <input
                  type="text"
                  placeholder="उदा. मासिक समसामयिकी सार - जनवरी 2026"
                  value={formTitleHi}
                  onChange={(e) => setFormTitleHi(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[40px]"
                />
              </div>

              {/* Period: Month & Year */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Month *
                  </label>
                  <select
                    value={formMonth}
                    onChange={(e) => setFormMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[40px]"
                  >
                    {MONTHS.map((m, idx) => (
                      <option key={m} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Year *
                  </label>
                  <input
                    type="number"
                    required
                    min={2000}
                    max={2100}
                    value={formYear}
                    onChange={(e) => setFormYear(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[40px]"
                  />
                </div>
              </div>

              {/* Files Upload: English & Hindi */}
              <div className="border border-border/80 rounded-xl p-4 bg-muted/20 space-y-4">
                <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Upload PDF Files (At least one required)
                </span>

                {/* English PDF */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-500" />
                      English Edition PDF
                    </span>
                    {enPdfUrl && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Uploaded {enFileSizeKb ? `(${formatKb(enFileSizeKb)})` : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleUploadFile(file, "en")
                        }
                      }}
                      className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer min-h-[36px]"
                    />
                    {isUploadingEn && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                  </div>
                </div>

                {/* Hindi PDF */}
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-amber-500" />
                      Hindi Edition PDF (हिंदी)
                    </span>
                    {hiPdfUrl && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Uploaded {hiFileSizeKb ? `(${formatKb(hiFileSizeKb)})` : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleUploadFile(file, "hi")
                        }
                      }}
                      className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer min-h-[36px]"
                    />
                    {isUploadingHi && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                  </div>
                </div>
              </div>

              {/* Centralized Gate Control */}
              <div className="pt-2 border-t border-border">
                <GateControlPanel
                  gate={{
                    isGated: formIsGated,
                    previewPercentage: formPreviewPercentage,
                    seoMode: formSeoMode,
                    gateTitle: formGateTitle,
                    gateSubtitle: formGateSubtitle,
                  }}
                  onChange={(gateData) => {
                    if (gateData.isGated !== undefined) setFormIsGated(gateData.isGated)
                    if (gateData.previewPercentage !== undefined) setFormPreviewPercentage(gateData.previewPercentage)
                    if (gateData.seoMode !== undefined) setFormSeoMode(gateData.seoMode)
                    if (gateData.gateTitle !== undefined) setFormGateTitle(gateData.gateTitle || "")
                    if (gateData.gateSubtitle !== undefined) setFormGateSubtitle(gateData.gateSubtitle || "")
                  }}
                  moduleName="Current Affairs"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Initial Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[40px]"
                >
                  <option value="PUBLISHED">Published (Visible to students immediately)</option>
                  <option value="DRAFT">Draft (Hidden from students)</option>
                </select>
              </div>

              {/* Submit / Cancel */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingEn || isUploadingHi}
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5 min-h-[40px]"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingItem ? "Save Changes" : "Create & Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CurrentAffairsStudioClient
