/**
 * Classifier module with Devanagari normalization, length-weighted scoring, inferRuns, and re-categorise-all
 * Source: Exam_Content_Engine-4.html
 */

import { T, HS, TaxonomyRow } from "./taxonomy"

/**
 * Unicode normalization for Devanagari and Latin text:
 * - NFD decomposition
 * - Strip nukta (U+093C), ZWJ/ZWNJ (U+200D, U+200C), Vedic svara marks (U+0951-U+0954)
 * - Chandrabindu (U+0901) -> Anusvara (U+0902)
 * - Nasal consonant + halant before consonant ([ङञणनम]्) -> Anusvara (U+0902)
 *   e.g. सिन्धु = सिंधु, हड़प्पा = हङप्पा, चंद्र = चन्द्र
 * - Recompose to NFC
 */
export function nz(t: string): string {
  if (!t) return ""
  return String(t)
    .normalize("NFD")
    .replace(/[\u093C\u200c\u200d\u0951-\u0954]/g, "")
    .replace(/\u0901/g, "\u0902")
    .replace(/[ङञणनम]\u094D(?=[क-ह])/g, "\u0902")
    .replace(/ङ(?!\u094D)/g, "ड")
    .normalize("NFC")
}

interface CachedRow {
  row: [string, string, string[]]
  normalizedKeywords: string[]
}

let cachedTable: CachedRow[] | null = null

function getCachedTable(): CachedRow[] {
  if (cachedTable) return cachedTable
  cachedTable = T.map((r) => ({
    row: r,
    normalizedKeywords: r[2].map((k) => nz(k.toLowerCase())),
  }))
  return cachedTable
}

/**
 * Classifies text into [Subject, Topic].
 * Applies nz normalization to both input text and keywords.
 * Keywords with length >= 7 count 2 points, otherwise 1.
 * Ties go to the earlier row in T.
 */
export function classify(text: string, subjectConstraint?: string): [string, string] {
  const normText = nz(String(text || "").toLowerCase())
  let best: [string, string, string[]] | null = null
  let bestScore = 0

  const table = getCachedTable()

  for (const entry of table) {
    const [sub, top] = entry.row

    // If subjectConstraint is given, honor it (unless History matches Ancient/Medieval/Modern)
    if (subjectConstraint) {
      if (
        sub !== subjectConstraint &&
        !(subjectConstraint === "History" && HS.includes(sub))
      ) {
        continue
      }
    }

    let score = 0
    for (const kw of entry.normalizedKeywords) {
      if (kw && normText.includes(kw)) {
        score += kw.length >= 7 ? 2 : 1
      }
    }

    if (score > bestScore) {
      bestScore = score
      best = entry.row
    }
  }

  if (best) {
    return [best[0], best[1]]
  }

  return [subjectConstraint || "Uncategorized", "General"]
}

export interface ClassifiableItem {
  id?: number | string
  type?: string
  q: string
  o: string[]
  exp?: string
  sub?: string
  top?: string
  inferred?: boolean
  manualOverride?: boolean
}

/**
 * inferRuns:
 * An unmatched MCQ (top === "General" || sub === "Uncategorized") inherits (sub, top)
 * from the nearest matched MCQs in document order when both neighbours agree,
 * or when only one side exists within 5 questions.
 * Inferred items are flagged `inferred=true` and never used as sources for other inferences.
 */
export function inferRuns<T extends ClassifiableItem>(items: T[]): T[] {
  const mcqIndices: number[] = []
  items.forEach((item, idx) => {
    if (item.type === undefined || item.type === "MCQ") {
      mcqIndices.push(idx)
    }
  })

  const isMatched = (k: number): boolean => {
    const it = items[k]
    return (
      it.top !== "General" &&
      it.sub !== "Uncategorized" &&
      Boolean(it.sub) &&
      Boolean(it.top) &&
      !it.inferred
    )
  }

  mcqIndices.forEach((k, p) => {
    const item = items[k]
    if (isMatched(k) || item.inferred) return

    let a: T | null = null
    let b: T | null = null
    let da = 0
    let db = 0

    // Search left
    for (let q = p - 1; q >= 0; q--) {
      const idx = mcqIndices[q]
      if (isMatched(idx)) {
        a = items[idx]
        da = p - q
        break
      }
    }

    // Search right
    for (let q = p + 1; q < mcqIndices.length; q++) {
      const idx = mcqIndices[q]
      if (isMatched(idx)) {
        b = items[idx]
        db = q - p
        break
      }
    }

    let target: T | null = null
    if (a && b && a.sub === b.sub && a.top === b.top) {
      target = a
    } else if (a && !b && da <= 5) {
      target = a
    } else if (b && !a && db <= 5) {
      target = b
    }

    if (target) {
      item.sub = target.sub
      item.top = target.top
      item.inferred = true
    }
  })

  return items
}

/**
 * Re-categorise-all:
 * Ignores parsed/pasted Subject/Topic for items without manual override.
 * Reclassifies via classify() + inferRuns().
 * Items with manualOverride === true are completely preserved.
 */
export function reCategoriseAll<T extends ClassifiableItem>(items: T[]): T[] {
  items.forEach((item) => {
    if (item.type !== undefined && item.type !== "MCQ") return
    if (item.manualOverride) return // Preserved

    // Reclassify text alone without prior subject
    const text = `${item.q} ${item.o.join(" ")} ${item.exp || ""}`
    const [sub, top] = classify(text, "")
    item.sub = sub
    item.top = top
    item.inferred = false
  })

  inferRuns(items)
  return items
}
