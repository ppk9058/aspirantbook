"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { buildPassLoginHref, evaluatePyqLockState } from "@/lib/pyqs/pass-popup"
import { usePyqPassUnlock } from "@/lib/pyqs/usePyqPassUnlock"
import PassPurchaseModal from "@/components/pass/PassPurchaseModal"
import {
  PYQ_UNLOCK_PENDING_MESSAGE,
  buildPyqPdfSource,
  resolvePostPaymentPdfAction,
} from "@/lib/pyqs/pdf-reader"
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
  Loader2,
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
  isAuthenticated = false,
  hasActivePass = false,
}: {
  initialPapers: PyqStudentPaper[]
  categories: PyqCategoryItem[]
  isAuthenticated?: boolean
  /** Server-resolved database Pass entitlement (never session role). */
  hasActivePass?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const hasLockedPapers = useMemo(
    () => initialPapers.some((paper) => evaluatePyqLockState(paper) === "locked"),
    [initialPapers]
  )
  const {
    openPassCheckout,
    isProcessing: isPassProcessing,
    error: passError,
    isPassModalOpen,
    closePassModal,
    handleModalSuccess,
  } = usePyqPassUnlock({
    hasActivePass,
    autoOpenEnabled: hasLockedPapers,
    isAuthenticated,
  })
  // Set after a verified Pass payment when the file endpoint is not ready yet.
  const [unlockPaper, setUnlockPaper] = useState<PyqStudentPaper | null>(null)
  const [unlockState, setUnlockState] = useState<"idle" | "checking" | "pending" | "error">("idle")
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

  // After payment, fulfilment can lag: probe the file endpoint once, then either
  // navigate to /pyqs/pdf-view or show the retry message. Never loop on its own.
  const verifyUnlockedPaper = async (paper: PyqStudentPaper) => {
    setUnlockPaper(paper)
    setUnlockState("checking")

    let status = 0
    try {
      const res = await fetch(buildPyqPdfSource(paper.id), {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
      })
      status = res.status
      try {
        await res.body?.cancel()
      } catch (cancelError) {
        console.warn("PYQ PDF probe: response body already closed", cancelError)
      }
    } catch (probeError) {
      console.warn("PYQ PDF probe failed; letting the reader page try the file", probeError)
      status = 0
    }

    const action = resolvePostPaymentPdfAction(status)
    if (action === "open") {
      setUnlockState("idle")
      setUnlockPaper(null)
      router.push(`/pyqs/pdf-view?paperId=${encodeURIComponent(paper.id)}`)
      return
    }
    setUnlockState(action)
  }

  // Locked PYQ click: same-page Pass Razorpay popup for signed-in students,
  // /login with a safe return path to this page for guests.
  const handlePassClick = (paper: PyqStudentPaper) => {
    if (!isAuthenticated) {
      router.push(buildPassLoginHref(pathname || "/pyqs"))
      return
    }
    // After a verified payment the modal opens for the clicked paper.
    void openPassCheckout(() => {
      void verifyUnlockedPaper(paper)
    })
  }

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
      {/* Search & Filter Control Center */}
      <div className="bg-card border border-border text-card-foreground rounded-2xl p-5 shadow-xs space-y-4">
        {/* Tier 1: Search & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="lg:col-span-6 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by exam, subject, or year (e.g. History, 2024)..."
              className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl border border-input bg-muted/40 dark:bg-muted/20 text-foreground placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md p-1 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Selectors Group */}
          <div className="lg:col-span-6 flex flex-wrap sm:flex-nowrap items-center gap-2 justify-start lg:justify-end">
            {/* Stage Dropdown */}
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              aria-label="Filter by Stage"
              className="w-full sm:w-auto px-3 py-2 text-xs font-semibold rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer shadow-2xs"
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
              className="w-full sm:w-auto px-3 py-2 text-xs font-semibold rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Pricing</option>
              <option value="FREE">Free</option>
              <option value="PAID">Paid</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Sort papers"
              className="w-full sm:w-auto px-3.5 py-2 text-xs font-semibold rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer shadow-2xs"
            >
              <option value="year">Latest Exam Year</option>
              <option value="downloads">Most Downloaded</option>
              <option value="recent">Recently Added</option>
            </select>
          </div>
        </div>

        {/* Tier 2: Category Navigation & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/70">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                selectedCategory === "ALL"
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border/60"
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                  selectedCategory.toLowerCase() === cat.slug.toLowerCase()
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border/60"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-primary hover:text-primary/80 font-bold px-2 py-1 ml-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Showing <strong className="text-foreground font-bold">{filteredPapers.length}</strong> previous year papers
        </span>
      </div>

      {/* Post-payment unlock status: only shown after a verified Pass payment. */}
      {unlockState !== "idle" && (
        <div
          role="status"
          aria-live="polite"
          data-testid="pyq-unlock-status"
          className={`flex flex-wrap items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold ${
            unlockState === "pending"
              ? "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
              : unlockState === "error"
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-border bg-muted/50 text-muted-foreground"
          }`}
        >
          {unlockState === "checking" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Checking access…</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>
                {unlockState === "pending"
                  ? PYQ_UNLOCK_PENDING_MESSAGE
                  : "We could not confirm access. Please retry."}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (unlockPaper) void verifyUnlockedPaper(unlockPaper)
                }}
                className="ml-auto rounded-lg border border-current px-3 py-1 min-h-11 inline-flex items-center text-[11px] font-bold hover:bg-background/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
              >
                Retry
              </button>
            </>
          )}
        </div>
      )}

      {/* Paper Grid */}
      {filteredPapers.length === 0 ? (
        <div className="bg-card border border-border text-card-foreground rounded-2xl p-12 sm:p-16 text-center shadow-xs space-y-4">
          <div className="p-4 rounded-2xl bg-muted/60 border border-border/80 inline-flex mx-auto">
            <BookOpen className="w-12 h-12 text-muted-foreground/60 stroke-[1.5]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">No matching papers found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 leading-relaxed">
              We couldn't find any papers matching your current search or filter combination.
            </p>
          </div>
          <button
            onClick={clearFilters}
            className="px-5 py-2.5 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors shadow-2xs"
          >
            Show All Papers
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPapers.map((paper) => (
            <div
              key={paper.id}
              className="group relative flex flex-col justify-between bg-card text-card-foreground rounded-2xl border border-border/80 hover:border-primary/50 shadow-xs hover:shadow-lg transition-all duration-200 p-5 space-y-4"
            >
              <div className="space-y-3">
                {/* Badges Bar: Category & Stage on left, Year & Access on right */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                      {paper.category.name}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                        paper.stage === "PRELIMS"
                          ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20"
                          : paper.stage === "MAINS"
                          ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                      }`}
                    >
                      {paper.stage}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-muted text-foreground/80 border border-border/60">
                      {paper.year}
                    </span>
                    {paper.accessType === "PAID" || paper.accessType === "PASS_ONLY" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                        <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />Pass
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        FREE
                      </span>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-bold text-foreground text-base line-clamp-2 leading-snug tracking-tight group-hover:text-primary transition-colors break-words min-h-[2.75rem]">
                  {paper.title}
                </h3>

                {/* Subject & Sub-exam */}
                <div className="space-y-1.5 text-xs">
                  {paper.subject && (
                    <div className="font-medium text-muted-foreground flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                      <span className="truncate text-foreground font-semibold">{paper.subject}</span>
                    </div>
                  )}
                  {paper.subExam && (
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <span className="text-muted-foreground/70">Sub-Exam:</span>
                      <span className="font-medium text-foreground/80 truncate">{paper.subExam.name}</span>
                    </div>
                  )}
                </div>

                {/* CBT Badge */}
                {paper.hasCbtMode && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-500/20">
                    <Zap className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                    <span>CBT Simulator Practice Ready</span>
                  </div>
                )}
              </div>

              {/* Meta & Actions Footer */}
              <div className="pt-3 border-t border-border/70 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Download className="w-3 h-3 text-muted-foreground/60" />
                    {paper.downloadCount || 0} downloads
                  </span>
                  {paper.pdfFileSizeKb ? (
                    <span>{paper.pdfFileSizeKb} KB</span>
                  ) : paper.pageCount ? (
                    <span>{paper.pageCount} pages</span>
                  ) : null}
                </div>

                {/* Actions: Obvious Primary Action + Quieter Secondary Actions */}
                <div className="flex items-center gap-2">
                  {evaluatePyqLockState(paper) === "locked" ? (
                    <>
                      {/* Primary CTA */}
                      <button
                        type="button"
                        onClick={() => handlePassClick(paper)}
                        disabled={isPassProcessing}
                        data-testid="pyq-pass-unlock-cta"
                        title="This paper needs the AspirantBook Pass"
                        className="flex-1 py-2.5 px-4 text-xs font-bold text-center rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        {isPassProcessing ? "Opening checkout..." : "Get Pass to View"}
                      </button>

                      {/* Quieter Secondary Actions */}
                      <button
                        type="button"
                        onClick={() => handlePassClick(paper)}
                        disabled={isPassProcessing}
                        title="This paper needs the AspirantBook Pass"
                        aria-label={`Get Pass to download ${paper.title}`}
                        className="p-2.5 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 border border-border/80 rounded-xl transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Lock className="w-4 h-4" />
                      </button>

                      {paper.hasCbtMode && paper.cbtTestId && (
                        <button
                          type="button"
                          onClick={() => handlePassClick(paper)}
                          disabled={isPassProcessing}
                          title="This paper needs the AspirantBook Pass"
                          className="py-2.5 px-3 text-xs font-semibold text-center rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/70 transition-colors flex items-center justify-center gap-1 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 shadow-2xs"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>Test</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Primary CTA */}
                      <Link
                        href={`/pyqs/pdf-view?paperId=${encodeURIComponent(paper.id)}`}
                        className="flex-1 py-2.5 px-4 text-xs font-bold text-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-colors flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View PDF</span>
                      </Link>

                      {/* Quieter Secondary Actions */}
                      <a
                        href={`/api/pyqs/file/${paper.id}?download=1`}
                        download
                        className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted border border-border/80 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title="Download Paper"
                        aria-label={`Download ${paper.title}`}
                      >
                        <Download className="w-4 h-4" />
                      </a>

                      {paper.hasCbtMode && paper.cbtTestId && (
                        <Link
                          href={`/test-series/${paper.cbtTestId}/instructions?testId=${paper.cbtTestId}`}
                          className="py-2.5 px-3 text-xs font-semibold text-center rounded-xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 shadow-2xs"
                        >
                          <Zap className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Test</span>
                        </Link>
                      )}
                    </>
                  )}
                </div>

                {passError && (
                  <p role="alert" className="text-[11px] font-semibold text-destructive">
                    {passError}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <PassPurchaseModal
        isOpen={isPassModalOpen}
        onClose={closePassModal}
        onSuccess={handleModalSuccess}
      />
    </div>
  )
}
