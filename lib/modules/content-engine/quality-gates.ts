/**
 * Quality Gates evaluation for competitive exam questions
 * Source: Exam_Content_Engine-4.html
 */

export interface QualityGateInput {
  id: string | number
  q: string
  o: string[]
  a: number
  exp?: string
  resolvedExp?: string
  src?: string
  sub?: string
  top?: string
  isVerified?: boolean
}

export type GateFailureReason =
  | "missing-answer"
  | "few-options"
  | "thin-explanation"
  | "no-source"
  | "uncategorized"
  | "duplicate"
  | "unverified"

/**
 * Creates a Set of 3-word shingles (tri-grams) for Jaccard similarity comparison.
 */
export function wordTrigrams(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/\W+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const set = new Set<string>()
  for (let k = 0; k + 2 < words.length; k++) {
    set.add(`${words[k]} ${words[k + 1]} ${words[k + 2]}`)
  }
  return set
}

/**
 * Computes Jaccard similarity coefficient between two Sets.
 */
export function jaccardSimilarity<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 && b.size === 0) return 1
  let intersection = 0
  for (const item of a) {
    if (b.has(item)) intersection++
  }
  return intersection / Math.max(1, a.size + b.size - intersection)
}

export interface GateResult {
  passed: boolean
  failures: GateFailureReason[]
  duplicateOfId?: string | number
}

/**
 * Evaluates quality gates for an array of questions.
 * Handles duplicate detection across the list.
 */
export function evaluateQualityGates(
  items: QualityGateInput[],
  options: { strict?: boolean } = {}
): Map<string | number, GateResult> {
  const results = new Map<string | number, GateResult>()
  const shinglesList = items.map((i) => wordTrigrams(`${i.q} ${i.o.join(" ")}`))

  items.forEach((item, k) => {
    const failures: GateFailureReason[] = []
    let duplicateOfId: string | number | undefined

    if (item.a < 0) {
      failures.push("missing-answer")
    }

    if (item.o.length < 4) {
      failures.push("few-options")
    }

    // Must evaluate on RESOLVED explanation (cross-references expanded)
    const effectiveExp = (item.resolvedExp || item.exp || "").trim()
    if (effectiveExp.length < 80) {
      failures.push("thin-explanation")
    }

    if (!item.src || !item.src.trim()) {
      failures.push("no-source")
    }

    if (!item.top || item.top === "General" || !item.sub || item.sub === "Uncategorized") {
      failures.push("uncategorized")
    }

    // Duplicate detection against prior items in list
    for (let j = 0; j < k; j++) {
      const priorResult = results.get(items[j].id)
      if (priorResult && !priorResult.failures.includes("duplicate")) {
        const sim = jaccardSimilarity(shinglesList[k], shinglesList[j])
        if (sim >= 0.8) {
          duplicateOfId = items[j].id
          failures.push("duplicate")
          break
        }
      }
    }

    if (options.strict && !item.isVerified) {
      failures.push("unverified")
    }

    results.set(item.id, {
      passed: failures.length === 0,
      failures,
      duplicateOfId,
    })
  })

  return results
}
