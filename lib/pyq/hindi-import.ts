/**
 * Hindi translation import (Phase 2.8, M7).
 *
 * Parses pasted Format v1 blocks with LANG: hi and REF: <shortId>, matches the
 * parent question by shortId (unique — no positional snapshot needed), and
 * produces ContentEngineTranslation rows with isReviewed=false and solution
 * status NEEDS_REVIEW. Pure logic lives here; DB upserts live in the route.
 */

import type { ParsedSolutionQuestion } from "@/lib/pyq/solution-format"
import { storedAnswerLetter } from "@/lib/pyq/answer-check"

export interface HindiSkip {
  ref: string | null
  no: string | null
  reason: string
}

export interface HindiImportRow {
  ref: string
  lang: "hi"
  q: string
  options: string[]
  answer: string | null
  explanation: null
  solution: {
    keyPoints: string[]
    additionalInfo: { heading: string; points: { text: string; sub: string[] }[] }[]
    optionAnalysis: { letter: string; verdict: string; reason: string }[]
    memoryTip: string | null
    concepts: string[]
    check: string | null
    checkNote: string | null
    unsure: string | null
    status: "NEEDS_REVIEW"
    warnings: string[]
    hints: { subject: string | null; topic: string | null }
  }
  warnings: string[]
}

/** Validate one parsed hi block against its parent question. */
export function evaluateHindiBlock(
  parsed: ParsedSolutionQuestion,
  parent: { shortId: string; answer: string | null } | null,
): { ok: true; row: HindiImportRow; warnings: string[] } | { ok: false; reason: string } {
  if (parsed.lang !== "hi") return { ok: false, reason: "block is not LANG: hi" }
  if (!parsed.ref) return { ok: false, reason: "missing REF" }
  if (!parent) return { ok: false, reason: `REF ${parsed.ref} not found` }

  const warnings: string[] = [...parsed.flags]

  if (!parsed.q) return { ok: false, reason: "missing Q (Hindi stem)" }
  const options = parsed.options.filter((o) => o.trim().length > 0)
  if (options.length < 2) return { ok: false, reason: "fewer than 2 options" }
  if (!parsed.answer) return { ok: false, reason: "missing ANSWER" }

  // Cross-check: translated ANSWER letter must match the parent question's
  // stored letter (answer-mismatch gate, same as English import).
  const parentLetter = parent.answer ? storedAnswerLetter(parent.answer) : null
  if (parentLetter && parentLetter !== parsed.answer) {
    warnings.push("answer-mismatch")
  }

  const row: HindiImportRow = {
    ref: parsed.ref,
    lang: "hi",
    q: parsed.q,
    options,
    answer: parsed.answer,
    explanation: null,
    solution: {
      keyPoints: parsed.keyPoints,
      additionalInfo: parsed.additionalInfo,
      optionAnalysis: parsed.optionAnalysis,
      memoryTip: parsed.memoryTip || null,
      concepts: parsed.concepts,
      check: parsed.check || null,
      checkNote: parsed.checkNote || null,
      unsure: parsed.unsure || null,
      status: "NEEDS_REVIEW",
      warnings,
      hints: { subject: parsed.subject || null, topic: parsed.topic || null },
    },
    warnings,
  }
  return { ok: true, row, warnings }
}
