/**
 * Bilingual field resolution.
 *
 * Every localised field follows the same contract: the English field is
 * `<field>`, the Hindi twin is `<field>Hi`. When the Hindi value is missing or
 * blank we fall back to English *for that field only* — never for the whole object.
 */

export type Lang = "en" | "hi"

export interface LocalizedSource {
  [key: string]: unknown
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim().length === 0)
}

/**
 * Reads `field` (or `fieldHi` for Hindi) from an object, falling back to English.
 * Returns an empty string when neither exists, so callers can render safely.
 */
export function localized(source: LocalizedSource | null | undefined, field: string, lang: Lang = "en"): string {
  if (!source) return ""
  const english = source[field]
  if (lang !== "hi") return isBlank(english) ? "" : String(english)

  const hindi = source[`${field}Hi`]
  if (!isBlank(hindi)) return String(hindi)
  return isBlank(english) ? "" : String(english)
}

/** Same as localized but returns undefined instead of "" when absent. */
export function localizedOptional(
  source: LocalizedSource | null | undefined,
  field: string,
  lang: Lang = "en"
): string | undefined {
  const value = localized(source, field, lang)
  return value === "" ? undefined : value
}

/**
 * Studio badge helper: how many of the given fields lack Hindi text.
 * Only counts fields that actually have English content.
 */
export function hindiCompleteness(
  source: LocalizedSource | null | undefined,
  fields: string[]
): { total: number; missing: number } {
  let total = 0
  let missing = 0
  if (!source) return { total, missing }
  for (const field of fields) {
    if (isBlank(source[field])) continue
    total += 1
    if (isBlank(source[`${field}Hi`])) missing += 1
  }
  return { total, missing }
}

/** Aggregates completeness across a list (e.g. teachers or FAQs). */
export function hindiCompletenessForList(
  items: Array<LocalizedSource | null | undefined> | null | undefined,
  fields: string[]
): { total: number; missing: number } {
  let total = 0
  let missing = 0
  for (const item of items || []) {
    const result = hindiCompleteness(item, fields)
    total += result.total
    missing += result.missing
  }
  return { total, missing }
}

/** Formats the studio badge text ("Hindi missing: N"). */
export function hindiBadgeLabel(missing: number): string {
  return missing > 0 ? `Hindi missing: ${missing}` : "Hindi complete"
}
