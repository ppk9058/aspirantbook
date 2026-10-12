"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Search,
  Filter,
  FileText,
  Download,
  Trash2,
  ExternalLink,
  Edit2,
  CheckCircle2,
  Lock,
  Zap,
  Clock,
  Layers,
  Sparkles,
  AlertCircle,
  X,
  Upload,
} from "lucide-react"

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
}

interface Category {
  id: string
  name: string
  slug: string
}

export function PyqPapersListClient({
  initialPapers,
  categories,
}: {
  initialPapers: Paper[]
  categories: Category[]
}) {
  const [papers, setPapers] = useState<Paper[]>(initialPapers)
  const [mounted, setMounted] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL")
  const [selectedYear, setSelectedYear] = useState<string>("ALL")
  const [selectedStage, setSelectedStage] = useState<string>("ALL")
  const [selectedAccess, setSelectedAccess] = useState<string>("ALL")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const availableYears = Array.from(new Set(papers.map((p) => p.year))).sort((a, b) => b - a)

  // Edit modal state
  const [editingPaper, setEditingPaper] = useState<Paper | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editSubject, setEditSubject] = useState("")
  const [editYear, setEditYear] = useState<number>(2024)
  const [editStage, setEditStage] = useState("PRELIMS")
  const [editCbtTestId, setEditCbtTestId] = useState("")
  const [editHasCbtMode, setEditHasCbtMode] = useState(false)
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
  const filteredPapers = papers.filter((paper) => {
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

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return
    }

    setDeletingId(id)
    setActionError(null)

    try {
      const res = await fetch(`/api/admin/pyqs/papers/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete paper")
      }
      setPapers((prev) => prev.filter((p) => p.id !== id))
    } catch (err: any) {
      setActionError(err.message || "Deletion failed")
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div
      data-hydrated={mounted ? "true" : undefined}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
    >
      {/* Header and Controls */}
      <div className="p-5 border-b border-gray-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search papers by title, year, sub-exam..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter by Exam Category"
            className="px-3 py-2 text-xs font-medium rounded-xl border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
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
            className="px-3 py-2 text-xs font-medium rounded-xl border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
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
            className="px-3 py-2 text-xs font-medium rounded-xl border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
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
            className="px-3 py-2 text-xs font-medium rounded-xl border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          >
            <option value="ALL">All Pricing</option>
            <option value="FREE">Free</option>
            <option value="PAID">Paid Unlock</option>
          </select>
        </div>
      </div>

      {actionError && (
        <div className="m-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {successMsg && (
        <div className="m-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-gray-600">
          <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
            <tr>
              <th className="py-3 px-4">Exam Paper & Year</th>
              <th className="py-3 px-4">Category & Sub-Type</th>
              <th className="py-3 px-4">Stage & Shift</th>
              <th className="py-3 px-4">Pricing & Mode</th>
              <th className="py-3 px-4 text-center">Downloads / Attempts</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredPapers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-medium text-gray-600">No PYQ papers found</p>
                  <p className="text-xs text-gray-400 mt-0.5">Try adjusting your filters or upload a new paper.</p>
                </td>
              </tr>
            ) : (
              filteredPapers.map((paper) => (
                <tr key={paper.id} className="hover:bg-gray-50/80 transition-colors">
                  {/* Title & Year */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="font-semibold text-gray-900 text-sm line-clamp-1">{paper.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                        {paper.year}
                      </span>
                      {paper.paperPdfUrl && (
                        <a
                          href={paper.paperPdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-orange-600 hover:text-orange-700 flex items-center gap-1 font-medium"
                        >
                          <FileText className="w-3 h-3" />
                          View PDF
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Category & Sub-Exam */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                      {paper.category.name}
                    </span>
                    {paper.subject && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                        {paper.subject}
                      </span>
                    )}
                    {paper.subExam && (
                      <div className="text-[11px] text-gray-500 font-medium mt-1 truncate max-w-[150px]">
                        ↳ {paper.subExam.name}
                      </div>
                    )}
                  </td>

                  {/* Stage & Shift */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                        paper.stage === "PRELIMS"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : paper.stage === "MAINS"
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
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
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Lock className="w-3 h-3 text-amber-600" />₹{paper.unlockPrice}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          FREE
                        </span>
                      )}
                    </div>
                    {paper.hasCbtMode && (
                      <div className="flex items-center gap-1 text-[11px] text-indigo-600 font-semibold mt-1">
                        <Zap className="w-3 h-3 text-indigo-500" />
                        CBT Simulator Live
                      </div>
                    )}
                  </td>

                  {/* Downloads & Attempts */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="font-semibold text-gray-900">{paper.downloadCount.toLocaleString()}</div>
                    <div className="text-[11px] text-gray-400">{paper.attemptCount} test attempts</div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <button
                      onClick={() => handleTogglePublish(paper)}
                      disabled={togglingId === paper.id}
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors disabled:opacity-50 cursor-pointer ${
                        paper.status === "PUBLISHED"
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                      title="Click to toggle status (PUBLISHED / DRAFT)"
                      aria-label={`Toggle publish status for ${paper.title}`}
                    >
                      {togglingId === paper.id ? "Saving..." : paper.status}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(paper)}
                        className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Edit Paper"
                        aria-label={`Edit ${paper.title}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <Link
                        href={`/pyqs/${paper.category.slug || "bpsc"}`}
                        target="_blank"
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View Public Page"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>

                      <button
                        onClick={() => handleDelete(paper.id, paper.title)}
                        disabled={deletingId === paper.id}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete Paper"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <span>Showing {filteredPapers.length} of {papers.length} papers</span>
        <span>Strictly restricted to Admin and Teacher roles</span>
      </div>

      {/* Edit Modal */}
      {editingPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <h3 className="text-base font-bold text-gray-900">Edit PYQ Paper</h3>
              <button
                onClick={() => setEditingPaper(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Paper Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  placeholder="Paper Title"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    placeholder="e.g. GS Paper 1, Mathematics"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Year</label>
                  <input
                    type="number"
                    value={editYear}
                    onChange={(e) => setEditYear(Number(e.target.value))}
                    min={1990}
                    max={2030}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Exam Stage</label>
                <select
                  value={editStage}
                  onChange={(e) => setEditStage(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="PRELIMS">Prelims</option>
                  <option value="MAINS">Mains</option>
                  <option value="INTERVIEW">Interview / Theory</option>
                </select>
              </div>

              {/* CBT Mode Setting */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700">Computer Based Test (CBT) Mode</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editHasCbtMode}
                      onChange={(e) => setEditHasCbtMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {editHasCbtMode && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Linked CBT Test ID / Slug</label>
                    <input
                      type="text"
                      value={editCbtTestId}
                      onChange={(e) => setEditCbtTestId(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      placeholder="e.g. test_id or test-slug"
                    />
                  </div>
                )}
              </div>

              {/* Replace Files */}
              <div className="pt-2 border-t border-gray-100 space-y-3">
                <div className="text-xs font-semibold text-gray-700">PDF Files & Solutions</div>
                
                <div className="p-3 rounded-xl border border-gray-200 bg-gray-50/50 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800">Paper PDF</p>
                    <p className="text-[11px] text-gray-500 truncate">{editingPaper.paperPdfUrl}</p>
                  </div>
                  <label className="shrink-0 cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingReplace ? "Uploading..." : "Replace"}</span>
                    <input
                      type="file"
                      accept=".pdf"
                      disabled={isUploadingReplace}
                      onChange={(e) => handleReplacePdf(e, false)}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="p-3 rounded-xl border border-gray-200 bg-gray-50/50 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800">Solution / Answer Key PDF</p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {editingPaper.solutionPdfUrl || "None attached"}
                    </p>
                  </div>
                  <label className="shrink-0 cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingSolution ? "Uploading..." : "Upload / Replace"}</span>
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

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEditingPaper(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-xl transition-colors"
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
