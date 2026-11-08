"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import {
  Search,
  Filter,
  FileText,
  Download,
  Eye,
  Zap,
  CheckCircle2,
  Lock,
  Layers,
  Calendar,
  Sparkles,
  ArrowUpDown,
  BookOpen,
  X,
} from "lucide-react"

export interface PyqStudentPaper {
  id: string
  title: string
  slug: string
  year: number
  stage: string
  shift?: string | null
  subject?: string | null
  paperPdfUrl: string
  solutionPdfUrl?: string | null
  pdfFileSizeKb?: number | null
  pageCount?: number | null
  accessType: string
  unlockPrice: number
  canAccess?: boolean
  hasCbtMode: boolean
  cbtTestId?: string | null
  downloadCount: number
  attemptCount: number
  createdAt: string | Date
  category: { name: string; slug: string; badgeColor?: string | null }
  subExam?: { name: string; slug: string } | null
}

export interface PyqCategoryItem {
  id: string
  name: string
  slug: string
  badgeColor?: string | null
  _count?: { papers: number }
}

export function PyqStudentListingClient({
  initialPapers,
  categories,
}: {
  initialPapers: PyqStudentPaper[]
  categories: PyqCategoryItem[]
}) {
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL")
  const [selectedStage, setSelectedStage] = useState<string>("ALL")
  const [selectedAccess, setSelectedAccess] = useState<string>("ALL")
  const [sortBy, setSortBy] = useState<"year" | "downloads" | "recent">("year")

  const filteredPapers = useMemo(() => {
    return initialPapers
      .filter((paper) => {
        const query = search.trim().toLowerCase()
        const matchesSearch =
          !query ||
          paper.title.toLowerCase().includes(query) ||
          paper.year.toString().includes(query) ||
          (paper.subject && paper.subject.toLowerCase().includes(query)) ||
          paper.category.name.toLowerCase().includes(query) ||
          (paper.subExam && paper.subExam.name.toLowerCase().includes(query))

        const matchesCategory =
          selectedCategory === "ALL" ||
          paper.category.slug.toLowerCase() === selectedCategory.toLowerCase() ||
          paper.category.name.toLowerCase() === selectedCategory.toLowerCase()

        const matchesStage = selectedStage === "ALL" || paper.stage === selectedStage
        const matchesAccess = selectedAccess === "ALL" || paper.accessType === selectedAccess

        return matchesSearch && matchesCategory && matchesStage && matchesAccess
      })
      .sort((a, b) => {
        if (sortBy === "year") return b.year - a.year
        if (sortBy === "downloads") return (b.downloadCount || 0) - (a.downloadCount || 0)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
  }, [initialPapers, search, selectedCategory, selectedStage, selectedAccess, sortBy])

  const clearFilters = () => {
    setSearch("")
    setSelectedCategory("ALL")
    setSelectedStage("ALL")
    setSelectedAccess("ALL")
  }

  const hasActiveFilters = search || selectedCategory !== "ALL" || selectedStage !== "ALL" || selectedAccess !== "ALL"

  // Search and filters are client state, so they only work once React has
  // hydrated. Expose that fact so an automation (or a slow device) can wait for
  // it instead of typing into an inert input and silently losing the keystrokes.
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  return (
    <div
      className="space-y-6"
      data-testid="pyqs-listing-root"
      data-hydrated={hydrated ? "true" : "false"}
    >
      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by exam, subject, or year (e.g. History, 2024)..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort papers"
                className="w-full sm:w-auto px-3 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              >
                <option value="year">Latest Exam Year</option>
                <option value="downloads">Most Downloaded</option>
                <option value="recent">Recently Added</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          {/* Category Tabs */}
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedCategory === "ALL"
                ? "bg-orange-600 text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedCategory.toLowerCase() === cat.slug.toLowerCase()
                  ? "bg-orange-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.name}
            </button>
          ))}

          {/* Stage Dropdown */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            aria-label="Filter by Stage"
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none"
          >
            <option value="ALL">All Stages</option>
            <option value="PRELIMS">Prelims</option>
            <option value="MAINS">Mains</option>
            <option value="INTERVIEW">Interview / Theory</option>
          </select>

          {/* Pricing Dropdown */}
          <select
            value={selectedAccess}
            onChange={(e) => setSelectedAccess(e.target.value)}
            aria-label="Filter by Price"
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none"
          >
            <option value="ALL">All Pricing</option>
            <option value="FREE">Free</option>
            <option value="PAID">Paid</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-orange-600 hover:text-orange-700 font-semibold px-2 py-1 ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span>
          Showing <strong className="text-gray-900 font-semibold">{filteredPapers.length}</strong> previous year papers
        </span>
      </div>

      {/* Paper Grid */}
      {filteredPapers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800">No matching papers found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
            We couldn't find any papers matching your filters. Try adjusting your search query or resetting filters.
          </p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-orange-600 text-white text-xs font-semibold rounded-xl hover:bg-orange-700 transition-colors"
          >
            Show All Papers
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPapers.map((paper) => (
            <div
              key={paper.id}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                {/* Badges Bar */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                      {paper.category.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
                      {paper.year}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        paper.stage === "PRELIMS"
                          ? "bg-blue-50 text-blue-700"
                          : paper.stage === "MAINS"
                          ? "bg-purple-50 text-purple-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {paper.stage}
                    </span>
                  </div>

                  {/* Access Badge */}
                  {paper.accessType === "PAID" || paper.accessType === "PASS_ONLY" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      <Lock className="w-3 h-3 text-amber-600" />Pass
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      FREE
                    </span>
                  )}
                </div>

                {/* Title */}
                <h4 className="font-bold text-gray-900 text-sm line-clamp-2 leading-snug mb-1.5">
                  {paper.title}
                </h4>

                {/* Subject & Sub-exam */}
                <div className="space-y-1 mb-4">
                  {paper.subject && (
                    <div className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                      <span className="text-gray-400">Subject:</span>
                      <span className="text-gray-800 font-semibold">{paper.subject}</span>
                    </div>
                  )}
                  {paper.subExam && (
                    <div className="text-[11px] text-gray-500">
                      Sub-Exam: {paper.subExam.name}
                    </div>
                  )}
                </div>

                {/* CBT Badge */}
                {paper.hasCbtMode && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-semibold mb-3 border border-indigo-100">
                    <Zap className="w-3 h-3 text-indigo-500" />
                    CBT Simulator Mode Available
                  </div>
                )}
              </div>

              {/* Meta & Actions */}
              <div className="pt-3 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span>{paper.downloadCount || 0} downloads</span>
                  {paper.pdfFileSizeKb ? (
                    <span>{paper.pdfFileSizeKb} KB</span>
                  ) : paper.pageCount ? (
                    <span>{paper.pageCount} pages</span>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  {paper.canAccess === false ? (
                    <>
                      <Link
                        href="/pricing"
                        title="This paper needs the aspirantbook Pass"
                        className="flex-1 py-2 px-3 text-xs font-semibold text-center rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        Get Pass to View
                      </Link>

                      <Link
                        href="/pricing"
                        title="This paper needs the aspirantbook Pass"
                        aria-label={`Get Pass to download ${paper.title}`}
                        className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 border border-gray-200 rounded-xl transition-colors"
                      >
                        <Lock className="w-4 h-4" />
                      </Link>

                      {paper.hasCbtMode && paper.cbtTestId && (
                        <Link
                          href="/pricing"
                          title="This paper needs the aspirantbook Pass"
                          className="py-2 px-3 text-xs font-semibold text-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          Attempt Test
                        </Link>
                      )}
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/pyqs/pdf-view?paperId=${paper.id}`}
                        className="flex-1 py-2 px-3 text-xs font-semibold text-center rounded-xl bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View PDF
                      </Link>

                      <a
                        href={`/api/pyqs/file/${paper.id}?download=1`}
                        download
                        className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 border border-gray-200 rounded-xl transition-colors"
                        title="Download Paper"
                        aria-label={`Download ${paper.title}`}
                      >
                        <Download className="w-4 h-4" />
                      </a>

                      {paper.hasCbtMode && paper.cbtTestId && (
                        <Link
                          href={`/test-series/${paper.cbtTestId}/instructions?testId=${paper.cbtTestId}`}
                          className="py-2 px-3 text-xs font-semibold text-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          Attempt Test
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
