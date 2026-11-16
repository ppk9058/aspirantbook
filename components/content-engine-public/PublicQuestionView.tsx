"use client"

import { useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Share2, Check, Zap, Link2, CalendarDays, ChevronRight, ChevronLeft } from "lucide-react"
import { toast } from "sonner"
import { SeoJsonLd } from "@/lib/seo/json-ld"
import { SolutionBlocks } from "@/components/pyq/SolutionBlocks"
import { QuestionActions } from "@/components/pyq/QuestionActions"
import { PassBanner } from "@/components/test-series/PassBanner"
import type { SeriesPromo } from "@/lib/pyq/series-match"
import { qaPath } from "@/lib/modules/content-engine/paths"

export interface PublicQuestionData {
  id: string
  shortId: string
  slug: string
  q: string
  options: string[]
  answer: string
  answerIndex: number
  explanation?: string | null
  solution?: unknown
  sub: string
  top: string
  exam?: string | null
  year?: string | null
  sourceTag?: string | null
  publishedAt?: Date | string | null
  updatedAt?: Date | string | null
}

export interface RelatedQuestionItem {
  id: string
  shortId: string
  slug: string
  q: string
  exam?: string | null
  sub?: string | null
}

const LETTERS = ["A", "B", "C", "D", "E", "F"]

function correctOptionIndex(
  options: string[],
  answer: string,
  answerIndex: number,
): number {
  const opts = Array.isArray(options) ? options : []
  const byText = opts.findIndex((o) => o === answer)
  if (byText >= 0) return byText
  if (answerIndex >= 1 && answerIndex <= opts.length) return answerIndex - 1
  if (answerIndex >= 0 && answerIndex < opts.length) return answerIndex
  return -1
}

