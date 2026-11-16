"use client"

import { useEffect, useState } from "react"
import { X, CheckCircle2, XCircle, Loader2, ChevronLeft, ChevronRight, Inbox } from "lucide-react"
import { toast } from "sonner"

interface TranslationSolution {
  status?: string
  warnings?: string[]
}

interface HindiTranslationItem {
  id: string
  q: string
  options: unknown
  answer: string | null
  solution: TranslationSolution | null
  isReviewed: boolean
  question: {
    shortId: string
    q: string
    answer: string | null
    sub: string | null
    top: string | null
    exam: string | null
    year: string | null
  }
}

/** Hindi translation review queue (Phase 2.8): approve / reject pending hi translations. */
export function HindiReviewModal({
  onClose,
  onChanged,
}: {
  onClose: () => void
  onChanged: () => void
}) {
  const [items, setItems] = useState<HindiTranslationItem[] | null>(null)
  const [index, setIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch("/api/admin/content-engine/translations?lang=hi&reviewed=false&take=100")
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to load Hindi translations")
        if (!cancelled) setItems(data.translations as HindiTranslationItem[])
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load")
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const review = async (action: "approve" | "reject") => {
    if (!items) return
    const current = items[Math.min(index, items.length - 1)]
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/content-engine/translations/${current.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Review action failed")
      toast.success(action === "approve" ? "Hindi translation approved" : "Rejected — stays in queue")
      setItems((prev) => (prev ? prev.filter((it) => it.id !== current.id) : prev))
      setIndex((i) => Math.max(0, Math.min(i, (items.length - 1) - 1)))
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Review action failed")
    } finally {
      setBusy(false)
    }
  }

  const loading = items === null && !loadError
  const current = items && items.length > 0 ? items[Math.min(index, items.length - 1)] : null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white dark:bg-[#0a1628] w-full sm:max-w-4xl rounded-t-3xl sm:rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Hindi review queue</h2>
            {items && <span className="text-xs text-gray-500 dark:text-gray-400">{items.length} pending</span>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {loading && (
          <div className="flex-1 flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        )}

        {loadError && (
          <div className="flex-1 p-6 text-center">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">{loadError}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 min-h-[44px] px-4 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
            >
              Close
            </button>
          </div>
        )}

        {items && items.length === 0 && (
          <div className="flex-1 p-6 text-center">
            <Inbox className="h-8 w-8 text-gray-400 mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Hindi review queue is empty 🎉</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Import Hindi translations first (Add Batch → Hindi tab).
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 min-h-[44px] px-4 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
            >
              Close
            </button>
          </div>
        )}

        {current && (
          <>
            {/* Nav */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
                className="p-2 min-h-[44px] min-w-[44px] rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 cursor-pointer"
                aria-label="Previous"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{current.question.shortId}</span>
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(items!.length - 1, i + 1))}
                disabled={index >= items!.length - 1}
                className="p-2 min-h-[44px] min-w-[44px] rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 cursor-pointer"
                aria-label="Next"
              >
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Side-by-side: English source | Hindi translation */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">English source</p>
                  <p className="text-xs text-gray-800 dark:text-gray-200">{current.question.q}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {current.question.exam || "—"} {current.question.year || ""}
                    {current.question.sub ? ` · ${current.question.sub}` : ""}
                    {current.question.top ? ` · ${current.question.top}` : ""}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Answer: <strong className="text-emerald-700 dark:text-emerald-400">{current.question.answer}</strong>
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Hindi translation</p>
                  {(current.solution?.warnings || []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {current.solution!.warnings!.map((w, i) => (
                        <span key={i} className="text-[10px] font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-full px-2 py-0.5">
                          {w}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-800 dark:text-gray-200">{current.q}</p>
                  <ul className="space-y-1">
                    {(Array.isArray(current.options) ? (current.options as string[]) : []).map((opt, i) => (
                      <li key={i} className="text-xs text-gray-700 dark:text-gray-300">
                        {"ABCD".slice(i, i + 1)}) {opt}
                      </li>
                    ))}
                  </ul>
                  {current.answer && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Answer: <strong className="text-emerald-700 dark:text-emerald-400">{current.answer}</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-800">
              <button
                type="button"
                onClick={() => review("approve")}
                disabled={busy}
                className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Approve
              </button>
              <button
                type="button"
                onClick={() => review("reject")}
                disabled={busy}
                className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
