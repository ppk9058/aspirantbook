"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Check, CheckCircle2, Trash2, ExternalLink, AlertTriangle } from "lucide-react"
import { qaPath } from "@/lib/modules/content-engine/paths"
import Link from "next/link"

export interface ContentEngineCardItem {
  id: string
  shortId: string
  slug?: string | null
  q: string
  options: string[]
  answer: string
  answerIndex: number
  explanation?: string | null
  sub?: string | null
  top?: string | null
  exam?: string | null
  year?: string | null
  status?: string | null
  isPublished: boolean
  isVerified: boolean
  isInferred: boolean
  sourceTag?: string | null
  sourceNo?: number | null
  translations?: Array<{
    id?: string
    lang: string
    q: string
    options: string[]
    explanation?: string | null
    top?: string | null
    isReviewed: boolean
  }>
}

export function QuestionCard({
  item,
  index,
  onVerifyToggle,
  onDelete,
}: {
  item: ContentEngineCardItem
  index?: number
  onVerifyToggle?: (id: string, current: boolean) => void
  onDelete?: (id: string) => void
}) {
  const [langMode, setLangMode] = useState<"en" | "hi" | "split">("en")

  const hiTr = item.translations?.find((t) => t.lang === "hi")
  const hasHindi = Boolean(hiTr)
  const isHindiReviewed = Boolean(hiTr?.isReviewed)

  const publicUrl = item.isPublished && item.slug && item.exam && item.sub
    ? qaPath(
        langMode === "hi" ? "hi" : "en",
        item.exam,
        item.sub,
        item.slug
      )
    : null

  const optLetters = ["(a)", "(b)", "(c)", "(d)", "(e)", "(f)"]

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3 transition-colors hover:border-primary/40">
      {/* Header row: Index/ShortId, Badges & Language Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2 border-b border-border/60">
        <div className="flex flex-wrap items-center gap-1.5">
          {index !== undefined && (
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
              #{index + 1}
            </span>
          )}
          <span className="text-xs font-mono text-muted-foreground">ID: {item.shortId}</span>

          {item.sub && (
            <Badge variant="secondary" className="text-xs">
              {item.sub}
            </Badge>
          )}
          {item.top && item.top !== "General" && (
            <Badge variant="outline" className="text-xs">
              {item.top}
            </Badge>
          )}
          {item.exam && (
            <Badge variant="default" className="text-xs bg-primary/80">
              {item.exam} {item.year ? `'${item.year.slice(-2)}` : ""}
            </Badge>
          )}
          {item.isInferred && (
            <Badge variant="outline" className="text-xs border-purple-500/40 text-purple-600 dark:text-purple-400">
              Inferred Run
            </Badge>
          )}
          {item.isVerified ? (
            <Badge variant="outline" className="text-xs border-green-500/50 text-green-600 dark:text-green-400 gap-1">
              <Check className="w-3 h-3" /> Verified
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400 border-amber-500/40">
              Unverified
            </Badge>
          )}
          {item.isPublished ? (
            <Badge variant="default" className="text-xs bg-emerald-600">
              Published
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              Draft
            </Badge>
          )}
        </div>

        {/* 3-Way Language Switcher */}
        <div className="flex items-center gap-1 self-start sm:self-auto bg-muted/60 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setLangMode("en")}
            className={`px-2.5 py-1 text-xs font-medium rounded-md min-h-[36px] transition-colors ${
              langMode === "en"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            En
          </button>
          <button
            type="button"
            onClick={() => setLangMode("hi")}
            className={`px-2.5 py-1 text-xs font-medium rounded-md min-h-[36px] transition-colors ${
              langMode === "hi"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            हिन्दी
          </button>
          <button
            type="button"
            onClick={() => setLangMode("split")}
            className={`px-2.5 py-1 text-xs font-medium rounded-md min-h-[36px] transition-colors ${
              langMode === "split"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            En ‖ हिं
          </button>
        </div>
      </div>

      {/* Main Body: English, Hindi, or Split */}
      {langMode === "split" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* English Column */}
          <div className="space-y-2.5 p-3 rounded-lg bg-muted/20 border border-border/50">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">English</span>
            <p className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">{item.q}</p>
            <div className="space-y-1.5 pt-1">
              {item.options.map((opt, i) => {
                const isCorrect = i === item.answerIndex
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-2 p-2 rounded-md text-xs sm:text-sm ${
                      isCorrect
                        ? "bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 border border-emerald-500/30 font-medium"
                        : "bg-background/80 text-foreground"
                    }`}
                  >
                    <span className="font-semibold text-muted-foreground shrink-0">{optLetters[i] || `(${i + 1})`}</span>
                    <span>{opt}</span>
                    {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto shrink-0" />}
                  </div>
                )
              })}
            </div>
            {item.explanation && (
              <div className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-md mt-2 border-l-2 border-primary/50">
                <span className="font-semibold text-foreground block mb-0.5">Explanation:</span>
                <p className="whitespace-pre-wrap">{item.explanation}</p>
              </div>
            )}
          </div>

          {/* Hindi Column */}
          <div className="space-y-2.5 p-3 rounded-lg bg-muted/20 border border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">हिन्दी</span>
              {hasHindi ? (
                isHindiReviewed ? (
                  <Badge variant="outline" className="text-[10px] text-green-600 border-green-500/40">Reviewed</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/40">Unreviewed</Badge>
                )
              ) : null}
            </div>

            {hasHindi && hiTr ? (
              <>
                <p className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">{hiTr.q}</p>
                <div className="space-y-1.5 pt-1">
                  {hiTr.options.map((opt, i) => {
                    const isCorrect = i === item.answerIndex
                    return (
                      <div
                        key={i}
                        className={`flex items-start gap-2 p-2 rounded-md text-xs sm:text-sm ${
                          isCorrect
                            ? "bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 border border-emerald-500/30 font-medium"
                            : "bg-background/80 text-foreground"
                        }`}
                      >
                        <span className="font-semibold text-muted-foreground shrink-0">{optLetters[i] || `(${i + 1})`}</span>
                        <span>{opt}</span>
                        {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto shrink-0" />}
                      </div>
                    )
                  })}
                </div>
                {hiTr.explanation && (
                  <div className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-md mt-2 border-l-2 border-primary/50">
                    <span className="font-semibold text-foreground block mb-0.5">व्याख्या:</span>
                    <p className="whitespace-pre-wrap">{hiTr.explanation}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-1.5 border border-dashed rounded-md">
                <AlertTriangle className="w-6 h-6 text-amber-500/70" />
                <span className="text-xs font-medium">No Hindi translation imported yet</span>
              </div>
            )}
          </div>
        </div>
      ) : langMode === "hi" ? (
        <div className="space-y-2.5 pt-1">
          {hasHindi && hiTr ? (
            <>
              <div className="flex items-center gap-2">
                {isHindiReviewed ? (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-500/40">Human Reviewed</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-500/40">Awaiting Human Review</Badge>
                )}
              </div>
              <p className="text-sm sm:text-base font-medium text-foreground whitespace-pre-wrap leading-relaxed">{hiTr.q}</p>
              <div className="space-y-1.5 pt-1">
                {hiTr.options.map((opt, i) => {
                  const isCorrect = i === item.answerIndex
                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-2 p-2.5 rounded-md text-xs sm:text-sm ${
                        isCorrect
                          ? "bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 border border-emerald-500/30 font-medium"
                          : "bg-muted/40 text-foreground"
                      }`}
                    >
                      <span className="font-semibold text-muted-foreground shrink-0">{optLetters[i] || `(${i + 1})`}</span>
                      <span>{opt}</span>
                      {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto shrink-0" />}
                    </div>
                  )
                })}
              </div>
              {hiTr.explanation && (
                <div className="text-xs sm:text-sm text-muted-foreground bg-muted/40 p-3 rounded-md mt-2 border-l-2 border-primary/50">
                  <span className="font-semibold text-foreground block mb-0.5">व्याख्या:</span>
                  <p className="whitespace-pre-wrap">{hiTr.explanation}</p>
                </div>
              )}
            </>
          ) : (
            <div className="p-6 text-center text-muted-foreground space-y-1.5 border border-dashed rounded-md">
              <AlertTriangle className="w-6 h-6 text-amber-500/70 mx-auto" />
              <p className="text-sm font-medium">No Hindi translation imported for this question</p>
              <p className="text-xs">Import Hindi translations via the Hindi Review tab</p>
            </div>
          )}
        </div>
      ) : (
        /* English Default */
        <div className="space-y-2.5 pt-1">
          <p className="text-sm sm:text-base font-medium text-foreground whitespace-pre-wrap leading-relaxed">{item.q}</p>
          <div className="space-y-1.5 pt-1">
            {item.options.map((opt, i) => {
              const isCorrect = i === item.answerIndex
              return (
                <div
                  key={i}
                  className={`flex items-start gap-2 p-2.5 rounded-md text-xs sm:text-sm ${
                    isCorrect
                      ? "bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 border border-emerald-500/30 font-medium"
                      : "bg-muted/40 text-foreground"
                  }`}
                >
                  <span className="font-semibold text-muted-foreground shrink-0">{optLetters[i] || `(${i + 1})`}</span>
                  <span>{opt}</span>
                  {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto shrink-0" />}
                </div>
              )
            })}
          </div>
          {item.explanation && (
            <div className="text-xs sm:text-sm text-muted-foreground bg-muted/40 p-3 rounded-md mt-2 border-l-2 border-primary/50">
              <span className="font-semibold text-foreground block mb-0.5">Explanation:</span>
              <p className="whitespace-pre-wrap">{item.explanation}</p>
            </div>
          )}
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
        <div>
          {item.sourceTag && <span>Source: {item.sourceTag}</span>}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          {publicUrl && (
            <Link
              href={publicUrl}
              target="_blank"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-muted text-foreground transition-colors min-h-[36px]"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Public Page</span>
            </Link>
          )}
          {onVerifyToggle && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onVerifyToggle(item.id, item.isVerified)}
              className="min-h-[36px] text-xs"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              {item.isVerified ? "Unmark Verified" : "Mark Verified"}
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(item.id)}
              className="min-h-[36px] text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
