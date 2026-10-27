/**
 * Typed schema for `Course.metadataJson` (v2).
 *
 * Design rules:
 *  - `.passthrough()` everywhere so legacy/unknown keys written by other features
 *    survive a save from the studio.
 *  - Every v2 key is optional: courses created before v2 must load unchanged.
 *  - Lengths/sizes are capped so a single metadata row cannot grow unbounded.
 */
import { z } from "zod"

export const MAX_SHORT = 120
export const MAX_MEDIUM = 240
export const MAX_LONG = 2000
export const MAX_LIST = 12
export const MAX_TAGS = 8

export const SECTION_KEYS = [
  "about",
  "plan",
  "syllabus",
  "teachers",
  "questions",
  "lectures",
  "callback",
] as const

export type SectionKey = (typeof SECTION_KEYS)[number]
export type SectionFlags = Record<SectionKey, boolean>

export const DEFAULT_SECTION_FLAGS: SectionFlags = {
  about: true,
  plan: true,
  syllabus: true,
  teachers: true,
  questions: true,
  lectures: true,
  callback: true,
}

const shortText = z.string().max(MAX_SHORT)
const mediumText = z.string().max(MAX_MEDIUM)
const longText = z.string().max(MAX_LONG)
const optionalShort = shortText.optional()
const optionalMedium = mediumText.optional()
const optionalLong = longText.optional()

export const heroMetricSchema = z
  .object({
    value: shortText,
    valueHi: optionalShort,
    label: shortText,
    labelHi: optionalShort,
  })
  .passthrough()

export const instructorSchema = z
  .object({
    name: shortText,
    nameHi: optionalShort,
    avatar: optionalMedium,
    credentials: z.array(shortText).max(MAX_LIST).optional(),
    credentialsHi: z.array(shortText).max(MAX_LIST).optional(),
  })
  .passthrough()

export const bilingualItemSchema = z
  .object({
    en: mediumText,
    hi: optionalMedium,
  })
  .passthrough()

export const teacherSchema = z
  .object({
    name: shortText,
    nameHi: optionalShort,
    role: optionalShort,
    roleHi: optionalShort,
    subject: optionalShort,
    experience: optionalShort,
    qualification: optionalMedium,
    qualificationHi: optionalMedium,
    avatar: optionalMedium,
    bio: optionalLong,
    bioHi: optionalLong,
  })
  .passthrough()

export const faqSchema = z
  .object({
    question: mediumText,
    questionHi: optionalMedium,
    answer: longText,
    answerHi: optionalLong,
  })
  .passthrough()

export const scheduleItemSchema = z
  .object({
    day: shortText,
    dayHi: optionalShort,
    subjects: optionalMedium,
    subjectsHi: optionalMedium,
    time: optionalMedium,
    timeHi: optionalMedium,
    type: optionalShort,
    typeHi: optionalShort,
  })
  .passthrough()

export const testModeSettingsSchema = z
  .object({
    applicationStartDate: optionalShort,
    examDate: optionalShort,
    resultDate: optionalShort,
    examTime: optionalShort,
    negativeMarking: z.boolean().optional(),
    language: optionalShort,
    // Hindi twins for the application/exam info block
    applicationStartDateHi: optionalShort,
    examDateHi: optionalShort,
    resultDateHi: optionalShort,
    examTimeHi: optionalShort,
  })
  .passthrough()

