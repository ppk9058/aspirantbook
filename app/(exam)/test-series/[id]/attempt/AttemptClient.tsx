"use client"

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react"
import dynamic from "next/dynamic"
import { useSearchParams, useParams, useRouter } from "next/navigation"
import { Flag, FileText, BookOpen, AlertTriangle, X, User, Pause, Play, Maximize2, ShieldAlert, Menu, Grid3X3 } from "lucide-react"
import { useSession } from "next-auth/react"
import { saveExamState, loadExamState, clearExamState } from "@/lib/exam-idb"
import MathRenderer from "@/components/exam/MathRenderer"
import { sanitizeReturnPath } from "@/lib/utils/return-path"

function formatQuestionText(text: string): string {
    if (!text) return ""
    if (text.includes("\n")) return text
    return text
        .replace(/(\s)(1\.\s)/g, "\n\n$2")
        .replace(/(\s)(2\.\s)/g, "\n$2")
        .replace(/(\s)(3\.\s)/g, "\n$3")
        .replace(/(\s)(4\.\s)/g, "\n$4")
        .replace(/(\s)(Which of the statements)/gi, "\n\n$2")
}

/**
 * B-010: exam-flow failures must never disappear into an empty catch.
 * A lost autosave, a blocked fullscreen call or a failed local backup has to
 * leave a diagnosable trail (console) and, when it can cost answers, a visible
 * state in the UI.
 */
function logExamIssue(scope: string, error: unknown) {
    console.error(`[exam-attempt] ${scope}:`, error)
}

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

type QState = "not-visited" | "not-answered" | "answered" | "marked" | "answered-marked"

interface Question {
    id: number
    rawId: string
    text: string
    textHi?: string
    options: string[]
    optionsHi?: string[]
    correctIndex?: number
    subject: string
    explanation?: string
    explanationHi?: string
    positiveMarks?: number
    negativeMarks?: number
    sectionTitle?: string
    sectionId?: string
}

interface Attempt {
    selected: number | null
    state: QState
    marked: boolean
}



// ─────────────────────────────────────────────────────────────────
// Palette color helper — returns CSSProperties
// ─────────────────────────────────────────────────────────────────

function paletteStyle(state: QState, isCurrent: boolean): React.CSSProperties {
    if (isCurrent) return {
        background: "#0ea5e9", color: "#fff",
        border: "2px solid #0284c7", fontWeight: 700
    }
    switch (state) {
        case "answered":        return { background: "#22c55e", color: "#fff", border: "1.5px solid #16a34a", fontWeight: 700 }
        case "not-answered":    return { background: "#ef4444", color: "#fff", border: "1.5px solid #dc2626", fontWeight: 700 }
        case "marked":          return { background: "#9333ea", color: "#fff", border: "1.5px solid #7e22ce", fontWeight: 700 }
        case "answered-marked": return { background: "linear-gradient(135deg,#9333ea 50%,#22c55e 50%)", color: "#fff", border: "1.5px solid #7e22ce", fontWeight: 700 }
        default:                return { background: "#fff", color: "#111827", border: "1.5px solid #d1d5db", fontWeight: 500 }
    }
}

// ─────────────────────────────────────────────────────────────────
// Timer
// ─────────────────────────────────────────────────────────────────

function TimerDisplay({ secs }: { secs: number }) {
    const h = String(Math.floor(secs / 3600)).padStart(2, "0")
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0")
    const s = String(secs % 60).padStart(2, "0")
    const urgent = secs < 300
    const col = urgent ? "#ef4444" : "#111827"
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 12, color: "#6b7280", marginRight: 4, fontWeight: 600 }}>Time Left</span>
            {[h, m, s].map((v, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {i > 0 && <span style={{ color: col, fontWeight: 700, fontSize: 18, margin: "0 1px" }}>:</span>}
                    <div style={{
                        background: urgent ? "#fef2f2" : "#f3f4f6",
                        border: `1px solid ${urgent ? "#fca5a5" : "#e5e7eb"}`,
                        borderRadius: 4, padding: "2px 9px", minWidth: 36,
                        display: "flex", flexDirection: "column", alignItems: "center"
                    }}>
                        <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2, color: col, fontVariantNumeric: "tabular-nums" }}>{v}</span>
                    </div>
                </div>
            ))}
        </div>
    )
}

// Mobile compact single-line timer
function MobileTimerDisplay({ secs }: { secs: number }) {
    const h = Math.floor(secs / 3600)
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0")
    const s = String(secs % 60).padStart(2, "0")
    const urgent = secs < 300
    const timeStr = h > 0 ? `${String(h).padStart(2, "0")}:${m}:${s}` : `${m}:${s}`
    return (
        <span
            style={{
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "0.02em"
            }}
            className={`font-mono text-sm font-bold whitespace-nowrap px-2 py-0.5 rounded ${
                urgent ? "text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800" : "text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            }`}
        >
            {timeStr}
        </span>
    )
}

// ─────────────────────────────────────────────────────────────────
// Legend item
// ─────────────────────────────────────────────────────────────────

function LegendItem({ bg, label, count, isBox = false }: { bg: string; label: string; count: number; isBox?: boolean }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
            <div style={{
                width: isBox ? 22 : 18, height: isBox ? 18 : 18,
                borderRadius: isBox ? 2 : "50%",
                background: bg,
                border: bg === "#fff" ? "1px solid #9ca3af" : "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, color: bg === "#fff" ? "#374151" : "#fff",
                flexShrink: 0
            }}>
                {count}
            </div>
            <span style={{ fontSize: 10.5, color: "#374151", lineHeight: 1.2, wordBreak: "break-word" }}>{label}</span>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────
// Tab Warning Modal (violations 1 & 2)
// ─────────────────────────────────────────────────────────────────

function TabWarningModal({
    count,
    onClose,
}: {
    count: number
    onClose: () => void
}) {
    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 200,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.65)"
        }}>
            <div style={{
                background: "#fff", borderRadius: 16,
                border: "2px solid #ef4444",
                boxShadow: "0 12px 48px rgba(239,68,68,0.25)",
                maxWidth: 400, width: "100%", padding: 28,
                animation: "tabWarn 0.3s ease"
            }}>
                <style>{`@keyframes tabWarn { from { transform: scale(0.88); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
                {/* Banner */}
                <div style={{
                    background: "linear-gradient(135deg,#dc2626,#b91c1c)",
                    borderRadius: 10, padding: "14px 18px",
                    display: "flex", alignItems: "center", gap: 12,
                    marginBottom: 20
                }}>
                    <ShieldAlert style={{ width: 28, height: 28, color: "#fca5a5", flexShrink: 0 }} />
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>⚠️ Tab Switch Detected!</div>
                        <div style={{ fontSize: 12, color: "#fca5a5", marginTop: 2 }}>Fair exam policy violation</div>
                    </div>
                </div>

                <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.65, marginBottom: 20 }}>
                    You have switched tabs or windows. This is{" "}
                    <strong style={{ color: "#dc2626" }}>violation #{count} of 3</strong>.
                    On the 3rd violation, your test will be <strong>automatically submitted</strong>.
                </p>

                {/* Violation dots */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 22 }}>
                    {[1, 2, 3].map(n => (
                        <div key={n} style={{
                            width: 28, height: 28, borderRadius: "50%",
                            background: n <= count ? "#ef4444" : "#e5e7eb",
                            border: `2px solid ${n <= count ? "#dc2626" : "#d1d5db"}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 800,
                            color: n <= count ? "#fff" : "#9ca3af"
                        }}>
                            {n <= count ? "●" : "○"}
                        </div>
                    ))}
                    <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 4 }}>
                        {count}/3 violations
                    </span>
                </div>

                <button
                    onClick={onClose}
                    style={{
                        width: "100%", padding: "12px 0", borderRadius: 10,
                        background: "linear-gradient(135deg,#dc2626,#b91c1c)",
                        color: "#fff", fontWeight: 800, fontSize: 14,
                        border: "none", cursor: "pointer",
                        boxShadow: "0 2px 12px rgba(239,68,68,0.35)"
                    }}
                >
                    I Understand, Return to Test
                </button>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────
// Auto-Submit Modal (violation 3)
// ─────────────────────────────────────────────────────────────────

function AutoSubmitModal({ onViewResults }: { onViewResults: () => void }) {
    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 300,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.75)"
        }}>
            <div style={{
                background: "#fff", borderRadius: 16,
                border: "2px solid #dc2626",
                boxShadow: "0 12px 48px rgba(220,38,38,0.3)",
                maxWidth: 400, width: "100%", padding: 32, textAlign: "center"
            }}>
                <div style={{
                    width: 72, height: 72, borderRadius: "50%",
                    background: "#fef2f2", border: "3px solid #fca5a5",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 20px", fontSize: 28
                }}>
                    ❌
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "#dc2626", margin: "0 0 10px" }}>
                    Test Auto-Submitted
                </h2>
                <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.65, marginBottom: 24 }}>
                    You have violated the fair exam policy <strong>3 times</strong>.
                    Your test has been <strong>automatically submitted</strong> with your current answers.
                </p>
                <div style={{
                    display: "flex", flexDirection: "column", gap: 6,
                    padding: "14px 18px", borderRadius: 10,
                    background: "#fef2f2", border: "1px solid #fca5a5", marginBottom: 22
                }}>
                    <div style={{ fontSize: 12, color: "#dc2626", fontWeight: 700 }}>📋 Violations Recorded</div>
                    <div style={{ fontSize: 12, color: "#374151" }}>
                        3 tab switch violations were detected and logged.
                    </div>
                </div>
                <button
                    onClick={onViewResults}
                    style={{
                        width: "100%", padding: "12px 0", borderRadius: 10,
                        background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                        color: "#fff", fontWeight: 800, fontSize: 14,
                        border: "none", cursor: "pointer",
                        boxShadow: "0 2px 12px rgba(14,165,233,0.35)"
                    }}
                >
                    View My Results →
                </button>
            </div>
        </div>
    )
}

