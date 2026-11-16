/**
 * Exam/year detector for source TAGs like "[UPSC CSE 2023]" (Phase 2.3).
 * Rules:
 *  - Year comes ONLY from the TAG text — never guessed or defaulted.
 *  - Exam name is canonicalized through the alias map; unknown names pass
 *    through verbatim (the TAG is the source of truth, never invented).
 */

const YEAR_RE = /\b(?:19|20)\d{2}\b/

/** normalized-key → canonical exam name. */
const EXAM_ALIASES: Record<string, string> = {
  UPSC: "UPSC CSE",
  UPSCCSE: "UPSC CSE",
  UPSCCIVILSERVICES: "UPSC CSE",
  IASPRELIMS: "UPSC CSE",
  CSEPRELIMS: "UPSC CSE",
  UPPCS: "UPPCS",
  UPPSC: "UPPCS",
  UPPCSCE: "UPPCS",
  UPPCSPRELIMS: "UPPCS",
  BPSC: "BPSC",
  BIHARPSC: "BPSC",
  BPSCCCE: "BPSC",
  MPSC: "MPSC",
  RPSC: "RPSC",
  JPSC: "JPSC",
  MPPSC: "MPPSC",
  UKPSC: "UKPSC",
  CGPSC: "CGPSC",
  WBCS: "WBCS",
  KPSC: "KPSC",
  TNPSC: "TNPSC",
  APPSC: "APPSC",
  TSPSC: "TSPSC",
  SSCCGL: "SSC CGL",
  SSCCHSL: "SSC CHSL",
  SSCMTS: "SSC MTS",
  SSCPPO: "SSC CPO",
  SSCCPO: "SSC CPO",
  SSCGD: "SSC GD",
  SSCJE: "SSC JE",
  IBPSPO: "IBPS PO",
  IBPSCLERK: "IBPS Clerk",
  IBPSRRB: "IBPS RRB",
  SBIPO: "SBI PO",
  SBICLERK: "SBI Clerk",
  RRBNTPC: "RRB NTPC",
  RRBGROUPD: "RRB Group D",
  RRBALP: "RRB ALP",
  NDA: "NDA",
  CDS: "CDS",
  CAPF: "CAPF",
  IES: "IES",
  AFCAT: "AFCAT",
  CDSPLAYER: "CDS",
}

function normalizeExamKey(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, "")
}

export interface DetectedExam {
  exam: string | null
  year: string | null
}

export function detectExamFromTag(tag: string | null | undefined): DetectedExam {
  if (!tag || /^none$/i.test(tag.trim())) return { exam: null, year: null }
  const cleaned = tag.replace(/[[\]]/g, " ").replace(/\s+/g, " ").trim()
  if (!cleaned) return { exam: null, year: null }

  const yearMatches = cleaned.match(new RegExp(YEAR_RE.source, "g"))
  const year = yearMatches ? yearMatches[yearMatches.length - 1] : null
  let examText = year ? cleaned.replace(year, " ").replace(/\s+/g, " ").trim() : cleaned
  examText = examText.replace(/[-–—,:;]+$/g, "").replace(/\s+/g, " ").trim()

  if (!examText) return { exam: null, year }
  const canonical = EXAM_ALIASES[normalizeExamKey(examText)]
  return { exam: canonical || examText, year }
}
