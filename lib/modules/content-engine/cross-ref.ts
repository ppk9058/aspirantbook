/**
 * Cross-Reference Explanation Resolver
 * Source: Exam_Content_Engine-4.html
 */

export const REFQ = /(?:प्रश्न|प्र\.?|questions?|ques\.?|\bQ\.?)\s*(?:no\.?|number|संख्या|सं\.?)?\s*(\d+)/i
export const REFV = /व्याख्या|समाधान|\bहल\b|explanation|solution|देख|\bsee\b|refer/i

export interface CrossRefQuestion {
  id: number | string
  no?: number
  q: string
  exp?: string
  src?: string
  type?: string
  // Optional Hindi/English variants
  hindiExp?: string
  englishExp?: string
}

export interface RefInfoResult {
  n: number
  keep: string
  target: CrossRefQuestion
  targetExp: string
}

export function isHindiText(text: string): boolean {
  return /[\u0900-\u097F]/.test(text || "")
}

/**
 * Checks if a question's explanation contains a cross-reference to another question.
 * Only applies when explanation is non-empty and length <= 400 characters.
 */
export function refInfo(
  i: CrossRefQuestion,
  pool: CrossRefQuestion[]
): RefInfoResult | null {
  const ex = (i.exp || "").trim()
  if (!ex || ex.length > 400) return null

  let targetNo: number | null = null
  const keep: string[] = []

  ex.split("\n").forEach((line) => {
    // Split on sentence boundaries (handling both Latin punctuation and Devanagari Danda)
    const sentences = line.split(/(?<=[।.!?])\s+/).filter((sentence) => {
      const match = sentence.match(REFQ)
      if (match && REFV.test(sentence) && targetNo === null) {
        targetNo = +match[1]
        return false // Exclude this reference sentence
      }
      return true
    })

    const remaining = sentences.join(" ").trim()
    if (remaining) keep.push(remaining)
  })

  if (targetNo === null) return null

  const isHindi = isHindiText(i.q)

  // Find candidate by source question number first
  let candidates = pool.filter(
    (x) => (x.type === undefined || x.type === "MCQ") && x.id !== i.id && +Number(x.no) === targetNo
  )

  // Fallback to n-th item (1-indexed) if no source number matches
  if (!candidates.length && targetNo >= 1 && targetNo <= pool.length) {
    const candidateByIndex = pool[targetNo - 1]
    if (candidateByIndex && candidateByIndex.id !== i.id && (candidateByIndex.type === undefined || candidateByIndex.type === "MCQ")) {
      candidates = [candidateByIndex]
    }
  }

  // Prefer matching source tag
  const t0 = candidates.find((x) => x.src === i.src) || candidates[0]
  if (!t0) return null

  // Resolve same-language explanation
  let targetExp = ""
  if (isHindi) {
    targetExp = isHindiText(t0.q) ? t0.exp || "" : t0.hindiExp || t0.exp || ""
  } else {
    targetExp = isHindiText(t0.q) ? t0.englishExp || t0.exp || "" : t0.exp || ""
  }

  if (!targetExp.trim()) return null

  return {
    n: targetNo,
    keep: keep.join("\n"),
    target: t0,
    targetExp,
  }
}

/**
 * Resolves explanation recursively up to depth 3.
 */
export function resolveExplanation(
  i: CrossRefQuestion,
  pool: CrossRefQuestion[],
  depth = 0
): { resolvedExp: string; refNumber: number | null } {
  if (depth >= 3) {
    return { resolvedExp: i.exp || "", refNumber: null }
  }

  const info = refInfo(i, pool)
  if (!info) {
    return { resolvedExp: i.exp || "", refNumber: null }
  }

  const subResolved = resolveExplanation(
    {
      ...info.target,
      exp: info.targetExp,
    },
    pool,
    depth + 1
  )

  const prefix = info.keep ? info.keep + "\n" : ""
  return {
    resolvedExp: prefix + subResolved.resolvedExp,
    refNumber: info.n,
  }
}

/**
 * Returns formatted note indicating borrowed explanation.
 */
export function getRefNote(refNumber: number, isHindi: boolean): string {
  return isHindi
    ? `यह व्याख्या प्रश्न ${refNumber} से ली गई है।`
    : `Explanation taken from question ${refNumber}.`
}
