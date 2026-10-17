import { parseAndValidateQuestion, NormalizedQuestionInput } from "./question-parser"

export interface ProcessedQuestion extends NormalizedQuestionInput {
  id: number
  warnings?: string[]
}

export interface SkippedQuestionInfo {
  blockIndex: number
  questionIndex?: number
  reason: string
  rawItem?: any
}

export interface BulkJsonPipelineResult {
  totalFound: number
  validCount: number
  duplicatesRemoved: number
  alreadyInTestCount: number
  warningCount: number
  questions: ProcessedQuestion[]
  skipped: SkippedQuestionInfo[]
  salvagedReports: string[]
}

export interface ExistingQuestionRef {
  questionEn: string
}

/**
 * A1. Citation strip regex:
 * Matches \s?[1], [2], [1, 2], [3-5], etc.
 * Must NOT touch non-numeric brackets like [Statement 1], [A], or Hindi text.
 */
export const CITATION_REGEX = /\s?\[\d+(?:[\s,\-–]+\d+)*\]/g

/**
 * B1. Input Sanitization:
 * - Strip BOM (U+FEFF), zero-width chars (U+200B-U+200D, U+FEFF)
 * - Convert non-breaking space (U+00A0) to normal space
 * - Normalize CRLF to LF
 * - Unicode NFC on all text (Hindi intact)
 */
export function sanitizeRawInput(raw: string): string {
  if (!raw || typeof raw !== "string") return ""
  let text = raw.replace(/[\uFEFF\u200B-\u200D]/g, "")
  text = text.replace(/\u00A0/g, " ")
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  text = text.normalize("NFC")
  return text
}

/**
 * Strips markdown code fences from text while keeping enclosed content.
 */
export function stripMarkdownCodeFences(text: string): string {
  let cleaned = text.replace(/^[ \t]*```(?:json|JSON)?[ \t]*\n?/gm, "")
  cleaned = cleaned.replace(/^[ \t]*```[ \t]*\n?/gm, "")
  cleaned = cleaned.replace(/```(?:json|JSON)?/gi, "").replace(/```/g, "")
  return cleaned
}

/**
 * A1. Strip citation tags from a string value and trim.
 */
export function stripCitationsOnly(str: string): string {
  if (typeof str !== "string") return str
  return str.replace(CITATION_REGEX, "").trim()
}

/**
 * C1. Strip leading option labels like "A) ", "(A) ", "A. ", "a) ", "Option A: ",
 * Hindi "क) ", "(क) ", "क. ", "विकल्प क: ". Only leading labels, never inner text.
 */
export function stripOptionLabel(str: string): string {
  if (typeof str !== "string") return str
  const trimmed = str.trim()
  const enMatch = trimmed.match(/^(?:(?:\(?\s*[A-Da-d]\s*[\)\.\:\-–])|(?:Option\s*[A-Da-d]\s*[\:\.\-–]?))\s*/i)
  if (enMatch) {
    return trimmed.slice(enMatch[0].length).trim()
  }
  const hiMatch = trimmed.match(/^(?:(?:\(?\s*[कखगघअबसद]\s*[\)\.\:\-–])|(?:विकल्प\s*[कखगघअबसद]\s*[\:\.\-–]?))\s*/)
  if (hiMatch) {
    return trimmed.slice(hiMatch[0].length).trim()
  }
  return trimmed
}

/**
 * C2. Strip leading question numbers like "Q1.", "1.", "1)", "प्रश्न 1." from question text.
 */
export function stripQuestionNumber(str: string): string {
  if (typeof str !== "string") return str
  const trimmed = str.trim()
  const enMatch = trimmed.match(/^(?:Q(?:uestion)?\s*\d+[\.\:\)\-–]|\d+[\.\)\:\-–])\s*/i)
  if (enMatch) {
    return trimmed.slice(enMatch[0].length).trim()
  }
  const hiMatch = trimmed.match(/^(?:(?:प्रश्न|प्र[\.]?)\s*\d+[\.\:\)\-–]|\d+[\.\)\:\-–])\s*/)
  if (hiMatch) {
    return trimmed.slice(hiMatch[0].length).trim()
  }
  return trimmed
}

