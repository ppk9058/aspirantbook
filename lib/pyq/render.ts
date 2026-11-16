/**
 * Safe rendering helpers for structured solutions (Phase 2, M6).
 *
 * Rules (docs/responsive-ui-standards.md §16):
 * - Escape ALL text first; only our own inline markers pass through.
 * - Structured solutions support exactly one marker: **bold** -> <strong>.
 * - Private review fields (CHECK_NOTE, UNSURE, warnings) are never public;
 *   they are stripped here so a caller cannot leak them by accident.
 */

export interface SolutionAdditionalInfo {
  heading: string
  points: { text: string; sub: string[] }[]
}

export interface StructuredSolution {
  status?: string
  check?: string | null
  checkNote?: string | null
  unsure?: string | null
  warnings?: string[]
  answerExplain?: string | null
  keyPoints?: string[]
  additionalInfo?: SolutionAdditionalInfo[]
  optionAnalysis?: { letter: string; verdict: string; reason: string }[]
  memoryTip?: string | null
  concepts?: string[]
}

/** Escape a string for safe HTML text/attribute interpolation. */
export function escapeHtml(raw: unknown): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/** Escape, then allow exactly one inline marker: **bold** -> <strong>. */
export function inlineHtml(raw: unknown): string {
  return escapeHtml(raw).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
}

/** Public view of a solution: private fields stripped, arrays normalised. */
export function publicSolution(solution: unknown): StructuredSolution {
  const sol = (solution || {}) as StructuredSolution
  return {
    answerExplain: sol.answerExplain || null,
    keyPoints: Array.isArray(sol.keyPoints) ? sol.keyPoints.filter(Boolean) : [],
    additionalInfo: Array.isArray(sol.additionalInfo) ? sol.additionalInfo : [],
    optionAnalysis: Array.isArray(sol.optionAnalysis) ? sol.optionAnalysis : [],
    memoryTip: sol.memoryTip || null,
    concepts: Array.isArray(sol.concepts) ? sol.concepts.filter(Boolean) : [],
    // check / checkNote / unsure / warnings deliberately dropped: never public.
  }
}
