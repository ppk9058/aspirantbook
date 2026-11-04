/**
 * Course delivery language options.
 *
 * `HINGLISH` used to be an implicit default in six files; it is now an explicit
 * option and ENGLISH is the default, so nothing is silently mislabelled.
 */

export type CourseLanguageCode = "ENGLISH" | "HINDI" | "HINGLISH"

export interface CourseLanguage {
  value: CourseLanguageCode
  label: string
  labelHi: string
}

export const COURSE_LANGUAGES: CourseLanguage[] = [
  { value: "ENGLISH", label: "English", labelHi: "अंग्रेज़ी" },
  { value: "HINDI", label: "Hindi", labelHi: "हिंदी" },
  { value: "HINGLISH", label: "Hinglish (Hindi + English)", labelHi: "हिंग्लिश (हिंदी + अंग्रेज़ी)" },
]

export const DEFAULT_COURSE_LANGUAGE: CourseLanguageCode = "ENGLISH"

export function isKnownCourseLanguage(value: string | null | undefined): boolean {
  if (!value) return false
  const v = value.trim().toUpperCase()
  return COURSE_LANGUAGES.some((l) => l.value === v)
}

export function normalizeCourseLanguage(value: string | null | undefined): CourseLanguageCode {
  const v = (value || "").trim().toUpperCase()
  return isKnownCourseLanguage(v) ? (v as CourseLanguageCode) : DEFAULT_COURSE_LANGUAGE
}

export function courseLanguageLabel(value: string | null | undefined, lang: "en" | "hi" = "en"): string {
  const normalized = normalizeCourseLanguage(value)
  const hit = COURSE_LANGUAGES.find((l) => l.value === normalized)!
  return lang === "hi" ? hit.labelHi : hit.label
}
