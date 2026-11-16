"use client"

import { useState } from "react"
import { X, Download, ClipboardCheck, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { PYQ_TAXONOMY } from "@/lib/pyq/taxonomy"

interface ExportResponse {
  items: { no: number; shortId: string; q: string; options: string[] }[]
  text: string
}

interface CheckResponse {
  checked: number
  ok: number
  mismatches: { no: number; shortId: string; stored: string | null; gemini: string }[]
  unmatched: number[]
  gated: number
  parseErrors: string[]
}

export function AnswerCheckModal({
  onClose,
  onDone,
}: {
  onClose: () => void
  onDone: () => void
}) {
  const [subject, setSubject] = useState("")
  const [top, setTop] = useState("")
  const [exam, setExam] = useState("")
  const [exported, setExported] = useState<ExportResponse | null>(null)
  const [checkText, setCheckText] = useState("")
  const [result, setResult] = useState<CheckResponse | null>(null)
  const [busy, setBusy] = useState(false)

  const topicOptions = PYQ_TAXONOMY.find((s) => s.name === subject)?.topics ?? []

  const runExport = async () => {
    setBusy(true)
    try {
      const params = new URLSearchParams({ resource: "answer-check-export" })
      if (subject) params.set("subject", subject)
      if (top) params.set("top", top)
      if (exam) params.set("exam", exam)
      const res = await fetch(`/api/admin/content-engine/batch?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Export failed")
      setExported(data as ExportResponse)
      toast.success(`Exported ${data.items.length} question(s)`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed")
    } finally {
      setBusy(false)
    }
  }

  const runCheck = async () => {
    setBusy(true)
    try {
      const res = await fetch("/api/admin/content-engine/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import-answer-check", text: checkText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Answer check failed")
      setResult(data as CheckResponse)
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Answer check failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white dark:bg-[#0a1628] w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl max-h-[92dvh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Answer cross-check (no API)</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Step 1: export */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">1 · Export questions without answers</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={subject}
                onChange={(e) => { setSubject(e.target.value); setTop("") }}
                className="min-h-[44px] rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1628] px-3 text-sm text-gray-900 dark:text-gray-100"
              >
                <option value="">All subjects</option>
                {PYQ_TAXONOMY.map((s) => (
                  <option key={s.num} value={s.name}>{s.num}. {s.name}</option>
                ))}
              </select>
              <select
                value={top}
                onChange={(e) => setTop(e.target.value)}
                disabled={!topicOptions.length}
                className="min-h-[44px] rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1628] px-3 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50"
              >
                <option value="">All topics</option>
                {topicOptions.map((t) => (
                  <option key={t.num} value={`${t.num} ${t.name}`}>{t.num} {t.name}</option>
                ))}
              </select>
              <input
                value={exam}
                onChange={(e) => setExam(e.target.value)}
                placeholder="Exam (optional)"
                className="min-h-[44px] rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1628] px-3 text-sm text-gray-900 dark:text-gray-100"
              />
            </div>
            <button
              type="button"
              onClick={runExport}
              disabled={busy}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export
            </button>
            {exported && (
              <pre className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-3 text-[11px] text-gray-700 dark:text-gray-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
                {exported.text}
              </pre>
            )}
          </div>

          {/* Step 2: import answer list */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">2 · Paste Gemini's "1-B, 2-C, …" reply</p>
            <textarea
              value={checkText}
              onChange={(e) => setCheckText(e.target.value)}
              rows={4}
              placeholder={"1-B, 2-C, 3-A\n4. D\n5) B"}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1628] px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={runCheck}
              disabled={!checkText.trim() || busy}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
              Check answers
            </button>
          </div>

          {result && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">3 · Result</p>
              <div className={`rounded-2xl border p-3 text-sm ${result.mismatches.length ? "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300" : "border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"}`}>
                <p className="font-bold">{result.checked} checked · {result.ok} match · {result.mismatches.length} mismatch</p>
                {result.mismatches.length > 0 && (
                  <p className="text-xs mt-1">
                    {result.gated} question(s) set to NEEDS_REVIEW with blocking gate <strong>answer-mismatch</strong>.
                  </p>
                )}
                {result.unmatched.length > 0 && (
                  <p className="text-xs mt-1">Numbers not found in export snapshot: {result.unmatched.join(", ")}</p>
                )}
              </div>
              {result.mismatches.map((m) => (
                <div key={m.no} className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-300">
                  <strong>#{m.no} {m.shortId}:</strong> stored <strong>{m.stored ?? "unparseable"}</strong> vs Gemini <strong>{m.gemini}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
