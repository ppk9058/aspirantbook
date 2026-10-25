"use client"

import { useState, useEffect } from "react"
import { ContentEngineHeader } from "@/components/admin/content-engine/ContentEngineHeader"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  PlayCircle,
  Copy,
  Printer,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
} from "lucide-react"
import { toast } from "sonner"

interface PracticeQuestion {
  id: string
  shortId: string
  q: string
  options: string[]
  answer: string
  answerIndex: number
  explanation?: string | null
  sub: string
  top: string
  exam?: string | null
  year?: string | null
}

export default function ContentEnginePracticePage() {
  const [questions, setQuestions] = useState<PracticeQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadQuestions() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/content-engine/questions?pageSize=50")
      const data = await res.json()
      if (data.items && data.items.length > 0) {
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

  const currentQ = questions[currentIndex]

  function handleSelectOption(idx: number) {
    if (selectedOption !== null) return // Already answered
    setSelectedOption(idx)
    setShowExplanation(true)
  }

  function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setSelectedOption(null)
      setShowExplanation(false)
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setSelectedOption(null)
      setShowExplanation(false)
    }
  }

  // Telegram Post Formatter
  function handleCopyTelegram() {
    if (!currentQ) return
    const optLetters = ["A", "B", "C", "D", "E"]
    const optionsText = currentQ.options
      .map((opt, i) => `${optLetters[i]}) ${opt}`)
      .join("\n")

    const tagLine = `#${currentQ.sub?.replace(/\s+/g, "") || "General"} #${currentQ.exam?.replace(/[\s/]+/g, "_") || "PYQ"}`

    const text = `🎯 **Exam Question of the Day**\n\n${currentQ.q}\n\n${optionsText}\n\n||✅ Correct Answer: ${optLetters[currentQ.answerIndex]}\n\n📖 Explanation: ${currentQ.explanation || "N/A"} ||\n\n${tagLine}\n👉 Practice more at TrillionSkill`

    navigator.clipboard.writeText(text)
    toast.success("Telegram post formatted and copied to clipboard!")
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
      <div className="print:hidden">
        <ContentEngineHeader
          title="Practice Preview & Quiz Mode"
          description="Interactive quiz runner for previewing questions, generating Telegram channel posts, and printing test sheets."
        />
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          <span className="text-sm">Loading practice questions...</span>
        </div>
      ) : !currentQ ? (
        <div className="p-12 text-center text-muted-foreground border border-dashed rounded-xl">
          <p className="text-sm">No questions available for practice preview.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card print:hidden">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Question {currentIndex + 1} of {questions.length}
              </Badge>
              {currentQ.exam && (
                <Badge variant="outline" className="text-xs">
                  {currentQ.exam} {currentQ.year ? `'${currentQ.year.slice(-2)}` : ""}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {currentQ.sub}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyTelegram}
                className="text-xs min-h-[38px] gap-1.5"
              >
                <Send className="w-3.5 h-3.5 text-blue-500" />
                <span>Copy Telegram Post</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="text-xs min-h-[38px] gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print PDF</span>
              </Button>
            </div>
          </div>

          {/* Interactive Question Card */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <span>Q{currentIndex + 1}.</span>
                <span>ID: {currentQ.shortId}</span>
              </div>
              <p className="text-base sm:text-lg font-medium text-foreground leading-relaxed">
                {currentQ.q}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-2.5">
              {currentQ.options.map((opt, idx) => {
                const isSelected = selectedOption === idx
                const isCorrect = idx === currentQ.answerIndex
                let btnStyle = "border-border bg-background hover:bg-muted/50"

                if (selectedOption !== null) {
                  if (isCorrect) {
                    btnStyle = "border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 font-medium"
                  } else if (isSelected) {
                    btnStyle = "border-destructive bg-destructive/10 text-destructive font-medium"
                  } else {
                    btnStyle = "border-border/60 opacity-60"
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOption(idx)}
                    disabled={selectedOption !== null}
                    className={`w-full flex items-center justify-between p-3.5 rounded-lg border text-sm text-left transition-colors min-h-[44px] ${btnStyle}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="font-semibold text-muted-foreground">
                        ({String.fromCharCode(97 + idx)})
                      </span>
                      <span>{opt}</span>
                    </div>

                    {selectedOption !== null && (
                      <div className="shrink-0 pl-2">
                        {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                        {isSelected && !isCorrect && (
                          <XCircle className="w-5 h-5 text-destructive" />
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Explanation reveal */}
            {showExplanation && currentQ.explanation && (
              <div className="p-4 rounded-lg bg-muted/40 border-l-4 border-primary text-xs sm:text-sm text-muted-foreground space-y-1">
                <span className="font-semibold text-foreground block">Explanation:</span>
                <p className="whitespace-pre-wrap leading-relaxed">{currentQ.explanation}</p>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-border print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="min-h-[44px] gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={currentIndex === questions.length - 1}
                className="min-h-[44px] gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
