"use client"

import { useMemo, useState } from "react"
import { X, Eye, Upload, Copy, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { detectSolutionFormat, parseSolutionBatch } from "@/lib/pyq/solution-format"
import { buildGeminiPrompt } from "@/lib/pyq/gemini-prompt"
import { PYQ_TAXONOMY, taxonomyListText } from "@/lib/pyq/taxonomy"

interface PreviewQuestion {
  index: number
  q: string
  options: string[]
  answer: string
  answerIndex: number
  no: string | null
  sourceNo: number | null
  tag: string | null
  subject: string | null
  topic: string | null
  keyPoints: string[]
  additionalInfo: { heading: string; points: { text: string; sub: string[] }[] }[]
  optionAnalysis: { letter: string; verdict: string; reason: string }[]
  memoryTip: string | null
  concepts: string[]
  check: string | null
  checkNote: string | null
  unsure: string | null
  detectedExam: string | null
  detectedYear: string | null
  flags: string[]
  duplicate: boolean
  repetitionMax: number
  repetitionExceeds: boolean
  repetitionMatch: { shortId: string; concepts: string[] } | null
  needsReview: boolean
}

interface PreviewResponse {
  format: "solution-v1" | "raw-mcq"
  errorBlocks: { index: number; error: string; raw: string }[]
  ignoredLineCount: number
  questions: PreviewQuestion[]
}

interface EditableItem extends PreviewQuestion {
  excluded: boolean
}

const LETTERS = ["A", "B", "C", "D", "E"]

function Pill({ tone, children }: { tone: "red" | "amber" | "purple" | "sky"; children: React.ReactNode }) {
  const tones = {
    red: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
    amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
    purple: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900",
    sky: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900",
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  )
}

function pillsFor(item: PreviewQuestion) {
  const pills: { tone: "red" | "amber" | "purple" | "sky"; label: string }[] = []
  const missing = item.flags.filter((f) => f.startsWith("missing:") || f === "options<2" || f.startsWith("stray-text"))
  if (item.flags.includes("no-answer")) missing.push("missing:ANSWER")
  if (missing.length) pills.push({ tone: "red", label: `Parse: ${missing.join(", ")}` })
  if (item.check === "disagree" || item.check === "unsure")
    pills.push({ tone: "red", label: `CHECK ${item.check}` })
  if (item.unsure) pills.push({ tone: "amber", label: "UNSURE set" })
  if (item.duplicate) pills.push({ tone: "amber", label: "Possible duplicate" })
  if (item.repetitionExceeds) pills.push({ tone: "purple", label: `Repetition ${Math.round(item.repetitionMax * 100)}%` })
  const cls = item.flags.filter((f) => f.endsWith("-not-in-taxonomy") || f === "topic-without-subject")
  if (cls.length) pills.push({ tone: "sky", label: cls.join(", ") })
  if (!item.subject) pills.push({ tone: "sky", label: "Uncategorized" })
  return pills
}

export function AddBatchModal({
  onClose,
  onImported,
}: {
  onClose: () => void
  onImported: (count: number) => void
}) {
  const [step, setStep] = useState<"paste" | "preview" | "done">("paste")
  const [mode, setMode] = useState<"questions" | "hindi">("questions")
  const [hindiText, setHindiText] = useState("")
  const [hindiBusy, setHindiBusy] = useState(false)
  const [hindiResult, setHindiResult] = useState<{
    parsed: number
    imported: number
    skipped: { ref: string | null; no: string | null; reason: string }[]
    mismatches: number
    errorBlocks: number
  } | null>(null)
  const [text, setText] = useState("")
  const [defaultSubject, setDefaultSubject] = useState("")
  const [defaultTopic, setDefaultTopic] = useState("")
  const [defaultExam, setDefaultExam] = useState("")
  const [defaultYear, setDefaultYear] = useState("")
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [items, setItems] = useState<EditableItem[]>([])
  const [busy, setBusy] = useState(false)
  const [importResult, setImportResult] = useState<{ created: number; needsReview: number; duplicates: number; rowErrors: { index: number; error: string }[] } | null>(null)

  const formatDetected = useMemo(() => {
    if (!text.trim()) return null
    return detectSolutionFormat(text) ? "solution-v1" : "raw-mcq"
  }, [text])

  const hindiPreview = useMemo(() => {
    if (!hindiText.trim()) return null
    const batch = parseSolutionBatch(hindiText)
    const hi = batch.questions.filter((q) => q.lang === "hi" && q.ref)
    return { blocks: batch.questions.length, hiBlocks: hi.length, errorBlocks: batch.errorBlocks.length }
  }, [hindiText])

  const copyHindiExport = async () => {
    setHindiBusy(true)
    try {
      const res = await fetch("/api/admin/content-engine/batch?resource=hindi-export&take=50")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Export failed")
      await navigator.clipboard.writeText(data.text as string)
      toast.success(`Hindi export copied — ${data.items.length} question(s) (EN blocks with REF)`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed")
    } finally {
      setHindiBusy(false)
    }
  }

  const importHindi = async () => {
    if (!hindiText.trim()) {
      toast.error("Paste the Gemini Hindi blocks first")
      return
    }
    setHindiBusy(true)
    try {
      const res = await fetch("/api/admin/content-engine/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import-hindi", text: hindiText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Hindi import failed")
      setHindiResult(data)
      onImported(data.imported as number)
      toast.success(`Imported ${data.imported} Hindi translation(s), ${data.skipped?.length || 0} skipped`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hindi import failed")
    } finally {
      setHindiBusy(false)
    }
  }

  const topicOptions = useMemo(() => {
    const sub = PYQ_TAXONOMY.find((s) => s.name === defaultSubject)
    return sub ? sub.topics.map((t) => `${t.num} ${t.name}`) : []
  }, [defaultSubject])

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`Failed to copy ${label}`)
    }
  }

  const copyCoveredConcepts = async () => {
    try {
      const params = new URLSearchParams()
      if (defaultSubject) params.set("subject", defaultSubject)
      if (defaultTopic) params.set("topic", defaultTopic)
      const res = await fetch(`/api/admin/content-engine/batch?resource=covered-concepts&${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load covered concepts")
      await navigator.clipboard.writeText((data.concepts as string[]).join(", ") || "")
      toast.success(data.concepts.length ? `Copied ${data.concepts.length} covered concepts` : "No covered concepts yet")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to copy covered concepts")
    }
  }

  const runPreview = async () => {
    setBusy(true)
    try {
      const res = await fetch("/api/admin/content-engine/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          text,
          defaultSubject: defaultSubject || null,
          defaultTopic: defaultTopic || null,
          defaultExam: defaultExam || null,
          defaultYear: defaultYear || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Preview failed")
      setPreview(data as PreviewResponse)
      setItems((data as PreviewResponse).questions.map((q) => ({ ...q, excluded: false })))
      setStep("preview")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Preview failed")
    } finally {
      setBusy(false)
    }
  }

  const updateItem = (index: number, patch: Partial<EditableItem>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  /** One-click "Collapse into See also" (Phase 2.5): replace the repeated
   * additionalInfo block with a See-also reference matched by CONCEPTS. */
  const collapseIntoSeeAlso = (index: number) => {
    const it = items[index]
    const shared = it.repetitionMatch?.concepts?.filter((c) => it.concepts.includes(c)) ?? []
    const slugs = shared.length ? shared : it.concepts
    if (!slugs.length) {
      toast.error("No concept slugs to link — add CONCEPTS first")
      return
    }
    updateItem(index, {
      additionalInfo: [
        { heading: "See also", points: [{ text: `See also: ${slugs.join(", ")}`, sub: [] }] },
      ],
      flags: [...it.flags, "collapsed-see-also"],
    })
    toast.success(`Question ${it.no ?? index + 1}: block collapsed into See also`)
  }

  const runImport = async () => {
    const selected = items.filter((it) => !it.excluded)
    if (selected.length === 0) {
      toast.error("All questions are excluded — nothing to import")
      return
    }
    const bad = selected.filter((it) => !it.q.trim() || it.options.filter((o) => o.trim()).length < 2 || !LETTERS.includes(it.answer))
    if (bad.length) {
      toast.error(`${bad.length} question(s) missing stem/options/answer — fix or exclude them`)
      return
    }
    setBusy(true)
    try {
      const res = await fetch("/api/admin/content-engine/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import",
          questions: selected.map((it) => ({
            no: it.no,
            tag: it.tag,
            subject: it.subject,
            topic: it.topic,
            q: it.q,
            options: it.options.filter((o) => o.trim()),
            answer: it.answer,
            answerIndex: it.answerIndex,
            check: it.check,
            checkNote: it.checkNote,
            keyPoints: it.keyPoints,
            additionalInfo: it.additionalInfo,
            optionAnalysis: it.optionAnalysis,
            memoryTip: it.memoryTip,
            concepts: it.concepts,
            unsure: it.unsure,
            exam: it.detectedExam,
            year: it.detectedYear,
            flags: it.flags,
          })),
          pastedText: text,
          defaultSubject: defaultSubject || null,
          defaultTopic: defaultTopic || null,
          defaultExam: defaultExam || null,
          defaultYear: defaultYear || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Import failed")
      setImportResult(data)
      setStep("done")
      onImported(data.created)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white dark:bg-[#0a1628] w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Add Batch</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {step === "paste" && (
            <>
              {/* Mode tabs */}
              <div className="flex items-center gap-2" role="tablist" aria-label="Import mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "questions"}
                  onClick={() => setMode("questions")}
                  className={`min-h-[44px] px-4 rounded-xl text-xs font-bold border cursor-pointer ${mode === "questions" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white dark:bg-[#0a1628] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"}`}
                >
                  Questions
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "hindi"}
                  onClick={() => setMode("hindi")}
                  className={`min-h-[44px] px-4 rounded-xl text-xs font-bold border cursor-pointer ${mode === "hindi" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white dark:bg-[#0a1628] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"}`}
                >
                  Hindi translations
                </button>
              </div>

              {mode === "hindi" ? (
                <>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    1. Copy the English export → paste into Gemini → ask for Hindi Format v1 (LANG: hi, REF kept) → paste Gemini&apos;s output here.
                  </p>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Paste Gemini Hindi blocks</label>
                    <textarea
                      value={hindiText}
                      onChange={(e) => setHindiText(e.target.value)}
                      rows={10}
                      placeholder={"====\nNO: 1\nREF: ceq-xxxx\nLANG: hi\nQ: हिंदी प्रश्न…"}
                      className="mt-1.5 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1628] px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {hindiPreview && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Detected: <strong>{hindiPreview.blocks}</strong> block(s), <strong>{hindiPreview.hiBlocks}</strong> Hindi block(s) with REF
                        {hindiPreview.errorBlocks > 0 ? ` · ${hindiPreview.errorBlocks} error block(s)` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={copyHindiExport}
                      disabled={hindiBusy}
                      className="inline-flex items-center gap-1.5 px-3 min-h-[44px] rounded-xl text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 disabled:opacity-50 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy Hindi export (EN blocks)
                    </button>
                    <button
                      type="button"
                      onClick={importHindi}
                      disabled={hindiBusy || !hindiText.trim()}
                      className="inline-flex items-center gap-1.5 px-3 min-h-[44px] rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                    >
                      {hindiBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      Import Hindi translations
                    </button>
                  </div>
                  {hindiResult && (
                    <div className="space-y-2">
                      <div className={`rounded-2xl border p-3 text-xs ${hindiResult.imported > 0 ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300" : "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300"}`}>
                        <p className="font-bold">
                          Imported {hindiResult.imported} translation(s) · {hindiResult.mismatches} answer-mismatch · {hindiResult.errorBlocks} error block(s)
                        </p>
                        <p className="mt-0.5">All imported rows land in the Hindi review queue (isReviewed = false).</p>
                      </div>
                      {hindiResult.skipped.length > 0 && (
                        <div className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-3">
                          <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
                            Skipped {hindiResult.skipped.length} block(s) — one bad block never fails the batch:
                          </p>
                          <ul className="space-y-1">
                            {hindiResult.skipped.slice(0, 10).map((s, i) => (
                              <li key={i} className="text-[11px] text-amber-800 dark:text-amber-300">
                                REF {s.ref || "—"} {s.no ? `(NO ${s.no})` : ""}: {s.reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
              <>
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Paste questions or Format v1 solutions</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={10}
                  placeholder="Paste Gemini output (==== blocks with Q: / KEY POINTS:) or raw MCQs…"
                  className="mt-1.5 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1628] px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {formatDetected && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Detected: <strong>{formatDetected === "solution-v1" ? "Solution Format v1" : "Raw MCQ"}</strong>
                  </p>
                )}
              </div>

              {/* Defaults */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Default subject</label>
                  <select
                    value={defaultSubject}
                    onChange={(e) => { setDefaultSubject(e.target.value); setDefaultTopic("") }}
                    className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1628] px-3 text-sm text-gray-900 dark:text-gray-100"
                  >
                    <option value="">— none —</option>
                    {PYQ_TAXONOMY.map((s) => (
                      <option key={s.num} value={s.name}>{s.num}. {s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Default topic</label>
                  <select
                    value={defaultTopic}
                    onChange={(e) => setDefaultTopic(e.target.value)}
                    disabled={!topicOptions.length}
                    className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1628] px-3 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50"
                  >
                    <option value="">— none —</option>
                    {topicOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Default exam</label>
                  <input
                    value={defaultExam}
                    onChange={(e) => setDefaultExam(e.target.value)}
                    className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1628] px-3 text-sm text-gray-900 dark:text-gray-100"
                    placeholder="e.g. UPSC CSE"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Default year</label>
                  <input
                    value={defaultYear}
                    onChange={(e) => setDefaultYear(e.target.value)}
                    className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1628] px-3 text-sm text-gray-900 dark:text-gray-100"
                    placeholder="e.g. 2024"
                  />
                </div>
              </div>

              {/* Copy buttons */}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => copyToClipboard(buildGeminiPrompt(), "Gemini prompt")} className="inline-flex items-center gap-1.5 px-3 min-h-[44px] rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 cursor-pointer">
                  <Copy className="w-3.5 h-3.5" /> Copy Gemini prompt
                </button>
                <button type="button" onClick={() => copyToClipboard(taxonomyListText(), "Taxonomy")} className="inline-flex items-center gap-1.5 px-3 min-h-[44px] rounded-xl text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 cursor-pointer">
                  <Copy className="w-3.5 h-3.5" /> Copy taxonomy for AI
                </button>
                <button type="button" onClick={copyCoveredConcepts} className="inline-flex items-center gap-1.5 px-3 min-h-[44px] rounded-xl text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 cursor-pointer">
                  <Copy className="w-3.5 h-3.5" /> Copy covered concepts
                </button>
              </div>

              <button
                type="button"
                onClick={runPreview}
                disabled={!text.trim() || busy}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                Preview parsed questions
              </button>
              </>
              )}
            </>
          )}

          {step === "preview" && preview && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <span className="font-semibold">{items.length} question(s)</span>
                <span>· format {preview.format}</span>
                {preview.errorBlocks.length > 0 && (
                  <Pill tone="red">{preview.errorBlocks.length} error block(s)</Pill>
                )}
                {preview.ignoredLineCount > 0 && <span>· {preview.ignoredLineCount} stray line(s) ignored</span>}
                <button type="button" onClick={() => setStep("paste")} className="ml-auto text-indigo-600 dark:text-indigo-400 font-semibold min-h-[44px] cursor-pointer">
                  ← Back to paste
                </button>
              </div>

              {preview.errorBlocks.map((eb) => (
                <div key={eb.index} className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-300">
                  <strong>Block error (segment {eb.index}):</strong> {eb.error}
                  <pre className="mt-1 whitespace-pre-wrap text-[10px] opacity-80">{eb.raw}</pre>
                </div>
              ))}

              <div className="space-y-3">
                {items.map((item, i) => (
                  <div key={i} className={`rounded-2xl border p-3 space-y-2 ${item.excluded ? "opacity-50 border-gray-200 dark:border-gray-800" : "border-gray-200 dark:border-gray-800"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs font-bold text-gray-900 dark:text-white">#{item.no ?? i + 1}</span>
                        {pillsFor(item).map((p, pi) => (
                          <Pill key={pi} tone={p.tone}>{p.label}</Pill>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.repetitionExceeds && (
                          <button
                            type="button"
                            onClick={() => collapseIntoSeeAlso(i)}
                            className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 rounded-full px-2 py-1 cursor-pointer"
                          >
                            Collapse into See also
                          </button>
                        )}
                        <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 shrink-0">
                        <input
                          type="checkbox"
                          checked={item.excluded}
                          onChange={(e) => updateItem(i, { excluded: e.target.checked })}
                          className="w-4 h-4 accent-indigo-600"
                        />
                        Exclude
                      </label>
                      </div>
                    </div>

                    <textarea
                      value={item.q}
                      onChange={(e) => updateItem(i, { q: e.target.value })}
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1628] px-2.5 py-1.5 text-xs text-gray-900 dark:text-gray-100"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {item.options.map((opt, oi) => (
                        <input
                          key={oi}
                          value={opt}
                          onChange={(e) => {
                            const next = [...item.options]
                            next[oi] = e.target.value
                            updateItem(i, { options: next })
                          }}
                          className={`w-full min-h-[40px] rounded-lg border px-2.5 py-1 text-xs ${LETTERS[item.answerIndex - 1] === LETTERS[oi] ? "border-emerald-400 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-gray-300 dark:border-gray-700"} bg-white dark:bg-[#0a1628] text-gray-900 dark:text-gray-100`}
                          placeholder={`${LETTERS[oi]})`}
                        />
                      ))}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      <select
                        value={item.answer}
                        onChange={(e) => updateItem(i, { answer: e.target.value, answerIndex: LETTERS.indexOf(e.target.value) + 1 })}
                        className="min-h-[40px] rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1628] px-2 text-xs text-gray-900 dark:text-gray-100"
                      >
                        {LETTERS.slice(0, item.options.length).map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                      <select
                        value={item.subject || ""}
                        onChange={(e) => updateItem(i, { subject: e.target.value || null, topic: null })}
                        className="min-h-[40px] rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1628] px-2 text-xs text-gray-900 dark:text-gray-100"
                      >
                        <option value="">Subject…</option>
                        {PYQ_TAXONOMY.map((s) => (
                          <option key={s.num} value={s.name}>{s.num}. {s.name}</option>
                        ))}
                      </select>
                      <input
                        value={item.detectedExam || ""}
                        onChange={(e) => updateItem(i, { detectedExam: e.target.value || null })}
                        placeholder="Exam"
                        className="min-h-[40px] rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1628] px-2 text-xs text-gray-900 dark:text-gray-100"
                      />
                      <input
                        value={item.detectedYear || ""}
                        onChange={(e) => updateItem(i, { detectedYear: e.target.value || null })}
                        placeholder="Year"
                        className="min-h-[40px] rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1628] px-2 text-xs text-gray-900 dark:text-gray-100"
                      />
                    </div>

                    {topicOptionsFor(item.subject).length > 0 && (
                      <select
                        value={item.topic || ""}
                        onChange={(e) => updateItem(i, { topic: e.target.value || null })}
                        className="w-full min-h-[40px] rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a1628] px-2 text-xs text-gray-900 dark:text-gray-100"
                      >
                        <option value="">Topic…</option>
                        {topicOptionsFor(item.subject).map((t) => (
                          <option key={t.num} value={`${t.num} ${t.name}`}>{t.num} {t.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={runImport}
                disabled={busy}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Import {items.filter((it) => !it.excluded).length} question(s)
              </button>
            </>
          )}

          {step === "done" && importResult && (
            <div className="space-y-3 text-sm">
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-emerald-800 dark:text-emerald-300">
                <p className="font-bold">Imported {importResult.created} question(s)</p>
                <p className="text-xs mt-1">{importResult.needsReview} need review · {importResult.duplicates} duplicate-flagged · {importResult.rowErrors.length} row error(s)</p>
              </div>
              {importResult.rowErrors.map((re) => (
                <div key={re.index} className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300">
                  <strong>Row {re.index}:</strong> {re.error}
                </div>
              ))}
              <button type="button" onClick={onClose} className="w-full min-h-[44px] rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function topicOptionsFor(subject: string | null) {
  const sub = PYQ_TAXONOMY.find((s) => s.name === subject)
  return sub ? sub.topics : []
}
