/**
 * Parser for "AspirantBook Solution Format v1" — the structured plain-text
 * format produced in the Gemini chat (see Add Batch > Copy Gemini prompt).
 *
 * Design goals (spec Phase 2.1):
 * - Lenient: CRLF, smart quotes, code fences, case-insensitive keys,
 *   "Option A)" variants, missing sections (flag, never crash).
 * - Isolate errors per question: one bad block never fails the batch.
 * - Ignore "NEXT:" lines and any text outside ==== blocks.
 */

export interface AdditionalInfoPoint {
  text: string
  sub: string[]
}

export interface AdditionalInfoSection {
  heading: string
  points: AdditionalInfoPoint[]
}

export interface OptionAnalysisRow {
  letter: string // "A".."E"
  verdict: "Correct" | "Incorrect" | "Partially correct"
  reason: string
}

export interface ParsedSolutionQuestion {
  no: string | null
  tag: string | null
  subject: string | null
  topic: string | null
  q: string
  options: string[]
  answer: string | null // "A".."E"
  answerIndex: number // 1..5, -1 when unknown
  check: "agree" | "disagree" | "unsure" | null
  checkNote: string | null
  keyPoints: string[]
  additionalInfo: AdditionalInfoSection[]
  optionAnalysis: OptionAnalysisRow[]
  memoryTip: string | null
  concepts: string[]
  unsure: string | null
  lang: "en" | "hi"
  ref: string | null
  flags: string[]
}

export interface ParsedErrorBlock {
  index: number
  error: string
  raw: string
}

export interface ParsedSolutionBatch {
  format: "solution-v1"
  questions: ParsedSolutionQuestion[]
  errorBlocks: ParsedErrorBlock[]
  ignoredLineCount: number
}

