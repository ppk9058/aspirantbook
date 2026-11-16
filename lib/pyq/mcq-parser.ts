/**
 * Raw MCQ fallback parser for Add Batch (Phase 2.1).
 *
 * Used when the pasted text does NOT contain Format v1 solution blocks.
 * Handles the layouts proven in the offline pipeline (scripts/pyq-pipeline/parse.mjs):
 *  - `Q<num>.` / `Q<num>)` stems with `(a)`-`(d)` / `a)` options and `Answer: (x)`
 *  - plain numbered stems `1.` with lettered options
 *  - inline `Answer: (b)` at the end of a stem line
 *
 * Lenient by design: bad blocks get flags, never throw; one bad block never
 * fails the batch.
 */
import { normalizePastedText } from "./solution-format"

export interface ParsedRawQuestion {
  sourceNo: number | null
  q: string
  options: string[]
  answer: string | null
  answerIndex: number
  flags: string[]
  raw: string
}

export interface ParsedRawBatch {
  format: "raw-mcq"
  questions: ParsedRawQuestion[]
  errorBlocks: { index: number; error: string; raw: string }[]
  ignoredLineCount: number
}

const LETTERS = ["A", "B", "C", "D", "E"] as const

const RAW_Q_QPREFIX_RE = /^\s*Q\s*[.]?\s*(\d{1,3})\s*[.)]?\s+(.*)$/i
const RAW_Q_NUM_RE = /^\s*(\d{1,3})\s*[.)]\s+(.*)$/
const RAW_OPT_RE = /^\s*\(?\s*([a-dA-D])\s*\)[.\)]?[ \t]*(.*)$/
const RAW_ANS_LINE_RE =
  /^\s*(?:Correct\s+)?(?:Answer|Ans)\s*[.:\-]?\s*\(?\s*([a-dA-D])\s*\)?\s*\.?\s*$/i
const RAW_ANS_INLINE_RE = /(?:Correct\s+)?(?:Answer|Ans)\s*[.:\-]\s*\(?\s*([a-dA-D])\s*\)?\s*\.?\s*$/i

interface RawBlock {
  no: string | null
  qLines: string[]
  options: (string | undefined)[]
  optionSeen: boolean[]
  answer: string | null
}

function newRawBlock(): RawBlock {
  return { no: null, qLines: [], options: [], optionSeen: [], answer: null }
}

function finalizeRaw(block: RawBlock, raw: string): ParsedRawQuestion {
  const flags: string[] = []
  const q = block.qLines.join(" ").trim()
  const options = block.options.filter((o): o is string => typeof o === "string" && o.trim().length > 0)
  const sourceNo = block.no ? Number.parseInt(block.no, 10) : null
  if (!q) flags.push("missing:Q")
  if (options.length < 2) flags.push("options<2")
  if (!block.answer) flags.push("no-answer")
  const answerIndex = block.answer ? LETTERS.indexOf(block.answer as "A") + 1 : -1
  if (block.answer && !block.optionSeen[answerIndex - 1]) flags.push("answer-out-of-range")
  return {
    sourceNo: Number.isFinite(sourceNo) ? sourceNo : null,
    q,
    options,
    answer: block.answer,
    answerIndex,
    flags,
    raw: raw.trim().slice(0, 1000),
  }
}

function parseRawText(normalized: string): {
  questions: ParsedRawQuestion[]
  errorBlocks: ParsedRawBatch["errorBlocks"]
} {
  const questions: ParsedRawQuestion[] = []
  const errorBlocks: ParsedRawBatch["errorBlocks"] = []
  const lines = normalized.split("\n")

  let block = newRawBlock()
  let blockStart = -1
  let open: { type: "q" } | { type: "option"; i: number } | null = null
  let hasContent = false

  const flush = (endLine: number) => {
    if (!hasContent) return
    const rawSlice = blockStart >= 0 ? lines.slice(blockStart, endLine).join("\n") : ""
    const snapshot = block
    try {
      questions.push(finalizeRaw(snapshot, rawSlice))
    } catch (err) {
      errorBlocks.push({
        index: questions.length,
        error: err instanceof Error ? err.message : String(err),
        raw: rawSlice.slice(0, 500),
      })
    }
    block = newRawBlock()
    open = null
    hasContent = false
    blockStart = -1
  }

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]
    if (!line.trim()) continue

    const ansLine = line.match(RAW_ANS_LINE_RE)
    if (ansLine) {
      block.answer = ansLine[1].toUpperCase()
      open = null
      continue
    }

    const qMatch = line.match(RAW_Q_QPREFIX_RE) ?? line.match(RAW_Q_NUM_RE)
    const optMatch = line.match(RAW_OPT_RE)
    // A numbered line is an option only when the stem already exists.
    const isOptionLine = optMatch !== null && qMatch !== null
      ? block.qLines.length > 0 && (block.options.length >= 2 || block.answer !== null)
      : optMatch !== null && block.qLines.length > 0

    if (qMatch && !isOptionLine) {
      flush(li)
      if (blockStart < 0) blockStart = li
      block.no = qMatch[1]
      let stem = qMatch[2].trim()
      const inlineAns = stem.match(RAW_ANS_INLINE_RE)
      if (inlineAns) {
        block.answer = inlineAns[1].toUpperCase()
        stem = stem.replace(RAW_ANS_INLINE_RE, "").trim()
      }
      if (stem) block.qLines.push(stem)
      hasContent = true
      open = { type: "q" }
      continue
    }

    if (optMatch && block.qLines.length > 0) {
      const letter = optMatch[1].toUpperCase()
      const idx = LETTERS.indexOf(letter as "A")
      if (idx >= 0) {
        if (block.options[idx] === undefined) block.options[idx] = ""
        block.options[idx] = (block.options[idx]! + " " + optMatch[2].trim()).trim()
        block.optionSeen[idx] = true
        open = { type: "option", i: idx }
        hasContent = true
        if (blockStart < 0) blockStart = li
        continue
      }
    }

    // Continuation line for the currently open target.
    if (open?.type === "q") {
      block.qLines.push(line.trim())
    } else if (open?.type === "option") {
      block.options[open.i] = (block.options[open.i]! + " " + line.trim()).trim()
    } else {
      // Text with no open target (header/instructions before the first stem).
      // Counted as a stray line on the block it precedes.
      if (!hasContent && blockStart < 0) continue
      block.qLines.push(line.trim())
      hasContent = true
      if (blockStart < 0) blockStart = li
    }
  }

  flush(lines.length)

  return { questions, errorBlocks }
}

export function parseRawMcqBatch(text: string): ParsedRawBatch {
  const normalized = normalizePastedText(text)
  const { questions, errorBlocks } = parseRawText(normalized)
  return { format: "raw-mcq", questions, errorBlocks, ignoredLineCount: 0 }
}
