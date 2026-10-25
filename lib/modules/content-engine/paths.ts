/**
 * Canonical URL path builders and slug generators
 * Shared by Native Next.js routes (Phase 4A) and Cloudflare ZIP export (Phase 4B).
 */

/**
 * Normalizes any text to a clean lowercase ASCII slug.
 * Non-alphanumeric characters (including slashes like RAS/RTS) become hyphens.
 */
export function slugify(text: string): string {
  if (!text) return ""
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Builds the canonical question URL path.
 *
 * Pattern:
 * - English: /question-answer/{exam}/{subject}/{questionSlug}
 * - Hindi:   /hi/question-answer/{exam}/{subject}/{questionSlug}
 *
 * When exam is empty, uses "general".
 */
export function qaPath(
  lang: "en" | "hi",
  exam: string | undefined | null,
  subject: string | undefined | null,
  questionSlug: string
): string {
  const prefix = lang === "hi" ? "/hi/question-answer" : "/question-answer"
  const examSegment = slugify(exam || "") || "general"
  const subSegment = slugify(subject || "") || "general"
  const qSlug = slugify(questionSlug) || "question"

  return `${prefix}/${examSegment}/${subSegment}/${qSlug}`
}

/**
 * Generates an English stem slug for a question.
 */
export function makeStemSlug(englishText: string, maxLen = 60): string {
  const clean = slugify(englishText || "")
  if (clean.length <= maxLen) return clean
  let cut = clean.slice(0, maxLen)
  const lastHyphen = cut.lastIndexOf("-")
  if (lastHyphen > 20) cut = cut.slice(0, lastHyphen)
  return cut.replace(/-+$/, "")
}

/**
 * Builds the full question slug combining shortId and stem:
 * e.g. "a1b2c3d4-where-did-revolt-of-1857-start"
 * If no English stem is available, falls back to "q-{shortId}".
 */
export function makeQuestionSlug(shortId: string, englishText?: string): string {
  const stem = englishText ? makeStemSlug(englishText) : ""
  if (stem) {
    return `${shortId}-${stem}`
  }
  return `q-${shortId}`
}

/**
 * Extracts shortId from a question slug (matches 8 alphanumeric chars at start, or q-{shortId}).
 */
export function extractShortIdFromSlug(slug: string): string | null {
  if (!slug) return null
  const m = slug.match(/^(?:q-)?([a-z0-9]{8})(?:-.*)?$/i)
  return m ? m[1].toLowerCase() : null
}

// Hub path builders
export function homeHubPath(lang: "en" | "hi" = "en"): string {
  return lang === "hi" ? "/hi/question-answer" : "/question-answer"
}

export function examHubPath(exam: string, lang: "en" | "hi" = "en"): string {
  const base = homeHubPath(lang)
  return `${base}/${slugify(exam) || "general"}`
}

export function yearHubPath(exam: string, year: string | number, lang: "en" | "hi" = "en"): string {
  const base = examHubPath(exam, lang)
  return `${base}/${year}`
}

export function subjectHubPath(exam: string, subject: string, lang: "en" | "hi" = "en"): string {
  const base = examHubPath(exam, lang)
  return `${base}/${slugify(subject) || "general"}`
}

export function topicHubPath(
  exam: string,
  subject: string,
  topic: string,
  lang: "en" | "hi" = "en"
): string {
  const base = subjectHubPath(exam, subject, lang)
  return `${base}/topic/${slugify(topic) || "general"}`
}