/** Normalize pasted text: CRLF, code fences, smart quotes/dashes, NBSP. */
export function normalizePastedText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/```[a-zA-Z0-9]*[ \t]*\n?/g, "")
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u00A0/g, " ")
    .trim()
}

/** Does the pasted text look like Format v1 solution blocks? */
export function detectSolutionFormat(text: string): boolean {
  const t = normalizePastedText(text)
  if (!/={4,}/.test(t)) return false
  const hasQ = /(^|\n)\s*Q\s*:/i.test(t)
  const hasKeyPoints = /(^|\n)\s*KEY\s*POINTS\s*:/i.test(t)
  return hasQ && hasKeyPoints
}

const LETTERS = ["A", "B", "C", "D", "E"] as const

function slugifyConcept(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function extractAnswerLetter(value: string): string | null {
  const m = value.match(/\b([A-Ea-e])\b/)
  return m ? m[1].toUpperCase() : null
}

type OpenTarget =
  | { type: "field"; name: string }
  | { type: "option"; i: number }
  | { type: "kp"; i: number }
  | { type: "info-point"; s: number; p: number }
  | { type: "info-sub"; s: number; p: number }
  | { type: "oa"; i: number }
  | null

interface BlockState {
  no: string | null
  tag: string | null
  subject: string | null
  topic: string | null
  q: string[]
  options: string[]
  optionSeen: boolean[]
  answer: string | null
  check: string | null
  checkNote: string[]
  keyPoints: string[]
  sections: AdditionalInfoSection[]
  oa: OptionAnalysisRow[]
  memoryTip: string[]
  concepts: string[]
  unsure: string[]
  lang: "en" | "hi"
  ref: string | null
  flags: Set<string>
  strayCount: number
}

function newBlockState(): BlockState {
  return {
    no: null,
    tag: null,
    subject: null,
    topic: null,
    q: [],
    options: [],
    optionSeen: [],
    answer: null,
    check: null,
    checkNote: [],
    keyPoints: [],
    sections: [],
    oa: [],
    memoryTip: [],
    concepts: [],
    unsure: [],
    lang: "en",
    ref: null,
    flags: new Set<string>(),
    strayCount: 0,
  }
}

function appendTo(state: BlockState, open: OpenTarget, line: string): void {
  if (!open) {
    state.strayCount += 1
    return
  }
  switch (open.type) {
    case "field": {
      const target =
        open.name === "Q"
          ? state.q
          : open.name === "CHECK_NOTE"
            ? state.checkNote
            : open.name === "MEMORY TIP"
              ? state.memoryTip
              : open.name === "UNSURE"
                ? state.unsure
                : null
      if (target) target.push(line)
      else state.strayCount += 1
      break
    }
    case "option":
      state.options[open.i] = (state.options[open.i] + " " + line).trim()
      break
    case "kp":
      state.keyPoints[open.i] = (state.keyPoints[open.i] + " " + line).trim()
      break
    case "info-point": {
      const sec = state.sections[open.s]
      if (sec && sec.points[open.p]) {
        sec.points[open.p].text = (sec.points[open.p].text + " " + line).trim()
      } else {
        state.strayCount += 1
      }
      break
    }
    case "info-sub": {
      const sec = state.sections[open.s]
      const pt = sec?.points[open.p]
      if (pt && pt.sub.length > 0) {
        pt.sub[pt.sub.length - 1] = (pt.sub[pt.sub.length - 1] + " " + line).trim()
      } else {
        state.strayCount += 1
      }
      break
    }
    case "oa": {
      const row = state.oa[open.i]
      if (row) row.reason = (row.reason + " " + line).trim()
      else state.strayCount += 1
      break
    }
  }
}

const FIELD_LINE_RE =
  /^(NO|TAG|SUBJECT|TOPIC|Q|ANSWER|CHECK|CHECK_NOTE|CHECKNOTE|KEY[ ]?POINTS|ADDITIONAL[ ]?INFO|OPTION[ ]?ANALYSIS|MEMORY[ ]?TIP|CONCEPTS|UNSURE|LANG|REF)\s*:\s*([^\n]*)$/i

const OPTION_LINE_RE = /^([A-Ea-e])\)[ \t]*(.*)$/
const OA_ROW_RE =
  /^(?:Option\s+)?([A-Ea-e])\)\s*(Correct|Incorrect|Partially[ ]+correct)\s*(?:[-:]|\s)\s*(.*)$/i
const HEADING_RE = /^\s*#\s*(.+)$/
const BULLET_RE = /^(\s*)-\s+(.*)$/
const NEXT_LINE_RE = /^\s*NEXT\s*:\s*\S.*$/i

function parseBlock(raw: string, index: number): ParsedSolutionQuestion {
  const state = newBlockState()
  let open: OpenTarget = null
  let mode: "none" | "keypoints" | "info" | "oa" = "none"

  const lines = raw.split("\n")
  for (const rawLine of lines) {
    if (NEXT_LINE_RE.test(rawLine)) continue
    const line = rawLine.replace(/\s+$/, "")
    if (!line.trim()) {
      open = open
      continue
    }

    // Field keys (case-insensitive) — checked before option/bullet detection.
    const fieldMatch = line.match(FIELD_LINE_RE)
    if (fieldMatch) {
      const key = fieldMatch[1].toUpperCase().replace(/\s+/g, " ")
      const value = fieldMatch[2].trim()
      mode = "none"
      switch (key) {
        case "NO":
          state.no = value || null
          open = { type: "field", name: "NO" }
          break
        case "TAG":
          state.tag = value && !/^none$/i.test(value) ? value : null
          open = { type: "field", name: "TAG" }
          break
        case "SUBJECT":
          state.subject = value || null
          open = { type: "field", name: "SUBJECT" }
          break
        case "TOPIC":
          state.topic = value || null
          open = { type: "field", name: "TOPIC" }
          break
        case "Q":
          if (value) state.q.push(value)
          open = { type: "field", name: "Q" }
          break
        case "ANSWER": {
          const letter = extractAnswerLetter(value)
          state.answer = letter
          open = null
          break
        }
        case "CHECK": {
          const v = value.toLowerCase()
          state.check = v === "agree" || v === "disagree" || v === "unsure" ? v : null
          if (!state.check && value) state.flags.add("check-invalid")
          open = null
          break
        }
        case "CHECK_NOTE":
        case "CHECKNOTE":
          if (value) state.checkNote.push(value)
          open = { type: "field", name: "CHECK_NOTE" }
          break
        case "KEY POINTS":
          mode = "keypoints"
          open = null
          if (value) {
            state.keyPoints.push(value)
            open = { type: "kp", i: state.keyPoints.length - 1 }
          }
          break
        case "ADDITIONAL INFO":
          mode = "info"
          open = null
          break
        case "OPTION ANALYSIS":
          mode = "oa"
          open = null
          break
        case "MEMORY TIP":
          if (value) state.memoryTip.push(value)
          open = { type: "field", name: "MEMORY TIP" }
          break
        case "CONCEPTS":
          if (value) state.concepts.push(value)
          open = { type: "field", name: "CONCEPTS" }
          break
        case "UNSURE":
          if (value) state.unsure.push(value)
          open = { type: "field", name: "UNSURE" }
          break
        case "LANG": {
          const v = value.trim().toLowerCase()
          state.lang = v.startsWith("hi") ? "hi" : "en"
          if (v && !v.startsWith("hi") && !v.startsWith("en")) state.flags.add("lang-invalid")
          open = null
          break
        }
        case "REF":
          state.ref = value || null
          open = null
          break
      }
      continue
    }

    if (mode === "info") {
      const heading = line.match(HEADING_RE)
      if (heading) {
        state.sections.push({ heading: heading[1].trim(), points: [] })
        open = null
        continue
      }
      const bullet = line.match(BULLET_RE)
      if (bullet) {
        const indent = bullet[1].length
        if (!state.sections.length) {
          state.sections.push({ heading: "", points: [] })
        }
        const sec = state.sections[state.sections.length - 1]
        if (indent >= 2 && sec.points.length > 0) {
          sec.points[sec.points.length - 1].sub.push(bullet[2].trim())
          open = {
            type: "info-sub",
            s: state.sections.length - 1,
            p: sec.points.length - 1,
          }
        } else {
          sec.points.push({ text: bullet[2].trim(), sub: [] })
          open = { type: "info-point", s: state.sections.length - 1, p: sec.points.length - 1 }
        }
        continue
      }
      appendTo(state, open, line.trim())
      continue
    }

    if (mode === "keypoints") {
      const bullet = line.match(BULLET_RE)
      if (bullet) {
        state.keyPoints.push(bullet[2].trim())
        open = { type: "kp", i: state.keyPoints.length - 1 }
      } else {
        appendTo(state, open, line.trim())
      }
      continue
    }

    if (mode === "oa") {
      const row = line.match(OA_ROW_RE)
      if (row) {
        const verdictRaw = row[2].toLowerCase().replace(/\s+/g, " ")
        state.oa.push({
          letter: row[1].toUpperCase(),
          verdict:
            verdictRaw === "correct"
              ? "Correct"
              : verdictRaw === "incorrect"
                ? "Incorrect"
                : "Partially correct",
          reason: row[3].trim(),
        })
        open = { type: "oa", i: state.oa.length - 1 }
      } else {
        appendTo(state, open, line.trim())
      }
      continue
    }

    // mode === "none": option lines or continuation of the open field.
    const opt = line.match(OPTION_LINE_RE)
    if (opt) {
      const letter = opt[1].toUpperCase()
      const li = LETTERS.indexOf(letter as (typeof LETTERS)[number])
      if (li >= 0) {
        if (state.options[li] === undefined) state.options[li] = ""
        state.options[li] = (state.options[li] + " " + opt[2].trim()).trim()
        state.optionSeen[li] = true
        open = { type: "option", i: li }
        continue
      }
    }
    appendTo(state, open, line.trim())
  }

  // Assemble + flags
  const flags: string[] = []
  const q = state.q.join(" ").trim()
  const options = state.options.filter((o) => typeof o === "string" && o.trim().length > 0)
  if (!state.no) flags.push("missing:NO")
  if (!state.tag) flags.push("tag:none")
  if (!state.subject) flags.push("missing:SUBJECT")
  if (!state.topic) flags.push("missing:TOPIC")
  if (!q) flags.push("missing:Q")
  if (options.length < 2) flags.push("options<2")
  if (!state.answer) flags.push("missing:ANSWER")
  if (state.answer && !state.optionSeen[LETTERS.indexOf(state.answer as "A")]) {
    flags.push("answer-out-of-range")
  }
  if (state.keyPoints.length === 0) flags.push("missing:KEY POINTS")
  if (state.sections.length === 0) flags.push("missing:ADDITIONAL INFO")
  if (state.oa.length === 0) flags.push("missing:OPTION ANALYSIS")
  if (state.memoryTip.length === 0) flags.push("missing:MEMORY TIP")
  if (state.concepts.length === 0) flags.push("missing:CONCEPTS")
  for (const row of state.oa) {
    const li = LETTERS.indexOf(row.letter as "A")
    if (li >= 0 && !state.optionSeen[li]) flags.push(`analysis-row-for-missing-option:${row.letter}`)
  }
  for (let i = 0; i < Math.min(options.length, 5); i++) {
    if (state.optionSeen[i] && !state.oa.some((r) => r.letter === LETTERS[i])) {
      flags.push(`analysis-missing:${LETTERS[i]}`)
    }
  }
  if (state.sections.some((s) => !s.heading)) flags.push("info-no-heading")
  if (state.strayCount > 0) flags.push(`stray-text:${state.strayCount}`)

  const answerIndex = state.answer ? LETTERS.indexOf(state.answer as "A") + 1 : -1
  const unsureRaw = state.unsure.join(" ").trim()

  return {
    no: state.no,
    tag: state.tag,
    subject: state.subject,
    topic: state.topic,
    q,
    options,
    answer: state.answer,
    answerIndex,
    check: state.check as ParsedSolutionQuestion["check"],
    checkNote: state.checkNote.join(" ").trim() || null,
    keyPoints: state.keyPoints.filter((k) => k.trim()),
    additionalInfo: state.sections,
    optionAnalysis: state.oa,
    memoryTip: state.memoryTip.join(" ").trim() || null,
    concepts: Array.from(
      new Set(state.concepts.flatMap((c) => c.split(/[,\n]/)).map(slugifyConcept).filter(Boolean)),
    ),
    unsure: unsureRaw && !/^none$/i.test(unsureRaw) ? unsureRaw : null,
    lang: state.lang,
    ref: state.ref,
    flags,
  }
}

/**
 * Parse a whole pasted batch. Errors are isolated per block: a block that
 * throws lands in `errorBlocks` with a visible message and the rest of the
 * batch still parses.
 */
export function parseSolutionBatch(text: string): ParsedSolutionBatch {
  const normalized = normalizePastedText(text)
  const segments = normalized.split(/^[ \t]*={4,}[ \t]*$/m)
  const questions: ParsedSolutionQuestion[] = []
  const errorBlocks: ParsedErrorBlock[] = []
  let ignoredLineCount = 0

  segments.forEach((segment, i) => {
    const trimmed = segment.trim()
    if (!trimmed) {
      return
    }
    const looksLikeBlock = /(^|\n)\s*(NO|Q)\s*:/i.test(trimmed) || /KEY\s*POINTS\s*:/i.test(trimmed)
    if (!looksLikeBlock) {
      // Preamble / postamble / commentary — ignored by spec, but counted.
      ignoredLineCount += trimmed.split("\n").length
      return
    }
    try {
      questions.push(parseBlock(trimmed, i))
    } catch (err) {
      errorBlocks.push({
        index: i,
        error: err instanceof Error ? err.message : String(err),
        raw: trimmed.slice(0, 500),
      })
    }
  })

  return { format: "solution-v1", questions, errorBlocks, ignoredLineCount }
}
