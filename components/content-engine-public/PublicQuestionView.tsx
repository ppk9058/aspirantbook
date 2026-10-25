"use client"

import { useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, ArrowRight, Share2, Check } from "lucide-react"
import { toast } from "sonner"

export interface PublicQuestionData {
  id: string
  shortId: string
  slug: string
  q: string
  options: string[]
  answer: string
  answerIndex: number
  explanation?: string | null
  sub: string
  top: string
  exam?: string | null
  year?: string | null
  sourceTag?: string | null
  publishedAt?: Date | string | null
  updatedAt?: Date | string | null
}

export function PublicQuestionView({
  question,
  lang = "en",
  jsonLdScript,
  breadcrumbs,
}: {
  question: PublicQuestionData
  lang?: "en" | "hi"
  jsonLdScript: string
  breadcrumbs: Array<{ name: string; url: string }>
}) {
  const isHi = lang === "hi"
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)

  const optLetters = ["(a)", "(b)", "(c)", "(d)", "(e)", "(f)"]

  function handleSelect(i: number) {
    if (selectedIdx === null) {
      setSelectedIdx(i)
      setRevealed(true)
    }
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: question.q.slice(0, 80),
        url: window.location.href,
      }).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      toast.success(isHi ? "लिंक कॉपी हो गया!" : "Link copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <article className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
      {/* Safe JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript }}
      />

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5">
        {breadcrumbs.map((b, i) => (
          <span key={b.url} className="flex items-center gap-1.5">
            {i > 0 && <span>/</span>}
            <Link href={b.url} className="hover:text-foreground transition-colors">
              {b.name}
            </Link>
          </span>
        ))}
      </nav>

      {/* Badges Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          {question.exam && (
            <Badge variant="default" className="text-xs bg-primary/90 font-medium">
              {question.exam} {question.year || ""}
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            {question.sub}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {question.top}
          </Badge>
        </div>

        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors min-h-[36px]"
          title="Share question"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
          <span>{copied ? (isHi ? "कॉपी हुआ" : "Copied") : (isHi ? "शेयर" : "Share")}</span>
        </button>
      </div>

      {/* Question Card */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-6 shadow-xs">
        <h1 className="text-lg sm:text-xl font-semibold text-foreground leading-relaxed whitespace-pre-wrap">
          {question.q}
        </h1>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((opt, idx) => {
            const isSelected = selectedIdx === idx
            const isCorrect = idx === question.answerIndex
            let btnClasses = "border-border bg-background hover:bg-muted/40"

            if (revealed) {
              if (isCorrect) {
                btnClasses = "border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 font-medium"
              } else if (isSelected) {
                btnClasses = "border-destructive bg-destructive/10 text-destructive font-medium"
              } else {
                btnClasses = "border-border/60 opacity-60"
              }
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(idx)}
                className={`w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl border text-sm sm:text-base text-left transition-all min-h-[48px] ${btnClasses}`}
              >
                <div className="flex items-start gap-3">
                  <span className="font-bold text-muted-foreground shrink-0">
                    {optLetters[idx] || `(${idx + 1})`}
                  </span>
                  <span className="leading-snug">{opt}</span>
                </div>

                {revealed && (
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

        {/* Instant Check Toggle */}
        {!revealed && (
          <div className="pt-2">
            <Button
              onClick={() => setRevealed(true)}
              variant="outline"
              size="sm"
              className="text-xs min-h-[38px]"
            >
              {isHi ? "उत्तर और व्याख्या देखें" : "Show Answer & Explanation"}
            </Button>
          </div>
        )}

        {/* Detailed Explanation */}
        {revealed && question.explanation && (
          <section className="pt-6 border-t border-border space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span>{isHi ? "विस्तृत व्याख्या" : "Detailed Explanation"}</span>
            </h2>
            <div className="p-4 rounded-xl bg-muted/40 border border-border text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {question.explanation}
            </div>
          </section>
        )}
      </div>

      {/* Attribution & Metadata Footer */}
      <div className="text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2 pt-2">
        <span>Question ID: {question.shortId}</span>
        {question.sourceTag && <span>Source: {question.sourceTag}</span>}
      </div>
    </article>
  )
}
