"use client"

import { useState } from "react"
import Link from "next/link"
import {
  FileText,
  Upload,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  Trash2,
  Eye,
  Plus,
  X,
  AlertCircle,
  ExternalLink,
  Calendar,
  Globe,
  Loader2,
  Lock,
} from "lucide-react"
import { GateControlPanel } from "@/components/admin/authwall/GateControlPanel"

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
  updatedAt: string | Date
  isGated?: boolean
  previewPercentage?: number
  seoMode?: "preview" | "bot-full"
  gateTitle?: string | null
  gateSubtitle?: string | null
}

interface Props {
  initialItems: CurrentAffairsPdfItem[]
  basePath?: string
  userRole?: string
  userId?: string
}

function formatKb(kb?: number | null) {
  if (!kb) return ""
  if (kb < 1024) return `${kb} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

export function CurrentAffairsStudioClient({
  initialItems,
  basePath = "/admin",
  userRole = "ADMIN",
  userId = "",
}: Props) {
  const [items, setItems] = useState<CurrentAffairsPdfItem[]>(initialItems)
  const [search, setSearch] = useState("")
  const [filterYear, setFilterYear] = useState<string>("ALL")
  const [filterMonth, setFilterMonth] = useState<string>("ALL")
  const [filterStatus, setFilterStatus] = useState<string>("ALL")

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CurrentAffairsPdfItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Form states
  const [formTitle, setFormTitle] = useState("")
  const [formTitleHi, setFormTitleHi] = useState("")
  const [formMonth, setFormMonth] = useState<number>(new Date().getMonth() + 1)
  const [formYear, setFormYear] = useState<number>(new Date().getFullYear())
  const [formStatus, setFormStatus] = useState<"DRAFT" | "PUBLISHED">("PUBLISHED")
  const [formIsGated, setFormIsGated] = useState(false)
  const [formPreviewPercentage, setFormPreviewPercentage] = useState(20)
  const [formSeoMode, setFormSeoMode] = useState<"preview" | "bot-full">("preview")
  const [formGateTitle, setFormGateTitle] = useState("")
  const [formGateSubtitle, setFormGateSubtitle] = useState("")

  // Uploading state for PDFs
  const [enPdfUrl, setEnPdfUrl] = useState<string | null>(null)
  const [hiPdfUrl, setHiPdfUrl] = useState<string | null>(null)
  const [enFileSizeKb, setEnFileSizeKb] = useState<number | null>(null)
  const [hiFileSizeKb, setHiFileSizeKb] = useState<number | null>(null)
  const [isUploadingEn, setIsUploadingEn] = useState(false)
  const [isUploadingHi, setIsUploadingHi] = useState(false)

  // Filter items
  const filteredItems = items.filter((item) => {
    if (search.trim()) {
      const q = search.toLowerCase()
      const titleMatch = item.title.toLowerCase().includes(q)
      const titleHiMatch = item.titleHi?.toLowerCase().includes(q)
      const monthName = MONTHS[item.month - 1]?.toLowerCase()
      if (!titleMatch && !titleHiMatch && !monthName?.includes(q)) return false
    }
    if (filterYear !== "ALL" && item.year.toString() !== filterYear) return false
    if (filterMonth !== "ALL" && item.month.toString() !== filterMonth) return false
    if (filterStatus !== "ALL" && item.status !== filterStatus) return false
    return true
  })

  // Extract unique years for filter
  const years = Array.from(new Set(items.map((i) => i.year))).sort((a, b) => b - a)

  const openCreateModal = () => {
    setEditingItem(null)
    setFormTitle("")
    setFormTitleHi("")
    setFormMonth(new Date().getMonth() + 1)
    setFormYear(new Date().getFullYear())
    setFormStatus("PUBLISHED")
    setFormIsGated(false)
    setFormPreviewPercentage(20)
    setFormSeoMode("preview")
    setFormGateTitle("")
    setFormGateSubtitle("")
    setEnPdfUrl(null)
    setHiPdfUrl(null)
    setEnFileSizeKb(null)
    setHiFileSizeKb(null)
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

  const handleUploadFile = async (file: File, lang: "en" | "hi") => {
    try {
      if (lang === "en") setIsUploadingEn(true)
      else setIsUploadingHi(true)

      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/admin/current-affairs/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload PDF file")
      }

      const kb = Math.round((data.fileSize || 0) / 1024)

      if (lang === "en") {
        setEnPdfUrl(data.filePath)
        setEnFileSizeKb(kb)
      } else {
        setHiPdfUrl(data.filePath)
        setHiFileSizeKb(kb)
      }
    } catch (err: any) {
      setFormError(err.message || "Upload error")
    } finally {
      if (lang === "en") setIsUploadingEn(false)
      else setIsUploadingHi(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formTitle.trim()) {
      setFormError("Title is required")
      return
    }

    if (!enPdfUrl && !hiPdfUrl) {
      setFormError("At least one PDF (English or Hindi) is required")
      return
    }

    setIsSubmitting(true)

    try {
      if (editingItem) {
        // PUT update
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
        setIsModalOpen(false)
      } else {
        // POST create
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
    } catch (err: any) {
      alert(err.message || "Failed to change status")
    }
  }

  const handleArchive = async (item: CurrentAffairsPdfItem) => {
    if (!confirm(`Are you sure you want to archive "${item.title}"?`)) return
    try {
      const res = await fetch(`/api/admin/current-affairs/${item.id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to archive document")

      setItems((prev) => prev.filter((i) => i.id !== item.id))
    } catch (err: any) {
      alert(err.message || "Failed to archive")
    }
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
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg border border-border bg-background hover:bg-muted/60 transition-colors"
          >
            <Eye className="w-4 h-4 text-muted-foreground" />
            Student View
          </Link>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
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
          <p className="text-2xl font-bold text-foreground mt-1">{items.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <span className="text-xs font-medium text-muted-foreground">Published</span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{publishedCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <span className="text-xs font-medium text-muted-foreground">Drafts</span>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {items.length - publishedCount}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <span className="text-xs font-medium text-muted-foreground">Total Downloads</span>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{totalDownloads}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-card p-4 rounded-xl border border-border">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title, month..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Year Filter */}
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none"
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
            className="px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none"
          >
            <option value="ALL">All Months</option>
            {MONTHS.map((m, idx) => (
              <option key={m} value={(idx + 1).toString()}>
                {m}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
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
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
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
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
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
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-200"
                        }`}
                      >
                        {item.status === "PUBLISHED" ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            Published
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
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleArchive(item)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                          title="Archive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                className="p-1 text-muted-foreground hover:text-foreground rounded-md"
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
                  className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                  className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                      className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
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
                      className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
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
                  onChange={(patch) => {
                    if (patch.isGated !== undefined) setFormIsGated(patch.isGated)
                    if (patch.previewPercentage !== undefined) setFormPreviewPercentage(patch.previewPercentage)
                    if (patch.seoMode !== undefined) setFormSeoMode(patch.seoMode)
                    if (patch.gateTitle !== undefined) setFormGateTitle(patch.gateTitle)
                    if (patch.gateSubtitle !== undefined) setFormGateSubtitle(patch.gateSubtitle)
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
                  className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingEn || isUploadingHi}
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
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