export function PublicQuestionView({
  question,
  lang = "en",
  jsonLdScript,
  breadcrumbs,
  alternateLangUrl,
  series,
  related = [],
}: {
  question: PublicQuestionData
  lang?: "en" | "hi"
  jsonLdScript: string
  breadcrumbs: Array<{ name: string; url: string }>
  alternateLangUrl?: string
  series?: SeriesPromo | null
  related?: RelatedQuestionItem[]
}) {
  const isHi = lang === "hi"
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)

  const hasApprovedSolution =
    Boolean(question.solution) &&
    typeof question.solution === "object" &&
    (question.solution as any).status === "APPROVED"

  const correctIdx = correctOptionIndex(question.options, question.answer, question.answerIndex)
  const answerLetter = correctIdx >= 0 ? LETTERS[correctIdx] : null

  function handleSelect(i: number) {
    if (selectedIdx === null) {
      setSelectedIdx(i)
      setRevealed(true)
    }
  }

  function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: question.q.slice(0, 80),
        url: window.location.href,
      }).catch(() => {})
    } else if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      toast.success(isHi ? "लिंक कॉपी हो गया!" : "Link copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const schemaObjects = (() => {
    if (!jsonLdScript) return null
    const scriptMatches = [...jsonLdScript.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)]
    if (scriptMatches.length > 0) {
      const parsedObjects: Record<string, unknown>[] = []
      for (const m of scriptMatches) {
        try {
          parsedObjects.push(JSON.parse(m[1].trim()))
        } catch {
          // skip malformed snippet
        }
      }
      return parsedObjects.length > 0 ? parsedObjects : null
    }
    try {
      const parsed = JSON.parse(jsonLdScript)
      return [parsed]
    } catch {
      return null
    }
  })()

  const allQuestionsHref = isHi ? "/hi/question-answer" : "/question-answer"

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl space-y-6">
      {/* Standard Schema.org JSON-LD via SeoJsonLd Engine */}
      {schemaObjects && <SeoJsonLd schemas={schemaObjects} />}

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="text-xs sm:text-sm text-muted-foreground flex flex-wrap items-center gap-1.5">
        {breadcrumbs.map((b, i) => (
          <span key={b.url} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            <Link href={b.url} className="hover:text-foreground transition-colors">
              {b.name}
            </Link>
          </span>
        ))}
      </nav>

      {/* Badges Bar & Language Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
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

        <div className="flex items-center gap-2">
          {alternateLangUrl && (
            <Link
              href={alternateLangUrl}
              data-testid="lang-toggle-btn"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted transition-colors min-h-[44px]"
            >
              {isHi ? "English" : "हिन्दी"}
            </Link>
          )}

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted transition-colors min-h-[44px]"
            title="Share question"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? (isHi ? "कॉपी हुआ" : "Copied") : (isHi ? "शेयर" : "Share")}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Column */}
        <div className="lg:col-span-8 min-w-0 space-y-6">
          {/* Question Card */}
          <article className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
              <h1 className="text-base sm:text-lg font-black text-foreground">
                {isHi ? "प्रश्न" : "Question"}
              </h1>
              <QuestionActions />
            </div>

            <div className="space-y-4">
              <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed whitespace-pre-line">
                {question.q}
              </p>

              {/* Options List */}
              {question.options.length > 0 && (
                <div className="space-y-2.5" role="list">
                  {question.options.map((opt, idx) => {
                    const isSelected = selectedIdx === idx
                    const isCorrect = idx === correctIdx
                    const showFeedback = revealed || hasApprovedSolution

                    let btnClasses = "border-border bg-background hover:bg-muted/40 text-foreground"
                    if (showFeedback) {
                      if (isCorrect) {
                        btnClasses = "border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 font-semibold"
                      } else if (isSelected) {
                        btnClasses = "border-destructive bg-destructive/10 text-destructive font-semibold"
                      } else {
                        btnClasses = "border-border/60 text-muted-foreground"
                      }
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelect(idx)}
                        className={`w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl border text-sm sm:text-base text-left transition-all min-h-[44px] ${btnClasses}`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <strong className="text-muted-foreground shrink-0" aria-hidden="true">
                            ({LETTERS[idx] || String(idx + 1)})
                          </strong>
                          <span className="leading-snug break-words">{opt}</span>
                        </div>

                        {showFeedback && (
                          <div className="shrink-0 pl-2">
                            {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                            {isSelected && !isCorrect && (
                              <XCircle className="w-5 h-5 text-destructive shrink-0" />
                            )}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Previously Asked In Box */}
              {(question.exam || question.year) && (
                <div className="rounded-xl border border-border bg-muted/30 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {isHi ? "यह प्रश्न पहले पूछा गया था" : "This question was previously asked in"}
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {question.exam || ""}{question.year ? ` ${question.year}` : ""}
                    </p>
                  </div>
                  {series && (
                    <Link
                      href={`/test-series/${series.slug}`}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-xl text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors shrink-0"
                    >
                      <Zap className="h-4 w-4" aria-hidden="true" />
                      <span>{isHi ? "ऑनलाइन टेस्ट दें" : "Attempt Online"}</span>
                    </Link>
                  )}
                </div>
              )}

              {/* Show Answer Toggle for legacy/unapproved questions */}
              {!hasApprovedSolution && !revealed && (
                <div className="pt-2">
                  <Button
                    onClick={() => setRevealed(true)}
                    variant="outline"
                    size="sm"
                    className="text-xs min-h-[44px] px-4"
                  >
                    {isHi ? "उत्तर और व्याख्या देखें" : "Show Answer & Explanation"}
                  </Button>
                </div>
              )}
            </div>
          </article>

          {/* Structured Detailed Solution (Approved Phase 2 Solution) */}
          {hasApprovedSolution ? (
            <article className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
                <h2 className="text-base sm:text-lg font-black text-foreground">
                  {isHi ? "विस्तृत समाधान" : "Detailed Solution"}
                </h2>
                <QuestionActions />
              </div>

              <SolutionBlocks
                solution={question.solution}
                answerLetter={answerLetter}
                answerText={question.answer}
                basePath={allQuestionsHref}
              />
            </article>
          ) : (
            /* Legacy explanation fallback */
            revealed && question.explanation && (
              <article className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-3 shadow-xs">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span>{isHi ? "विस्तृत व्याख्या" : "Detailed Explanation"}</span>
                </h2>
                <div className="p-4 rounded-xl bg-muted/40 border border-border text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {question.explanation}
                </div>
              </article>
            )
          )}

          {/* Relevant Test Series Promo Card */}
          {series && (
            <Link
              href={`/test-series/${series.slug}`}
              className="block rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 text-white p-5 sm:p-6 shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <p className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-white/20 rounded-full px-2.5 py-0.5">
                    <Zap className="h-3 w-3" aria-hidden="true" /> {isHi ? "टेस्ट सीरीज़" : "Test Series"}
                  </p>
                  <p className="text-base sm:text-lg font-black leading-snug">{series.title}</p>
                  <p className="text-xs text-white/85">
                    {series.totalTests} {isHi ? "कुल टेस्ट" : "Total Tests"} · {series.freeTests} {isHi ? "फ्री टेस्ट" : "Free Tests"}
                    {question.exam ? ` · For ${question.exam} aspirants` : ""}
                  </p>
                </div>
                <span className="shrink-0 inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl bg-white text-indigo-700 text-sm font-black shadow-xs">
                  {isHi ? "अभी शुरू करें" : "Start Now"}
                </span>
              </div>
            </Link>
          )}

          {/* Related Questions */}
          {related.length > 0 && (
            <section aria-label="Related questions" className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <h2 className="flex items-center gap-1.5 text-sm font-black text-foreground">
                <Link2 className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>{isHi ? "संबंधित प्रश्न" : "Related Questions"}</span>
              </h2>
              <ul className="divide-y divide-border">
                {related.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={qaPath(lang, r.exam || question.exam, r.sub || question.sub, r.slug || r.shortId)}
                      className="flex items-center gap-2 py-3 group"
                    >
                      <span className="text-sm text-foreground leading-snug group-hover:text-primary transition-colors flex-1 min-w-0">
                        {r.q}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="pt-2">
            <Link
              href={allQuestionsHref}
              className="inline-flex items-center gap-1.5 min-h-[44px] text-sm font-semibold text-primary hover:underline print:hidden"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span>{isHi ? "सभी प्रश्न देखें" : "View all questions"}</span>
            </Link>
          </div>
        </div>

        {/* Sidebar Column */}
        <aside className="lg:col-span-4 min-w-0 space-y-6 print:hidden">
          <div className="lg:sticky lg:top-[76px] space-y-6">
            <PassBanner />

            {(question.exam || question.year || question.sub) && (
              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> {isHi ? "परीक्षा विवरण" : "Exam info"}
                </p>
                {question.exam && (
                  <p className="text-sm text-foreground">
                    Asked in <strong className="font-semibold">{question.exam}</strong>
                    {question.year ? ` (${question.year})` : ""}
                  </p>
                )}
                {question.sub && (
                  <p className="text-xs text-muted-foreground">
                    Subject: {question.sub}
                    {question.top ? ` · ${question.top}` : ""}
                  </p>
                )}
                {question.sourceTag && (
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Source: {question.sourceTag}
                  </p>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
