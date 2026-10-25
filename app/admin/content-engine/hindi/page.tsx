"use client"

import { useState, useEffect } from "react"
import { ContentEngineHeader } from "@/components/admin/content-engine/ContentEngineHeader"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { exportMissingHindiPrompt } from "@/lib/modules/content-engine/assist-io"
import {
  Languages,
  Copy,
  Check,
  Upload,
  RefreshCw,
  AlertCircle,
  FileText,
  UserCheck,
} from "lucide-react"
import { toast } from "sonner"

interface QuestionWithTranslation {
  id: string
  shortId: string
  q: string
  options: string[]
  explanation?: string | null
  sub?: string | null
  top?: string | null
  translations?: Array<{
    id: string
    lang: string
    q: string
    options: string[]
    explanation?: string | null
    isReviewed: boolean
  }>
}

export default function ContentEngineHindiReviewPage() {
  const [rawInput, setRawInput] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [questions, setQuestions] = useState<QuestionWithTranslation[]>([])
  const [loading, setLoading] = useState(true)
  const [filterReviewed, setFilterReviewed] = useState<"ALL" | "UNREVIEWED" | "REVIEWED">("UNREVIEWED")

  // Load questions
  async function loadQuestions() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/content-engine/questions?pageSize=100")
      const data = await res.json()
      if (data.items) {
        setQuestions(data.items)
      }
    } catch {
      toast.error("Failed to load questions")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQuestions()
  }, [])

  // Handle import
  async function handleImport() {
    if (!rawInput.trim()) {
      toast.error("Please paste Hindi translations JSON or text blocks")
      return
    }

    setIsImporting(true)
    try {
      const res = await fetch("/api/admin/content-engine/hindi/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`Import complete! Matched: ${data.matched}, Skipped: ${data.skipped}`)
        setRawInput("")
        loadQuestions()
      } else {
        toast.error(data.error || "Failed to import translations")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setIsImporting(false)
    }
  }

  // Handle review toggle
  async function handleReviewToggle(questionId: string, current: boolean) {
    try {
      const res = await fetch("/api/admin/content-engine/hindi/review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, isReviewed: !current }),
      })

      if (res.ok) {
        setQuestions((prev) =>
          prev.map((q) => {
            if (q.id !== questionId) return q
            const updatedTr = q.translations?.map((t) =>
              t.lang === "hi" ? { ...t, isReviewed: !current } : t
            )
            return { ...q, translations: updatedTr }
          })
        )
        toast.success(!current ? "Marked translation as human reviewed" : "Marked as unreviewed")
      } else {
        toast.error("Failed to update review status")
      }
    } catch {
      toast.error("Network error")
    }
  }

  // Generate copyable prompt for questions missing Hindi
  function handleCopyMissingPrompt() {
    const missing = questions
      .filter((q) => !q.translations?.some((t) => t.lang === "hi"))
      .map((q) => ({
        id: q.id,
        q: q.q,
        o: q.options,
        exp: q.explanation || undefined,
        top: q.top || undefined,
      }))

    if (missing.length === 0) {
      toast.info("All currently loaded questions already have Hindi translations!")
      return
    }

    const promptText = exportMissingHindiPrompt(missing)
    navigator.clipboard.writeText(promptText)
    toast.success(`Copied prompt for ${missing.length} questions to clipboard!`)
  }

  // Filter questions for review
  const displayQuestions = questions.filter((q) => {
    const hi = q.translations?.find((t) => t.lang === "hi")
    if (!hi) return false
    if (filterReviewed === "UNREVIEWED") return !hi.isReviewed
    if (filterReviewed === "REVIEWED") return hi.isReviewed
    return true
  })

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl space-y-8">
      <ContentEngineHeader
        title="Hindi Translation & Human Review"
        description="Import Hindi translations matched automatically by English text, generate zero-cost external prompts, and conduct mandatory human review."
      />

      {/* Top Section: Import Textarea & Prompt Generator */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              <span>Import Hindi Translations</span>
            </h2>
            <span className="text-xs text-muted-foreground">JSON array or EN:/HQ:/HA: blocks</span>
          </div>

          <Textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder={`Paste JSON array:\n[\n  {\n    "en": "Consider the following statements...",\n    "q": "निम्नलिखित कथनों पर विचार कीजिए...",\n    "o": ["विकल्प 1", "विकल्प 2", "विकल्प 3", "विकल्प 4"],\n    "exp": "व्याख्या..."\n  }\n]\n\nOr blocks:\nEN: English text...\nHQ: Hindi question...\nHA: Opt 1 | Opt 2 | Opt 3 | Opt 4\nHE: Explanation...\nOK: true\n###`}
            rows={8}
            className="font-mono text-xs p-3 leading-relaxed"
          />

          <Button
            onClick={handleImport}
            disabled={isImporting || !rawInput.trim()}
            className="w-full sm:w-auto min-h-[44px] text-sm font-semibold gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>{isImporting ? "Processing Import..." : "Import Hindi Translations"}</span>
          </Button>
        </div>

        {/* Side Card: External Translation Assist */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              <span>Zero-Cost LLM Assist</span>
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Export questions missing Hindi into a structured, copyable prompt for external free LLMs (Claude, ChatGPT, or DeepSeek). Paste the result back into the import box.
            </p>
          </div>

          <Button
            onClick={handleCopyMissingPrompt}
            variant="outline"
            className="w-full min-h-[44px] text-xs font-semibold gap-2"
          >
            <Copy className="w-4 h-4" />
            <span>Copy Prompt for Missing Hindi</span>
          </Button>
        </div>
      </div>

      {/* Human Review Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Human Review Queue</h2>
            <Badge variant="secondary" className="text-xs">
              {displayQuestions.length} Items
            </Badge>
          </div>

          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg self-start sm:self-auto">
            <button
              onClick={() => setFilterReviewed("UNREVIEWED")}
              className={`px-3 py-1 text-xs font-medium rounded-md min-h-[36px] transition-colors ${
                filterReviewed === "UNREVIEWED"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground"
              }`}
            >
              Needs Review
            </button>
            <button
              onClick={() => setFilterReviewed("REVIEWED")}
              className={`px-3 py-1 text-xs font-medium rounded-md min-h-[36px] transition-colors ${
                filterReviewed === "REVIEWED"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground"
              }`}
            >
              Reviewed
            </button>
            <button
              onClick={() => setFilterReviewed("ALL")}
              className={`px-3 py-1 text-xs font-medium rounded-md min-h-[36px] transition-colors ${
                filterReviewed === "ALL"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground"
              }`}
            >
              All Hindi
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            <span className="text-sm">Loading review items...</span>
          </div>
        ) : displayQuestions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground border border-dashed rounded-xl space-y-1.5">
            <UserCheck className="w-8 h-8 mx-auto text-emerald-600" />
            <p className="text-sm font-medium text-foreground">Review Queue Clear</p>
            <p className="text-xs">No questions currently match this review filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayQuestions.map((q, idx) => {
              const hi = q.translations?.find((t) => t.lang === "hi")
              if (!hi) return null
              return (
                <div
                  key={q.id}
                  className="rounded-xl border border-border bg-card p-5 space-y-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">ID: {q.shortId}</span>
                      <Badge variant="secondary" className="text-xs">
                        {q.sub}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {q.top}
                      </Badge>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer bg-muted/40 px-3 py-1.5 rounded-lg border border-border/60 hover:bg-muted/80 transition-colors min-h-[44px]">
                      <Checkbox
                        checked={hi.isReviewed}
                        onCheckedChange={() => handleReviewToggle(q.id, hi.isReviewed)}
                      />
                      <span className="text-xs font-semibold text-foreground">
                        {hi.isReviewed ? "Human Reviewed" : "Mark as Reviewed"}
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* English */}
                    <div className="space-y-2 p-3 rounded-lg bg-muted/20 border border-border/40 text-xs sm:text-sm">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        English Original
                      </span>
                      <p className="font-medium text-foreground whitespace-pre-wrap">{q.q}</p>
                      <div className="space-y-1 pt-1">
                        {q.options.map((opt, i) => (
                          <div key={i} className="text-muted-foreground">
                            ({String.fromCharCode(97 + i)}) {opt}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <p className="text-xs text-muted-foreground pt-1 border-t border-border/40 mt-2">
                          <strong className="text-foreground">Exp:</strong> {q.explanation}
                        </p>
                      )}
                    </div>

                    {/* Hindi */}
                    <div className="space-y-2 p-3 rounded-lg bg-muted/20 border border-border/40 text-xs sm:text-sm">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Hindi Translation
                      </span>
                      <p className="font-medium text-foreground whitespace-pre-wrap">{hi.q}</p>
                      <div className="space-y-1 pt-1">
                        {hi.options.map((opt, i) => (
                          <div key={i} className="text-muted-foreground">
                            ({String.fromCharCode(97 + i)}) {opt}
                          </div>
                        ))}
                      </div>
                      {hi.explanation && (
                        <p className="text-xs text-muted-foreground pt-1 border-t border-border/40 mt-2">
                          <strong className="text-foreground">व्याख्या:</strong> {hi.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
