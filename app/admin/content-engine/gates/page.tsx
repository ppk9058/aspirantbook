"use client"

import { useState, useEffect } from "react"
import { ContentEngineHeader } from "@/components/admin/content-engine/ContentEngineHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  evaluateQualityGates,
  GateFailureReason,
} from "@/lib/modules/content-engine/quality-gates"
import {
  ShieldCheck,
  ShieldAlert,
  Send,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

interface GateQuestion {
  id: string
  shortId: string
  q: string
  options: string[]
  answerIndex: number
  explanation?: string | null
  sourceTag?: string | null
  exam?: string | null
  sub: string
  top: string
  isVerified: boolean
  isPublished: boolean
}

export default function ContentEngineQualityGatesPage() {
  const [questions, setQuestions] = useState<GateQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [waveSize, setWaveSize] = useState(200)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishResult, setPublishResult] = useState<{
    successCount: number
    rejectedCount: number
    errors: Record<string, string[]>
  } | null>(null)

  // Load questions
  async function loadQuestions() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/content-engine/questions?pageSize=200")
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

  // Evaluate gates locally for client dashboard
  const gateInputs = questions.map((q) => ({
    id: q.id,
    q: q.q,
    o: q.options,
    a: q.answerIndex,
    exp: q.explanation || "",
    resolvedExp: q.explanation || "",
    src: q.sourceTag || q.exam || "",
    sub: q.sub,
    top: q.top,
    isVerified: q.isVerified,
  }))

  const gateResults = evaluateQualityGates(gateInputs)

  // Calculate statistics
  let passCount = 0
  let failCount = 0
  const failureStats: Record<GateFailureReason, number> = {
    "missing-answer": 0,
    "few-options": 0,
    "thin-explanation": 0,
    "no-source": 0,
    "uncategorized": 0,
    "duplicate": 0,
    "unverified": 0,
  }

  const failingItems: Array<{ question: GateQuestion; failures: GateFailureReason[] }> = []

  questions.forEach((q) => {
    const res = gateResults.get(q.id)
    if (res?.passed) {
      passCount++
    } else {
      failCount++
      if (res) {
        res.failures.forEach((f) => {
          failureStats[f] = (failureStats[f] || 0) + 1
        })
        failingItems.push({ question: q, failures: res.failures })
      }
    }
  })

  // Handle wave publish
  async function handlePublishWave() {
    setIsPublishing(true)
    try {
      const res = await fetch("/api/admin/content-engine/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waveSize }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(
          `Wave published: ${data.successCount} live, ${data.rejectedCount} rejected by gates`
        )
        setPublishResult(data)
        loadQuestions()
      } else {
        toast.error(data.error || "Failed to execute wave publish")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl space-y-8">
      <ContentEngineHeader
        title="Quality Gates & Publishing Waves"
        description="Verify questions against strict publishing gates (answer presence, 4+ options, 80+ char explanation, source attribution, taxonomy match, duplicate detection)."
      />

      {/* Overview Cards & Wave Publishing Button */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Total Checked</span>
          <p className="text-2xl font-bold text-foreground">{questions.length}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Passing All Gates</span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{passCount}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Failing Gates</span>
          <p className="text-2xl font-bold text-destructive">{failCount}</p>
        </div>

        {/* Wave Publisher */}
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Wave Publish</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Size:</span>
              <Input
                type="number"
                value={waveSize}
                onChange={(e) => setWaveSize(parseInt(e.target.value) || 200)}
                className="h-7 w-16 text-xs text-center"
              />
            </div>
          </div>

          <Button
            onClick={handlePublishWave}
            disabled={isPublishing || passCount === 0}
            size="sm"
            className="w-full min-h-[38px] text-xs font-semibold gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isPublishing ? "Publishing..." : `Publish Wave (Next ${waveSize})`}</span>
          </Button>
        </div>
      </div>

      {/* Publish Result Feedback */}
      {publishResult && (
        <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-4 text-xs">
          <span className="font-semibold text-foreground">Last Wave Result:</span>
          <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 bg-emerald-500/10">
            {publishResult.successCount} Live
          </Badge>
          <Badge variant="outline" className="border-destructive/50 text-destructive bg-destructive/10">
            {publishResult.rejectedCount} Rejected by Gates
          </Badge>
        </div>
      )}

      {/* Failure Breakdown Cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Gate Failure Breakdown</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {Object.entries(failureStats).map(([reason, count]) => (
            <div
              key={reason}
              className={`p-3 rounded-lg border text-center space-y-1 ${
                count > 0
                  ? "bg-destructive/5 border-destructive/30"
                  : "bg-card border-border opacity-70"
              }`}
            >
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block truncate">
                {reason.replace("-", " ")}
              </span>
              <p
                className={`text-lg font-bold ${
                  count > 0 ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {count}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Failing Questions Inspection List */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-destructive" />
          <span>Questions Requiring Fixes ({failingItems.length})</span>
        </h2>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            <span className="text-sm">Evaluating gates...</span>
          </div>
        ) : failingItems.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground border border-dashed rounded-xl space-y-1.5">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <p className="text-sm font-medium text-foreground">All Questions Pass Quality Gates</p>
            <p className="text-xs">No defects or missing requirements detected.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {failingItems.map(({ question, failures }, idx) => (
              <div
                key={question.id}
                className="rounded-xl border border-destructive/30 bg-card p-4 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      ID: {question.shortId}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {question.sub}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {question.top}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {failures.map((f) => (
                      <Badge
                        key={f}
                        variant="outline"
                        className="text-[10px] border-destructive/50 text-destructive bg-destructive/10"
                      >
                        {f}
                      </Badge>
                    ))}
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-foreground line-clamp-2 leading-relaxed">
                  {question.q}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
