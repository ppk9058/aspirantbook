/**
 * Course format resolution — the ONE place that decides what a course *is*.
 *
 * Historically four different files carried their own inline heuristics
 * (`slug.includes("bpsc")`, the `72nd-bpsc-prelims-current-affairs` slug,
 * `externalId`, `price > 0`, lesson media type). Those rules now live here,
 * clearly marked as legacy fallbacks, and every call site imports from here.
 */

export type CourseFormat = "bundle" | "document" | "tutorial" | "comingSoon"

export interface CourseFormatInput {
  slug?: string | null
  title?: string | null
  price?: number | null
  externalId?: string | null
  metadataJson?: unknown
  chapters?: Array<{
    lessons?: Array<{
      type?: string | null
      title?: string | null
      videoUrl?: string | null
      attachmentType?: string | null
      attachmentName?: string | null
    }>
  }> | null
}

/** Legacy: the flagship video course that was special-cased in five files. */
export const LEGACY_FLAGSHIP_VIDEO_SLUG = "72nd-bpsc-prelims-current-affairs"

function parseMetadata(metadataJson: unknown): Record<string, any> | null {
  if (!metadataJson) return null
  if (typeof metadataJson === "object") return metadataJson as Record<string, any>
  if (typeof metadataJson !== "string") return null
  try {
    const parsed = JSON.parse(metadataJson)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function explicitFormat(meta: Record<string, any> | null): CourseFormat | null {
  if (!meta) return null
  const candidates = [meta.format, meta?.meta?.format, meta.type]
  for (const raw of candidates) {
    if (!raw || typeof raw !== "string") continue
    const value = raw.toLowerCase().replace(/[-_\s]/g, "")
    if (value === "tutorial") return "tutorial"
    if (value === "document" || value === "reading" || value === "notes") return "document"
    if (value === "video" || value === "bundle" || value === "videobundle") return "bundle"
    if (value === "comingsoon" || value === "soon") return "comingSoon"
  }
  return null
}

function hasMediaLesson(course: CourseFormatInput): boolean {
  for (const chapter of course.chapters || []) {
    for (const lesson of chapter?.lessons || []) {
      if (!lesson) continue
      if (lesson.videoUrl && lesson.videoUrl.trim().length > 0) return true
      if (lesson.type === "VIDEO") return true
      if (lesson.attachmentType || lesson.attachmentName) return true
    }
  }
  return false
}

/**
 * Resolves the render format for a course.
 * Explicit `metadataJson.format` always wins; legacy heuristics only run as fallbacks.
 */
export function resolveCourseFormat(course: CourseFormatInput): CourseFormat {
  const meta = parseMetadata(course.metadataJson)
  const explicit = explicitFormat(meta)
  if (explicit) return explicit

  // ── Legacy fallbacks (kept for existing rows; do not extend) ──────────────
  // Tutorials imported through Tutorial Studio always carry an externalId.
  if (course.externalId) return "tutorial"

  const slug = (course.slug || "").toLowerCase().trim()
  if (slug === LEGACY_FLAGSHIP_VIDEO_SLUG) return "bundle"
  if (slug.includes("bpsc")) return "bundle"

  if (typeof course.price === "number" && course.price > 0) return "bundle"
  if (hasMediaLesson(course)) return "bundle"

  return "document"
}

/**
 * Video Course Studio listing (admin + teacher): pays OR has video lessons/sections
 * OR is the legacy flagship. Mirrors the previous inline filter exactly.
 */
export function isVideoCourseForStudio(course: CourseFormatInput): boolean {
  if ((course.slug || "") === LEGACY_FLAGSHIP_VIDEO_SLUG) return true
  if (typeof course.price === "number" && course.price > 0) return true
  for (const chapter of course.chapters || []) {
    for (const lesson of chapter?.lessons || []) {
      if (!lesson) continue
      if (lesson.videoUrl || lesson.type === "VIDEO") return true
    }
  }
  return false
}

/**
 * Text tutorial catalog (student /tutorials and admin /tutorials): everything that
 * is not video-ish and not the legacy flagship. Mirrors the previous inline filter.
 */
export function isTextTutorialForCatalog(course: CourseFormatInput): boolean {
  if ((course.slug || "") === LEGACY_FLAGSHIP_VIDEO_SLUG) return false
  const lowerTitle = (course.title || "").toLowerCase()
  const lowerSlug = (course.slug || "").toLowerCase()
  if (lowerTitle.includes("video course") || lowerTitle.includes("video tutorial") || lowerSlug.includes("video")) {
    return false
  }
  for (const chapter of course.chapters || []) {
    for (const lesson of chapter?.lessons || []) {
      if (!lesson) continue
      if (lesson.videoUrl || lesson.type === "VIDEO") return false
    }
  }
  return true
}

/**
 * Tutorial URLs in app/sitemap.ts: the old rule only looked at the slug.
 * Kept separate so the sitemap output does not change.
 */
export function isListedInTutorialsSitemap(course: CourseFormatInput): boolean {
  const lowerSlug = (course.slug || "").toLowerCase()
  if (lowerSlug.includes("video")) return false
  return (course.slug || "") !== LEGACY_FLAGSHIP_VIDEO_SLUG
}

/** True when the course should render the full video/bundle detail page. */
export function rendersAsBundle(course: CourseFormatInput): boolean {
  return resolveCourseFormat(course) === "bundle" || resolveCourseFormat(course) === "comingSoon"
}
