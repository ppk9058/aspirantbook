"use client"

import { useState } from "react"
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
} from "lucide-react"

interface Paper {
  id: string
  title: string
  slug: string
  year: number
  stage: string
  shift?: string | null
  paperPdfUrl: string
  solutionPdfUrl?: string | null
  accessType: string
  unlockPrice: number
  hasCbtMode: boolean
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
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL")
  const [selectedStage, setSelectedStage] = useState<string>("ALL")
  const [selectedAccess, setSelectedAccess] = useState<string>("ALL")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Filter logic
  const filteredPapers = papers.filter((paper) => {
    const matchSearch =
      paper.title.toLowerCase().includes(search.toLowerCase()) ||
      paper.year.toString().includes(search) ||
      (paper.subExam?.name && paper.subExam.name.toLowerCase().includes(search.toLowerCase()))

    const matchCategory =
      selectedCategory === "ALL" || paper.category.name.toUpperCase() === selectedCategory.toUpperCase()

    const matchStage = selectedStage === "ALL" || paper.stage === selectedStage

    const matchAccess = selectedAccess === "ALL" || paper.accessType === selectedAccess

    return matchSearch && matchCategory && matchStage && matchAccess
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

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
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
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        paper.status === "PUBLISHED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {paper.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
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
    </div>
  )
}
