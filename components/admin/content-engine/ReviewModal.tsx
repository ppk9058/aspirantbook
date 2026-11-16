"use client"

import { useState } from "react"
import { X, CheckCircle2, XCircle, Save, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import type { ContentEngineQuestionItem } from "./ContentEngineStudioClient"

export interface SolutionJson {
  keyPoints?: string[]
  additionalInfo?: { heading: string; points: { text: string; sub: string[] }[] }[]
  optionAnalysis?: { letter: string; verdict: string; reason: string }[]
  memoryTip?: string | null
  concepts?: string[]
  check?: string | null
  checkNote?: string | null
  unsure?: string | null
  status?: string
  warnings?: string[]
}

interface EditState {
  _id: string
  q: string
  options: string[]
  answer: string
  sub: string
  top: string
  exam: string
  year: string
  check: string
  checkNote: string
  unsure: string
}

function toEdit(q: ContentEngineQuestionItem): EditState {
  const sol = (q.solution || {}) as SolutionJson
  return {
    _id: q.id,
    q: q.q,
    options: [...(q.options as string[]), "", "", "", ""].slice(0, 4),
    answer: q.answer || "A",
    sub: q.sub || "",
    top: q.top || "",
    exam: q.exam || "",
    year: q.year || "",
    check: sol.check || "agree",
    checkNote: sol.checkNote || "",
    unsure: sol.unsure || "",
  }
}

export function ReviewModal({
  questions,
  onClose,
  onUpdated,
}: {
  questions: ContentEngineQuestionItem[]
  onClose: () => void
  onUpdated: () => void
}) {
  const [index, setIndex] = useState(0)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [busy, setBusy] = useState(false)

  if (questions.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-[#0a1628] w-full sm:max-w-lg rounded-3xl border border-gray-200 dark:border-gray-800 p-6 text-center">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Review queue is empty 🎉</p>
          <button type="button" onClick={onClose} className="mt-4 w-full min-h-[44px] rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
            Close
          </button>
        </div>
      </div>
    )
  }

  const current = questions[Math.min(index, questions.length - 1)]
  const sol = (current.solution || {}) as SolutionJson
  const state = edit && edit._id === current.id ? edit : null

  const startEdit = () => setEdit(toEdit(current))
  const patchEdit = (patch: Partial<Omit<EditState, "_id">>) => {    setEdit((prev) => (prev && prev._id === current.id ? { ...prev, ...patch } : prev))
  }

  const saveEdits = async (thenAction: "approve" | "reject" | null) => {
    setBusy(true)
    try {
      if (state) {
        const payload: Record<string, unknown> = {
          action: "save",
          edits: {
            q: state.q,
            options: state.options.filter((o) => o.trim()),
            answer: state.answer,
            sub: state.sub || null,
            top: state.top || null,
            exam: state.exam || null,
            year: state.year || null,
            check: state.check,
            checkNote: state.checkNote || null,
            unsure: state.unsure || null,
          },
        }
        const res = await fetch(`/api/admin/content-engine/${current.id}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Save failed")
      }
      if (thenAction) {
        const res = await fetch(`/api/admin/content-engine/${current.id}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: thenAction }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error + (data.reasons ? `: ${data.reasons.join("; ")}` : "") || "Review action failed")
        toast.success(thenAction === "approve" ? "Approved" : "Rejected — stays in queue")
      } else {
        toast.success("Edits saved")
      }
      setEdit(null)
      onUpdated()
      if (thenAction === "approve") {
        setIndex((i) => Math.min(i + 1, questions.length - 1))
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Review action failed")
    } finally {
      setBusy(false)
    }
  }

  const bulkApproveClean = async () => {
    setBusy(true)
    try {
      const res = await fetch("/api/admin/content-engine/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionIds: questions.map((q) => q.id),
          action: "approve",
        }),
      })
      const data = await res.json()
      if (!res.ok && data.affected === 0) {
        toast.error(data.error || "No question passed the approve guard")
        if (data.skipped) {
          for (const s of data.skipped.slice(0, 5)) toast.warning(s.reason, { description: s.id })
        }
      } else {
        toast.success(`Approved ${data.affected}; skipped ${data.skipped?.length || 0}`)
      }
      onUpdated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk approve failed")
    } finally {
      setBusy(false)
    }
  }

  const guardOk =
    (state ? state.check : sol.check || "agree") === "agree" &&
    !(state ? state.unsure : sol.unsure) &&
    (sol.warnings || []).length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white dark:bg-[#0a1628] w-full sm:max-w-4xl rounded-t-3xl sm:rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Review queue</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">{index + 1}/{questions.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={bulkApproveClean}
              disabled={busy}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 min-h-[40px] rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve all clean
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Nav */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800">
          <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} className="p-2 min-h-[44px] min-w-[44px] rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 cursor-pointer" aria-label="Previous">
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{current.shortId}</span>
          <button type="button" onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))} disabled={index >= questions.length - 1} className="p-2 min-h-[44px] min-w-[44px] rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 cursor-pointer" aria-label="Next">
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Side-by-side */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: question + answer */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Question</p>
              {state ? (
                <textarea value={state.q} onChange={(e) => patchEdit({ q: e.target.value })} rows={3} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1628] px-2.5 py-1.5 text-xs text-gray-900 dark:text-gray-100" />
              ) : (
                <p className="text-xs text-gray-800 dark:text-gray-200">{current.q}</p>
              )}
              <div className="space-y-1">
                {(state ? state.options : (current.options as string[])).map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {state ? (
                      <input
                        value={opt}
                        onChange={(e) => {
                          const next = [...state.options]
                          next[i] = e.target.value
                          patchEdit({ options: next })
                        }}
                        className="w-full min-h-[36px] rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1628] px-2 text-xs text-gray-900 dark:text-gray-100"
                      />
                    ) : (
                      <span className={`text-xs px-2 py-1 rounded-lg ${opt === current.answer ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold" : "text-gray-700 dark:text-gray-300"}`}>
                        {"ABCD".slice(i, i + 1)}) {opt}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {state ? (
                  <>
                    <input value={state.answer} onChange={(e) => patchEdit({ answer: e.target.value.toUpperCase().slice(0, 1) })} placeholder="Answer" className="min-h-[40px] rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1628] px-2 text-xs text-gray-900 dark:text-gray-100" />
                    <input value={state.exam} onChange={(e) => patchEdit({ exam: e.target.value })} placeholder="Exam" className="min-h-[40px] rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1628] px-2 text-xs text-gray-900 dark:text-gray-100" />
                    <input value={state.sub} onChange={(e) => patchEdit({ sub: e.target.value })} placeholder="Subject" className="min-h-[40px] rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1628] px-2 text-xs text-gray-900 dark:text-gray-100" />
                    <input value={state.top} onChange={(e) => patchEdit({ top: e.target.value })} placeholder="Topic" className="min-h-[40px] rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1628] px-2 text-xs text-gray-900 dark:text-gray-100" />
                  </>
                ) : (
                  <>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Answer: <strong className="text-emerald-700 dark:text-emerald-400">{current.answer}</strong></span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">{current.exam || "—"} {current.year || ""}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 col-span-2">{current.sub || "Uncategorized"} {current.top ? `· ${current.top}` : ""}</span>
                  </>
                )}
              </div>
            </div>

            {/* Right: solution preview + review fields */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Structured solution</p>
              {sol.warnings && sol.warnings.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {sol.warnings.map((w, i) => (
                    <span key={i} className="text-[10px] font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-full px-2 py-0.5">{w}</span>
                  ))}
                </div>
              )}
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5">
                <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Key Points</p>
                <ul className="mt-1 space-y-0.5">
                  {(sol.keyPoints || []).map((k, i) => (
                    <li key={i} className="text-xs text-gray-800 dark:text-gray-200">• {k}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-sky-200 dark:border-sky-900 bg-sky-50/50 dark:bg-sky-950/20 p-2.5">
                <p className="text-[10px] font-bold text-sky-800 dark:text-sky-300 uppercase">Additional Information</p>
                {(sol.additionalInfo || []).map((s, i) => (
                  <div key={i} className="mt-1">
                    {s.heading && <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{s.heading}</p>}
                    <ul className="space-y-0.5">
                      {s.points.map((p, j) => (
                        <li key={j} className="text-xs text-gray-800 dark:text-gray-200">• {p.text}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-2.5">
                <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase">Option Analysis</p>
                {(sol.optionAnalysis || []).map((r, i) => (
                  <p key={i} className={`text-xs ${r.verdict === "Correct" ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                    {r.verdict === "Correct" ? "✓" : "✗"} {r.letter}) {r.verdict} — {r.reason}
                  </p>
                ))}
                {sol.memoryTip && (
                  <p className="mt-1.5 text-xs text-amber-800 dark:text-amber-300">💡 {sol.memoryTip}</p>
                )}
                {sol.concepts && sol.concepts.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {sol.concepts.map((c) => (
                      <span key={c} className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 rounded-full px-2 py-0.5">{c}</span>
                    ))}
                  </div>
                )}
              </div>

              {sol.checkNote && (
                <p className="text-xs text-amber-800 dark:text-amber-300"><strong>CHECK_NOTE:</strong> {sol.checkNote}</p>
              )}
              {sol.unsure && (
                <p className="text-xs text-amber-800 dark:text-amber-300"><strong>UNSURE:</strong> {sol.unsure}</p>
              )}

              {/* Review decision fields (inline edit) */}
              {state ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  <select value={state.check} onChange={(e) => patchEdit({ check: e.target.value })} className="min-h-[40px] rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1628] px-2 text-xs text-gray-900 dark:text-gray-100">
                    <option value="agree">CHECK: agree</option>
                    <option value="disagree">CHECK: disagree</option>
                    <option value="unsure">CHECK: unsure</option>
                  </select>
                  <input value={state.checkNote} onChange={(e) => patchEdit({ checkNote: e.target.value })} placeholder="CHECK_NOTE" className="min-h-[40px] rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1628] px-2 text-xs text-gray-900 dark:text-gray-100" />
                  <input value={state.unsure} onChange={(e) => patchEdit({ unsure: e.target.value })} placeholder="UNSURE" className="min-h-[40px] rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1628] px-2 text-xs text-gray-900 dark:text-gray-100" />
                </div>
              ) : (
                <button type="button" onClick={startEdit} className="w-full min-h-[40px] rounded-lg text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 cursor-pointer">
                  Edit inline
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-800">
          <button
            type="button"
            onClick={() => saveEdits("approve")}
            disabled={busy || !guardOk}
            title={!guardOk ? "Guard: CHECK=agree, UNSURE empty, no warnings" : "Approve"}
            className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Approve
          </button>
          <button
            type="button"
            onClick={() => saveEdits("reject")}
            disabled={busy}
            className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
          {state && (
            <button
              type="button"
              onClick={() => saveEdits(null)}
              disabled={busy}
              className="min-h-[44px] px-3 inline-flex items-center gap-1.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> Save only
            </button>
          )}
          <button
            type="button"
            onClick={bulkApproveClean}
            disabled={busy}
            className="sm:hidden min-h-[44px] px-3 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 cursor-pointer"
          >
            Approve all clean
          </button>
        </div>
      </div>
    </div>
  )
}
