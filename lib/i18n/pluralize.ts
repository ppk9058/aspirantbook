export type PluralNoun = "lecture" | "hour" | "theme" | "unit" | "question" | "paper"

/**
 * Shared pluralization helper for English and Hindi.
 * Handles 0, 1, and 2+ counts consistently across course detail components.
 */
export function pluralize(count: number, noun: PluralNoun, lang: "en" | "hi" = "en"): string {
  const n = Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0

  if (lang === "hi") {
    switch (noun) {
      case "lecture":
        return n === 1 ? "1 लेक्चर" : `${n} लेक्चर्स`
      case "hour":
        return n === 1 ? "1 घंटा" : `${n} घंटे`
      case "theme":
        return n === 1 ? "1 थीम" : `${n} थीम्स`
      case "unit":
        return n === 1 ? "1 यूनिट" : `${n} यूनिट्स`
      case "question":
        return n === 1 ? "1 प्रश्न" : `${n} प्रश्न`
      case "paper":
        return n === 1 ? "1 पेपर" : `${n} पेपर्स`
    }
  }

  // English
  switch (noun) {
    case "lecture":
      return n === 1 ? "1 lecture" : `${n} lectures`
    case "hour":
      return n === 1 ? "1 hour" : `${n} hours`
    case "theme":
      return n === 1 ? "1 theme" : `${n} themes`
    case "unit":
      return n === 1 ? "1 unit" : `${n} units`
    case "question":
      return n === 1 ? "1 question" : `${n} questions`
    case "paper":
      return n === 1 ? "1 paper" : `${n} papers`
  }
}

/**
 * Helper to format lecture and hour counts together:
 * e.g. "1 lecture, 1 hour" (EN) or "1 लेक्चर, 1 घंटा" (HI)
 *      "9 lectures, 14 hours" (EN) or "9 लेक्चर्स, 14 घंटे" (HI)
 */
export function formatLecturesAndHours(lectures: number, hours: number, lang: "en" | "hi" = "en"): string {
  return `${pluralize(lectures, "lecture", lang)}, ${pluralize(hours, "hour", lang)}`
}
