/**
 * Answer cross-check (Phase 2.6, no API): export questions without verified
 * answers, admin pastes them into a NEW Gemini chat and gets "1-B, 2-C, ..."
 * back; import compares with stored answers.
 */
export const ANSWER_CHECK_EXPORT_KEY = "ANSWER_CHECK_EXPORT_LAST"
export const GATE_ANSWER_MISMATCH = "answer-mismatch"

export interface AnswerCheckExportItem {
  no: number
  shortId: string
  q: string
  options: string[]
}

export function buildAnswerCheckExportText(items: AnswerCheckExportItem[]): string {
  return items
    .map((it) => {
      const opts = it.options.map((o, i) => `${"ABCDE"[i] || "?"}) ${o}`).join("\n")
      return `${it.no}. ${it.q}\n${opts}`
    })
    .join("\n\n")
}

export interface ParsedAnswerCheck {
  results: { no: number; letter: string }[]
  errors: string[]
}

/** Lenient parser for "1-B, 2. C, 3) b, 4: E" style replies (commas/newlines). */
export function parseAnswerCheckText(text: string): ParsedAnswerCheck {
  const errors: string[] = []
  const results: { no: number; letter: string }[] = []
  const seen = new Set<number>()
  const tokens = text
    .split(/[,;\n]+/)
    .map((t) => t.trim())
    .filter(Boolean)
  for (const token of tokens) {
    const m = token.match(/^(\d{1,4})\s*[-.):]?\s*[:\-]?\s*([A-Ea-e])\)?\.?$/)
    if (!m) {
      errors.push(token.slice(0, 60))
      continue
    }
    const no = Number.parseInt(m[1], 10)
    const letter = m[2].toUpperCase()
    if (seen.has(no)) {
      errors.push(`duplicate:${no}`)
      continue
    }
    seen.add(no)
    results.push({ no, letter })
  }
  return { results, errors }
}

/** Extract the answer letter from a stored answer string ("B", "(b)", "B) Mars"...). */
export function storedAnswerLetter(answer: string): string | null {
  const cleaned = answer.trim()
  const single = cleaned.match(/^[(]?([A-Ea-e])[).:]?\)?$/)
  if (single) return single[1].toUpperCase()
  const prefixed = cleaned.match(/^(?:option\s+)?[(]?\s*([A-Ea-e])\s*[).:]/i)
  return prefixed ? prefixed[1].toUpperCase() : null
}
