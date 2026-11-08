"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"
import {
  Sparkles,
  Search,
  Clock,
  FileQuestion,
  Award,
  Plus,
  Flame,
  CheckCircle2,
  Calendar,
  Languages,
  BookOpen,
  Filter,
  Download,
  Eye,
  FileText,
  AlertCircle,
  RefreshCw,
  X,
  ExternalLink,
  ChevronRight,
  Globe,
  Upload,
} from "lucide-react"
import { TestActionButton } from "@/components/test-series/TestActionButton"
import { useGoal } from "@/components/providers/GoalProvider"
import { GoalSelectorBar } from "@/components/goals/GoalSelectorBar"
import { applyQuizGoalFilter } from "@/lib/goals/goal-filters"
import { getQuizSlug } from "@/lib/current-affairs/slugs"
import { useBatchUserStatus } from "@/lib/exam/batched-user-status"
import { buildPdfReaderHref } from "@/lib/pdf/reader-href"

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

export interface CurrentAffairsPdfDoc {
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
  createdAt: string | Date
}

interface QuizItem {
  id: string
  seriesId: string
  title: string
  titleHi?: string
  category: string
  testType?: string
  questions: number
  marks: number
  durationMinutes: number
  languages: string
  isFree: boolean
  attempts?: number
  isNew?: boolean
  isTeacherAuthored?: boolean
  month?: number | null
  year?: number | null
  tags?: string[]
}

interface Props {
  initialPdfs?: CurrentAffairsPdfDoc[]
  userRole?: string
  userId?: string
}