/**
 * C3. Strip markdown artifacts: **bold**, *italic*, leading #, backticks.
 * Keeps \n line breaks intact for statement-type questions.
 */
export function stripMarkdownArtifacts(str: string): string {
  if (typeof str !== "string") return str
  let res = str
  // Remove leading markdown header '#' symbols e.g. "### Who was..."
  res = res.replace(/^[#\s]+(?=[a-zA-Z0-9\u0900-\u097F])/gm, "")
  // Remove **bold** and __bold__
  res = res.replace(/\*\*(.*?)\*\*/g, "$1").replace(/__(.*?)__/g, "$1")
  // Remove *italic* (not part of bullets or math)
  res = res.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1")
  // Remove inline backticks `code`
  res = res.replace(/`([^`\n]+)`/g, "$1")
  return res
}

/**
 * Cleans a string value according to A1, C1-C4 rules:
 * Strips citations, markdown artifacts, option labels (if option), question numbers (if question), and trims.
 */
export function cleanTextValue(
  val: any,
  options: { isOption?: boolean; isQuestion?: boolean } = {}
): string {
  if (val === null || val === undefined) return ""
  let str = typeof val === "string" ? val : String(val)
  str = stripCitationsOnly(str)
  str = stripMarkdownArtifacts(str)
  if (options.isOption) {
    str = stripOptionLabel(str)
  }
  if (options.isQuestion) {
    str = stripQuestionNumber(str)
  }
  return str.trim()
}

/**
 * Removes trailing commas immediately preceding ] or } outside of JSON string literals.
 */
export function removeTrailingCommas(jsonStr: string): string {
  let result = ""
  let inString = false
  let isEscaped = false

  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i]

    if (inString) {
      if (ch === "\n") {
        inString = false
        isEscaped = false
        result += ch
        continue
      }
      result += ch
      if (isEscaped) {
        isEscaped = false
      } else if (ch === "\\") {
        isEscaped = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }

    if (ch === '"') {
      inString = true
      result += ch
      continue
    }

    if (ch === ",") {
      let j = i + 1
      while (j < jsonStr.length && /\s/.test(jsonStr[j])) {
        j++
      }
      if (j < jsonStr.length && (jsonStr[j] === "]" || jsonStr[j] === "}")) {
        continue
      }
    }

    result += ch
  }

  return result
}

/**
 * A2 (2). Converts smart quotes to normal quotes ONLY where they act as structural delimiters:
 * - Around keys: “key”: or ‘key’: -> "key":
 * - After colon starting string: : “ or : ‘ -> : "
 * - Array elements: [ “ or , “ -> [ " or , "
 * - Ending string before comma/brace/bracket: ” or ’ before , or } or ] -> "
 * Keeps quotes inside string content (e.g. “Sabka Saath”) intact.
 */
export function convertStructuralSmartQuotes(str: string): string {
  let res = str
  // Keys
  res = res.replace(/([{\s,])\s*[“"']([a-zA-Z0-9_$-]+)[”"']\s*:/g, '$1"$2":')
  // String start after colon
  res = res.replace(/:\s*[“‘]/g, ': "')
  // Array string element start
  res = res.replace(/(\[|,)\s*[“‘]/g, '$1"')
  // String end before punctuation
  res = res.replace(/[”’]\s*(?=[,\}\]])/g, '"')
  return res
}

/**
 * B4. Escapes raw control characters (literal newlines, tabs) inside string literals.
 */
export function escapeControlCharsInStrings(text: string): string {
  let result = ""
  let inString = false
  let isEscaped = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (inString) {
      if (isEscaped) {
        result += ch
        isEscaped = false
        continue
      }
      if (ch === "\\") {
        isEscaped = true
        result += ch
        continue
      }
      if (ch === '"') {
        inString = false
        result += ch
        continue
      }
      // B4: Literal newline inside string
      if (ch === "\n") {
        result += "\\n"
        continue
      }
      if (ch === "\r") {
        continue
      }
      if (ch === "\t") {
        result += "\\t"
        continue
      }
      result += ch
      continue
    }

    if (ch === '"') {
      inString = true
      result += ch
      continue
    }

    result += ch
  }

  return result
}

/**
 * B5. Repair unescaped inner double quotes inside a single object JSON string:
 * Treats a " as string-end ONLY if the next non-space char is , } ] or :;
 * otherwise treats it as a literal quote and escapes it (\").
 */
export function repairUnescapedInnerQuotes(rawObjStr: string): string {
  let result = ""
  let inString = false
  let isEscaped = false

  for (let i = 0; i < rawObjStr.length; i++) {
    const ch = rawObjStr[i]

    if (isEscaped) {
      result += ch
      isEscaped = false
      continue
    }

    if (ch === "\\") {
      isEscaped = true
      result += ch
      continue
    }

    if (ch === '"') {
      if (!inString) {
        // Opening quote of a string/key
        inString = true
        result += ch
      } else {
        // We are inside a string. Check if this quote is a true string-end.
        // Look ahead to find the next non-whitespace char.
        let j = i + 1
        while (j < rawObjStr.length && /\s/.test(rawObjStr[j])) {
          j++
        }
        const nextChar = j < rawObjStr.length ? rawObjStr[j] : ""

        if (nextChar === "," || nextChar === "}" || nextChar === "]" || nextChar === ":") {
          // Valid structural string termination
          inString = false
          result += ch
        } else {
          // B5: Unescaped inner quote -> treat as literal quote and escape it!
          result += '\\"'
        }
      }
      continue
    }

    result += ch
  }

  return result
}

/**
 * B2. Extracts JSON blocks from noisy text by string-aware bracket matching.
 * Ignores prose before/after and multiple code fences.
 */
export function splitIntoJsonBlocks(rawText: string): string[] {
  const sanitized = sanitizeRawInput(rawText)

  // If text contains multiple markdown fences like ```json [...] ```, extract each fence
  const fenceMatches = Array.from(sanitized.matchAll(/```(?:json|JSON)?\s*([\s\S]*?)```/gi))
  if (fenceMatches.length > 1) {
    const blocks: string[] = []
    for (const m of fenceMatches) {
      const content = m[1].trim()
      if (content) blocks.push(content)
    }
    if (blocks.length > 0) return blocks
  }

  const cleaned = stripMarkdownCodeFences(sanitized).trim()
  if (!cleaned) return []

  const blocks: string[] = []
  const stack: ("[" | "{")[] = []
  let blockStart = -1
  let inString = false
  let isEscaped = false

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i]

    if (inString) {
      if (ch === "\n") {
        inString = false
        isEscaped = false
      } else if (isEscaped) {
        isEscaped = false
      } else if (ch === "\\") {
        isEscaped = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }

    if (ch === '"') {
      inString = true
      continue
    }

    if (stack.length === 0) {
      if (ch === "[" || ch === "{") {
        blockStart = i
        stack.push(ch)
      }
    } else {
      if (ch === "[" || ch === "{") {
        // Check if an unclosed block was cut off and a new block starts on a new line
        let prevIdx = i - 1
        while (prevIdx >= 0 && /\s/.test(cleaned[prevIdx])) {
          prevIdx--
        }
        const prevChar = prevIdx >= 0 ? cleaned[prevIdx] : ""
        const isNewBlockStart =
          prevChar !== "," &&
          prevChar !== ":" &&
          prevChar !== "[" &&
          prevChar !== "{" &&
          cleaned.slice(Math.max(0, prevIdx - 20), i).includes("\n")

        if (isNewBlockStart && blockStart !== -1) {
          blocks.push(cleaned.slice(blockStart, i).trim())
          blockStart = i
          stack.length = 0
          stack.push(ch)
          continue
        }

        stack.push(ch)
      } else if (ch === "]") {
        const lastBracketIdx = stack.lastIndexOf("[")
        if (lastBracketIdx !== -1) {
          stack.length = lastBracketIdx
          if (stack.length === 0 && blockStart !== -1) {
            blocks.push(cleaned.slice(blockStart, i + 1))
            blockStart = -1
          }
        }
      } else if (ch === "}") {
        const lastBraceIdx = stack.lastIndexOf("{")
        if (lastBraceIdx !== -1) {
          stack.length = lastBraceIdx
          if (stack.length === 0 && blockStart !== -1) {
            blocks.push(cleaned.slice(blockStart, i + 1))
            blockStart = -1
          }
        }
      }
    }
  }

  if (stack.length > 0 && blockStart !== -1) {
    const rem = cleaned.slice(blockStart).trim()
    if (rem) blocks.push(rem)
  }

  if (blocks.length === 0 && cleaned.length > 0) {
    blocks.push(cleaned)
  }

  return blocks
}

/**
 * Salvages complete top-level {...} question objects from a broken or truncated JSON block.
 */
export function salvageQuestionObjects(blockText: string): { salvaged: any[]; incompleteCount: number } {
  let searchStartIndex = 0
  const arrayMatch = blockText.match(/(?:"questions"|"data"|"items")\s*:\s*\[/i)
  if (arrayMatch && arrayMatch.index !== undefined) {
    searchStartIndex = arrayMatch.index + arrayMatch[0].length
  } else {
    const firstBracket = blockText.indexOf("[")
    if (firstBracket !== -1) {
      searchStartIndex = firstBracket + 1
    }
  }

  let inString = false
  let isEscaped = false
  let depth = 0
  let objStart = -1
  const salvaged: any[] = []
  let sawIncomplete = false

  for (let i = searchStartIndex; i < blockText.length; i++) {
    const ch = blockText[i]

    if (inString) {
      if (ch === "\n") {
        inString = false
        isEscaped = false
      } else if (isEscaped) {
        isEscaped = false
      } else if (ch === "\\") {
        isEscaped = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }

    if (ch === '"') {
      inString = true
      continue
    }

    if (ch === "{") {
      if (depth === 0) {
        objStart = i
      }
      depth++
    } else if (ch === "}") {
      if (depth > 0) {
        depth--
        if (depth === 0 && objStart !== -1) {
          const candidate = blockText.slice(objStart, i + 1)
          objStart = -1

          // Try parsing candidate as-is
          let parsed: any = null
          try {
            parsed = JSON.parse(candidate)
          } catch {
            // Repair B4 & B5 on candidate
            let repaired = convertStructuralSmartQuotes(candidate)
            repaired = removeTrailingCommas(repaired)
            repaired = escapeControlCharsInStrings(repaired)
            repaired = repairUnescapedInnerQuotes(repaired)
            try {
              parsed = JSON.parse(repaired)
            } catch {
              parsed = null
            }
          }

          if (parsed && typeof parsed === "object") {
            salvaged.push(parsed)
          }
        }
      }
    }
  }

  if (depth > 0 || objStart !== -1) {
    sawIncomplete = true
  }

  return {
    salvaged,
    incompleteCount: sawIncomplete ? 1 : 0,
  }
}

/**
 * A2. Parses a single block respecting strict order:
 * (1) JSON.parse as-is; if OK, do not modify quotes at all (smart quotes like “Sabka Saath” stay).
 * (2) Only if it throws: normalize structural smart quotes, remove trailing commas, escape control chars, retry.
 * (3) Still throws: salvage object-by-object.
 * B3. Validates shapes: array, {"questions":[...]}, {"data":[...]}, {"items":[...]}, or single question object.
 */
function parseBlockItems(
  blockText: string,
  blockIndex: number
): {
  items: any[]
  salvagedReport?: string
  hadError?: string
} {
  let parsed: any = null

  // (1) JSON.parse as-is
  try {
    parsed = JSON.parse(blockText)
  } catch {
    // (2) If it throws: structural smart quotes + trailing commas + B4 control char escaping
    try {
      let repaired = convertStructuralSmartQuotes(blockText)
      repaired = removeTrailingCommas(repaired)
      repaired = escapeControlCharsInStrings(repaired)
      parsed = JSON.parse(repaired)
    } catch {
      parsed = null
    }
  }

  // If successfully parsed via (1) or (2), extract items according to B3
  if (parsed !== null) {
    if (Array.isArray(parsed)) {
      return { items: parsed }
    }
    if (parsed && typeof parsed === "object") {
      if (Array.isArray(parsed.questions)) return { items: parsed.questions }
      if (Array.isArray(parsed.data)) return { items: parsed.data }
      if (Array.isArray(parsed.items)) return { items: parsed.items }

      // Check if it's a single question object
      const hasQ =
        "questionEn" in parsed ||
        "question" in parsed ||
        "question_en" in parsed ||
        "text" in parsed ||
        "textEnglish" in parsed ||
        "options" in parsed
      if (hasQ) {
        return { items: [parsed] }
      }

      return {
        items: [],
        hadError: `block ${blockIndex}: Object missing questions array or question fields`,
      }
    }
    return {
      items: [],
      hadError: `block ${blockIndex}: Invalid JSON structure, expected an array or question object`,
    }
  }

  // (3) Still throws: salvage object-by-object
  const { salvaged, incompleteCount } = salvageQuestionObjects(blockText)
  if (salvaged.length > 0 || incompleteCount > 0) {
    const salvagedReport = `block ${blockIndex}: ${salvaged.length} salvaged, ${incompleteCount} incomplete skipped`
    return {
      items: salvaged,
      salvagedReport,
    }
  }

  return {
    items: [],
    hadError: `block ${blockIndex}: Invalid JSON syntax; could not parse or salvage any questions`,
  }
}

/**
 * A3. Dedupe key: item.questionEn.trim().toLowerCase().replace(/\s+/g,' ')
 */
export function getDedupeKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ")
}

/**
 * D2. Simple Devanagari ratio check to detect suspected language swap.
 */
function getDevanagariRatio(text: string): { devanagari: number; latin: number } {
  const devanagari = (text.match(/[\u0900-\u097F]/g) || []).length
  const latin = (text.match(/[a-zA-Z]/g) || []).length
  return { devanagari, latin }
}

/**
 * Strips prototype pollution keys (__proto__, constructor, prototype) from an object.
 */
export function sanitizeObjectKeys(obj: any): any {
  if (!obj || typeof obj !== "object") return obj
  if (Array.isArray(obj)) return obj.map(sanitizeObjectKeys)
  const clean: Record<string, any> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (k === "__proto__" || k === "constructor" || k === "prototype") continue
    clean[k] = sanitizeObjectKeys(v)
  }
  return clean
}

/**
 * E1. Natural-sorts files by filename (e.g. q1, q2, q10).
 */
export function naturalSortFiles<T extends { name: string }>(files: T[]): T[] {
  return [...files].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
  )
}

/**
 * Main Pure Bulk JSON Import Pipeline Function.
 */
export function processBulkJsonImport(
  input: string | string[],
  existingQuestions: ExistingQuestionRef[] = []
): BulkJsonPipelineResult {
  const blocksToProcess: string[] = []

  if (Array.isArray(input)) {
    for (const fileContent of input) {
      const subBlocks = splitIntoJsonBlocks(fileContent)
      if (subBlocks.length > 0) {
        blocksToProcess.push(...subBlocks)
      }
    }
  } else {
    const splitBlocks = splitIntoJsonBlocks(input)
    blocksToProcess.push(...splitBlocks)
  }

  if (blocksToProcess.length === 0) {
    throw new Error("No JSON input provided. Please paste JSON content or select JSON files.")
  }

  interface RawItemWithMeta {
    item: any
    blockIndex: number
    itemIndex: number
  }

  const allRawItems: RawItemWithMeta[] = []
  const salvagedReports: string[] = []
  const skipped: SkippedQuestionInfo[] = []
  let totalFound = 0

  // 1. Parse each block independently in strict input order
  for (let b = 0; b < blocksToProcess.length; b++) {
    const blockIndex = b + 1
    const { items, salvagedReport, hadError } = parseBlockItems(blocksToProcess[b], blockIndex)

    if (salvagedReport) {
      salvagedReports.push(salvagedReport)
      skipped.push({
        blockIndex,
        reason: salvagedReport,
      })
    }

    if (hadError) {
      skipped.push({
        blockIndex,
        reason: hadError,
      })
    }

    items.forEach((item, idx) => {
      totalFound++
      allRawItems.push({
        item: sanitizeObjectKeys(item),
        blockIndex,
        itemIndex: idx,
      })
    })
  }

  if (totalFound === 0) {
    throw new Error("No valid question objects could be found. Please check your JSON formatting.")
  }

  // F5. Soft cap 500 questions per import
  if (totalFound > 500) {
    throw new Error("Maximum 500 questions allowed per import batch. Please reduce your selection.")
  }

  // Build existing questions lookup set (E4)
  const existingKeys = new Set<string>()
  for (const eq of existingQuestions) {
    if (eq && eq.questionEn) {
      existingKeys.add(getDedupeKey(eq.questionEn))
    }
  }

  // 2. Duplicate removal:
  // - Dedupe against existing questions in test (E4)
  // - Dedupe within the pasted/uploaded batch (A3)
  const seenBatchKeys = new Set<string>()
  const deduplicatedItems: RawItemWithMeta[] = []
  let duplicatesRemoved = 0
  let alreadyInTestCount = 0

  for (const raw of allRawItems) {
    const rawQEn =
      raw.item?.questionEn ??
      raw.item?.question ??
      raw.item?.question_en ??
      raw.item?.text ??
      raw.item?.textEnglish ??
      ""
    const key = getDedupeKey(String(rawQEn))

    // Check if already in test (E4)
    if (key && existingKeys.has(key)) {
      alreadyInTestCount++
      skipped.push({
        blockIndex: raw.blockIndex,
        questionIndex: raw.itemIndex + 1,
        reason: "Already in test",
        rawItem: raw.item,
      })
      continue
    }

    // Check duplicate within this batch (A3)
    if (key && seenBatchKeys.has(key)) {
      duplicatesRemoved++
      skipped.push({
        blockIndex: raw.blockIndex,
        questionIndex: raw.itemIndex + 1,
        reason: `Duplicate of earlier question in batch: "${String(rawQEn).slice(0, 40)}"`,
        rawItem: raw.item,
      })
      continue
    }

    if (key) {
      seenBatchKeys.add(key)
    }
    deduplicatedItems.push(raw)
  }

  // 3. Normalization, Validation & Renumbering (1..N)
  const validQuestions: ProcessedQuestion[] = []
  let warningCount = 0

  // Track near-duplicates across valid questions (D3)
  const nearDuplicateMap = new Map<string, number>()

  for (let i = 0; i < deduplicatedItems.length; i++) {
    const { item, blockIndex, itemIndex } = deduplicatedItems[i]

    try {
      // Per-question field normalization before validation (C1-C4)
      const rawQEn = item.questionEn ?? item.question ?? item.question_en ?? item.text ?? item.textEnglish ?? ""
      const qEn = cleanTextValue(rawQEn, { isQuestion: true })

      const rawQHi = item.questionHi ?? item.question_hi ?? item.textHindi ?? item.hindi ?? ""
      const qHi = rawQHi ? cleanTextValue(rawQHi, { isQuestion: true }) : ""

      // Options extraction with label stripping (C1)
      let optA = ""
      let optB = ""
      let optC = ""
      let optD = ""
      let optAHi = ""
      let optBHi = ""
      let optCHi = ""
      let optDHi = ""

      if (item.options && typeof item.options === "object" && !Array.isArray(item.options)) {
        const o = item.options
        optA = cleanTextValue(o.A ?? o.a ?? o["1"], { isOption: true })
        optB = cleanTextValue(o.B ?? o.b ?? o["2"], { isOption: true })
        optC = cleanTextValue(o.C ?? o.c ?? o["3"], { isOption: true })
        optD = cleanTextValue(o.D ?? o.d ?? o["4"], { isOption: true })
      } else if (Array.isArray(item.options)) {
        const getVal = (entry: any) =>
          typeof entry === "object" && entry !== null
            ? entry.english ?? entry.text ?? entry.value ?? ""
            : entry
        const getHi = (entry: any) =>
          typeof entry === "object" && entry !== null ? entry.hindi ?? "" : ""

        optA = cleanTextValue(getVal(item.options[0]), { isOption: true })
        optB = cleanTextValue(getVal(item.options[1]), { isOption: true })
        optC = cleanTextValue(getVal(item.options[2]), { isOption: true })
        optD = cleanTextValue(getVal(item.options[3]), { isOption: true })

        optAHi = cleanTextValue(getHi(item.options[0]), { isOption: true })
        optBHi = cleanTextValue(getHi(item.options[1]), { isOption: true })
        optCHi = cleanTextValue(getHi(item.options[2]), { isOption: true })
        optDHi = cleanTextValue(getHi(item.options[3]), { isOption: true })
      }

      if (!optA) optA = cleanTextValue(item.optionAEn ?? item.optionA ?? item.option_a ?? item.optA, { isOption: true })
      if (!optB) optB = cleanTextValue(item.optionBEn ?? item.optionB ?? item.option_b ?? item.optB, { isOption: true })
      if (!optC) optC = cleanTextValue(item.optionCEn ?? item.optionC ?? item.option_c ?? item.optC, { isOption: true })
      if (!optD) optD = cleanTextValue(item.optionDEn ?? item.optionD ?? item.option_d ?? item.optD, { isOption: true })

      if (!optAHi) optAHi = cleanTextValue(item.optionAHi ?? item.option_a_hi ?? item.optionsHi?.[0], { isOption: true })
      if (!optBHi) optBHi = cleanTextValue(item.optionBHi ?? item.option_b_hi ?? item.optionsHi?.[1], { isOption: true })
      if (!optCHi) optCHi = cleanTextValue(item.optionCHi ?? item.option_c_hi ?? item.optionsHi?.[2], { isOption: true })
      if (!optDHi) optDHi = cleanTextValue(item.optionDHi ?? item.option_d_hi ?? item.optionsHi?.[3], { isOption: true })

      const rawExpEn = item.explanationEn ?? item.explanation ?? item.explanation_en ?? item.explanationEnglish ?? item.solution ?? ""
      const expEn = rawExpEn ? cleanTextValue(rawExpEn) : undefined

      const rawExpHi = item.explanationHi ?? item.explanation_hi ?? item.explanationHindi ?? ""
      const expHi = rawExpHi ? cleanTextValue(rawExpHi) : undefined

      const normalizedItem = {
        questionEn: qEn,
        questionHi: qHi || undefined,
        optionAEn: optA,
        optionAHi: optAHi || undefined,
        optionBEn: optB,
        optionBHi: optBHi || undefined,
        optionCEn: optC,
        optionCHi: optCHi || undefined,
        optionDEn: optD,
        optionDHi: optDHi || undefined,
        correctOption: item.correctOption ?? item.correct_option ?? item.correct_answer ?? item.correctAnswer ?? item.answer ?? item.ans ?? item.key,
        explanationEn: expEn,
        explanationHi: expHi,
        difficulty: item.difficulty,
        subject: item.subject ? cleanTextValue(item.subject) : undefined,
        topic: item.topic ? cleanTextValue(item.topic) : undefined,
      }

      // Run through parseAndValidateQuestion unchanged (validation rules preserved)
      const validated = parseAndValidateQuestion(normalizedItem, i)

      // Collect warnings (D1-D5, C5)
      const itemWarnings: string[] = []

      // D1. questionHi or any option Hindi missing
      if (!validated.questionHi || !validated.optionAHi || !validated.optionBHi || !validated.optionCHi || !validated.optionDHi) {
        itemWarnings.push("Missing Hindi translation for question or one or more options")
      }

      // D2. Language swap suspected
      const qEnRatios = getDevanagariRatio(validated.questionEn)
      if (qEnRatios.devanagari > qEnRatios.latin && qEnRatios.devanagari >= 5) {
        itemWarnings.push("Language swap suspected: English question contains mostly Hindi/Devanagari script")
      }
      if (validated.questionHi) {
        const qHiRatios = getDevanagariRatio(validated.questionHi)
        if (qHiRatios.latin > qHiRatios.devanagari && qHiRatios.latin >= 5) {
          itemWarnings.push("Language swap suspected: Hindi question contains mostly Latin/English characters")
        }
      }

      // D3. Near-duplicate check (after stripping all punctuation/spaces)
      const nearKey = validated.questionEn.toLowerCase().replace(/[^a-z0-9]/g, "")
      if (nearKey) {
        if (nearDuplicateMap.has(nearKey)) {
          itemWarnings.push(`Near-duplicate of Question ${nearDuplicateMap.get(nearKey)}`)
        } else {
          nearDuplicateMap.set(nearKey, validQuestions.length + 1)
        }
      }

      // D4. Missing explanation in both languages
      if (!validated.explanationEn && !validated.explanationHi) {
        itemWarnings.push("Missing explanation in both English and Hindi")
      }

      // D5. Very long text
      if (validated.questionEn.length > 1500 || (validated.questionHi && validated.questionHi.length > 1500)) {
        itemWarnings.push("Question text is unusually long (>1500 characters)")
      }
      if (
        validated.optionAEn.length > 500 ||
        validated.optionBEn.length > 500 ||
        validated.optionCEn.length > 500 ||
        validated.optionDEn.length > 500
      ) {
        itemWarnings.push("One or more options exceed 500 characters")
      }

      // C5. Duplicate option text warning
      const opts = [validated.optionAEn.toLowerCase(), validated.optionBEn.toLowerCase(), validated.optionCEn.toLowerCase(), validated.optionDEn.toLowerCase()]
      const uniqueOpts = new Set(opts)
      if (uniqueOpts.size < 4) {
        itemWarnings.push("Two or more options have identical text")
      }

      if (itemWarnings.length > 0) {
        warningCount += itemWarnings.length
      }

      // Assign id 1..N in final order
      validQuestions.push({
        ...validated,
        id: validQuestions.length + 1,
        warnings: itemWarnings.length > 0 ? itemWarnings : undefined,
      })
    } catch (err: any) {
      skipped.push({
        blockIndex,
        questionIndex: itemIndex + 1,
        reason: err?.message || String(err),
        rawItem: item,
      })
    }
  }

  return {
    totalFound,
    validCount: validQuestions.length,
    duplicatesRemoved,
    alreadyInTestCount,
    warningCount,
    questions: validQuestions,
    skipped,
    salvagedReports,
  }
}