export const courseMetadataSchema = z
  .object({
    schemaVersion: z.number().int().min(1).max(99).optional(),
    format: shortText.optional(),

    // Hero / details
    subtitle: optionalMedium,
    subtitleHi: optionalMedium,
    heroMetrics: z.array(heroMetricSchema).max(4).optional(),
    firstClassDate: optionalShort,
    scheduleText: optionalMedium,
    scheduleTextHi: optionalMedium,
    validityText: optionalMedium,
    validityTextHi: optionalMedium,
    validityNote: optionalMedium,
    validityNoteHi: optionalMedium,
    lateJoinerTemplate: optionalMedium,
    lateJoinerTemplateHi: optionalMedium,
    pillTags: z.array(shortText).max(MAX_TAGS).optional(),
    pillTagsHi: z.array(shortText).max(MAX_TAGS).optional(),
    instructor: instructorSchema.optional(),
    thumbnailBadge: optionalShort,
    thumbnailBadgeHi: optionalShort,
    enrollDisclaimer: optionalMedium,
    enrollDisclaimerHi: optionalMedium,
    howItWorks: z.array(bilingualItemSchema).max(MAX_LIST).optional(),
    whatYouGet: z.array(bilingualItemSchema).max(MAX_LIST).optional(),

    // Section toggles
    sections: z
      .object({
        about: z.boolean().optional(),
        plan: z.boolean().optional(),
        syllabus: z.boolean().optional(),
        teachers: z.boolean().optional(),
        questions: z.boolean().optional(),
        lectures: z.boolean().optional(),
        callback: z.boolean().optional(),
      })
      .passthrough()
      .optional(),

    // Legacy blocks (kept, now with bilingual twins)
    language: optionalShort,
    targetText: optionalMedium,
    classTag: optionalShort,
    teachers: z.array(teacherSchema).max(MAX_LIST).optional(),
    schedule: z.array(scheduleItemSchema).max(MAX_LIST).optional(),
    aboutHighlights: z.array(mediumText).max(MAX_LIST).optional(),
    aboutHighlightsHi: z.array(mediumText).max(MAX_LIST).optional(),
    faqs: z.array(faqSchema).max(30).optional(),
    testModeSettings: testModeSettingsSchema.optional(),
    demoSettings: z
      .object({
        enabled: z.boolean().optional(),
        topic: optionalMedium,
        topicHi: optionalMedium,
        facultyName: optionalShort,
        agenda: z.array(mediumText).max(MAX_LIST).optional(),
        agendaHi: z.array(mediumText).max(MAX_LIST).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()

export type CourseMetadataV2 = z.infer<typeof courseMetadataSchema>

export type ParseResult =
  | { ok: true; data: CourseMetadataV2 }
  | { ok: false; errors: string[] }

/** Parses metadata JSON. Never throws. Returns flat `path: message` errors. */
export function parseCourseMetadata(raw: unknown): ParseResult {
  let value: unknown = raw
  if (typeof raw === "string") {
    if (raw.trim().length === 0) value = {}
    else {
      try {
        value = JSON.parse(raw)
      } catch {
        return { ok: false, errors: ["metadataJson: must be valid JSON"] }
      }
    }
  }
  if (value === null || value === undefined) value = {}
  if (typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, errors: ["metadataJson: must be a JSON object"] }
  }

  const result = courseMetadataSchema.safeParse(value)
  if (result.success) return { ok: true, data: result.data }
  return {
    ok: false,
    errors: result.error.issues.map((issue) => `${issue.path.join(".") || "metadataJson"}: ${issue.message}`),
  }
}

/** Reads section flags with the defaults applied. */
export function readSectionFlags(meta: Partial<CourseMetadataV2> | null | undefined): SectionFlags {
  const raw = (meta?.sections || {}) as Partial<SectionFlags>
  const flags = { ...DEFAULT_SECTION_FLAGS }
  for (const key of SECTION_KEYS) {
    if (typeof raw[key] === "boolean") flags[key] = raw[key] as boolean
  }
  return flags
}

/**
 * Accepts https URLs and our own uploaded paths only.
 * Rejects javascript:/data: (SVG data URLs are an XSS vector) and relative junk.
 */
export function stripUnsafeImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^https:\/\//i.test(trimmed)) return trimmed
  if (/^\/(uploads|images|assets|static)\//.test(trimmed)) return trimmed
  if (/^\/[A-Za-z0-9._-]+\.(png|jpe?g|webp|gif|svg)$/i.test(trimmed)) return trimmed
  return null
}

/** Validates a list of https image/URL fields in one go. */
export function sanitizeImageUrls(values: unknown[]): Array<string | null> {
  return values.map((value) => stripUnsafeImageUrl(value))
}
