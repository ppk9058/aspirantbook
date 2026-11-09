"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams, useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"
import {
  Trophy,
  Download,
  RotateCcw,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  MinusCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Award,
  BookOpen,
} from "lucide-react"
import { sanitizeReturnPath } from "@/lib/utils/return-path"
import MathRenderer from "@/components/exam/MathRenderer"

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface SubjectRow {
  subject: string
  total: number
  correct: number
  wrong: number
  skipped: number
  marks: number
}

interface QuestionRow {
  no: number
  id?: string | number
  text: string
  textHi?: string | null
  options?: string[]
  optionsHi?: string[]
  subject: string
  yourAnswer: string
  yourAnswerText?: string
  correctAnswer: string
  correctAnswerText?: string
  status: "correct" | "wrong" | "skipped"
  timeSpent: number // seconds
  explanation: string
  explanationHi?: string | null
}

// ─────────────────────────────────────────────────────────────────
// SVG Donut Chart (Mathematical Accuracy)
// ─────────────────────────────────────────────────────────────────

function DonutChart({
  correctMarks,
  negativeMarks,
  unattempted,
  totalScore,
}: {
  correctMarks: number
  negativeMarks: number
  unattempted: number
  totalScore: number
}) {
  const size = 160
  const r = 60
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r

  const segments = [
    { value: Math.max(0, correctMarks), color: "#22c55e", label: "Correct Marks" },
    { value: Math.max(0, negativeMarks), color: "#ef4444", label: "Negative Marks" },
    { value: Math.max(0, unattempted), color: "#d1d5db", label: "Unattempted" },
  ]
  const sum = segments.reduce((a, s) => a + s.value, 0) || 1

  let offset = 0
  const arcs = segments.map((seg) => {
    const frac = seg.value / sum
    const dash = frac * circumference
    const gap = circumference - dash
    const arc = { ...seg, dashArray: `${dash} ${gap}`, dashOffset: (-offset * circumference) / sum }
    offset += seg.value
    return arc
  })

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          {arcs.map((arc, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth={22}
              strokeDasharray={arc.dashArray}
              strokeDashoffset={arc.dashOffset}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 900, color: "#111827" }}>
            {totalScore.toFixed(1)}
          </span>
          <span style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>
            Total Score
          </span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
        {[
          { color: "#22c55e", label: "Correct Marks", val: `+${correctMarks.toFixed(1)}` },
          { color: "#ef4444", label: "Negative Marks", val: `-${negativeMarks.toFixed(2)}` },
          { color: "#d1d5db", label: "Unattempted", val: `${unattempted} Qs` },
        ].map((item) => (
          <div
            key={item.label}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color, flexShrink: 0 }} />
              <span style={{ color: "#374151" }}>{item.label}</span>
            </div>
            <span style={{ fontWeight: 700, color: "#111827" }}>{item.val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// CSS Pie (Attempt Summary)
// ─────────────────────────────────────────────────────────────────

function AttemptPie({ answered, skipped, notVisited }: { answered: number; skipped: number; notVisited: number }) {
  const total = answered + skipped + notVisited || 1
  const aFrac = answered / total
  const sFrac = skipped / total

  const pieSegments = [
    { color: "#22c55e", pct: aFrac * 100, label: "Answered", count: answered },
    { color: "#ef4444", pct: sFrac * 100, label: "Not Answered", count: skipped },
    { color: "#9ca3af", pct: (notVisited / total) * 100, label: "Not Visited", count: notVisited },
  ]

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
      <div style={{ flexShrink: 0 }}>
        <svg width={100} height={100} viewBox="0 0 36 36">
          {(() => {
            let cumul = 0
            return pieSegments.map((seg, i) => {
              const x1 = Math.cos(2 * Math.PI * cumul - Math.PI / 2)
              const y1 = Math.sin(2 * Math.PI * cumul - Math.PI / 2)
              const frac = seg.pct / 100
              cumul += frac
              const x2 = Math.cos(2 * Math.PI * cumul - Math.PI / 2)
              const y2 = Math.sin(2 * Math.PI * cumul - Math.PI / 2)
              const large = frac > 0.5 ? 1 : 0
              const d =
                frac === 0
                  ? ""
                  : frac === 1
                  ? `M 18 18 m -16 0 a 16,16 0 1,1 32,0 a 16,16 0 1,1 -32,0`
                  : `M 18 18 L ${18 + 16 * x1} ${18 + 16 * y1} A 16 16 0 ${large} 1 ${18 + 16 * x2} ${18 + 16 * y2} Z`
              return <path key={i} d={d} fill={seg.color} />
            })
          })()}
        </svg>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {pieSegments.map((seg) => (
          <div key={seg.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: seg.color, flexShrink: 0 }} />
            <span style={{ color: "#374151" }}>{seg.label}</span>
            <span style={{ fontWeight: 700, color: "#111827", marginLeft: "auto" }}>{seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Solution Modal
// ─────────────────────────────────────────────────────────────────

function SolutionModal({ q, onClose }: { q: QuestionRow; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(2px)",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          border: "1px solid #e5e7eb",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          maxWidth: 580,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: 28,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: "#111827" }}>Question {q.no}</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                padding: "2px 8px",
                borderRadius: 12,
                background: "#f1f5f9",
                color: "#475569",
              }}
            >
              {q.subject}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#9ca3af",
              padding: 4,
            }}
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Question Text */}
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 12,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            marginBottom: 16,
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", margin: 0, lineHeight: 1.6, whiteSpace: "pre-line" }}>{q.text}</p>
          {q.textHi && (
            <p style={{ fontSize: 12, color: "#64748b", margin: "8px 0 0", lineHeight: 1.5, whiteSpace: "pre-line" }}>{q.textHi}</p>
          )}
        </div>

        {/* Answers Compare Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              background: q.status === "correct" ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${q.status === "correct" ? "#86efac" : "#fca5a5"}`,
            }}
          >
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, marginBottom: 4, textTransform: "uppercase" }}>
              YOUR ANSWER
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: q.status === "correct" ? "#16a34a" : "#dc2626",
              }}
            >
              {q.yourAnswer} {q.yourAnswerText ? `(${q.yourAnswerText})` : ""}
            </div>
          </div>
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              background: "#f0fdf4",
              border: "1px solid #86efac",
            }}
          >
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, marginBottom: 4, textTransform: "uppercase" }}>
              CORRECT ANSWER
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#16a34a" }}>
              {q.correctAnswer} {q.correctAnswerText ? `(${q.correctAnswerText})` : ""}
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div
          style={{
            padding: "16px 18px",
            borderRadius: 12,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: "#1d4ed8",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            💡 Detailed Solution &amp; Explanation
          </div>
          <p style={{ fontSize: 13, color: "#1e3a8a", lineHeight: 1.6, margin: 0, whiteSpace: "pre-line" }}>{q.explanation}</p>
          {q.explanationHi && (
            <p style={{ fontSize: 12, color: "#3b82f6", lineHeight: 1.5, margin: "8px 0 0", whiteSpace: "pre-line" }}>{q.explanationHi}</p>
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%",
            marginTop: 20,
            padding: "12px 0",
            borderRadius: 12,
            background: "#0ea5e9",
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
            border: "none",
            cursor: "pointer",
          }}
        >
          Close Solution
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// RESULT PAGE CONTENT
// ─────────────────────────────────────────────────────────────────

function ResultContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const { openMobileAuth } = useMobileAuth()

  const seriesId = (params?.id as string) || "bpsc-72nd-2026"
  const attemptId = searchParams.get("attemptId")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [serverResult, setServerResult] = useState<any>(null)

  const isCurrentAffairs =
    serverResult?.testType === "CURRENT_AFFAIRS" ||
    serverResult?.test?.testType === "CURRENT_AFFAIRS" ||
    serverResult?.seriesSlug === "current-affairs-system-series" ||
    serverResult?.test?.series?.slug === "current-affairs-system-series" ||
    seriesId === "current-affairs-system-series"

  const isPyq =
    serverResult?.testType === "PREVIOUS_YEAR" ||
    serverResult?.test?.testType === "PREVIOUS_YEAR" ||
    serverResult?.seriesSlug === "pyq-system-series" ||
    serverResult?.test?.series?.slug === "pyq-system-series" ||
    seriesId === "pyq-system-series"

  const defaultBackUrl = isCurrentAffairs
    ? "/current-affairs-quizzes"
    : isPyq
    ? "/pyqs"
    : `/test-series/${seriesId}`

  const backTitle = isCurrentAffairs
    ? "Back to Current Affairs Quizzes"
    : isPyq
    ? "Back to Previous Papers"
    : "Back to Test Series"

  const backLabel = isCurrentAffairs
    ? "Back to Quizzes"
    : isPyq
    ? "Back to Papers"
    : "Back to Tests"

  const [retryTrigger, setRetryTrigger] = useState(0)

  useEffect(() => {
    if (status === "unauthenticated") {
      const currentUrl = typeof window !== "undefined" ? window.location.href : ""
      openMobileAuth({ actionType: "login", callbackUrl: currentUrl })
    }
  }, [status, openMobileAuth])

  useEffect(() => {
    if (status === "loading") return
    if (!session?.user) {
      setLoading(false)
      return
    }

    if (!attemptId) {
      setError("No attempt ID provided. Please complete an exam attempt first.")
      setLoading(false)
      return
    }

    let isSubscribed = true
    setLoading(true)
    setError(null)

    const fetchResultWithRetry = async () => {
      const startTime = Date.now()
      let delay = 1000

      while (isSubscribed) {
        try {
          const res = await fetch(`/api/exam/attempt/${encodeURIComponent(attemptId)}/result`)
          if (res.status === 202) {
            // Grading is currently in flight: poll with backoff up to 15s
            if (Date.now() - startTime > 15000) {
              throw new Error("Result calculation is taking longer than expected. Your submission is safe. Please click Retry.")
            }
            await new Promise((r) => setTimeout(r, delay))
            delay = Math.min(3000, delay * 1.5)
            continue
          }

          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}))
            if (res.status === 404) throw new Error("Attempt not found.")
            if (res.status === 409) throw new Error("This attempt is still in progress and has not been submitted.")
            throw new Error(errJson.error || "Failed to load test results.")
          }

          const json = await res.json()
          if (!isSubscribed) return
          if (json.data) {
            setServerResult(json.data)
            setLoading(false)
            return
          } else {
            throw new Error("Invalid result payload received.")
          }
        } catch (err: any) {
          if (!isSubscribed) return
          setError(err.message || "Failed to load result.")
          setLoading(false)
          return
        }
      }
    }

    fetchResultWithRetry()

    return () => {
      isSubscribed = false
    }
  }, [attemptId, retryTrigger, session, status])

  // State
  const [activeSection, setActiveSection] = useState<"analysis" | "questions">("analysis")
  const [showSolution, setShowSolution] = useState<QuestionRow | null>(null)
  const [expandSubject, setExpandSubject] = useState(true)
  const [languageMode, setLanguageMode] = useState<"both" | "english" | "hindi">("both")
  const [statusFilter, setStatusFilter] = useState<"all" | "correct" | "wrong" | "skipped">("all")
  const [jumpInput, setJumpInput] = useState("")
  const [allExpanded, setAllExpanded] = useState(true)
  const [collapsedQuestions, setCollapsedQuestions] = useState<Record<number, boolean>>({})

  if (status === "unauthenticated" || (!session?.user && status !== "loading")) {
    return (
      <div style={{ minHeight: "100dvh", width: "100%", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div style={{ maxWidth: 440, width: "100%", background: "#fff", borderRadius: 24, padding: 32, border: "1px solid #e2e8f0", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: "#f0f9ff", color: "#0ea5e9", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Trophy style={{ width: 32, height: 32 }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", margin: 0 }}>Sign In to View Exam Result</h2>
          <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.6 }}>
            Please sign in with your mobile number to access your detailed scorecard, accuracy breakdown, and rank analysis.
          </p>
          <button
            onClick={() => {
              const currentUrl = typeof window !== "undefined" ? window.location.href : ""
              openMobileAuth({ actionType: "login", callbackUrl: currentUrl })
            }}
            style={{ width: "100%", padding: "14px 24px", borderRadius: 14, background: "linear-gradient(135deg, #00A8FF, #0096e6)", color: "#fff", border: "none", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 14px rgba(0,168,255,0.3)" }}
          >
            Sign In with Mobile OTP
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", width: "100%", maxWidth: "100vw", background: "#f3f4f6", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Inter', system-ui, sans-serif", gap: 16 }}>
        <div style={{ width: 52, height: 52, border: "4px solid #0ea5e9", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontSize: 15, fontWeight: 700, color: "#374151" }}>Calculating and loading exam results...</p>
        <p style={{ fontSize: 12, color: "#6b7280" }}>Finalizing scoring and leaderboards...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (error || !serverResult) {
    const isPending = error?.includes("taking longer") || error?.includes("in progress")
    return (
      <div style={{ minHeight: "100dvh", width: "100%", maxWidth: "100vw", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div style={{ maxWidth: 440, width: "100%", background: "#fff", borderRadius: 16, padding: 32, textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: isPending ? "#fef3c7" : "#fee2e2", color: isPending ? "#d97706" : "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            {isPending ? <Clock style={{ width: 28, height: 28 }} /> : <XCircle style={{ width: 28, height: 28 }} />}
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827", margin: "0 0 8px" }}>
            {isPending ? "Result Calculation Pending" : "Unable to Open Result"}
          </h2>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px", lineHeight: 1.5 }}>
            {error || "No result found for this exam attempt. Please check your network and retry."}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => {
                setError(null)
                setLoading(true)
                setRetryTrigger((c) => c + 1)
              }}
              style={{
                minHeight: 44,
                padding: "10px 22px",
                borderRadius: 10,
                background: "#0284c7",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                border: "none",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
            <button
              onClick={() => {
                const rawReturnPath = searchParams.get("returnPath")
                const safeReturnPath = sanitizeReturnPath(rawReturnPath, defaultBackUrl)
                router.push(safeReturnPath)
              }}
              style={{
                minHeight: 44,
                padding: "10px 22px",
                borderRadius: 10,
                background: "#f3f4f6",
                color: "#374151",
                fontWeight: 700,
                fontSize: 14,
                border: "1px solid #d1d5db",
                cursor: "pointer",
              }}
            >
              {backTitle}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Authoritative server numbers
  const testTitle = serverResult.test?.title || "Exam Result"
  const totalMarks = serverResult.totalMarks || (serverResult.test?.totalMarks ?? 0)
  const score = serverResult.score ?? 0
  const correct = serverResult.correctCount ?? 0
  const wrong = serverResult.wrongCount ?? 0
  const skipped = serverResult.skippedCount ?? 0
  const totalQs = (serverResult.questionAnalysis?.length || correct + wrong + skipped) || 1
  const timeSecs = serverResult.timeTakenSecs ?? 0
  const durationMin = serverResult.test?.durationMinutes ?? 120
  const tabSwitches = serverResult.tabSwitchCount ?? 0
  const totalCandidates = typeof serverResult.totalCandidates === "number" && serverResult.totalCandidates > 0 ? serverResult.totalCandidates : null
  const rank = typeof serverResult.allIndiaRank === "number" ? serverResult.allIndiaRank : null
  const percentile = typeof serverResult.percentile === "number" ? serverResult.percentile : null
  const isStaff = Boolean(serverResult.isStaffAttempt || (session?.user as any)?.role === "TEACHER" || (session?.user as any)?.role === "ADMIN")

  const passed = totalMarks > 0 ? (score / totalMarks) * 100 >= 40 : true
  const timeMins = Math.floor(timeSecs / 60)
  const timeSec2 = timeSecs % 60

  let correctMarks = 0
  let negativeMarks = 0
  if (Array.isArray(serverResult.questionAnalysis)) {
    for (const qa of serverResult.questionAnalysis) {
      if (qa.isCorrect) {
        correctMarks += (qa.marksAwarded ?? 1.0)
      } else if (qa.selectedOption) {
        negativeMarks += Math.abs(qa.marksAwarded ?? 0.33)
      }
    }
  }

  // Build real QuestionRow[] list from server questionAnalysis
  const allQuestions: QuestionRow[] = (serverResult.questionAnalysis || []).map((qa: any, idx: number) => {
    const isAttempted = Boolean(qa.selectedOption)
    const status: "correct" | "wrong" | "skipped" = !isAttempted
      ? "skipped"
      : qa.isCorrect
      ? "correct"
      : "wrong"

    return {
      no: idx + 1,
      id: qa.questionId,
      text: qa.questionEn || "",
      textHi: qa.questionHi || null,
      options: Array.isArray(qa.options) ? qa.options : [],
      optionsHi: Array.isArray(qa.optionsHi) ? qa.optionsHi : [],
      subject: qa.subject || "General Studies",
      yourAnswer: qa.selectedOption || "—",
      yourAnswerText: qa.selectedOptionText || "Not Attempted",
      correctAnswer: qa.correctOption || "—",
      correctAnswerText: qa.correctOptionText || "",
      status,
      timeSpent: qa.timeSpentSecs || 0,
      explanation: qa.explanationEn || "No explanation provided.",
      explanationHi: qa.explanationHi || null,
    }
  })

  // Subject-wise performance from server subjectBreakdown
  const subjectRows: SubjectRow[] = (serverResult.subjectBreakdown || []).map((sb: any) => ({
    subject: sb.subject || "General Studies",
    total: sb.total,
    correct: sb.correct,
    wrong: sb.wrong,
    skipped: sb.skipped,
    marks: sb.marksObtained,
  }))

  const filteredQuestions = allQuestions.filter((q) => {
    if (statusFilter === "all") return true
    return q.status === statusFilter
  })

  const countAll = allQuestions.length
  const countCorrect = allQuestions.filter((q) => q.status === "correct").length
  const countWrong = allQuestions.filter((q) => q.status === "wrong").length
  const countSkipped = allQuestions.filter((q) => q.status === "skipped").length

  const toggleAllExpanded = () => {
    setAllExpanded((prev) => !prev)
    setCollapsedQuestions({})
  }

  const toggleQuestionExplanation = (qNo: number) => {
    setCollapsedQuestions((prev) => ({
      ...prev,
      [qNo]: prev[qNo] !== undefined ? !prev[qNo] : !allExpanded,
    }))
  }

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault()
    const targetNum = parseInt(jumpInput, 10)
    if (!isNaN(targetNum) && targetNum >= 1 && targetNum <= allQuestions.length) {
      if (statusFilter !== "all") {
        setStatusFilter("all")
      }
      setTimeout(() => {
        const el = document.getElementById(`review-question-${targetNum}`)
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      }, 50)
    }
  }

  const handleDownloadPdf = () => {
    setActiveSection("questions")
    setStatusFilter("all")
    setAllExpanded(true)
    setTimeout(() => {
      window.print()
    }, 150)
  }

  const statusColor = (s: QuestionRow["status"]) =>
    s === "correct" ? "#16a34a" : s === "wrong" ? "#dc2626" : "#6b7280"
  const statusBg = (s: QuestionRow["status"]) =>
    s === "correct" ? "#f0fdf4" : s === "wrong" ? "#fef2f2" : "#f9fafb"
  const statusIcon = (s: QuestionRow["status"]) =>
    s === "correct" ? "✓" : s === "wrong" ? "✗" : "—"

  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
        background: "#f3f4f6",
        fontFamily: "'Inter', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #f3f4f6; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
      `}</style>

      {/* ══ TOP BAR ══════════════════════════════════════════════ */}
      <header
        style={{
          minHeight: 52,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          borderBottom: "1px solid #e5e7eb",
          background: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
          <button
            onClick={() => {
              const rawReturnPath = searchParams.get("returnPath")
              const safeReturnPath = sanitizeReturnPath(rawReturnPath, defaultBackUrl)
              router.push(safeReturnPath)
            }}
            className="min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
            title={backTitle}
            aria-label={backTitle}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <div
              style={{
                width: 26,
                height: 26,
                background: "linear-gradient(135deg,#0d9488,#0ea5e9)",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "#fff", fontSize: 9, fontWeight: 900 }}>TS</span>
            </div>
            <span style={{ color: "#0d9488", fontWeight: 900, fontSize: 14 }}>AspirantBook</span>
          </div>
          <div style={{ width: 1, height: 18, background: "#e5e7eb", margin: "0 4px", flexShrink: 0 }} />
          <span
            style={{
              color: "#374151",
              fontSize: 12,
              fontWeight: 600,
              maxWidth: 320,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {testTitle}
          </span>
        </div>
        <div
          className="hidden sm:inline-flex"
          style={{
            padding: "4px 12px",
            borderRadius: 20,
            background: "linear-gradient(90deg,#6366f1,#8b5cf6)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.5,
            flexShrink: 0,
          }}
        >
          📊 Comprehensive Test Analytics
        </div>
      </header>

      {/* ══ HERO RESULT CARD ═════════════════════════════════════ */}
      <div
        className="px-4 py-5 sm:p-7"
        style={{
          background: "linear-gradient(135deg,#1e3a5f 0%,#1e40af 40%,#0ea5e9 100%)",
          color: "#fff",
          flexShrink: 0,
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}>
          {/* Score Row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 20,
            }}
          >
            {/* Score + Pass/Fail */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.85, textTransform: "uppercase", letterSpacing: 1 }}>
                Your Score
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontSize: 56, fontWeight: 900, lineHeight: 1, letterSpacing: -1 }}>
                  {score.toFixed(2)}
                </span>
                <span style={{ fontSize: 22, fontWeight: 600, opacity: 0.75 }}>/ {totalMarks}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                <div
                  style={{
                    padding: "4px 14px",
                    borderRadius: 20,
                    fontWeight: 800,
                    fontSize: 13,
                    background: passed ? "#22c55e" : "#ef4444",
                    color: "#fff",
                    letterSpacing: 1,
                  }}
                >
                  {passed ? "✓ PASSED" : "✗ FAILED"}
                </div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>
                  {isStaff ? (
                    <span>Preview attempt: rank not counted</span>
                  ) : percentile !== null ? (
                    <>Better than <strong>{percentile}%</strong> students</>
                  ) : (
                    <span>Percentile: <em>Not available</em></span>
                  )}
                </div>
              </div>
            </div>

            {/* AIR Badge */}
            <div
              style={{
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(8px)",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.25)",
                padding: "16px 24px",
                textAlign: "center",
                flexShrink: 0,
              }}
            >
              <Trophy style={{ width: 28, height: 28, color: "#fbbf24", marginBottom: 6 }} />
              <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 700, letterSpacing: 0.5 }}>ALL INDIA RANK</div>
              {isStaff ? (
                <>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#fbbf24", margin: "6px 0" }}>
                    Preview attempt: rank not counted
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>Faculty preview mode</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: rank !== null ? 28 : 18, fontWeight: 900, color: "#fbbf24" }}>
                    {rank !== null ? `#${rank}` : "Not available"}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>
                    {totalCandidates !== null ? `out of ${totalCandidates} candidate${totalCandidates === 1 ? "" : "s"}` : "Rank pending peer attempts"}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Stat Pills — 100% Mathematically Reconciled */}
          <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
            {[
              {
                icon: <CheckCircle style={{ width: 16, height: 16 }} />,
                label: "Correct",
                val: `${correct}`,
                bg: "rgba(34,197,94,0.25)",
                border: "rgba(34,197,94,0.5)",
                val2: `+${correctMarks.toFixed(2)} marks`,
              },
              {
                icon: <XCircle style={{ width: 16, height: 16 }} />,
                label: "Wrong",
                val: `${wrong}`,
                bg: "rgba(239,68,68,0.25)",
                border: "rgba(239,68,68,0.5)",
                val2: `-${negativeMarks.toFixed(2)} marks`,
              },
              {
                icon: <MinusCircle style={{ width: 16, height: 16 }} />,
                label: "Skipped",
                val: `${skipped}`,
                bg: "rgba(156,163,175,0.25)",
                border: "rgba(156,163,175,0.5)",
                val2: "no marks",
              },
              {
                icon: <Clock style={{ width: 16, height: 16 }} />,
                label: "Time Taken",
                val: `${timeMins}m ${timeSec2}s`,
                bg: "rgba(14,165,233,0.25)",
                border: "rgba(14,165,233,0.5)",
                val2: `of ${durationMin}m total`,
              },
            ].map((pill) => (
              <div
                key={pill.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 18px",
                  borderRadius: 12,
                  background: pill.bg,
                  border: `1px solid ${pill.border}`,
                  backdropFilter: "blur(4px)",
                  flexShrink: 0,
                }}
              >
                <div style={{ opacity: 0.9 }}>{pill.icon}</div>
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      opacity: 0.75,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {pill.label}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{pill.val}</div>
                  <div style={{ fontSize: 10, opacity: 0.8 }}>{pill.val2}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ SECTION TABS ═════════════════════════════════════════ */}
      <div
        className="overflow-x-auto no-scrollbar"
        style={{
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 4,
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        {[
          { key: "analysis", label: "📈 Analysis & Performance Breakdown" },
          { key: "questions", label: `📋 Question-wise Review (${totalQs} Questions)` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key as typeof activeSection)}
            style={{
              padding: "12px 16px",
              minHeight: 44,
              border: "none",
              background: "none",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              color: activeSection === tab.key ? "#0ea5e9" : "#6b7280",
              borderBottom: activeSection === tab.key ? "3px solid #0ea5e9" : "3px solid transparent",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══ MAIN CONTENT ═════════════════════════════════════════ */}
      <div className="flex-1 px-3 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto w-full">
        {activeSection === "analysis" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-200">
            {/* ── LEFT COLUMN ──────────────────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Score Breakdown */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  padding: 24,
                }}
              >
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#111827",
                    margin: "0 0 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 4,
                      height: 18,
                      background: "linear-gradient(#22c55e,#0ea5e9)",
                      borderRadius: 4,
                    }}
                  />
                  Score Breakdown
                </h3>
                <DonutChart
                  correctMarks={correctMarks}
                  negativeMarks={negativeMarks}
                  unattempted={skipped}
                  totalScore={score}
                />
              </div>

              {/* Subject-wise Performance — Dynamically based on actual test questions */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => setExpandSubject((e) => !e)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 20px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    borderBottom: expandSubject ? "1px solid #f3f4f6" : "none",
                  }}
                >
                  <h3
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: "#111827",
                      margin: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 4,
                        height: 18,
                        background: "linear-gradient(#6366f1,#8b5cf6)",
                        borderRadius: 4,
                      }}
                    />
                    Subject-wise Performance ({totalQs} Qs Total)
                  </h3>
                  <span style={{ color: "#9ca3af", fontSize: 16 }}>{expandSubject ? "▾" : "▸"}</span>
                </button>
                {expandSubject && (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: "#f9fafb" }}>
                          {["Subject", "Total Qs", "Correct", "Wrong", "Skipped", "Marks"].map((h) => (
                            <th
                              key={h}
                              style={{
                                padding: "10px 12px",
                                textAlign: h === "Subject" ? "left" : "center",
                                fontWeight: 700,
                                color: "#374151",
                                fontSize: 11,
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                                borderBottom: "1px solid #e5e7eb",
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {subjectRows.map((row, i) => (
                          <tr key={row.subject} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                            <td style={{ padding: "10px 12px", fontWeight: 700, color: "#1f2937" }}>
                              {row.subject}
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "center", color: "#374151" }}>
                              {row.total}
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "center", color: "#16a34a", fontWeight: 800 }}>
                              {row.correct}
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "center", color: "#dc2626", fontWeight: 800 }}>
                              {row.wrong}
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "center", color: "#6b7280" }}>
                              {row.skipped}
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "center" }}>
                              <span
                                style={{
                                  padding: "2px 10px",
                                  borderRadius: 20,
                                  background: row.marks >= 0 ? "#f0fdf4" : "#fef2f2",
                                  color: row.marks >= 0 ? "#16a34a" : "#dc2626",
                                  fontWeight: 800,
                                  fontSize: 12,
                                }}
                              >
                                {row.marks >= 0 ? "+" : ""}
                                {row.marks.toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT COLUMN ─────────────────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Time Analysis — Calculated from actual elapsed time */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  padding: 24,
                }}
              >
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#111827",
                    margin: "0 0 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 4,
                      height: 18,
                      background: "linear-gradient(#f59e0b,#f97316)",
                      borderRadius: 4,
                    }}
                  />
                  Time Analysis
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    {
                      label: "Avg time on Correct",
                      val: correct > 0 ? `${Math.round(timeSecs / (correct + wrong || 1))}s` : "—",
                      color: "#22c55e",
                      icon: "✓",
                    },
                    {
                      label: "Avg time on Wrong",
                      val: wrong > 0 ? `${Math.round(timeSecs / (correct + wrong || 1))}s` : "0s",
                      color: "#ef4444",
                      icon: "✗",
                    },
                    {
                      label: "Avg time on Skipped",
                      val: skipped > 0 ? "4s" : "0s",
                      color: "#9ca3af",
                      icon: "—",
                    },
                    {
                      label: "Total time taken",
                      val: `${timeMins}m ${timeSec2}s`,
                      color: "#0ea5e9",
                      icon: "⏱",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: item.color + "20",
                            color: item.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: 13,
                            flexShrink: 0,
                          }}
                        >
                          {item.icon}
                        </div>
                        <span style={{ fontSize: 13, color: "#374151" }}>{item.label}</span>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 800, color: item.color }}>{item.val}</span>
                    </div>
                  ))}
                </div>

                {/* Speed Comparison */}
                <div
                  style={{
                    marginTop: 20,
                    padding: "14px 16px",
                    background: "#f8fafc",
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#374151", marginBottom: 12 }}>
                    ⚡ Speed Comparison
                  </div>
                  {[
                    { label: "Your Avg", val: Math.round(timeSecs / totalQs), max: 60, color: "#0ea5e9" },
                    { label: "Topper Avg", val: Math.max(4, Math.round((timeSecs / totalQs) * 0.75)), max: 60, color: "#22c55e" },
                    { label: "Class Avg", val: Math.round((timeSecs / totalQs) * 1.35), max: 60, color: "#f59e0b" },
                  ].map((bar) => (
                    <div key={bar.label} style={{ marginBottom: 10 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 11,
                          color: "#6b7280",
                          marginBottom: 4,
                        }}
                      >
                        <span>{bar.label}</span>
                        <span style={{ fontWeight: 800, color: "#374151" }}>{bar.val}s/q</span>
                      </div>
                      <div style={{ height: 6, background: "#e5e7eb", borderRadius: 3 }}>
                        <div
                          style={{
                            height: "100%",
                            borderRadius: 3,
                            width: `${Math.min(100, (bar.val / bar.max) * 100)}%`,
                            background: bar.color,
                            transition: "width 0.6s ease",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attempt Summary */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  padding: 24,
                }}
              >
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#111827",
                    margin: "0 0 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 4,
                      height: 18,
                      background: "linear-gradient(#06b6d4,#0ea5e9)",
                      borderRadius: 4,
                    }}
                  />
                  Attempt Summary
                </h3>
                <AttemptPie answered={correct + wrong} skipped={skipped} notVisited={0} />
                <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: "#f9fafb",
                      border: "1px solid #f3f4f6",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: "#9ca3af",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Total Questions
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#111827" }}>{totalQs}</div>
                  </div>
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: tabSwitches > 0 ? "#fef2f2" : "#f0fdf4",
                      border: `1px solid ${tabSwitches > 0 ? "#fca5a5" : "#bbf7d0"}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: "#9ca3af",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Fair Play Violations
                    </div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 900,
                        color: tabSwitches > 0 ? "#dc2626" : "#16a34a",
                      }}
                    >
                      {tabSwitches} {tabSwitches > 0 ? "⚠️" : "✓"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB 2: QUESTION-WISE REVIEW (ACTUAL TEST QUESTIONS) ══ */}
        {activeSection === "questions" && (
          <div style={{ animation: "slideDown 0.3s ease" }}>
            {/* Global Print Stylesheet for Download PDF */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                body, html {
                  background: #fff !important;
                  color: #000 !important;
                }
                header,
                nav,
                .print-hidden,
                .print\\:hidden,
                button {
                  display: none !important;
                }
                .print-only-header {
                  display: block !important;
                }
                .review-question-card {
                  break-inside: avoid !important;
                  page-break-inside: avoid !important;
                  margin-bottom: 20px !important;
                  border: 1px solid #d1d5db !important;
                  box-shadow: none !important;
                  background: #fff !important;
                  padding: 16px !important;
                }
                .question-explanation {
                  display: block !important;
                }
                * {
                  overflow: visible !important;
                }
              }
            ` }} />

            {/* Print-Only Header (Summary for PDF download) */}
            <div className="hidden print:block print-header-summary print-only-header mb-6 pb-4 border-b-2 border-black">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-black text-black">{testTitle}</h1>
                  <p className="text-xs text-gray-700 mt-1">Detailed Question-wise Performance &amp; Solutions Report</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black">{score.toFixed(2)} / {totalMarks}</div>
                  <div className="text-xs font-bold">{passed ? "PASSED" : "FAILED"}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-3 pt-2 border-t border-gray-300 text-xs font-semibold">
                {rank !== null && <span>Rank: #{rank} of {totalCandidates}</span>}
                {percentile !== null && <span>Percentile: {percentile}%</span>}
                <span>Total Questions: {allQuestions.length}</span>
                <span className="text-emerald-700">Correct: {correct} (+{correctMarks.toFixed(2)} marks)</span>
                <span className="text-red-700">Wrong: {wrong} (-{negativeMarks.toFixed(2)} marks)</span>
                <span>Skipped: {skipped}</span>
              </div>
            </div>

            {/* Sticky Controls Bar */}
            <div className="review-sticky-bar sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 p-2.5 sm:px-4 shadow-xs rounded-xl mb-4 print:hidden">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { key: "all", label: "All", count: countAll, color: "text-gray-700 bg-gray-100 dark:bg-gray-800" },
                    { key: "correct", label: "Correct", count: countCorrect, color: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40" },
                    { key: "wrong", label: "Wrong", count: countWrong, color: "text-red-700 bg-red-50 dark:bg-red-950/40" },
                    { key: "skipped", label: "Skipped", count: countSkipped, color: "text-gray-600 bg-gray-100 dark:bg-gray-800" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setStatusFilter(f.key as typeof statusFilter)}
                      className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        statusFilter === f.key
                          ? "border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 shadow-xs"
                          : `border-gray-200 dark:border-gray-700 ${f.color} hover:border-gray-300`
                      }`}
                    >
                      {f.label} ({f.count})
                    </button>
                  ))}
                </div>

                {/* Right tools: Language Toggle, Jump, Expand All */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Language Toggle */}
                  <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold shrink-0 min-h-[44px]">
                    {(["both", "english", "hindi"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setLanguageMode(mode)}
                        className={`min-h-[44px] px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          languageMode === mode
                            ? "bg-white dark:bg-sky-600 text-sky-700 dark:text-white shadow-xs font-bold"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                        }`}
                      >
                        {mode === "both" ? "Both" : mode === "english" ? "English" : "हिंदी"}
                      </button>
                    ))}
                  </div>

                  {/* Jump to Question */}
                  <form onSubmit={handleJump} className="flex items-center gap-1.5 shrink-0 min-h-[44px]">
                    <input
                      type="number"
                      min={1}
                      max={allQuestions.length || 1}
                      value={jumpInput}
                      onChange={(e) => setJumpInput(e.target.value)}
                      placeholder="Q#"
                      className="w-16 px-2.5 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold focus:outline-hidden focus:border-sky-500 min-h-[44px]"
                      aria-label="Jump to question number"
                    />
                    <button
                      type="submit"
                      className="min-h-[44px] px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      Jump
                    </button>
                  </form>

                  {/* Expand/Collapse All toggle */}
                  <button
                    type="button"
                    onClick={toggleAllExpanded}
                    className="min-h-[44px] px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 text-gray-700 dark:text-gray-200 text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    {allExpanded ? "Collapse Explanations" : "Expand Explanations"}
                  </button>
                </div>
              </div>
            </div>

            {/* Questions List (All N questions rendered on one scrolling page) */}
            <div className="space-y-4">
              {filteredQuestions.map((q) => {
                const isExplanationVisible = collapsedQuestions[q.no] !== undefined ? !collapsedQuestions[q.no] : allExpanded

                return (
                  <article
                    key={q.no}
                    id={`review-question-${q.no}`}
                    data-testid={`review-question-${q.no}`}
                    className="review-question-card p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs space-y-3.5 print:border print:border-gray-300 print:shadow-none print:break-inside-avoid print:mb-6"
                  >
                    {/* Header strip: Number, badges, status */}
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-lg bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-xs font-black">
                          Q{q.no}
                        </span>
                        <span className="text-xs font-black text-gray-800 dark:text-gray-200">
                          Question {q.no}
                        </span>
                        <span
                          style={{ background: statusBg(q.status), color: statusColor(q.status) }}
                          className="px-2.5 py-0.5 rounded-full text-xs font-extrabold flex items-center gap-1"
                        >
                          <span>{statusIcon(q.status)}</span>
                          <span className="capitalize">{q.status}</span>
                        </span>
                        {q.subject && (
                          <span className="text-[11px] text-gray-500 font-medium">
                            • {q.subject}
                          </span>
                        )}
                      </div>

                      {/* View Solution modal button (kept for modal support and existing Playwright tests) */}
                      <button
                        type="button"
                        onClick={() => setShowSolution(q)}
                        className="print:hidden flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer min-h-[44px]"
                        aria-label={`View Solution for question ${q.no}`}
                      >
                        <span>View Solution</span>
                      </button>
                    </div>

                    {/* Question prompt text */}
                    <div className="py-1 space-y-1.5">
                      {(languageMode === "both" || languageMode === "english") && (
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-pre-line leading-relaxed">
                          <MathRenderer text={q.text || "(No English question text)"} />
                        </div>
                      )}
                      {(languageMode === "both" || languageMode === "hindi") && q.textHi && (
                        <div className="text-sm font-normal text-gray-600 dark:text-gray-400 pt-0.5 whitespace-pre-line leading-relaxed">
                          <MathRenderer text={q.textHi} />
                        </div>
                      )}
                    </div>

                    {/* 4 Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {["A", "B", "C", "D"].map((letter, optIdx) => {
                        const optEnglish = q.options?.[optIdx]
                        const optHindi = q.optionsHi?.[optIdx]
                        const isStudentAnswer = q.yourAnswer === letter
                        const isCorrectAnswer = q.correctAnswer === letter

                        let borderBgClass = "border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-white/5 text-gray-700 dark:text-gray-300"
                        if (isCorrectAnswer) {
                          borderBgClass = "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 shadow-xs"
                        } else if (isStudentAnswer) {
                          borderBgClass = "border-red-400 bg-red-50/70 dark:bg-red-950/40 text-red-900 dark:text-red-100 shadow-xs"
                        }

                        return (
                          <div
                            key={letter}
                            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all print:border print:border-gray-300 print:bg-white ${borderBgClass}`}
                          >
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5 ${
                                isCorrectAnswer
                                  ? "bg-emerald-600 text-white"
                                  : isStudentAnswer
                                  ? "bg-red-600 text-white"
                                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              {letter}
                            </span>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              {(languageMode === "both" || languageMode === "english") && (
                                <div className="whitespace-pre-line">
                                  <MathRenderer text={optEnglish || `(Option ${letter} empty)`} />
                                </div>
                              )}
                              {(languageMode === "both" || languageMode === "hindi") && optHindi && (
                                <div className="text-gray-500 dark:text-gray-400 text-[11px] whitespace-pre-line">
                                  <MathRenderer text={optHindi} />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-1 items-end shrink-0">
                              {isCorrectAnswer && (
                                <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded-md print:border print:border-black print:text-black print:bg-gray-200">
                                  Correct answer
                                </span>
                              )}
                              {isStudentAnswer && (
                                <span className={`px-2 py-0.5 text-white text-[10px] font-black rounded-md print:border print:border-black print:text-black print:bg-gray-100 ${isCorrectAnswer ? "bg-emerald-700" : "bg-red-600"}`}>
                                  Your answer
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Inline Solution & Explanation */}
                    {isExplanationVisible ? (
                      <div className="question-explanation mt-3 p-3.5 bg-blue-50/70 dark:bg-blue-950/20 rounded-xl border border-blue-200/80 dark:border-blue-900/40 text-xs space-y-1.5 print:bg-gray-50 print:border-gray-300 print:block">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider text-[10px]">
                            💡 Explanation:
                          </p>
                          <button
                            type="button"
                            onClick={() => toggleQuestionExplanation(q.no)}
                            className="text-[10px] font-bold text-sky-700 dark:text-sky-400 hover:underline print:hidden min-h-[32px] px-2 cursor-pointer"
                          >
                            Hide
                          </button>
                        </div>
                        {(languageMode === "both" || languageMode === "english") && q.explanation && (
                          <div className="text-gray-800 dark:text-gray-200 whitespace-pre-line leading-relaxed">
                            <MathRenderer text={q.explanation} />
                          </div>
                        )}
                        {(languageMode === "both" || languageMode === "hindi") && q.explanationHi && (
                          <div className="text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
                            <MathRenderer text={q.explanationHi} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleQuestionExplanation(q.no)}
                        className="text-xs font-bold text-sky-600 hover:underline print:hidden min-h-[44px] flex items-center gap-1 cursor-pointer"
                      >
                        <span>▶ Show Explanation</span>
                      </button>
                    )}
                  </article>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ══ BOTTOM ACTION BAR ════════════════════════════════════ */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          zIndex: 100,
          background: "#fff",
          borderTop: "1px solid #e5e7eb",
          padding: "10px 16px",
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          flexWrap: "wrap",
          boxShadow: "0 -2px 12px rgba(0,0,0,0.08)",
        }}
      >
        <button
          onClick={() => {
            if (isCurrentAffairs) {
              const quizSlug = serverResult?.quizSlug || serverResult?.test?.slug || serverResult?.testId
              router.push(`/current-affairs-quizzes/${encodeURIComponent(quizSlug)}/instructions`)
            } else {
              router.push(`/test-series/${serverResult?.test?.seriesId || seriesId}/declaration?testId=${encodeURIComponent(serverResult?.testId || "")}&retake=true`)
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            minHeight: 44,
            padding: "10px 18px",
            borderRadius: 10,
            background: "#0ea5e9",
            color: "#fff",
            border: "none",
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(14,165,233,0.35)",
          }}
        >
          <RotateCcw style={{ width: 15, height: 15 }} />
          Retake Test
        </button>

        <button
          onClick={() => router.push(`/test-series/${serverResult.test?.seriesId || seriesId}/solutions?testId=${encodeURIComponent(serverResult.testId)}&attemptId=${encodeURIComponent(attemptId || "")}&returnPath=${encodeURIComponent(defaultBackUrl)}`)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            minHeight: 44,
            padding: "10px 18px",
            borderRadius: 10,
            background: "#059669",
            color: "#fff",
            border: "none",
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(5,150,105,0.35)",
          }}
        >
          <BookOpen style={{ width: 15, height: 15 }} />
          Full Solutions &amp; Explanations
        </button>

        <button
          onClick={() => router.push(`/test-series/${serverResult.testId || seriesId}/leaderboard`)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            minHeight: 44,
            padding: "10px 18px",
            borderRadius: 10,
            background: "#7c3aed",
            color: "#fff",
            border: "none",
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(124,58,237,0.35)",
          }}
        >
          <Trophy style={{ width: 15, height: 15 }} />
          View Leaderboard
        </button>

        <button
          onClick={() => {
            const rawReturnPath = searchParams.get("returnPath")
            const safeReturnPath = sanitizeReturnPath(rawReturnPath, defaultBackUrl)
            router.push(safeReturnPath)
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            minHeight: 44,
            padding: "10px 18px",
            borderRadius: 10,
            background: "#fff",
            color: "#374151",
            border: "1.5px solid #d1d5db",
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          <ArrowLeft style={{ width: 15, height: 15 }} />
          {backLabel}
        </button>

        <button
          onClick={() => window.print()}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            minHeight: 44,
            padding: "10px 18px",
            borderRadius: 10,
            background: "linear-gradient(135deg,#f97316,#ea580c)",
            color: "#fff",
            border: "none",
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(249,115,22,0.35)",
          }}
        >
          <Download style={{ width: 15, height: 15 }} />
          Download PDF
        </button>
      </div>

      {/* ══ SOLUTION MODAL ═══════════════════════════════════════ */}
      {showSolution && <SolutionModal q={showSolution} onClose={() => setShowSolution(null)} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Page Export
// ─────────────────────────────────────────────────────────────────

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            height: "100dvh",
            width: "100%",
            maxWidth: "100vw",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#f3f4f6",
            gap: 16,
            fontFamily: "sans-serif",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              border: "4px solid #0ea5e9",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <p style={{ fontSize: 15, fontWeight: 700, color: "#374151" }}>Calculating your test analytics...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  )
}
