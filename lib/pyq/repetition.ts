/**
 * Anti-repetition (Phase 2.5): shingle Jaccard comparison of additionalInfo
 * blocks against existing blocks in the same subject/topic and within the
 * batch. >= threshold (default 0.5) → warning with one-click "Collapse into
 * See also".
 */
import type { AdditionalInfoSection } from "./solution-format"

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\*\*/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
}

export function shingles(text: string, k = 3): Set<string> {
  const toks = tokenize(text)
  const out = new Set<string>()
  if (toks.length === 0) return out
  if (toks.length < k) {
    out.add(toks.join(" "))
    return out
  }
  for (let i = 0; i <= toks.length - k; i++) {
    out.add(toks.slice(i, i + k).join(" "))
  }
  return out
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}

/** Flatten additionalInfo sections to plain text for shingling. */
export function additionalInfoText(sections: AdditionalInfoSection[] | undefined | null): string {
  if (!sections) return ""
  const lines: string[] = []
  for (const s of sections) {
    if (s.heading) lines.push(s.heading)
    for (const p of s.points) {
      lines.push(p.text)
      for (const sub of p.sub) lines.push(sub)
    }
  }
  return lines.join(" ")
}

export const REPETITION_THRESHOLD = 0.5

/**
 * For each candidate block, return the best (max) Jaccard score against the
 * reference set (existing DB blocks in same subject/topic + earlier blocks in
 * the same batch).
 */
export function repetitionScore(
  candidateText: string,
  referenceTexts: string[],
  candidateShingles?: Set<string>,
): number {
  const c = candidateShingles ?? shingles(candidateText)
  if (c.size === 0) return 0
  let best = 0
  for (const ref of referenceTexts) {
    const score = jaccard(c, shingles(ref))
    if (score > best) best = score
    if (best >= 0.99) break
  }
  return best
}
