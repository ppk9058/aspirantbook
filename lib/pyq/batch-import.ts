/**
 * Batch import helpers (Phase 2.2 / 2.3): zod schema for pasted structured
 * questions, hint classification against the taxonomy, and the
 * NEEDS_REVIEW decision. Server-side only (crypto import); schema is shared
 * with the client for types.
 */
import { createHash } from "crypto"
import { z } from "zod"
import { findTaxonomySubject, findTaxonomyTopic } from "./taxonomy"
import type { AdditionalInfoSection, OptionAnalysisRow } from "./solution-format"

export const answerLetter = z.string().regex(/^[A-E]$/, "Answer must be A-E")

export const batchQuestionSchema = z.object({
  no: z.string().nullable().optional(),
  tag: z.string().nullable().optional(),
  subject: z.string().nullable().optional(),
  topic: z.string().nullable().optional(),
  q: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(5),
  answer: answerLetter,
  answerIndex: z.number().int().min(1).max(5),
  check: z.enum(["agree", "disagree", "unsure"]).nullable().optional(),
  checkNote: z.string().nullable().optional(),
  keyPoints: z.array(z.string()).default([]),
  additionalInfo: z
    .array(
      z.object({
        heading: z.string(),
        points: z.array(z.object({ text: z.string(), sub: z.array(z.string()).default([]) })),
      }),
    )
    .default([]),
  optionAnalysis: z
    .array(
      z.object({
        letter: z.string().regex(/^[A-E]$/),
        verdict: z.enum(["Correct", "Incorrect", "Partially correct"]),
        reason: z.string().default(""),
      }),
    )
    .default([]),
  memoryTip: z.string().nullable().optional(),
  concepts: z.array(z.string()).default([]),
  unsure: z.string().nullable().optional(),
  exam: z.string().nullable().optional(),
  year: z.string().nullable().optional(),
  flags: z.array(z.string()).default([]),
})

export type BatchQuestionInput = z.infer<typeof batchQuestionSchema>

export interface HintClassification {
  sub: string | null
  top: string | null
  classificationFlags: string[]
}

/**
 * SUBJECT/TOPIC from the paste are HINTS (Phase 2.3):
 *  - hint exists in taxonomy → use it verbatim
 *  - hint not in taxonomy → Uncategorized + flag
 * Topic without a valid subject → Uncategorized too.
 */
export function classifyHints(
  subjectHint: string | null | undefined,
  topicHint: string | null | undefined,
  defaultSubject?: string | null,
  defaultTopic?: string | null,
): HintClassification {
  const subject = (subjectHint || defaultSubject || "").trim() || null
  const topic = (topicHint || defaultTopic || "").trim() || null
  const classificationFlags: string[] = []
  if (!subject) {
    if (topic) classificationFlags.push("topic-without-subject")
    return { sub: null, top: null, classificationFlags }
  }
  const sub = findTaxonomySubject(subject)
  if (!sub) {
    classificationFlags.push("subject-not-in-taxonomy")
    return { sub: null, top: null, classificationFlags }
  }
  if (!topic) return { sub: sub.name, top: null, classificationFlags }
  const top = findTaxonomyTopic(sub.name, topic)
  if (!top) {
    classificationFlags.push("topic-not-in-taxonomy")
    return { sub: sub.name, top: null, classificationFlags }
  }
  return { sub: sub.name, top: `${top.num} ${top.name}`, classificationFlags }
}

const MISSING_SECTION_FLAGS = [
  "missing:Q",
  "missing:SUBJECT",
  "missing:TOPIC",
  "missing:ANSWER",
  "options<2",
  "missing:KEY POINTS",
  "missing:ADDITIONAL INFO",
  "missing:OPTION ANALYSIS",
  "missing:MEMORY TIP",
  "missing:CONCEPTS",
]

export interface ReviewDecisionInput {
  check: string | null | undefined
  unsure: string | null | undefined
  flags: string[]
  duplicate: boolean
  repetitionMax: number
}

/**
 * NEEDS_REVIEW decision (Phase 2.6/2.7):
 * CHECK disagree/unsure, non-empty UNSURE, missing-section parse flags,
 * duplicate warning or repetition >= 0.5 → NEEDS_REVIEW.
 * (answer-mismatch gate is applied separately after the optional answer check.)
 */
export function needsReview(input: ReviewDecisionInput): boolean {
  if (input.check === "disagree" || input.check === "unsure") return true
  if (input.unsure && !/^none$/i.test(input.unsure.trim())) return true
  if (input.flags.some((f) => MISSING_SECTION_FLAGS.includes(f) || f.startsWith("stray-text"))) {
    return true
  }
  if (input.duplicate) return true
  if (input.repetitionMax >= 0.5) return true
  return false
}

/** Normalized question key for duplicate detection and content hashing. */
export function normalizedQuestionKey(q: string, options: string[]): string {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[^a-z0-9 ]/g, "")
      .trim()
  return [norm(q), ...options.map(norm)].join("|")
}

export function contentHash(q: string, options: string[]): string {
  return `th-${createHash("sha256").update(normalizedQuestionKey(q, options)).digest("hex").slice(0, 24)}`
}

/** Build the stored solution JSON (Phase 2.2). */
export function buildSolutionJson(
  input: BatchQuestionInput,
  opts: { solutionStatus: "NEEDS_REVIEW" | "APPROVED"; warnings: string[] },
) {
  const additionalInfo: AdditionalInfoSection[] = input.additionalInfo
  const optionAnalysis: OptionAnalysisRow[] = input.optionAnalysis
  return {
    keyPoints: input.keyPoints,
    additionalInfo,
    optionAnalysis,
    memoryTip: input.memoryTip || null,
    concepts: input.concepts,
    check: input.check || null,
    checkNote: input.checkNote || null,
    unsure: input.unsure || null,
    status: opts.solutionStatus,
    warnings: opts.warnings,
    hints: { subject: input.subject || null, topic: input.topic || null },
  }
}
