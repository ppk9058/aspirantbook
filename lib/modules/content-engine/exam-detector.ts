/**
 * Exam and year detection module
 * Source: Exam_Content_Engine-4.html
 */

export const DEFAULT_EXAM_LIST = [
  "UPSC",
  "UPPCS",
  "UPRO/ARO",
  "RAS/RTS",
  "RAS",
  "UKPSC",
  "CGPSC",
  "UPSSSC",
  "REET",
  "HTET",
  "MPSC",
  "GPSC",
  "APPSC",
  "TSPSC",
  "BSSC",
  "CSAT",
  "BPSC",
  "UPPSC",
  "MPPSC",
  "RPSC",
  "HPSC",
  "JPSC",
  "OPSC",
  "WBCS",
  "TNPSC",
  "KPSC",
  "SSC",
  "SSC CGL",
  "SSC CHSL",
  "SSC MTS",
  "SSC GD",
  "SSC CPO",
  "SSC JE",
  "RRB",
  "RRB NTPC",
  "RRB JE",
  "RRB ALP",
  "RRC Group D",
  "NTPC",
  "IBPS",
  "IBPS PO",
  "IBPS Clerk",
  "IBPS RRB",
  "SBI",
  "SBI PO",
  "SBI Clerk",
  "RBI",
  "RBI Grade B",
  "RBI Assistant",
  "NDA",
  "CDS",
  "CTET",
  "UPTET",
  "NEET",
  "JEE",
  "DSSSB",
]

/**
 * Built-in regex matching all canonical exams
 */
export const EXAM_REGEX =
  /\b(UPSC|UPPCS|UPRO\/ARO|RAS\/RTS|RAS|UKPSC|CGPSC|UPSSSC|REET|HTET|MPSC|GPSC|APPSC|TSPSC|BSSC|CSAT|BPSC|UPPSC|MPPSC|RPSC|HPSC|JPSC|OPSC|WBCS|TNPSC|KPSC|SSC(?:\s?(?:CGL|CHSL|MTS|GD|CPO|JE))?|RRB(?:\s?(?:NTPC|JE|ALP))?|RRC(?:\s?Group\s?D)?|NTPC|IBPS(?:\s?(?:PO|Clerk|RRB))?|SBI(?:\s?(?:PO|Clerk))?|RBI(?:\s?(?:Grade B|Assistant))?|NDA|CDS|CTET|UPTET|NEET|JEE|DSSSB)\b/i

export const YEAR_REGEX = /\b(19[89]\d|20[0-3]\d)\b/

const ABBR = /(?:\b\d{1,2}(?:st|nd|rd|th)\s+)?\b(?:[A-Z]\s?\.\s?){2,}/

/**
 * Extracts normalized exam name from a source string.
 * Supports an optional dynamic alias list from the database.
 */
export function examOf(src: string, customAliases?: string[]): string {
  if (!src) return ""

  // Check custom aliases first if provided
  if (customAliases && customAliases.length > 0) {
    for (const alias of customAliases) {
      const re = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\b`, "i")
      const m = src.match(re)
      if (m) {
        return m[0].toUpperCase().replace(/\s+/g, " ")
      }
    }
  }

  // Check standard regex
  const m0 = src.match(EXAM_REGEX)
  if (m0) {
    return m0[1].toUpperCase().replace(/\s+/g, " ")
  }

  // Fallback for Source: lines only (all-caps abbreviation)
  const s = src.replace(/\b\d{1,2}(?:st|nd|rd|th)\s+/gi, "").replace(/\.\s+(?=[A-Z]\.)/g, ".")
  const m = s.match(/^\s*((?:[A-Z]\.?){2,}(?:[\/-](?:[A-Z]\.?){2,})?)/)
  return m ? m[1].replace(/\./g, "") : ""
}

/**
 * Extracts 4-digit year between 1980 and 2039 from a string.
 */
export function yearOf(src: string): string {
  if (!src) return ""
  const m = src.match(YEAR_REGEX)
  return m ? m[1] : ""
}

/**
 * Checks if a string contains a known exam name (either built-in or custom alias).
 */
export function isKnownExam(text: string, customAliases?: string[]): boolean {
  if (!text) return false
  if (EXAM_REGEX.test(text)) return true
  if (customAliases) {
    return customAliases.some((alias) =>
      new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\b`, "i").test(text)
    )
  }
  return false
}

/**
 * Detects bracket tag at the end of question text: [RPSC 2019] or (RAS 2013) or [1995].
 * Known behaviour: a bracket tag whose exam name is NOT in the list is NOT treated as a source tag.
 */
export function detectBracketTag(
  questionText: string,
  customAliases?: string[]
): { cleanQuestion: string; tag: string } {
  const tg = questionText.match(/\s*[\[(]([^\[\]()]*\b(?:19|20)\d\d\b[^\[\]()]*)[\])]\s*$/)
  if (!tg) {
    return { cleanQuestion: questionText.trim(), tag: "" }
  }

  const inner = tg[1].trim()
  const hasKnown = isKnownExam(inner, customAliases)
  const isYearOnly = /^\s*(19|20)\d\d\s*$/.test(inner)

  if (hasKnown || isYearOnly) {
    return {
      cleanQuestion: questionText.slice(0, tg.index).trim(),
      tag: inner,
    }
  }

  // Unknown exam inside bracket stays untagged and unstripped
  return { cleanQuestion: questionText.trim(), tag: "" }
}