function formatKb(kb?: number | null) {
  if (!kb) return ""
  if (kb < 1024) return `${kb} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

export default function CurrentAffairsQuizzesClient({
  initialPdfs = [],
  userRole,
  userId,
}: Props) {
  const { data: session } = useSession()
  const { selectedGoal, selectedGoals, selectedGoalIds } = useGoal()
  const { openMobileAuth } = useMobileAuth()

  const effectiveRole = session?.user?.role || userRole
  const isTeacher = effectiveRole === "TEACHER"
  const isAdmin = effectiveRole === "ADMIN"
  const isTeacherOrAdmin = isTeacher || isAdmin
  const isGuest = !session?.user && !userId

  // PDFs state
  const [pdfs, setPdfs] = useState<CurrentAffairsPdfDoc[]>(initialPdfs)
  const [pdfSearch, setPdfSearch] = useState("")
  const [pdfYear, setPdfYear] = useState<string>("ALL")
  const [pdfMonth, setPdfMonth] = useState<string>("ALL")
  const [pdfLang, setPdfLang] = useState<"ALL" | "EN" | "HI">("ALL")

  // Quizzes state
  const [dbQuizzes, setDbQuizzes] = useState<QuizItem[]>([])
  const [quizSearch, setQuizSearch] = useState("")
  const [activeQuizTab, setActiveQuizTab] = useState<"all" | "daily" | "weekly" | "special">("all")
  const [quizYear, setQuizYear] = useState<string>("ALL")
  const [quizMonth, setQuizMonth] = useState<string>("ALL")

  // Single batched user status hook for all quiz cards (strictly per-user, zero cross-user cache)
  const quizIds = useMemo(() => dbQuizzes.map((t) => t.id), [dbQuizzes])
  const { statuses: userStatuses } = useBatchUserStatus(quizIds)

  // Loading & error states
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Deduplication refs for goals & list calls
  const prevGoalKeyRef = React.useRef<string | null>(null)
  const inFlightFetchRef = React.useRef<Promise<any> | null>(null)

  // Fetch quizzes with visible loading & error retry
  const fetchQuizzes = async () => {
    if (inFlightFetchRef.current) return inFlightFetchRef.current

    setIsLoading(true)
    setErrorMessage(null)
    const fetchPromise = (async () => {
      try {
        const res = await fetch("/api/exam/test/list?category=Current%20Affairs")
        if (!res.ok) {
          throw new Error(`Server returned status ${res.status}`)
        }
        const json = await res.json()
        if (json.data && Array.isArray(json.data)) {
          setDbQuizzes(
            json.data.map((t: any) => ({
              id: t.id,
              seriesId: t.seriesSlug || t.seriesId,
              title: t.title,
              titleHi: t.titleHi,
              category: t.category,
              testType: t.testType,
              questions: t.questions,
              marks: t.marks,
              durationMinutes: t.durationMinutes,
              languages: t.languages,
              isFree: t.isFree,
              attempts: t.attempts,
              month: t.month,
              year: t.year,
            }))
          )
        } else {
          setDbQuizzes([])
        }
      } catch (err: any) {
        console.error("Error fetching Current Affairs quizzes:", err)
        setErrorMessage("Unable to load Current Affairs quizzes at this moment.")
      } finally {
        setIsLoading(false)
        inFlightFetchRef.current = null
      }
    })()

    inFlightFetchRef.current = fetchPromise
    return fetchPromise
  }

  const currentGoalKey = selectedGoalIds.slice().sort().join(",")

  useEffect(() => {
    if (prevGoalKeyRef.current === currentGoalKey && dbQuizzes.length > 0) {
      return
    }
    prevGoalKeyRef.current = currentGoalKey
    fetchQuizzes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGoalKey])

  // PDF download handling with guest OTP intercept
  const handlePdfDownload = (doc: CurrentAffairsPdfDoc, lang: "en" | "hi") => {
    if (isGuest) {
      openMobileAuth({
        actionType: "login",
        callbackUrl: `/current-affairs-quizzes`,
      })
      return
    }

    // Direct download for authenticated users
    const downloadUrl = `/api/current-affairs/file/${doc.id}?lang=${lang}&download=1`
    const link = document.createElement("a")
    link.href = downloadUrl
    link.setAttribute("download", `${doc.title}_${lang.toUpperCase()}.pdf`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Optimistically update local download count
    setPdfs((prev) =>
      prev.map((p) => (p.id === doc.id ? { ...p, downloadCount: (p.downloadCount || 0) + 1 } : p))
    )
  }

  // "My Quiz History" click handling
  const handleMyQuizHistory = (e: React.MouseEvent) => {
    if (isGuest) {
      e.preventDefault()
      openMobileAuth({
        actionType: "login",
        callbackUrl: "/my-tests",
      })
    }
  }

  // Filtered PDFs
  const filteredPdfs = useMemo(() => {
    return pdfs.filter((p) => {
      if (pdfSearch.trim()) {
        const q = pdfSearch.toLowerCase()
        const titleMatch = p.title.toLowerCase().includes(q)
        const titleHiMatch = p.titleHi?.toLowerCase().includes(q)
        const monthName = MONTHS[p.month - 1]?.toLowerCase()
        if (!titleMatch && !titleHiMatch && !monthName?.includes(q)) return false
      }
      if (pdfYear !== "ALL" && p.year.toString() !== pdfYear) return false
      if (pdfMonth !== "ALL" && p.month.toString() !== pdfMonth) return false
      if (pdfLang === "EN" && !p.pdfUrlEn) return false
      if (pdfLang === "HI" && !p.pdfUrlHi) return false
      return true
    })
  }, [pdfs, pdfSearch, pdfYear, pdfMonth, pdfLang])

  // Extract unique PDF years
  const pdfYears = Array.from(new Set(pdfs.map((p) => p.year))).sort((a, b) => b - a)

  // Filtered Quizzes
  const filteredQuizzes = useMemo(() => {
    const goalFiltered =
      selectedGoalIds.length > 0 ? applyQuizGoalFilter(dbQuizzes, selectedGoalIds) : dbQuizzes

    return goalFiltered.filter((q) => {
      const matchesSearch =
        !quizSearch ||
        q.title.toLowerCase().includes(quizSearch.toLowerCase()) ||
        (q.titleHi && q.titleHi.includes(quizSearch))

      if (!matchesSearch) return false

      if (quizYear !== "ALL" && q.year && q.year.toString() !== quizYear) return false
      if (quizMonth !== "ALL" && q.month && q.month.toString() !== quizMonth) return false

      if (activeQuizTab === "daily") {
        return q.title.toLowerCase().includes("daily") || q.title.toLowerCase().includes("speed")
      }
      if (activeQuizTab === "weekly") {
        return q.title.toLowerCase().includes("weekly") || q.testType === "WEEKLY_QUIZ"
      }
      if (activeQuizTab === "special") {
        return (
          q.title.toLowerCase().includes("special") ||
          q.title.toLowerCase().includes("budget") ||
          q.title.toLowerCase().includes("bpsc")
        )
      }
      return true
    })
  }, [dbQuizzes, quizSearch, activeQuizTab, quizYear, quizMonth, selectedGoalIds])

  const uploadPdfHref = isTeacher ? "/teacher/current-affairs" : "/admin/current-affairs"
  const createQuizHref = isTeacher
    ? "/teacher/test-series/create?type=CURRENT_AFFAIRS"
    : "/admin/test-series/create?type=CURRENT_AFFAIRS"

  return (
    <div className="space-y-10 pb-16">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#003B73] via-[#005B96] to-[#00A896] text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/3 w-60 h-60 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs border border-white/20 text-xs font-bold uppercase tracking-wider text-teal-200">
              <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" />
              <span>Current Affairs Command Center</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Current Affairs &amp; Quizzes
            </h1>
            <p className="text-sm text-white/85 leading-relaxed">
              Stay ahead with curated monthly PDF digests, daily speed mocks, and bilingual practice
              tests designed for UPSC, BPSC, SSC, and State PSC examinations.
            </p>
          </div>

          {/* Action Buttons: Teacher/Admin gets Upload & Create; Guest/Student gets My Quiz History */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {isTeacherOrAdmin && (
              <>
                <Link
                  href={uploadPdfHref}
                  data-testid="btn-upload-monthly-pdf"
                  className="px-4 py-2.5 rounded-xl bg-white text-teal-800 font-bold text-xs sm:text-sm hover:bg-teal-50 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4 text-teal-600" />
                  <span>Upload Monthly PDF</span>
                </Link>
                <Link
                  href={createQuizHref}
                  data-testid="btn-create-ca-quiz"
                  className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-bold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create CA Quiz</span>
                </Link>
              </>
            )}

            <Link
              href="/my-tests"
              onClick={handleMyQuizHistory}
              data-testid="btn-my-quiz-history"
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 backdrop-blur-xs"
            >
              <Award className="w-4 h-4 text-amber-300" />
              <span>My Quiz History</span>
            </Link>
          </div>
        </div>

        {/* Quick Highlights Bar */}
        <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <span className="text-xl sm:text-2xl font-black text-white">{pdfs.length}</span>
            <p className="text-[11px] text-white/70 uppercase font-semibold">Monthly Digests</p>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black text-white">{dbQuizzes.length}</span>
            <p className="text-[11px] text-white/70 uppercase font-semibold">Active Quizzes</p>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black text-emerald-300">100% Free</span>
            <p className="text-[11px] text-white/70 uppercase font-semibold">Monthly PDFs</p>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black text-teal-200">Bilingual</span>
            <p className="text-[11px] text-white/70 uppercase font-semibold">English &amp; हिंदी</p>
          </div>
        </div>
      </div>

      {/* Goal Selector */}
      <GoalSelectorBar
        title="Target Exams & Focus"
        subtitle="Filter quizzes and materials tailored for your target exams"
      />

      {/* SECTION 1: Monthly Current Affairs PDFs */}
      <section className="space-y-6" data-testid="section-monthly-pdfs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                Monthly Current Affairs Digests (PDFs)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Download and study high-yield monthly magazine compilations available in English and Hindi.
            </p>
          </div>

          {/* Language filter pills */}
          <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl self-start md:self-auto">
            {(["ALL", "EN", "HI"] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setPdfLang(lang)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  pdfLang === lang
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lang === "ALL" ? "All Languages" : lang === "EN" ? "English" : "हिंदी"}
              </button>
            ))}
          </div>
        </div>

        {/* PDF Filters Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search monthly digests by title, month..."
              value={pdfSearch}
              onChange={(e) => setPdfSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pdfYear}
              onChange={(e) => setPdfYear(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none"
            >
              <option value="ALL">All Years</option>
              {pdfYears.map((y) => (
                <option key={y} value={y.toString()}>
                  {y}
                </option>
              ))}
            </select>

            <select
              value={pdfMonth}
              onChange={(e) => setPdfMonth(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none"
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

        {/* PDF Cards Grid */}
        {filteredPdfs.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border border-border bg-card">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
            <h4 className="text-sm font-bold text-foreground">No Current Affairs PDFs match filters</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Try adjusting the year, month, language, or search query.
            </p>
            <button
              onClick={() => {
                setPdfSearch("")
                setPdfYear("ALL")
                setPdfMonth("ALL")
                setPdfLang("ALL")
              }}
              className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPdfs.map((doc) => {
              const monthName = MONTHS[doc.month - 1] || "Monthly"
              return (
                <div
                  key={doc.id}
                  data-testid="ca-pdf-card"
                  className="group relative bg-card rounded-2xl border border-border hover:border-primary/50 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Period & Downloads */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-primary/10 text-primary">
                        <Calendar className="w-3 h-3" />
                        {monthName} {doc.year}
                      </span>
                      <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {doc.downloadCount}
                      </span>
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                        {doc.title}
                      </h3>
                      {doc.titleHi && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {doc.titleHi}
                        </p>
                      )}
                    </div>

                    {/* Available Editions */}
                    <div className="flex items-center gap-2 pt-1">
                      {doc.pdfUrlEn && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          <Globe className="w-2.5 h-2.5" />
                          EN {doc.fileSizeKbEn ? `(${formatKb(doc.fileSizeKbEn)})` : ""}
                        </span>
                      )}
                      {doc.pdfUrlHi && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          <Globe className="w-2.5 h-2.5" />
                          हिंदी {doc.fileSizeKbHi ? `(${formatKb(doc.fileSizeKbHi)})` : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions: View & Download */}
                  <div className="mt-5 pt-3 border-t border-border flex items-center justify-between gap-2">
                    <Link
                      href={buildPdfReaderHref({
                        src: `/api/current-affairs/file/${doc.id}?lang=${doc.pdfUrlEn ? "en" : "hi"}`,
                        downloadUrl: `/api/current-affairs/file/${doc.id}?lang=${doc.pdfUrlEn ? "en" : "hi"}&download=1`,
                        title: doc.title,
                        subtitle: `${MONTHS[doc.month - 1]} ${doc.year}`,
                        badge: "Current Affairs Magazine",
                      })}
                      data-testid={`btn-view-pdf-${doc.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-background hover:bg-muted transition-colors text-foreground"
                    >
                      <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>View PDF</span>
                    </Link>

                    <div className="flex items-center gap-1">
                      {doc.pdfUrlEn && (
                        <button
                          onClick={() => handlePdfDownload(doc, "en")}
                          data-testid={`btn-download-en-${doc.id}`}
                          title="Download English PDF"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download{doc.pdfUrlHi ? " (EN)" : ""}</span>
                        </button>
                      )}
                      {doc.pdfUrlHi && (
                        <button
                          onClick={() => handlePdfDownload(doc, "hi")}
                          data-testid={`btn-download-hi-${doc.id}`}
                          title="Download Hindi PDF"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>हिंदी</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* SECTION 2: Current Affairs Quizzes (CBT) */}
      <section className="space-y-6 pt-6 border-t border-border" data-testid="section-ca-quizzes">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600">
                <FileQuestion className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                Current Affairs Quizzes &amp; CBT Tests
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Test your knowledge with daily speed mocks and time-bound sectionals with real exam CBT analytics.
            </p>
          </div>

          {/* Horizontal Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {[
              { id: "all", label: "All Quizzes" },
              { id: "daily", label: "Daily Speed Tests" },
              { id: "weekly", label: "Weekly Roundups" },
              { id: "special", label: "State & Economy Specials" },
            ].map((tab) => {
              const isSelected = activeQuizTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveQuizTab(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? "bg-teal-600 text-white shadow-xs"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Quiz Filters Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search quizzes by title or keyword..."
              value={quizSearch}
              onChange={(e) => setQuizSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={quizYear}
              onChange={(e) => setQuizYear(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none"
            >
              <option value="ALL">All Years</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>

            <select
              value={quizMonth}
              onChange={(e) => setQuizMonth(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none"
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

        {/* Error State with Retry */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-xs sm:text-sm font-medium">{errorMessage}</p>
            </div>
            <button
              onClick={fetchQuizzes}
              className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-bold hover:bg-destructive/90 flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-card rounded-2xl border border-border p-5 space-y-4 animate-pulse"
              >
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-10 bg-muted rounded w-full" />
                <div className="h-8 bg-muted rounded w-1/2 ml-auto" />
              </div>
            ))}
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-3xl border border-border p-8 space-y-3">
            <FileQuestion className="w-12 h-12 text-muted-foreground mx-auto opacity-40" />
            <h3 className="font-extrabold text-foreground text-base">No quizzes available yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No current affairs quizzes match your current filter or search query. Try changing
              filters or search terms.
            </p>
            <button
              onClick={() => {
                setActiveQuizTab("all")
                setQuizSearch("")
                setQuizYear("ALL")
                setQuizMonth("ALL")
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredQuizzes.map((quiz) => {
              const targetSeriesId = quiz.seriesId
              if (!targetSeriesId) return null
              const quizSlug = getQuizSlug(quiz)

              return (
                <div
                  key={quiz.id}
                  data-testid="current-affairs-quiz-card"
                  className="group relative bg-card rounded-2xl border border-border hover:border-teal-500/50 shadow-xs hover:shadow-xl transition-all duration-300 p-5 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Top Tags Row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {quiz.isTeacherAuthored ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            Faculty Authored
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                            Current Affairs
                          </span>
                        )}
                        {quiz.isFree && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            Free
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Languages className="w-3 h-3" />
                        <span>En / हिं</span>
                      </span>
                    </div>

                    {/* Quiz Title with Link to Public Slug Page */}
                    <div>
                      <Link href={`/current-affairs-quizzes/${quizSlug}`} className="group/link">
                        <h3 className="font-extrabold text-base text-foreground group-hover/link:text-teal-600 dark:group-hover/link:text-teal-400 transition-colors line-clamp-2 leading-snug">
                          {quiz.title}
                        </h3>
                      </Link>
                      {quiz.titleHi && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {quiz.titleHi}
                        </p>
                      )}
                    </div>

                    {/* Meta Row: Questions, Time, Marks */}
                    <div className="pt-2 grid grid-cols-3 gap-2 py-2 border-y border-border text-center">
                      <div>
                        <span className="text-xs font-black text-foreground">
                          {quiz.questions}
                        </span>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                          Questions
                        </p>
                      </div>
                      <div>
                        <span className="text-xs font-black text-foreground">
                          {quiz.durationMinutes}m
                        </span>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                          Time
                        </p>
                      </div>
                      <div>
                        <span className="text-xs font-black text-foreground">
                          {quiz.marks}
                        </span>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                          Marks
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="mt-5 pt-3 flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {typeof quiz.attempts === "number"
                        ? `${quiz.attempts.toLocaleString()} attempted`
                        : null}
                    </span>
                    <TestActionButton
                      testId={quiz.id}
                      seriesId={targetSeriesId}
                      testTitle={quiz.title}
                      status={userStatuses[quiz.id]}
                      customStartUrl={`/current-affairs-quizzes/${quizSlug}/instructions`}
                      returnPath={`/current-affairs-quizzes/${quizSlug}`}
                      isGuest={isGuest}
                      size="sm"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