// Helper for fetching with a client-side timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 30000): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
        const res = await fetch(url, { ...options, signal: controller.signal })
        return res
    } catch (err: any) {
        if (err?.name === "AbortError" || err?.message?.includes("aborted")) {
            throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)} seconds. Please check your connection and retry.`)
        }
        throw err
    } finally {
        clearTimeout(timer)
    }
}

// ─────────────────────────────────────────────────────────────────
// ARENA COMPONENT
// ─────────────────────────────────────────────────────────────────

function Arena() {
    const params = useParams()
    const searchParams = useSearchParams()
    const router = useRouter()

    const paramId = (params?.id as string) || ""
    const queryTestId = searchParams.get("testId")
    const testId = queryTestId || paramId
    const [customTestRecord, setCustomTestRecord] = useState<any>(null)
    const seriesId = queryTestId ? paramId : (customTestRecord?.series?.slug || customTestRecord?.seriesId || paramId)
    const urlAttemptId = searchParams.get("attemptId")
    const lang = (searchParams.get("lang") ?? "English") as "English" | "Hindi"

    const [isMounted, setIsMounted] = useState(false)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [retryCount, setRetryCount] = useState(0)
    const [questions, setQuestions] = useState<Question[]>([])

    const [activeAttemptId, setActiveAttemptId] = useState<string | null>(urlAttemptId)
    const [serverDeadline, setServerDeadline] = useState<string | null>(null)
    const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "error">("synced")
    const [localSaveFailed, setLocalSaveFailed] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const testTitle = customTestRecord?.title || "Test Arena"
    const totalQs = questions.length
    const durationMin = customTestRecord?.durationMinutes ?? 120

    const isBpsc = useMemo(() => {
        const checkStr = (s?: string | null) => Boolean(s && /bpsc/i.test(s));
        return (
            checkStr(customTestRecord?.series?.examName) ||
            checkStr(customTestRecord?.series?.category) ||
            checkStr(customTestRecord?.series?.title) ||
            checkStr(customTestRecord?.series?.slug) ||
            checkStr(customTestRecord?.title) ||
            checkStr(customTestRecord?.category)
        );
    }, [customTestRecord]);

    // Attempt key for IndexedDB (unique per attempt or test)
    const attemptKey = activeAttemptId ? `attempt-${activeAttemptId}` : (testId ? `${seriesId}-${testId}` : `${seriesId}-unknown`)

    // ── Session (User candidate info) ───────────────────────────
    const { data: session } = useSession()
    const candidateName = session?.user?.name || "Student"

    // ── Mobile Palette Sheet State ───────────────────────────────
    const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState(false)
    const [showInstructionsModal, setShowInstructionsModal] = useState(false)

    // ── State ────────────────────────────────────────────────────
    const [timeLeft, setTimeLeft] = useState(() => durationMin * 60)
    const [paused, setPaused] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [currentQ, setCurrentQ] = useState(0)
    const [viewLang, setViewLang] = useState<"English" | "Hindi">(lang)
    const [showSubmitModal, setShowSubmitModal] = useState(false)
    const [showReportModal, setShowReportModal] = useState(false)
    const [showQPaper, setShowQPaper] = useState(false)
    const [showExitConfirmModal, setShowExitConfirmModal] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const wakeLockRef = useRef<any>(null)

    // ── Anti-Cheat State ─────────────────────────────────────────
    const [tabSwitchCount, setTabSwitchCount] = useState(0)
    const [showTabWarningModal, setShowTabWarningModal] = useState(false)
    const [showAutoSubmitModal, setShowAutoSubmitModal] = useState(false)

    // ── Debounce & Sync refs ────────────────────────────────────
    const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
    const syncTimerRef = useRef<NodeJS.Timeout | null>(null)
    const lastSyncedAnswersRef = useRef<Map<string, { selectedOption: string | null; isMarked: boolean }>>(new Map())
    const syncSeqRef = useRef<number>(0)
    const isSyncingRef = useRef<boolean>(false)
    const pendingSyncRef = useRef<boolean>(false)
    const currentAttemptsRef = useRef<Record<number, Attempt>>({})
    const tabSwitchCountRef = useRef<number>(0)
    const activeAttemptIdRef = useRef<string | null>(null)
    const submissionPendingRef = useRef<boolean>(false)
    const serverOffsetRef = useRef<number>(0)

    // Stable tracking refs for timer, submission, and per-question time
    const timeLeftRef = useRef<number>(durationMin * 60)
    const currentQRef = useRef<number>(0)
    const questionsRef = useRef<Question[]>([])
    const questionTimesRef = useRef<Record<number, number>>({})
    const performSubmitRef = useRef<((currentAttempts?: Record<number, Attempt>) => Promise<void>) | null>(null)
    const hasInitializedRef = useRef<boolean>(false)

    // Per-question time spent tracking
    const [questionTimeSpent, setQuestionTimeSpent] = useState<Record<number, number>>({})

    // ── Attempts ─────────────────────────────────────────────────
    const [attempts, setAttempts] = useState<Record<number, Attempt>>({})

    useEffect(() => {
        currentAttemptsRef.current = attempts
    }, [attempts])

    useEffect(() => {
        tabSwitchCountRef.current = tabSwitchCount
    }, [tabSwitchCount])

    useEffect(() => {
        activeAttemptIdRef.current = activeAttemptId
    }, [activeAttemptId])

    useEffect(() => {
        timeLeftRef.current = timeLeft
    }, [timeLeft])

    useEffect(() => {
        currentQRef.current = currentQ
    }, [currentQ])

    useEffect(() => {
        questionsRef.current = questions
    }, [questions])

    const currentQuestion = questions[currentQ]
    const curAttempt = currentQuestion ? attempts[currentQuestion.id] : undefined

    // ── Exit Fullscreen Gracefully ───────────────────────────────
    const safeExitFullscreen = async () => {
        try {
            if (typeof document !== "undefined" && document.fullscreenElement) {
                await document.exitFullscreen()
            }
        } catch (error) {
            // Expected on iOS Safari and when fullscreen is blocked by policy.
            logExamIssue("exit fullscreen", error)
        }
    }

    // ── Submit exam to server (with resilience & offline queue) ───
    const performSubmit = useCallback(async (currentAttemptsOverride?: Record<number, Attempt>) => {
        const attId = activeAttemptIdRef.current || activeAttemptId
        if (!attId) return
        setSubmitting(true)
        setSubmitError(null)
        if (timerRef.current) clearInterval(timerRef.current)
        setSubmitted(true)
        submissionPendingRef.current = true

        const currentAttempts = currentAttemptsOverride || currentAttemptsRef.current
        const currentQuestions = questionsRef.current
        const currentQTimes = questionTimesRef.current
        const elapsedSecs = Math.max(1, durationMin * 60 - timeLeftRef.current)

        const answersPayload = currentQuestions.map((q) => {
            const att = currentAttempts[q.id]
            const selectedOption =
                att?.selected !== null && att?.selected !== undefined
                    ? (["A", "B", "C", "D"][att.selected] as "A" | "B" | "C" | "D")
                    : null
            return {
                questionId: q.rawId,
                selectedOption,
                isMarked: att?.marked ?? false,
                timeSpentSecs: Math.max(0, currentQTimes[q.id] ?? Math.round(elapsedSecs / (currentQuestions.length || 1))),
            }
        })

        try {
            const res = await fetch(`/api/exam/attempt/${encodeURIComponent(attId)}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    answers: answersPayload,
                }),
            })

            if (!res.ok) {
                const errData = await res.json().catch((parseError) => {
                    logExamIssue("submit response was not valid JSON", parseError)
                    return {}
                })
                // If attempt is already submitted or past deadline grace, navigate to result instead of retrying forever
                if (res.status === 409 || res.status === 410 || errData.error?.includes("already submitted")) {
                    submissionPendingRef.current = false
                    await clearExamState(attemptKey).catch((error) =>
                        logExamIssue("clear local exam state after duplicate submit", error)
                    )
                    await safeExitFullscreen()
                    const returnParam = searchParams.get("returnPath")
                    const q = new URLSearchParams({ attemptId: attId })
                    if (returnParam) q.set("returnPath", returnParam)
                    router.replace(`/test-series/${seriesId}/result?${q.toString()}`)
                    return
                }
                throw new Error(errData.error || `Submission failed with status ${res.status}`)
            }

            // Successfully submitted on server
            submissionPendingRef.current = false
            await clearExamState(attemptKey).catch((error) =>
                logExamIssue("clear local exam state after submit", error)
            )
            await safeExitFullscreen()
            const returnParam = searchParams.get("returnPath")
            const q = new URLSearchParams({ attemptId: attId })
            if (returnParam) q.set("returnPath", returnParam)
            router.replace(`/test-series/${seriesId}/result?${q.toString()}`)
        } catch (err: any) {
            console.error("Submission failed:", err)
            setSubmitting(false)
            submissionPendingRef.current = true
            setSubmitError(err.message || "Failed to submit test. Your answers are preserved locally. Please check your network and click retry.")
            // Persist with submissionPending flag in IndexedDB
            await saveExamState(attemptKey, {
                attempts: currentAttempts,
                timeLeft: timeLeftRef.current,
                currentQ: currentQRef.current,
                tabSwitchCount: tabSwitchCountRef.current,
                submissionPending: true,
            }).catch((error) => {
                logExamIssue("persist pending submission locally", error)
                setLocalSaveFailed(true)
            })
        }
    }, [activeAttemptId, attemptKey, durationMin, router, seriesId, searchParams])

    useEffect(() => {
        performSubmitRef.current = performSubmit
    }, [performSubmit])

    // ── Compute only changed answers since last sync ──────────────
    const computeChangedAnswers = useCallback((currentAttempts: Record<number, Attempt>) => {
        const changed: Array<{
            questionId: string;
            selectedOption: "A" | "B" | "C" | "D" | null;
            isMarked: boolean;
            timeSpentSecs: number;
        }> = []

        const currentQuestions = questionsRef.current
        const currentQTimes = questionTimesRef.current
        const elapsedSecs = Math.max(1, durationMin * 60 - timeLeftRef.current)
        const timePerQ = Math.max(0, Math.round(elapsedSecs / (currentQuestions.length || 1)))

        for (const q of currentQuestions) {
            const att = currentAttempts[q.id]
            const selectedOption =
                att?.selected !== null && att?.selected !== undefined
                    ? (["A", "B", "C", "D"][att.selected] as "A" | "B" | "C" | "D")
                    : null
            const isMarked = att?.marked ?? false
            const last = lastSyncedAnswersRef.current.get(q.rawId)

            if (!last || last.selectedOption !== selectedOption || last.isMarked !== isMarked) {
                changed.push({
                    questionId: q.rawId,
                    selectedOption,
                    isMarked,
                    timeSpentSecs: Math.max(0, currentQTimes[q.id] ?? timePerQ),
                })
            }
        }
        return changed
    }, [durationMin])

    // ── Sync to server with sequence control and backoff ───────────
    const syncAttemptToServer = useCallback(
        async (att: Record<number, Attempt>, tsc: number) => {
            const attId = activeAttemptIdRef.current || activeAttemptId
            if (!attId || !questionsRef.current.length) return

            const changed = computeChangedAnswers(att)
            if (changed.length === 0) return

            if (isSyncingRef.current) {
                pendingSyncRef.current = true
                return
            }

            isSyncingRef.current = true
            setSyncStatus("syncing")
            const currentSeq = ++syncSeqRef.current

            const doSync = async (retries = 2, delay = 1000): Promise<boolean> => {
                try {
                    const res = await fetch(`/api/exam/attempt/${encodeURIComponent(attId)}/sync`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            answers: changed,
                            tabSwitchCount: tsc,
                            sequence: currentSeq,
                        }),
                    })
                    if (res.ok) {
                        for (const item of changed) {
                            lastSyncedAnswersRef.current.set(item.questionId, {
                                selectedOption: item.selectedOption,
                                isMarked: item.isMarked,
                            })
                        }
                        return true
                    }
                    if (res.status === 409) {
                        const errData = await res.json().catch((parseError) => {
                            logExamIssue("sync 409 response was not valid JSON", parseError)
                            return null
                        })
                        if (errData?.storedSeq) {
                            syncSeqRef.current = Math.max(syncSeqRef.current, errData.storedSeq) + 1
                            pendingSyncRef.current = true
                        }
                        return false
                    }
                    if (res.status === 410) {
                        return false
                    }
                    if (retries > 0) {
                        await new Promise((r) => setTimeout(r, delay))
                        return doSync(retries - 1, delay * 2)
                    }
                    return false
                } catch (error) {
                    logExamIssue(`sync attempt failed (seq ${currentSeq}, retries left ${retries})`, error)
                    if (retries > 0) {
                        await new Promise((r) => setTimeout(r, delay))
                        return doSync(retries - 1, delay * 2)
                    }
                    return false
                }
            }

            const success = await doSync()
            isSyncingRef.current = false
            if (success) {
                setSyncStatus("synced")
            } else {
                setSyncStatus("error")
            }

            if (pendingSyncRef.current) {
                pendingSyncRef.current = false
                syncAttemptToServer(currentAttemptsRef.current, tabSwitchCountRef.current)
            }
        },
        [activeAttemptId, computeChangedAnswers]
    )

    // ── Flush on page hide or tab switch to background ────────────
    useEffect(() => {
        const flushSync = () => {
            const attId = activeAttemptIdRef.current
            if (!attId || !questions.length) return
            const changed = computeChangedAnswers(currentAttemptsRef.current)
            if (changed.length === 0) return

            try {
                const payload = JSON.stringify({
                    answers: changed,
                    tabSwitchCount: tabSwitchCountRef.current,
                    sequence: ++syncSeqRef.current,
                })
                fetch(`/api/exam/attempt/${encodeURIComponent(attId)}/sync`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: payload,
                    keepalive: true,
                }).catch((error) => logExamIssue("flush sync on page hide", error))

                for (const item of changed) {
                    lastSyncedAnswersRef.current.set(item.questionId, {
                        selectedOption: item.selectedOption,
                        isMarked: item.isMarked,
                    })
                }
            } catch (error) {
                logExamIssue("build flush payload on page hide", error)
            }
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                flushSync()
            }
        }

        document.addEventListener("visibilitychange", handleVisibilityChange)
        window.addEventListener("pagehide", flushSync)

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange)
            window.removeEventListener("pagehide", flushSync)
        }
    }, [computeChangedAnswers, questions.length])

    // ── Auto-retry submission when network reconnects ─────────────
    useEffect(() => {
        const handleOnline = () => {
            if (submissionPendingRef.current) {
                performSubmit(currentAttemptsRef.current)
            }
        }
        window.addEventListener("online", handleOnline)
        return () => {
            window.removeEventListener("online", handleOnline)
        }
    }, [performSubmit])

    // ── Save exam state to IDB & debounced Server Sync ───────────
    const persistState = useCallback(
        (att: Record<number, Attempt>, tl: number, cq: number, tsc: number) => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
            saveTimerRef.current = setTimeout(() => {
                saveExamState(attemptKey, {
                    attempts: att,
                    timeLeft: tl,
                    currentQ: cq,
                    tabSwitchCount: tsc,
                })
                    .then(() => setLocalSaveFailed(false))
                    .catch((error) => {
                        logExamIssue("persist exam state locally (IndexedDB)", error)
                        setLocalSaveFailed(true)
                    })
            }, 2000)

            if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
            syncTimerRef.current = setTimeout(() => {
                syncAttemptToServer(att, tsc)
            }, 2500)
        },
        [attemptKey, syncAttemptToServer]
    )

    // ── Load test and initialize/resume server attempt ───────────
    useEffect(() => {
        if (!testId) {
            setLoadError("No test ID provided.")
            setLoading(false)
            return
        }

        let isSubscribed = true
        setLoading(true)
        setLoadError(null)

        const loadAll = async () => {
            try {
                const isRetake = searchParams.get("retake") === "true"

                // 1. Initialize or resume attempt first
                let attemptData: any = null
                if (urlAttemptId && !isRetake) {
                    const attRes = await fetchWithTimeout(`/api/exam/attempt/${encodeURIComponent(urlAttemptId)}`)
                    if (attRes.ok) {
                        const attJson = await attRes.json()
                        if (attJson.data) attemptData = attJson.data
                    }
                }

                if (!attemptData) {
                    const startRes = await fetchWithTimeout("/api/exam/attempt/start", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            testId,
                            language: lang,
                            retake: isRetake,
                        }),
                    })

                    if (!startRes.ok) {
                        const err = await startRes.json().catch((parseError) => {
                            logExamIssue("start attempt error response was not valid JSON", parseError)
                            return {}
                        })
                        throw new Error(err.error || `Failed to start or resume exam attempt (HTTP ${startRes.status}).`)
                    }
                    const startJson = await startRes.json()
                    attemptData = startJson.data
                }

                if (!attemptData?.attemptId) {
                    throw new Error("Failed to initialize exam attempt.")
                }

                // 2. Obtain test questions: from attempt payload or via attemptId-authorized questions API
                let t = attemptData.test
                const hasInlineQuestions =
                    Array.isArray(t?.sections) &&
                    t.sections.some(
                        (s: any) => Array.isArray(s.questions) && s.questions.length > 0
                    )

                if (!hasInlineQuestions) {
                    const qRes = await fetchWithTimeout(
                        `/api/exam/${encodeURIComponent(testId)}/questions?attemptId=${encodeURIComponent(attemptData.attemptId)}`
                    )
                    if (!qRes.ok) {
                        const err = await qRes.json().catch((parseError) => {
                            logExamIssue("questions error response was not valid JSON", parseError)
                            return {}
                        })
                        throw new Error(
                            err.error ||
                                (qRes.status === 404
                                    ? "Test not found."
                                    : `Failed to load test questions (HTTP ${qRes.status}).`)
                        )
                    }
                    const qJson = await qRes.json()
                    if (!qJson.data?.test) throw new Error("Invalid test data received from server.")
                    t = qJson.data.test
                }

                const rawQuestions: any[] = []
                if (Array.isArray(t.sections)) {
                    for (const sec of t.sections) {
                        if (Array.isArray(sec.questions)) {
                            for (const q of sec.questions) {
                                rawQuestions.push({
                                    ...q,
                                    sectionTitle: sec.title,
                                    sectionId: sec.id,
                                    sectionPositiveMarks: sec.positiveMarks,
                                    sectionNegativeMarks: sec.negativeMarks,
                                })
                            }
                        }
                    }
                }

                if (rawQuestions.length === 0) {
                    throw new Error("This test does not contain any questions.")
                }

                const mappedQuestions: Question[] = rawQuestions.map((q: any, idx: number) => ({
                    id: idx + 1,
                    rawId: q.id,
                    text: q.questionEn || "",
                    textHi: q.questionHi || undefined,
                    options: [q.optionAEn, q.optionBEn, q.optionCEn, q.optionDEn].filter((o: any) => o !== null && o !== undefined),
                    optionsHi: [q.optionAHi, q.optionBHi, q.optionCHi, q.optionDHi].filter((o: any) => o !== null && o !== undefined),
                    correctIndex: 0,
                    subject: q.subject || "General Studies",
                    positiveMarks: q.positiveMarks ?? q.sectionPositiveMarks ?? t.positiveMarks ?? 1,
                    negativeMarks: q.negativeMarks ?? q.sectionNegativeMarks ?? t.negativeMarks ?? 0.33,
                    sectionTitle: q.sectionTitle,
                    sectionId: q.sectionId,
                }))

                if (!isSubscribed) return
                setCustomTestRecord(t)
                setQuestions(mappedQuestions)

                // Authoritative validation: attempt must belong to this test and series
                if (attemptData.testId !== testId) {
                    throw new Error(
                        `Attempt test mismatch: this attempt is for test ID "${attemptData.testId}", but the URL specifies "${testId}".`
                    )
                }
                // Resolve series: URL parameter [id] can be either series.id or series.slug
                const urlSeries = (seriesId || "").toLowerCase()
                const matchesSeries =
                    !urlSeries ||
                    (attemptData.seriesId && attemptData.seriesId.toLowerCase() === urlSeries) ||
                    (attemptData.seriesSlug && attemptData.seriesSlug.toLowerCase() === urlSeries) ||
                    (attemptData.test?.seriesId && attemptData.test.seriesId.toLowerCase() === urlSeries) ||
                    (t.seriesId && t.seriesId.toLowerCase() === urlSeries) ||
                    (t.series?.id && t.series.id.toLowerCase() === urlSeries) ||
                    (t.series?.slug && t.series.slug.toLowerCase() === urlSeries)

                if (!matchesSeries) {
                    throw new Error(
                        `Attempt series mismatch: this attempt belongs to series "${attemptData.seriesId}", but the URL specifies "${seriesId}".`
                    )
                }

                if (attemptData.status === "SUBMITTED") {
                    const returnParam = searchParams.get("returnPath")
                    const isCa = seriesId === "current-affairs-system-series" || attemptData.test?.testType === "CURRENT_AFFAIRS"
                    const isPyq = seriesId === "pyq-system-series" || attemptData.test?.testType === "PREVIOUS_YEAR"
                    const safeFallback = isCa ? "/current-affairs-quizzes" : isPyq ? "/pyqs" : `/test-series/${seriesId}`
                    const safeReturn = sanitizeReturnPath(returnParam, safeFallback)
                    router.replace(safeReturn)
                    return
                }

                setActiveAttemptId(attemptData.attemptId)
                setServerDeadline(attemptData.deadline)

                if (typeof attemptData.maxClientSeq === "number") {
                    syncSeqRef.current = Math.max(syncSeqRef.current, attemptData.maxClientSeq)
                }

                // Update URL search params with attemptId if not present
                if (!urlAttemptId && typeof window !== "undefined") {
                    const newUrl = `/test-series/${seriesId}/attempt?testId=${encodeURIComponent(testId)}&attemptId=${encodeURIComponent(attemptData.attemptId)}&lang=${lang}`
                    window.history.replaceState(null, "", newUrl)
                }

                // Initial attempts template
                const initialAttempts: Record<number, Attempt> = Object.fromEntries(
                    mappedQuestions.map((q, i) => [
                        q.id,
                        {
                            selected: null,
                            state: (i === 0 ? "not-answered" : "not-visited") as QState,
                            marked: false,
                        },
                    ])
                )

                // Populate with server recorded answers and sync cache
                if (Array.isArray(attemptData.answers)) {
                    for (const ans of attemptData.answers) {
                        lastSyncedAnswersRef.current.set(ans.questionId, {
                            selectedOption: ans.selectedOption,
                            isMarked: Boolean(ans.isMarked),
                        })
                        const qIndex = mappedQuestions.findIndex((mq) => mq.rawId === ans.questionId)
                        if (qIndex >= 0) {
                            const qId = mappedQuestions[qIndex].id
                            const optIndex = ans.selectedOption ? ["A", "B", "C", "D"].indexOf(ans.selectedOption) : -1
                            const selected = optIndex >= 0 ? optIndex : null
                            const marked = Boolean(ans.isMarked)
                            const state: QState = selected !== null
                                ? (marked ? "answered-marked" : "answered")
                                : (marked ? "marked" : "not-answered")
                            initialAttempts[qId] = { selected, marked, state }
                        }
                    }
                }

                if (typeof attemptData.tabSwitchCount === "number") {
                    setTabSwitchCount(attemptData.tabSwitchCount)
                }

                // Calculate clock offset between server and client device
                if (attemptData.serverNow) {
                    const clientNow = Date.now()
                    const serverNowMs = new Date(attemptData.serverNow).getTime()
                    serverOffsetRef.current = serverNowMs - clientNow
                }

                // Calculate time left from server deadline independent of device clock
                const deadlineTime = new Date(attemptData.deadline).getTime()
                const currentServerTime = Date.now() + serverOffsetRef.current
                const remaining = Math.max(0, Math.round((deadlineTime - currentServerTime) / 1000))
                setTimeLeft(remaining)

                // Merge with IndexedDB if local data is available
                let pendingSubmitRecovery = false
                try {
                    const saved = await loadExamState(`attempt-${attemptData.attemptId}`) || await loadExamState(`${seriesId}-${testId}`)
                    if (saved && typeof saved === "object") {
                        const s = saved as {
                            attempts?: Record<number, Attempt>
                            currentQ?: number
                            tabSwitchCount?: number
                            submissionPending?: boolean
                        }
                        if (s.attempts) {
                            for (const [k, v] of Object.entries(s.attempts)) {
                                const numK = Number(k)
                                if (v && initialAttempts[numK] && v.selected !== null) {
                                    initialAttempts[numK] = v
                                }
                            }
                        }
                        if (typeof s.currentQ === "number") setCurrentQ(s.currentQ)
                        if (typeof s.tabSwitchCount === "number" && s.tabSwitchCount > (attemptData.tabSwitchCount || 0)) {
                            setTabSwitchCount(s.tabSwitchCount)
                        }
                        if (s.submissionPending) {
                            pendingSubmitRecovery = true
                        }
                    }
                } catch (error) {
                    logExamIssue("restore locally saved exam state", error)
                }

                setAttempts(initialAttempts)
                setLoading(false)

                // Resume of an unsent submission must be retried on next load
                if (pendingSubmitRecovery) {
                    performSubmitRef.current?.(initialAttempts)
                }
            } catch (err: any) {
                if (isSubscribed) {
                    setLoadError(err.message || "Failed to load test.")
                    setLoading(false)
                }
            }
        }

        loadAll()

        return () => {
            isSubscribed = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [testId, seriesId, lang, retryCount])

    // ── AUTO FULLSCREEN on mount ─────────────────────────────────
    useEffect(() => {
        const enterFS = async () => {
            try {
                if (!document.fullscreenElement) {
                    await document.documentElement.requestFullscreen()
                    setIsFullscreen(true)
                }
            } catch (error) {
                // Browser blocked automatic fullscreen — the student can still use the button.
                logExamIssue("automatic fullscreen request blocked", error)
            }
        }
        const t = setTimeout(enterFS, 300)
        return () => clearTimeout(t)
    }, [])

    // Listen for fullscreen changes (e.g. user presses Esc)
    useEffect(() => {
        const onFSChange = () => setIsFullscreen(!!document.fullscreenElement)
        document.addEventListener("fullscreenchange", onFSChange)
        return () => document.removeEventListener("fullscreenchange", onFSChange)
    }, [])

    // ── Screen Wake Lock (Keep screen awake on mobile during exam) ───
    useEffect(() => {
        const requestWakeLock = async () => {
            try {
                if ("wakeLock" in navigator && !wakeLockRef.current) {
                    wakeLockRef.current = await (navigator as any).wakeLock.request("screen")
                }
            } catch (error) {
                // Wake lock may fail if battery saver is on or document not visible
                logExamIssue("screen wake lock request", error)
            }
        }
        requestWakeLock()

        const handleVisibilityForWakeLock = () => {
            if (document.visibilityState === "visible") {
                requestWakeLock()
            }
        }
        document.addEventListener("visibilitychange", handleVisibilityForWakeLock)

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityForWakeLock)
            if (wakeLockRef.current) {
                wakeLockRef.current.release().catch((error: unknown) => logExamIssue("screen wake lock release", error))
                wakeLockRef.current = null
            }
        }
    }, [])

    // ── Timer (Calculated strictly from server deadline) ─────────────
    useEffect(() => {
        if (submitted || paused || !serverDeadline) {
            if (timerRef.current) clearInterval(timerRef.current)
            return
        }

        timerRef.current = setInterval(() => {
            const deadlineTime = new Date(serverDeadline).getTime()
            const currentServerTime = Date.now() + serverOffsetRef.current
            const remaining = Math.max(0, Math.round((deadlineTime - currentServerTime) / 1000))
            setTimeLeft(remaining)
            timeLeftRef.current = remaining

            // Increment time spent on current question
            const curQObj = questionsRef.current[currentQRef.current]
            if (curQObj) {
                const cqId = curQObj.id
                questionTimesRef.current[cqId] = (questionTimesRef.current[cqId] || 0) + 1
                setQuestionTimeSpent(prev => ({
                    ...prev,
                    [cqId]: (prev[cqId] || 0) + 1
                }))
            }

            if (remaining <= 0) {
                if (timerRef.current) clearInterval(timerRef.current)
                setSubmitted(true)
                performSubmitRef.current?.(currentAttemptsRef.current)
            }
        }, 1000)

        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [submitted, paused, serverDeadline])

    // ── Anti-Cheat: Tab Switch / Visibility Detection ─────────────
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && !submitted && !paused) {
                setTabSwitchCount(prev => {
                    const next = prev + 1
                    if (next >= 3) {
                        setShowAutoSubmitModal(true)
                    } else {
                        setShowTabWarningModal(true)
                    }
                    return next
                })
            }
        }
        document.addEventListener("visibilitychange", handleVisibilityChange)
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
    }, [submitted, paused])

    // ── Anti-Cheat: Right-click & Copy-Paste disable ──────────────
    useEffect(() => {
        const prevent = (e: Event) => e.preventDefault()
        document.addEventListener("contextmenu", prevent)
        document.addEventListener("copy", prevent)
        document.addEventListener("cut", prevent)
        return () => {
            document.removeEventListener("contextmenu", prevent)
            document.removeEventListener("copy", prevent)
            document.removeEventListener("cut", prevent)
        }
    }, [])

    // ── Prevent accidental back navigation & pull-to-refresh ──────────
    useEffect(() => {
        if (submitted) return

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!submitted) {
                e.preventDefault()
                e.returnValue = ""
                return ""
            }
        }

        // Push state so back button doesn't immediately navigate out
        if (typeof window !== "undefined") {
            try {
                window.history.pushState(null, "", window.location.href)
            } catch (error) {
                logExamIssue("guard against back navigation (initial pushState)", error)
            }
        }

        const handlePopState = () => {
            if (!submitted) {
                // Keep the student on the exam page
                try {
                    window.history.pushState(null, "", window.location.href)
                } catch (error) {
                    logExamIssue("guard against back navigation (popstate pushState)", error)
                }
                setShowExitConfirmModal(true)
            }
        }

        window.addEventListener("beforeunload", handleBeforeUnload)
        window.addEventListener("popstate", handlePopState)

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload)
            window.removeEventListener("popstate", handlePopState)
        }
    }, [submitted])

    // ── Stats ────────────────────────────────────────────────────
    const counts = {
        answered: Object.values(attempts).filter(a => a.state === "answered" || a.state === "answered-marked").length,
        notAnswered: Object.values(attempts).filter(a => a.state === "not-answered").length,
        notVisited: Object.values(attempts).filter(a => a.state === "not-visited").length,
        marked: Object.values(attempts).filter(a => a.state === "marked").length,
        answeredMarked: Object.values(attempts).filter(a => a.state === "answered-marked").length,
    }

    // ── Navigation ───────────────────────────────────────────────
    const goTo = useCallback((idx: number) => {
        const curQ = questionsRef.current[currentQRef.current]
        if (curQ) {
            const curAtt = currentAttemptsRef.current[curQ.id]
            if (curAtt && curAtt.state === "not-visited") {
                const updated = {
                    ...currentAttemptsRef.current,
                    [curQ.id]: { ...curAtt, state: "not-answered" as QState }
                }
                setAttempts(updated)
                currentAttemptsRef.current = updated
                persistState(updated, timeLeftRef.current, idx, tabSwitchCountRef.current)
            } else {
                persistState(currentAttemptsRef.current, timeLeftRef.current, idx, tabSwitchCountRef.current)
            }
        }
        setCurrentQ(idx)
        currentQRef.current = idx
    }, [persistState])

    // ── Actions ──────────────────────────────────────────────────
    const selectOption = (i: number) => {
        const curQ = questionsRef.current[currentQRef.current]
        if (!curQ) return
        const curAtt = currentAttemptsRef.current[curQ.id]
        const updated = {
            ...currentAttemptsRef.current,
            [curQ.id]: {
                ...curAtt,
                selected: i,
                state: (curAtt?.marked ? "answered-marked" : "answered") as QState
            }
        }
        setAttempts(updated)
        currentAttemptsRef.current = updated
        persistState(updated, timeLeftRef.current, currentQRef.current, tabSwitchCountRef.current)
    }

    const saveAndNext = () => {
        if (currentQ < questions.length - 1) {
            goTo(currentQ + 1)
        }
    }

    const markForReview = () => {
        const curQ = questionsRef.current[currentQRef.current]
        if (!curQ) return
        const curAtt = currentAttemptsRef.current[curQ.id]
        const updated = {
            ...currentAttemptsRef.current,
            [curQ.id]: {
                ...curAtt,
                marked: true,
                state: (curAtt?.selected !== null && curAtt?.selected !== undefined ? "answered-marked" : "marked") as QState
            }
        }
        setAttempts(updated)
        currentAttemptsRef.current = updated
        const nextQ = currentQ < questions.length - 1 ? currentQ + 1 : currentQ
        persistState(updated, timeLeftRef.current, nextQ, tabSwitchCountRef.current)
        if (currentQ < questions.length - 1) {
            goTo(currentQ + 1)
        }
    }

    const clearResponse = () => {
        const curQ = questionsRef.current[currentQRef.current]
        if (!curQ) return
        const curAtt = currentAttemptsRef.current[curQ.id]
        const updated = {
            ...currentAttemptsRef.current,
            [curQ.id]: {
                ...curAtt,
                selected: null,
                state: (curAtt?.marked ? "marked" : "not-answered") as QState
            }
        }
        setAttempts(updated)
        currentAttemptsRef.current = updated
        persistState(updated, timeLeftRef.current, currentQRef.current, tabSwitchCountRef.current)
    }

    const handleSubmit = useCallback(() => {
        setShowSubmitModal(false)
        performSubmit()
    }, [performSubmit])

    // Auto-submit (3rd violation) handler
    const handleAutoSubmit = useCallback(() => {
        setShowAutoSubmitModal(false)
        performSubmit()
    }, [performSubmit])

    const toggleFS = () => {
        if (!document.fullscreenElement) {
            document.documentElement
                .requestFullscreen()
                .then(() => setIsFullscreen(true))
                .catch((error) => logExamIssue("manual fullscreen request", error))
        } else {
            document
                .exitFullscreen()
                .then(() => setIsFullscreen(false))
                .catch((error) => logExamIssue("manual fullscreen exit", error))
        }
    }

    // Per-question elapsed time display (starts at 00:00 for each question)
    const currentQId = currentQuestion?.id
    const currentQSecs = currentQId ? (questionTimeSpent[currentQId] || 0) : 0
    const qMins = Math.floor(currentQSecs / 60)
    const qSecs = currentQSecs % 60
    const perQuestionTimeStr = `${String(qMins).padStart(2, "0")}:${String(qSecs).padStart(2, "0")}`

    if (!isMounted || loading) {
        return (
            <div style={{ height: "100dvh", width: "100%", maxWidth: "100vw", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fff", gap: 16, fontFamily: "sans-serif" }}>
                <div style={{ width: 52, height: 52, border: "4px solid #0ea5e9", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: "#374151" }}>Preparing CBT Exam Arena...</p>
                <p style={{ fontSize: 12, color: "#9ca3af" }}>Loading question paper and candidate credentials...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
        )
    }

    if (loadError || (!loading && questions.length === 0)) {
        return (
            <div style={{ height: "100dvh", width: "100%", maxWidth: "100vw", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fff", padding: 24, fontFamily: "sans-serif" }}>
                <div style={{ maxWidth: 440, width: "100%", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <AlertTriangle style={{ width: 28, height: 28 }} />
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>Cannot Open Test</h2>
                    <p style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.5, margin: 0, wordBreak: "break-word" }}>
                        {loadError || "The requested test contains no questions or could not be loaded."}
                    </p>
                    <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
                        <button
                            onClick={() => {
                                setLoadError(null)
                                setLoading(true)
                                setRetryCount((c) => c + 1)
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
                                boxShadow: "0 2px 8px rgba(2,132,199,0.25)"
                            }}
                        >
                            Retry
                        </button>
                        <button
                            onClick={() => {
                                const isCa = seriesId === "current-affairs-system-series"
                                const isPyq = seriesId === "pyq-system-series"
                                const defaultFallback = isCa ? "/current-affairs-quizzes" : isPyq ? "/pyqs" : `/test-series/${seriesId}`
                                const rawReturnPath = searchParams.get("returnPath")
                                const safeReturnPath = sanitizeReturnPath(rawReturnPath, defaultFallback)
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
                            {seriesId === "current-affairs-system-series" || searchParams.get("returnPath")?.includes("/current-affairs-quizzes")
                                ? "Back to Current Affairs Quizzes"
                                : seriesId === "pyq-system-series" || searchParams.get("returnPath")?.includes("/pyqs")
                                ? "Back to Previous Papers"
                                : "Back to Test Series"}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div style={{
            height: "100dvh", width: "100%", maxWidth: "100%",
            display: "flex", flexDirection: "column",
            background: "#fff", fontFamily: "sans-serif",
            overflow: "hidden", userSelect: "none",
            overscrollBehaviorY: "contain"
        }}>

            {/* ══ TOP BAR ══════════════════════════════════════════ */}
            {/* Desktop Header (>= 1024px, lg:flex, hidden on mobile) */}
            <header className="hidden lg:flex" style={{
                height: 48, flexShrink: 0,
                alignItems: "center", justifyContent: "space-between",
                padding: "0 16px", borderBottom: "1px solid #e5e7eb", background: "#fff"
            }}>
                {/* Logo + Title */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 22, height: 22, background: "#14b8a6", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ color: "#fff", fontSize: 8, fontWeight: 900 }}>TS</span>
                        </div>
                        <span style={{ color: "#0d9488", fontWeight: 900, fontSize: 13 }}>aspirantbook</span>
                    </div>
                    <div style={{ width: 1, height: 18, background: "#d1d5db", margin: "0 4px" }} />
                    <span style={{ color: "#374151", fontSize: 12, fontWeight: 600, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {testTitle}
                    </span>
                </div>

                {/* Center: anti-cheat warning indicator */}
                {tabSwitchCount > 0 && (
                    <div style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "3px 12px", borderRadius: 20,
                        background: "#fef2f2", border: "1px solid #fca5a5",
                        fontSize: 11, fontWeight: 700, color: "#dc2626"
                    }}>
                        <ShieldAlert style={{ width: 13, height: 13 }} />
                        {tabSwitchCount}/3 Violations
                    </div>
                )}

                {/* Timer & Sync Status */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {syncStatus === "synced" && (
                        <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} /> Synced
                        </span>
                    )}
                    {syncStatus === "syncing" && (
                        <span style={{ fontSize: 11, color: "#d97706", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} /> Saving...
                        </span>
                    )}
                    {syncStatus === "error" && (
                        <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }} title="Sync failed: Buffered locally, retrying...">
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} /> Sync failed - retrying
                        </span>
                    )}
                    <TimerDisplay secs={timeLeft} />
                </div>

                {/* Buttons */}
                <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={toggleFS} style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "5px 12px", border: "1px solid #d1d5db", borderRadius: 4,
                        background: "#fff", fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer"
                    }}>
                        {isFullscreen ? "Exit Full Screen" : <><Maximize2 style={{ width: 13, height: 13 }} /> Switch Full Screen</>}
                    </button>
                    <button onClick={() => setPaused(p => !p)} style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "5px 12px", border: "1px solid #d1d5db", borderRadius: 4,
                        background: "#fff", fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer"
                    }}>
                        {paused ? <Play style={{ width: 13, height: 13 }} /> : <Pause style={{ width: 13, height: 13 }} />}
                        {paused ? "Resume" : "Pause"}
                    </button>
                </div>
            </header>

            {/* Mobile Header (< 1024px, lg:hidden, min 52px height for 44px tap targets) */}
            <header className="flex lg:hidden items-center justify-between px-3 min-h-[52px] flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-20 gap-1.5">
                <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
                    <div className="w-6 h-6 rounded bg-teal-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-[9px] font-black">TS</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate" title={testTitle}>
                        {testTitle}
                    </span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    {tabSwitchCount > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/60 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800">
                            <ShieldAlert className="w-3 h-3" />
                            {tabSwitchCount}/3
                        </span>
                    )}
                    {syncStatus === "synced" && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" title="Synced to server" />
                    )}
                    {syncStatus === "syncing" && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" title="Saving to server..." />
                    )}
                    {syncStatus === "error" && (
                        <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="Sync failed - buffered locally, retrying..." />
                    )}
                    <MobileTimerDisplay secs={timeLeft} />
                    <button
                        onClick={() => setPaused(p => !p)}
                        className="min-w-[44px] min-h-[44px] p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center justify-center cursor-pointer"
                        title={paused ? "Resume Test" : "Pause Test"}
                        aria-label={paused ? "Resume Test" : "Pause Test"}
                    >
                        {paused ? <Play className="w-4 h-4 text-emerald-600" /> : <Pause className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => setShowSubmitModal(true)}
                        data-testid="cbt-submit-button"
                        className="min-h-[44px] px-3 rounded-lg bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold shadow-sm transition flex items-center justify-center cursor-pointer"
                    >
                        Submit
                    </button>
                </div>
            </header>

            {localSaveFailed && (
                <div
                    role="alert"
                    data-testid="cbt-local-save-warning"
                    className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-[11px] font-semibold text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800"
                >
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Local backup unavailable — answers are still sent to the server. Keep this tab open until you submit.</span>
                </div>
            )}

            {/* ══ SECTION TABS ══════════════════════════════════════ */}
            <div className="h-10 flex-shrink-0 flex items-center border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 overflow-x-auto no-scrollbar">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider pr-3 mr-3 border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
                    SECTIONS
                </span>
                <div className="flex items-center gap-2">
                    {Array.isArray(customTestRecord?.sections) && customTestRecord.sections.length > 0 ? (
                        customTestRecord.sections.map((sec: any) => {
                            const isCurrentSec = currentQuestion?.sectionId
                                ? currentQuestion.sectionId === sec.id
                                : currentQuestion?.sectionTitle === sec.title;
                            return (
                                <button
                                    key={sec.id || sec.title}
                                    type="button"
                                    onClick={() => {
                                        const targetIdx = questions.findIndex(
                                            (q) => (q.sectionId && q.sectionId === sec.id) || (q.sectionTitle && q.sectionTitle === sec.title)
                                        );
                                        if (targetIdx !== -1) {
                                            goTo(targetIdx);
                                        }
                                    }}
                                    className={`px-4 py-1 rounded text-xs font-bold whitespace-nowrap transition-colors cursor-pointer min-h-[32px] ${
                                        isCurrentSec
                                            ? "bg-[#1448d8] text-white shadow-sm"
                                            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    {sec.title}
                                </button>
                            );
                        })
                    ) : (
                        <button type="button" className="px-4 py-1 rounded text-xs font-bold bg-[#1448d8] text-white whitespace-nowrap shadow-sm min-h-[32px]">
                            {currentQuestion?.sectionTitle || customTestRecord?.title || "Test"}
                        </button>
                    )}
                </div>
            </div>

            {/* ══ BODY ═════════════════════════════════════════════ */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

                {/* ── LEFT: Question panel (Full width on mobile, flex: 1) ──────────────────────── */}
                <main style={{
                    flex: 1, display: "flex", flexDirection: "column",
                    overflow: "hidden", borderRight: "1px solid #e5e7eb",
                    position: "relative"
                }}>
                    {/* Meta row */}
                    <div className="flex items-center justify-between px-3 md:px-5 py-2 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
                        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                            <span className="text-xs md:text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                Q.{currentQ + 1}
                            </span>
                            <div className="flex items-center gap-1 md:gap-1.5">
                                <span className="text-[10px] md:text-xs text-gray-500 font-semibold hidden sm:inline">Marks</span>
                                <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-500 text-white">
                                    +{currentQuestion?.positiveMarks ?? customTestRecord?.positiveMarks ?? 1}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-orange-500 text-white">
                                    -{currentQuestion?.negativeMarks ?? customTestRecord?.negativeMarks ?? 0.33}
                                </span>
                                {isBpsc && (
                                    <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-gray-400 text-white">-0</span>
                                )}
                            </div>
                            <div className="flex items-center gap-1 ml-1 text-gray-500 dark:text-gray-400">
                                <span className="text-[10px] md:text-xs font-semibold">Time</span>
                                <span className="text-xs font-bold font-mono text-gray-900 dark:text-gray-200">{perQuestionTimeStr}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs text-gray-500 hidden sm:inline">View in</span>
                                <select
                                    value={viewLang}
                                    onChange={e => setViewLang(e.target.value as "English" | "Hindi")}
                                    className="text-xs font-semibold border border-gray-300 dark:border-gray-700 rounded px-1.5 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 cursor-pointer"
                                >
                                    <option>English</option>
                                    <option>Hindi</option>
                                </select>
                            </div>
                            <button
                                onClick={() => setShowReportModal(true)}
                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 transition ml-1"
                                title="Report issue with question"
                            >
                                <Flag className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Report</span>
                            </button>
                        </div>
                    </div>

                    {/* Question body */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 80px", userSelect: "text" }}>
                        <div style={{ fontSize: 14, color: "#111827", lineHeight: 1.7, marginBottom: 24, whiteSpace: "pre-line" }}>
                            <MathRenderer text={formatQuestionText((viewLang === "Hindi" && currentQuestion?.textHi) ? currentQuestion.textHi : (currentQuestion?.text ?? ""))} />
                        </div>

                        {/* Option Cards (Touch-first: min 48px height, clear hit targets) */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {currentQuestion?.options.map((opt, i) => {
                                const sel = curAttempt?.selected === i
                                const optText = (viewLang === "Hindi" && currentQuestion?.optionsHi?.[i]) ? currentQuestion.optionsHi[i] : opt
                                return (
                                    <label
                                        key={i}
                                        onClick={() => selectOption(i)}
                                        className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer min-h-[48px] ${
                                            sel
                                                ? "border-sky-500 bg-sky-50/70 dark:bg-sky-950/30 text-sky-900 dark:text-sky-200 font-semibold shadow-sm"
                                                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 text-gray-800 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700"
                                        }`}
                                    >
                                        <div
                                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                                sel ? "border-sky-500 bg-sky-500" : "border-gray-400 bg-white dark:bg-gray-800"
                                            }`}
                                        >
                                            {sel && <div className="w-2 h-2 rounded-full bg-white" />}
                                        </div>
                                        <div className="flex-1 text-sm leading-relaxed whitespace-pre-line">
                                            <MathRenderer text={optText} />
                                        </div>
                                    </label>
                                )
                            })}

                            {/* Question Not Attempted (BPSC only) */}
                            {isBpsc && (
                                <label
                                    onClick={clearResponse}
                                    className={`flex items-center gap-3.5 p-3 rounded-xl border border-dashed transition-all cursor-pointer min-h-[44px] ${
                                        curAttempt?.selected === null && curAttempt?.state !== "not-visited"
                                            ? "border-sky-500 bg-sky-50/50 dark:bg-sky-950/20 text-sky-800 dark:text-sky-300"
                                            : "border-gray-200 dark:border-gray-800 bg-transparent text-gray-400 hover:border-gray-300"
                                    }`}
                                >
                                    <div
                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                            curAttempt?.selected === null && curAttempt?.state !== "not-visited" ? "border-sky-500 bg-sky-500" : "border-gray-300 bg-white dark:bg-gray-800"
                                        }`}
                                    >
                                        {curAttempt?.selected === null && curAttempt?.state !== "not-visited" && (
                                            <div className="w-2 h-2 rounded-full bg-white" />
                                        )}
                                    </div>
                                    <span className="text-sm">Question Not Attempted</span>
                                </label>
                            )}
                        </div>
                    </div>

                    {/* ── Floating Palette Menu Button (FAB) on Mobile (< 1024px) ────────────────── */}
                    {/* Positioned on bottom-right above the sticky action bar */}
                    <div className="lg:hidden absolute right-4 bottom-16 z-30 pointer-events-auto">
                        <button
                            onClick={() => setIsMobilePaletteOpen(true)}
                            aria-label="Open Question Palette"
                            className="relative flex items-center justify-center w-12 h-12 rounded-full bg-sky-600 text-white shadow-xl hover:bg-sky-700 active:scale-95 transition-transform border-2 border-white dark:border-gray-800"
                        >
                            <Menu className="w-6 h-6" />
                            {/* Unattempted or remaining count badge */}
                            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-extrabold flex items-center justify-center border border-white">
                                {counts.notAnswered + counts.notVisited}
                            </span>
                        </button>
                    </div>

                    {/* ── Bottom action bar (Sticky, safe-area-inset-bottom aware) ───────────────────────── */}
                    <div
                        style={{
                            paddingBottom: "max(8px, env(safe-area-inset-bottom))"
                        }}
                        className="flex items-center justify-between px-2.5 sm:px-4 py-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex-shrink-0 z-20 gap-2"
                    >
                        <div className="flex items-center gap-2">
                            <button
                                onClick={clearResponse}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 transition whitespace-nowrap min-h-[44px] flex items-center justify-center text-center cursor-pointer"
                            >
                                <span className="hidden sm:inline">Clear Response</span>
                                <span className="sm:hidden">Clear</span>
                            </button>
                            <button
                                onClick={markForReview}
                                className="px-2.5 sm:px-3.5 py-2 border border-purple-300 dark:border-purple-700 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-[11px] sm:text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition whitespace-nowrap min-h-[44px] flex items-center justify-center text-center cursor-pointer"
                            >
                                <span className="hidden sm:inline">Mark for Review &amp; Next</span>
                                <span className="sm:hidden">Review &amp; Next</span>
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={saveAndNext}
                                className="px-4 sm:px-6 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-bold shadow-sm transition whitespace-nowrap min-h-[44px] flex items-center justify-center cursor-pointer"
                            >
                                Save &amp; Next
                            </button>
                            <button
                                onClick={() => setShowSubmitModal(true)}
                                data-testid="cbt-submit-button"
                                className="hidden lg:flex px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold shadow-sm transition whitespace-nowrap min-h-[44px] items-center justify-center cursor-pointer"
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </main>

                {/* ── RIGHT SIDEBAR: DESKTOP ONLY (hidden on mobile, lg:flex, persistent width 280px) ── */}
                <aside
                    className="hidden lg:flex"
                    style={{
                        width: 280, flexShrink: 0, flexDirection: "column",
                        background: "#fff", overflowX: "hidden", borderLeft: "1px solid #e5e7eb"
                    }}
                >
                    {/* Candidate */}
                    <div style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 14px", borderBottom: "1px solid #e5e7eb", flexShrink: 0
                    }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: "50%",
                            background: "#1f2937", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                        }}>
                            <User style={{ width: 18, height: 18, color: "rgba(255,255,255,0.7)" }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{candidateName}</span>
                    </div>

                    {/* Legend */}
                    <div style={{
                        padding: "10px 12px", borderBottom: "1px solid #e5e7eb",
                        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 8px", flexShrink: 0
                    }}>
                        <LegendItem bg="#22c55e" label="Answered" count={counts.answered} />
                        <LegendItem bg="#9333ea" label="Marked" count={counts.marked} />
                        <LegendItem bg="#fff" label="Not Visited" count={counts.notVisited} />
                        <LegendItem bg="linear-gradient(135deg,#9333ea 50%,#22c55e 50%)" label="Marked and answered" count={counts.answeredMarked} />
                        <LegendItem bg="#ef4444" label="Not Answered" count={counts.notAnswered} />
                        {isBpsc && <LegendItem bg="#9ca3af" label="No option selected" count={0} isBox />}
                    </div>

                    {/* Section header */}
                    <div style={{
                        padding: "6px 12px", background: "#e0f2fe",
                        borderBottom: "1px solid #bae6fd", flexShrink: 0
                    }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#075985" }}>
                            SECTION : {currentQuestion?.sectionTitle || "Section"}
                        </span>
                    </div>

                    {/* Question Palette Grid */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 8px", scrollbarWidth: "thin" }}>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(5, 1fr)",
                            gap: 8
                        }}>
                            {questions.map((q, i) => {
                                const a = attempts[q.id]
                                const st = a?.state ?? "not-visited"
                                const isCur = i === currentQ
                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => goTo(i)}
                                        style={{
                                            ...paletteStyle(st, isCur),
                                            width: "100%",
                                            height: 34,
                                            borderRadius: 4,
                                            fontSize: 12,
                                            lineHeight: 1,
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            transition: "transform 0.1s",
                                            padding: 0
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.zIndex = "10" }}
                                        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.zIndex = "1" }}
                                    >
                                        {i + 1}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Utility buttons */}
                    <div style={{
                        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
                        padding: "8px 10px", borderTop: "1px solid #e5e7eb", flexShrink: 0
                    }}>
                        <button onClick={() => setShowQPaper(true)} style={{
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                            padding: "8px 4px", border: "1px solid #d1d5db", borderRadius: 4,
                            background: "#fff", fontSize: 11, fontWeight: 600, color: "#374151", cursor: "pointer",
                            minHeight: 40
                        }}>
                            <FileText style={{ width: 12, height: 12 }} />
                            Question Paper
                        </button>
                        <button onClick={() => setShowInstructionsModal(true)} style={{
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                            padding: "8px 4px", border: "1px solid #d1d5db", borderRadius: 4,
                            background: "#fff", fontSize: 11, fontWeight: 600, color: "#374151", cursor: "pointer",
                            minHeight: 40
                        }}>
                            <BookOpen style={{ width: 12, height: 12 }} />
                            Instructions
                        </button>
                    </div>
                </aside>
            </div>

            {/* ══ MOBILE QUESTION PALETTE BOTTOM SHEET (< 1024px) ══ */}
            {isMobilePaletteOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
                    {/* Backdrop */}
                    <div
                        onClick={() => setIsMobilePaletteOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
                    />

                    {/* Bottom Sheet Modal */}
                    <div
                        style={{ maxHeight: "70dvh" }}
                        className="relative w-full max-h-[70dvh] bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl flex flex-col z-10 animate-in slide-in-from-bottom duration-200 border-t border-gray-200 dark:border-gray-800"
                    >
                        {/* Drag Handle Bar */}
                        <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto my-2.5 shrink-0" />

                        {/* Sheet Header */}
                        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/80 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold text-xs">
                                    <User className="w-4 h-4 text-gray-300" />
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100">{candidateName}</h3>
                                    <p className="text-[10px] text-gray-500">Candidate</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsMobilePaletteOpen(false)}
                                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer"
                                aria-label="Close palette"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Live Counts Legend (2 or 3 columns) */}
                        <div className="p-3 border-b border-gray-200 dark:border-gray-800 grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white dark:bg-gray-900 shrink-0">
                            <LegendItem bg="#22c55e" label="Answered" count={counts.answered} />
                            <LegendItem bg="#9333ea" label="Marked" count={counts.marked} />
                            <LegendItem bg="#fff" label="Not Visited" count={counts.notVisited} />
                            <LegendItem bg="linear-gradient(135deg,#9333ea 50%,#22c55e 50%)" label="Marked &amp; Ans" count={counts.answeredMarked} />
                            <LegendItem bg="#ef4444" label="Not Answered" count={counts.notAnswered} />
                            {isBpsc && <LegendItem bg="#9ca3af" label="Not Selected" count={0} isBox />}
                        </div>

                        {/* Section Header */}
                        <div className="px-4 py-2 bg-sky-50 dark:bg-sky-950/40 border-b border-sky-100 dark:border-sky-900 shrink-0">
                            <span className="text-xs font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wide">
                                SECTION : {currentQuestion?.sectionTitle || "Section"}
                            </span>
                        </div>

                        {/* Question Numbers Grid (5 cols, scrollable) */}
                        <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: "thin" }}>
                            <div className="grid grid-cols-5 gap-2">
                                {questions.map((q, i) => {
                                    const a = attempts[q.id]
                                    const st = a?.state ?? "not-visited"
                                    const isCur = i === currentQ
                                    return (
                                        <button
                                            key={q.id}
                                            onClick={() => {
                                                goTo(i)
                                                setIsMobilePaletteOpen(false)
                                            }}
                                            style={{
                                                ...paletteStyle(st, isCur),
                                                minHeight: 44,
                                                borderRadius: 8,
                                                fontSize: 13,
                                                fontWeight: 700,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                cursor: "pointer"
                                            }}
                                            className="active:scale-95 transition-transform"
                                        >
                                            {i + 1}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Sheet Footer Actions */}
                        <div
                            style={{
                                paddingBottom: "max(12px, env(safe-area-inset-bottom))"
                            }}
                            className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex flex-col gap-2 shrink-0"
                        >
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => {
                                        setIsMobilePaletteOpen(false)
                                        setShowQPaper(true)
                                    }}
                                    className="min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200 cursor-pointer"
                                >
                                    <FileText className="w-4 h-4 text-gray-500" />
                                    Paper
                                </button>
                                <button
                                    onClick={() => {
                                        setIsMobilePaletteOpen(false)
                                        setShowInstructionsModal(true)
                                    }}
                                    className="min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200 cursor-pointer"
                                >
                                    <BookOpen className="w-4 h-4 text-gray-500" />
                                    Instructions
                                </button>
                            </div>
                            <button
                                onClick={() => {
                                    setIsMobilePaletteOpen(false)
                                    setShowSubmitModal(true)
                                }}
                                className="min-h-[44px] w-full py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-sm flex items-center justify-center cursor-pointer"
                            >
                                Submit Test
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ SUBMIT MODAL ═════════════════════════════════════ */}
            {showSubmitModal && (
                <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", padding: 16 }}>
                    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", boxShadow: "0 8px 32px rgba(0,0,0,0.15)", maxWidth: 380, width: "100%", padding: 24 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#fffbeb", border: "1px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <AlertTriangle style={{ width: 22, height: 22, color: "#f59e0b" }} />
                            </div>
                            <div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Are you sure you want to Submit?</div>
                                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>This action will finalize your attempt.</div>
                            </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                            {[
                                { l: "Answered", v: counts.answered, bg: "#f0fdf4", c: "#16a34a" },
                                { l: "Not Answered", v: counts.notAnswered, bg: "#fef2f2", c: "#dc2626" },
                                { l: "Not Visited", v: counts.notVisited, bg: "#f9fafb", c: "#374151" },
                                { l: "Marked", v: counts.marked + counts.answeredMarked, bg: "#faf5ff", c: "#7e22ce" },
                            ].map(item => (
                                <div key={item.l} style={{ padding: "12px 8px", borderRadius: 10, background: item.bg, textAlign: "center" }}>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: item.c }}>{item.v}</div>
                                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2, fontWeight: 600 }}>{item.l}</div>
                                </div>
                            ))}
                        </div>
                        {/* Tab switch warning in submit modal */}
                        {tabSwitchCount > 0 && (
                            <div style={{
                                display: "flex", alignItems: "center", gap: 8,
                                padding: "10px 12px", borderRadius: 8, marginBottom: 14,
                                background: "#fef2f2", border: "1px solid #fca5a5"
                            }}>
                                <ShieldAlert style={{ width: 16, height: 16, color: "#dc2626", flexShrink: 0 }} />
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626" }}>
                                        Tab Switches: {tabSwitchCount} ⚠️
                                    </div>
                                    <div style={{ fontSize: 11, color: "#6b7280" }}>Violations recorded in your result</div>
                                </div>
                            </div>
                        )}
                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={() => setShowSubmitModal(false)} style={{ flex: 1, minHeight: 44, padding: "10px 0", border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", fontSize: 13, fontWeight: 700, color: "#374151", cursor: "pointer" }}>
                                Continue Test
                            </button>
                            <button onClick={handleSubmit} data-testid="cbt-confirm-submit-button" style={{ flex: 1, minHeight: 44, padding: "10px 0", border: "none", borderRadius: 10, background: "#0d9488", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
                                Submit Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ EXIT CONFIRM MODAL (Back Navigation Prevention) ═════ */}
            {showExitConfirmModal && (
                <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", padding: 16 }}>
                    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", maxWidth: 380, width: "100%", padding: 24, textAlign: "center" }}>
                        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fef3c7", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                            <AlertTriangle style={{ width: 24, height: 24 }} />
                        </div>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#111827", margin: "0 0 6px" }}>Leave Examination?</h3>
                        <p style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.5, margin: "0 0 20px" }}>
                            Your answers are saved on the server. Leaving the arena during a live test may record tab switch violations or cause you to run out of time.
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <button
                                onClick={() => setShowExitConfirmModal(false)}
                                style={{ minHeight: 44, padding: "10px 0", borderRadius: 10, background: "#0284c7", color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}
                            >
                                Stay &amp; Continue Test
                            </button>
                            <button
                                onClick={async () => {
                                    setShowExitConfirmModal(false)
                                    await safeExitFullscreen()
                                    router.push(`/test-series/${seriesId}`)
                                }}
                                style={{ minHeight: 44, padding: "10px 0", borderRadius: 10, background: "#f3f4f6", color: "#6b7280", fontWeight: 600, fontSize: 13, border: "1px solid #d1d5db", cursor: "pointer" }}
                            >
                                Exit to Test Series
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ REPORT MODAL ═════════════════════════════════════ */}
            {showReportModal && (
                <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", padding: 16 }}>
                    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", boxShadow: "0 8px 32px rgba(0,0,0,0.15)", maxWidth: 380, width: "100%", padding: 22 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: 6 }}>
                                <Flag style={{ width: 15, height: 15, color: "#ef4444" }} /> Report Question {currentQ + 1}
                            </span>
                            <button
                                onClick={() => setShowReportModal(false)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
                                aria-label="Close report modal"
                            >
                                <X style={{ width: 18, height: 18 }} />
                            </button>
                        </div>
                        {["Wrong answer key", "Incorrect/Incomplete question", "Typo or Grammar error", "Image not displaying", "Other issue"].map(issue => (
                            <label key={issue} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, cursor: "pointer", padding: "4px 0" }}>
                                <input type="checkbox" style={{ width: 18, height: 18, accentColor: "#0ea5e9" }} />
                                <span style={{ fontSize: 13, color: "#374151" }}>{issue}</span>
                            </label>
                        ))}
                        <button onClick={() => setShowReportModal(false)} style={{
                            width: "100%", marginTop: 8, minHeight: 44, borderRadius: 10,
                            background: "#0ea5e9", color: "#fff", fontWeight: 700, fontSize: 14,
                            border: "none", cursor: "pointer"
                        }}>
                            Submit Report
                        </button>
                    </div>
                </div>
            )}

            {/* ══ QUESTION PAPER MODAL (Responsive Sheet on mobile) ═════════════════════════ */}
            {showQPaper && (
                <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", padding: 12 }}>
                    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", maxWidth: 680, width: "100%", maxHeight: "85dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
                            <span style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>Question Paper</span>
                            <button
                                onClick={() => setShowQPaper(false)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
                                aria-label="Close question paper"
                            >
                                <X style={{ width: 18, height: 18 }} />
                            </button>
                        </div>
                        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
                            {questions.map((q, i) => (
                                <div key={q.id} style={{ paddingBottom: 14, marginBottom: 14, borderBottom: "1px solid #f3f4f6" }}>
                                    <button onClick={() => { goTo(i); setShowQPaper(false) }}
                                        style={{ textAlign: "left", width: "100%", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#374151", padding: 0, minHeight: 44, display: "flex", alignItems: "flex-start", gap: 6 }}>
                                        <strong style={{ color: "#0ea5e9", flexShrink: 0 }}>Q{i + 1}.</strong>
                                        <span style={{ lineHeight: 1.5 }}>{(viewLang === "Hindi" && q.textHi) ? q.textHi : q.text}</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ══ INSTRUCTIONS MODAL (Responsive Sheet on mobile) ═════════════════════════ */}
            {showInstructionsModal && (
                <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", padding: 12 }}>
                    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", maxWidth: 540, width: "100%", maxHeight: "85dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
                            <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-sky-600" />
                                <span style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>Exam Instructions</span>
                            </div>
                            <button
                                onClick={() => setShowInstructionsModal(false)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
                                aria-label="Close instructions"
                            >
                                <X style={{ width: 18, height: 18 }} />
                            </button>
                        </div>
                        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
                            <h4 className="font-bold text-gray-900 mb-2">General Instructions:</h4>
                            <ul className="list-disc pl-5 space-y-1.5 mb-4 text-xs text-gray-700">
                                <li>The clock will be set at the server. The countdown timer at the top displays remaining time.</li>
                                <li>When the timer reaches zero, the examination will end by itself. You need not terminate or submit your examination.</li>
                                <li>Marking Scheme: +1 mark for correct answers, -0.33 negative marking for incorrect attempts.</li>
                                <li>Do not switch tabs or windows. Three violations will trigger an automated immediate submission.</li>
                            </ul>
                            <h4 className="font-bold text-gray-900 mb-2">Palette Legend:</h4>
                            <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg text-xs mb-4">
                                <LegendItem bg="#22c55e" label="Answered" count={counts.answered} />
                                <LegendItem bg="#9333ea" label="Marked" count={counts.marked} />
                                <LegendItem bg="#fff" label="Not Visited" count={counts.notVisited} />
                                <LegendItem bg="linear-gradient(135deg,#9333ea 50%,#22c55e 50%)" label="Marked & Ans" count={counts.answeredMarked} />
                                <LegendItem bg="#ef4444" label="Not Answered" count={counts.notAnswered} />
                            </div>
                        </div>
                        <div className="p-3 border-t border-gray-100 flex justify-end shrink-0">
                            <button
                                onClick={() => setShowInstructionsModal(false)}
                                className="min-h-[44px] px-5 py-2 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 transition cursor-pointer"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ PAUSE OVERLAY ════════════════════════════════════ */}
            {paused && (
                <div style={{ position: "fixed", inset: 0, zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.65)" }}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 40, textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
                        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#f0f9ff", border: "2px solid #bae6fd", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                            <Pause style={{ width: 28, height: 28, color: "#0ea5e9" }} />
                        </div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>Test Paused</h3>
                        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>Timer is paused. Click Resume to continue.</p>
                        <button onClick={() => setPaused(false)} style={{ padding: "10px 32px", borderRadius: 8, background: "#0ea5e9", color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}>
                            ▶ Resume Test
                        </button>
                    </div>
                </div>
            )}

            {/* ══ TAB WARNING MODAL (violations 1 & 2) ════════════ */}
            {showTabWarningModal && (
                <TabWarningModal
                    count={tabSwitchCount}
                    onClose={() => setShowTabWarningModal(false)}
                />
            )}

            {/* ══ AUTO-SUBMIT MODAL (violation 3) ═════════════════ */}
            {showAutoSubmitModal && (
                <AutoSubmitModal onViewResults={handleAutoSubmit} />
            )}

            {/* ══ SUBMITTING OVERLAY ══════════════════════════════ */}
            {submitting && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 9999,
                    background: "rgba(15,23,42,0.85)", backdropFilter: "blur(4px)",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: 16, padding: 24, textAlign: "center"
                }}>
                    <div style={{
                        width: 56, height: 56,
                        border: "4px solid #38bdf8", borderTopColor: "transparent",
                        borderRadius: "50%", animation: "spin 0.8s linear infinite"
                    }} />
                    <h3 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: 0 }}>
                        Submitting Your Exam...
                    </h3>
                    <p style={{ color: "#cbd5e1", fontSize: 13, maxWidth: 360, margin: 0, lineHeight: 1.5 }}>
                        Please wait while your answers are safely processed and graded on the server. Do not close this window.
                    </p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                </div>
            )}

            {/* ══ SUBMIT ERROR RETRY MODAL ════════════════════════ */}
            {submitError && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 9999,
                    background: "rgba(15,23,42,0.8)", backdropFilter: "blur(4px)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: 20
                }}>
                    <div style={{
                        background: "#fff", borderRadius: 16,
                        maxWidth: 440, width: "100%", padding: 28,
                        textAlign: "center", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.3)"
                    }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: "50%",
                            background: "#fee2e2", color: "#dc2626",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            margin: "0 auto 16px"
                        }}>
                            <AlertTriangle style={{ width: 28, height: 28 }} />
                        </div>
                        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#111827", margin: "0 0 8px" }}>
                            Submission Failed
                        </h3>
                        <p style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.5, margin: "0 0 24px" }}>
                            {submitError}
                        </p>
                        <div style={{ display: "flex", gap: 12 }}>
                            <button
                                onClick={() => performSubmit(attempts)}
                                style={{
                                    flex: 1, padding: "12px 0",
                                    background: "#0ea5e9", color: "#fff",
                                    border: "none", borderRadius: 8,
                                    fontWeight: 700, fontSize: 14, cursor: "pointer"
                                }}
                            >
                                Retry Submit Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────
// Page Export
// ─────────────────────────────────────────────────────────────────

const DynamicArena = dynamic(() => Promise.resolve(Arena), {
    ssr: false,
    loading: () => (
        <div style={{ height: "100dvh", width: "100%", maxWidth: "100vw", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fff", gap: 16, fontFamily: "sans-serif" }}>
            <div style={{ width: 52, height: 52, border: "4px solid #0ea5e9", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: "#374151" }}>Preparing your exam...</p>
            <p style={{ fontSize: 12, color: "#9ca3af" }}>Loading questions, please wait</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
    ),
})

export default function AttemptClient() {
    return (
        <Suspense fallback={
            <div style={{ height: "100dvh", width: "100%", maxWidth: "100vw", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fff", gap: 16, fontFamily: "sans-serif" }}>
                <div style={{ width: 52, height: 52, border: "4px solid #0ea5e9", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: "#374151" }}>Preparing your exam...</p>
                <p style={{ fontSize: 12, color: "#9ca3af" }}>Loading questions, please wait</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
        }>
            <DynamicArena />
        </Suspense>
    )
}
