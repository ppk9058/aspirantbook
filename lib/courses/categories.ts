/**
 * Exam / course categories used by the studio and public pages.
 *
 * `value` is what gets persisted to Course.technology (existing column), so the
 * first ten entries are stable. Custom values are allowed — isKnownExamCategory
 * only answers "is this one of ours?" for UI purposes.
 */

export interface ExamCategory {
  value: string
  label: string
  /** Grouping for the studio select; purely presentational. */
  group: "Civil Services" | "State Services" | "Central Govt." | "Board & School" | "Skills" | "Other"
  /** Optional Hindi label so the studio/select can be bilingual. */
  labelHi?: string
}

export const EXAM_CATEGORIES: ExamCategory[] = [
  { value: "UPSC", label: "UPSC Civil Services", labelHi: "यूपीएससी सिविल सेवा", group: "Civil Services" },
  { value: "State PSC", label: "State PSC (General)", labelHi: "राज्य लोक सेवा आयोग", group: "State Services" },
  { value: "BPSC", label: "BPSC Civil Services", labelHi: "बीपीएससी सिविल सेवा", group: "State Services" },
  { value: "SSC", label: "SSC (CGL / CHSL / MTS)", labelHi: "एसएससी", group: "Central Govt." },
  { value: "Banking", label: "Banking (IBPS / SBI / RBI)", labelHi: "बैंकिंग", group: "Central Govt." },
  { value: "Railways", label: "Railways (RRB / NTPC)", labelHi: "रेलवे", group: "Central Govt." },
  { value: "Defence", label: "Defence (NDA / CDS / AFCAT)", labelHi: "रक्षा", group: "Central Govt." },
  { value: "Teaching", label: "Teaching (CTET / TET / KVS)", labelHi: "शिक्षण", group: "Central Govt." },
  { value: "Class 10th", label: "Class 10th (Boards & NTSE)", labelHi: "कक्षा 10", group: "Board & School" },
  { value: "Class 9th", label: "Class 9th (School Foundation)", labelHi: "कक्षा 9", group: "Board & School" },
  { value: "Class 8th", label: "Class 8th (Junior Foundation)", labelHi: "कक्षा 8", group: "Board & School" },
  { value: "Class 7th", label: "Class 7th (Middle School)", labelHi: "कक्षा 7", group: "Board & School" },
  { value: "Class 6th", label: "Class 6th (Junior School)", labelHi: "कक्षा 6", group: "Board & School" },
  { value: "Data Science & AI", label: "Data Science & AI / ML", labelHi: "डेटा साइंस और एआई", group: "Skills" },
  { value: "DSA & Coding Interviews", label: "DSA & Coding Interviews", labelHi: "डीएसए और कोडिंग", group: "Skills" },
  { value: "Skills & Tech", label: "Skills & Tech (Coding & Dev)", labelHi: "स्किल्स और टेक", group: "Skills" },
  { value: "Govt. Job Exams", label: "Govt. Job Exams (legacy)", labelHi: "सरकारी नौकरी परीक्षाएँ", group: "Other" },
  { value: "Other", label: "Other / Custom", labelHi: "अन्य", group: "Other" },
]

const KNOWN_CATEGORY_VALUES = new Set(EXAM_CATEGORIES.map((c) => c.value.toLowerCase()))

export function isKnownExamCategory(value: string | null | undefined): boolean {
  if (!value) return false
  return KNOWN_CATEGORY_VALUES.has(value.trim().toLowerCase())
}

/** Human label for a stored technology value; unknown values are returned as-is. */
export function examCategoryLabel(value: string | null | undefined): string {
  if (!value) return EXAM_CATEGORIES[EXAM_CATEGORIES.length - 1].label
  const hit = EXAM_CATEGORIES.find((c) => c.value.toLowerCase() === value.trim().toLowerCase())
  return hit ? hit.label : value
}

/** Stable grouping order for the studio dropdown. */
export const EXAM_CATEGORY_GROUPS = Array.from(new Set(EXAM_CATEGORIES.map((c) => c.group)))
