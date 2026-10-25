"use client"

import { useState, useEffect, useMemo } from "react"
import { ContentEngineHeader } from "@/components/admin/content-engine/ContentEngineHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { T } from "@/lib/modules/content-engine/taxonomy"
import { DEFAULT_EXAM_LIST } from "@/lib/modules/content-engine/exam-detector"
import { CheckSquare, Square, Check, RefreshCw, Filter } from "lucide-react"
import { toast } from "sonner"

interface AssignQuestionItem {
  id: string
  shortId: string
  q: string
  sub: string
  top: string
  exam?: string | null
  year?: string | null
  isPublished: boolean
}

export default function ContentEngineAssignPage() {
  const [questions, setQuestions] = useState<AssignQuestionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [rangeInput, setRangeInput] = useState("")
  const [uncategorizedOnly, setUncategorizedOnly] = useState(true)

  // Target assignment fields
  const [targetSubject, setTargetSubject] = useState("")
  const [targetTopic, setTargetTopic] = useState("")
  const [targetExam, setTargetExam] = useState("")
  const [targetYear, setTargetYear] = useState("")
  const [isAssigning, setIsAssigning] = useState(false)

  // Subject list from taxonomy
  const subjectList = useMemo(() => {
    const set = new Set(T.map((r) => r[0]))
    return Array.from(set).sort()
  }, [])

  // Topic list reactive to selected subject
  const topicList = useMemo(() => {
    if (!targetSubject) {
      const set = new Set(T.map((r) => r[1]))
      return Array.from(set).sort()
    }
    return T.filter((r) => r[0] === targetSubject).map((r) => r[1]).sort()
  }, [targetSubject])

  // Load questions
  async function loadQuestions() {
    setLoading(true)
    try {
      const url = `/api/admin/content-engine/questions?pageSize=150${
        uncategorizedOnly ? "&uncategorizedOnly=true" : ""
      }`
      const res = await fetch(url)
      const data = await res.json()
      if (data.items) {
        setQuestions(data.items)
        setSelectedIds(new Set())
      }
    } catch {
      toast.error("Failed to load questions")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQuestions()
  }, [uncategorizedOnly])

  // Toggle single item
  function toggleItem(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  // Select all or none
  function toggleSelectAll() {
    if (selectedIds.size === questions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(questions.map((q) => q.id)))
    }
  }

  // Parse range selection string: "1-10, 15, 20-25"
  function applyRangeSelection() {
    if (!rangeInput.trim()) return
    const parts = rangeInput.split(",")
    const selectedIndices = new Set<number>()

    for (const part of parts) {
      const p = part.trim()
      const dash = p.indexOf("-")
      if (dash > 0) {
        const start = parseInt(p.slice(0, dash).trim(), 10)
        const end = parseInt(p.slice(dash + 1).trim(), 10)
        if (!isNaN(start) && !isNaN(end)) {
          const from = Math.min(start, end)
          const to = Math.max(start, end)
          for (let i = from; i <= to; i++) {
            selectedIndices.add(i - 1) // 1-based index
          }
        }
      } else {
        const num = parseInt(p, 10)
        if (!isNaN(num)) {
          selectedIndices.add(num - 1)
        }
      }
    }

    const next = new Set<string>()
    selectedIndices.forEach((idx) => {
      if (questions[idx]) {
        next.add(questions[idx].id)
      }
    })

    setSelectedIds(next)
    toast.success(`Selected ${next.size} questions from range`)
  }

  // Handle bulk assign
  async function handleBulkAssign() {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one question")
      return
    }
    if (!targetSubject || !targetTopic) {
      toast.error("Subject and Topic are required")
      return
    }

    setIsAssigning(true)
    try {
      const res = await fetch("/api/admin/content-engine/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionIds: Array.from(selectedIds),
          subject: targetSubject,
          topic: targetTopic,
          exam: targetExam || undefined,
          year: targetYear || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`Assigned ${data.count} questions successfully!`)
        loadQuestions()
      } else {
        toast.error(data.error || "Failed to assign")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setIsAssigning(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <ContentEngineHeader
        title="Assign Questions"
        description="Select questions individually or by range (e.g. 1-10, 15) and bulk assign Subject, Topic, Exam, or Year with permanent manual override protection."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Question Selection List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm font-semibold text-foreground min-h-[44px]"
              >
                {selectedIds.size > 0 && selectedIds.size === questions.length ? (
                  <CheckSquare className="w-5 h-5 text-primary" />
                ) : (
                  <Square className="w-5 h-5 text-muted-foreground" />
                )}
                <span>
                  {selectedIds.size === 0
                    ? "Select All"
                    : `${selectedIds.size} of ${questions.length} selected`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setUncategorizedOnly(!uncategorizedOnly)}
                className={`text-xs px-2.5 py-1.5 rounded-md border min-h-[36px] transition-colors ${
                  uncategorizedOnly
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/40 font-medium"
                    : "border-border text-muted-foreground"
                }`}
              >
                Uncategorized only
              </button>
            </div>

            {/* Range Selection Input */}
            <div className="flex items-center gap-2">
              <Input
                value={rangeInput}
                onChange={(e) => setRangeInput(e.target.value)}
                placeholder="Range: 1-10, 15"
                className="h-9 w-32 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={applyRangeSelection}
                className="h-9 text-xs"
              >
                Select
              </Button>
            </div>
          </div>

          {/* List items */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                <span className="text-sm">Loading questions...</span>
              </div>
            ) : questions.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground border border-dashed rounded-xl">
                <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No questions found</p>
                <p className="text-xs">All questions may already be categorized.</p>
              </div>
            ) : (
              questions.map((q, idx) => {
                const isChecked = selectedIds.has(q.id)
                return (
                  <div
                    key={q.id}
                    onClick={() => toggleItem(q.id)}
                    className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${
                      isChecked
                        ? "bg-primary/5 border-primary"
                        : "bg-card border-border hover:border-border/80"
                    }`}
                  >
                    <div className="pt-0.5">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-mono font-semibold text-muted-foreground">
                          #{idx + 1}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {q.sub}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {q.top}
                        </Badge>
                        {q.exam && (
                          <Badge variant="default" className="text-[10px] bg-primary/80">
                            {q.exam} {q.year ? `'${q.year.slice(-2)}` : ""}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-foreground line-clamp-2 leading-relaxed">
                        {q.q}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Col: Assignment Action Panel */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 sticky top-6">
            <h2 className="text-sm font-semibold text-foreground flex items-center justify-between">
              <span>Bulk Assignment</span>
              <Badge variant="outline" className="text-xs">
                {selectedIds.size} Selected
              </Badge>
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Target Subject *
                </label>
                <select
                  value={targetSubject}
                  onChange={(e) => {
                    setTargetSubject(e.target.value)
                    setTargetTopic("")
                  }}
                  className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background min-h-[44px] text-foreground"
                >
                  <option value="">Select Subject</option>
                  {subjectList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Target Topic *
                </label>
                <select
                  value={targetTopic}
                  onChange={(e) => setTargetTopic(e.target.value)}
                  disabled={!targetSubject}
                  className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background min-h-[44px] text-foreground disabled:opacity-50"
                >
                  <option value="">Select Topic</option>
                  {topicList.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Target Exam (Optional)
                </label>
                <select
                  value={targetExam}
                  onChange={(e) => setTargetExam(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background min-h-[44px] text-foreground"
                >
                  <option value="">Keep Existing</option>
                  {DEFAULT_EXAM_LIST.slice(0, 30).map((exam) => (
                    <option key={exam} value={exam}>
                      {exam}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Target Year (Optional)
                </label>
                <Input
                  value={targetYear}
                  onChange={(e) => setTargetYear(e.target.value)}
                  placeholder="e.g. 2023"
                  className="min-h-[44px]"
                />
              </div>

              <Button
                onClick={handleBulkAssign}
                disabled={isAssigning || selectedIds.size === 0 || !targetSubject || !targetTopic}
                className="w-full min-h-[44px] text-sm font-semibold gap-2 mt-2"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isAssigning
                    ? "Applying..."
                    : `Assign to ${selectedIds.size} Question${selectedIds.size === 1 ? "" : "s"}`}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
