/**
 * Hindi translation export (Phase 2.8, M7).
 *
 * The admin copies Format v1 blocks for questions that have no Hindi
 * translation yet, pastes them into the Gemini chat, and Gemini returns
 * translated blocks (LANG: hi, REF: <shortId>). Import matches purely by REF
 * (question shortId — unique), so no positional snapshot ordering is needed.
 */

export const HINDI_EXPORT_KEY = "HINDI_EXPORT_LAST"

export interface HindiExportItem {
  no: number
  shortId: string
  tag: string | null
  subject: string | null
  topic: string | null
  q: string
  options: string[]
  answerLetter: string | null
  keyPoints?: string[]
  additionalInfo?: { heading: string; points: { text: string; sub: string[] }[] }[]
  optionAnalysis?: { letter: string; verdict: string; reason: string }[]
  memoryTip?: string | null
  concepts?: string[]
}

const LETTERS = ["a", "b", "c", "d", "e"]

function block(item: HindiExportItem): string {
  const lines: string[] = []
  lines.push("====")
  lines.push(`NO: ${item.no}`)
  lines.push(`REF: ${item.shortId}`)
  lines.push("LANG: hi")
  if (item.tag) lines.push(`TAG: ${item.tag}`)
  if (item.subject) lines.push(`SUBJECT: ${item.subject}`)
  if (item.topic) lines.push(`TOPIC: ${item.topic}`)
  lines.push(`Q: ${item.q}`)
  item.options.forEach((opt, i) => {
    if (i < 5) lines.push(`${LETTERS[i]}) ${opt}`)
  })
  if (item.answerLetter) lines.push(`ANSWER: ${item.answerLetter}`)
  if (item.keyPoints?.length) {
    lines.push("KEY POINTS:")
    for (const kp of item.keyPoints) lines.push(`- ${kp}`)
  }
  if (item.additionalInfo?.length) {
    lines.push("ADDITIONAL INFO:")
    for (const sec of item.additionalInfo) {
      if (sec.heading) lines.push(`# ${sec.heading}`)
      for (const p of sec.points) {
        lines.push(`- ${p.text}`)
        for (const s of p.sub) lines.push(`  - ${s}`)
      }
    }
  }
  if (item.optionAnalysis?.length) {
    lines.push("OPTION ANALYSIS:")
    for (const row of item.optionAnalysis) {
      lines.push(`${row.letter.toLowerCase()}) ${row.verdict} - ${row.reason}`)
    }
  }
  if (item.memoryTip) lines.push(`MEMORY TIP: ${item.memoryTip}`)
  if (item.concepts?.length) lines.push(`CONCEPTS: ${item.concepts.join(", ")}`)
  return lines.join("\n")
}

/** Full export text: instructions header + one Format v1 block per question. */
export function buildHindiExportText(items: HindiExportItem[]): string {
  const header = [
    "# Hindi Translation Task — AspirantBook Solution Format v1",
    "# For every block below: translate Q, options and the whole solution into",
    "# natural Hindi (Devanagari). KEEP every field key exactly as-is (NO/REF/LANG/",
    "# TAG/SUBJECT/TOPIC/Q/ANSWER/KEY POINTS/ADDITIONAL INFO/OPTION ANALYSIS/",
    "# MEMORY TIP/CONCEPTS), keep REF unchanged and set LANG: hi. Answer letter",
    "# stays the same letter. Use ==== between blocks.",
  ].join("\n")
  return [header, ...items.map(block)].join("\n\n")
}
