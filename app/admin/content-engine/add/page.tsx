"use client"

import { useState, useMemo } from "react"
import { ContentEngineHeader } from "@/components/admin/content-engine/ContentEngineHeader"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { T } from "@/lib/modules/content-engine/taxonomy"
import { DEFAULT_EXAM_LIST } from "@/lib/modules/content-engine/exam-detector"
import { PlusCircle, Sparkles, Trash2, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

const SAMPLE_TEXT = `[UPSC CSE 2023] Q1. Consider the following statements regarding the Indus Valley Civilization:
1. Harappa was excavated before Mohenjo-daro.
2. The Great Bath was discovered at Mohenjo-daro.
Which of the statements given above is/are correct?
(a) 1 only
(b) 2 only
(c) Both 1 and 2
(d) Neither 1 nor 2
Ans: (c)
Explanation: Harappa was excavated in 1921 by Daya Ram Sahni. Mohenjo-daro was excavated in 1922 by R.D. Banerji. The Great Bath was discovered at Mohenjo-daro. Both statements are correct.

[SSC CGL 2022] Q2. Who is known as the Father of the Indian Constitution?
(a) Mahatma Gandhi
(b) Dr. B.R. Ambedkar
(c) Jawaharlal Nehru
(d) Sardar Patel
Ans: (b)
Explanation: Dr. B.R. Ambedkar was the Chairman of the Drafting Committee of the Constituent Assembly.

[UPPCS 2021] Q3. Which of the following is a direct tax in India?
(a) Goods and Services Tax (GST)
(b) Corporation Tax
(c) Central Excise Duty
(d) Customs Duty
Ans: (b)
Explanation: Corporation tax and personal income tax are direct taxes levied by the Central Government.

[BPSC 2020] Q4. The Preamble to the Indian Constitution was amended by which Constitutional Amendment Act?
(a) 42nd Amendment Act, 1976
(b) 44th Amendment Act, 1978
(c) 86th Amendment Act, 2002
(d) 52nd Amendment Act, 1985
Ans: (a)
Explanation: The 42nd Constitutional Amendment Act 1976 added three words: Socialist, Secular, and Integrity.`

export default function ContentEngineAddBatchPage() {
  const [pastedText, setPastedText] = useState("")
  const [defaultSubject, setDefaultSubject] = useState("")
  const [defaultTopic, setDefaultTopic] = useState("")
  const [defaultExam, setDefaultExam] = useState("")
  const [defaultYear, setDefaultYear] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState<{
    batchId: string
    totalParsed: number
    addedCount: number
    duplicateCount: number
    skipped?: {
      count: number
      snippets: string[]
    }
  } | null>(null)

  // Subject list from taxonomy
  const subjectList = useMemo(() => {
    const set = new Set(T.map((r) => r[0]))
    return Array.from(set).sort()
  }, [])

  // Topic list reactive to selected subject
  const topicList = useMemo(() => {
    if (!defaultSubject) {
      const set = new Set(T.map((r) => r[1]))
      return Array.from(set).sort()
    }
    return T.filter((r) => r[0] === defaultSubject).map((r) => r[1]).sort()
  }, [defaultSubject])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pastedText.trim()) {
      toast.error("Please paste question text")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/admin/content-engine/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pastedText,
          defaultSubject: defaultSubject || undefined,
          defaultTopic: defaultTopic || undefined,
          defaultExam: defaultExam || undefined,
          defaultYear: defaultYear || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`Batch parsed! Added: ${data.addedCount}, Duplicates: ${data.duplicateCount}`)
        setLastResult(data)
      } else {
        toast.error(data.error || "Failed to process batch")
      }
    } catch (err: any) {
      toast.error(err.message || "Network error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <ContentEngineHeader
        title="Add Question Batch"
        description="Paste raw exam text with optional bracket tags [Exam Year] or section headers. Text is parsed, deduplicated, and classified automatically."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Defaults Bar */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Manual Defaults (Optional)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Default Subject
              </label>
              <select
                value={defaultSubject}
                onChange={(e) => {
                  setDefaultSubject(e.target.value)
                  setDefaultTopic("") // Reset topic
                }}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background min-h-[44px] text-foreground"
              >
                <option value="">Auto-detect Subject</option>
                {subjectList.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Default Topic
              </label>
              <select
                value={defaultTopic}
                onChange={(e) => setDefaultTopic(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background min-h-[44px] text-foreground"
              >
                <option value="">Auto-classify Topic</option>
                {topicList.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Default Exam
              </label>
              <select
                value={defaultExam}
                onChange={(e) => setDefaultExam(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background min-h-[44px] text-foreground"
              >
                <option value="">Auto-detect Exam</option>
                {DEFAULT_EXAM_LIST.slice(0, 30).map((exam) => (
                  <option key={exam} value={exam}>
                    {exam}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Default Year
              </label>
              <Input
                value={defaultYear}
                onChange={(e) => setDefaultYear(e.target.value)}
                placeholder="e.g. 2023"
                className="min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Textarea Area */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-foreground">
              Pasted Questions Text
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPastedText(SAMPLE_TEXT)}
                className="text-xs min-h-[36px] gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Load 4-Q Sample
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPastedText("")}
                className="text-xs min-h-[36px] gap-1 text-muted-foreground"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </Button>
            </div>
          </div>

          <Textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste raw MCQs here with answers and explanations..."
            rows={14}
            className="font-mono text-xs sm:text-sm p-4 leading-relaxed"
          />
        </div>

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Button
            type="submit"
            disabled={isSubmitting || !pastedText.trim()}
            className="w-full sm:w-auto min-h-[44px] px-8 text-sm font-semibold gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isSubmitting ? "Parsing & Deduplicating..." : "Parse & Save Batch"}</span>
          </Button>

          {lastResult && (
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 bg-emerald-500/10 gap-1 py-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Added: {lastResult.addedCount}
              </Badge>
              {lastResult.duplicateCount > 0 && (
                <Badge variant="outline" className="border-amber-500/50 text-amber-600 bg-amber-500/10 gap-1 py-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Skipped Duplicates: {lastResult.duplicateCount}
                </Badge>
              )}
              {lastResult.skipped && lastResult.skipped.count > 0 && (
                <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground bg-muted/40 gap-1 py-1" title={lastResult.skipped.snippets.join(" | ")}>
                  Dropped/Skipped: {lastResult.skipped.count}
                </Badge>
              )}
              <Link
                href="/admin/content-engine"
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline ml-2"
              >
                View Library <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
