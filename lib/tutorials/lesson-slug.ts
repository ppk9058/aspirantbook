/**
 * Utility for deriving and matching deterministic, URL-safe lesson slugs
 * without altering database schema.
 */

export function slugifyText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

export function deriveLessonSlug(lesson: {
  id: string
  title: string
  externalId?: string | null
}): string {
  const base = slugifyText(lesson.title)
  // Use a stable suffix from the lesson's unique ID to avoid collisions
  const suffix = lesson.id.slice(-6).toLowerCase()
  return base ? `${base}-${suffix}` : lesson.id
}

export function findLessonBySlug<
  T extends { id: string; title: string; externalId?: string | null }
>(lessons: T[], slugOrId: string): T | undefined {
  if (!slugOrId) return undefined
  const norm = slugOrId.trim().toLowerCase()

  // 1. Direct ID match
  const directId = lessons.find((l) => l.id.toLowerCase() === norm)
  if (directId) return directId

  // 2. Exact derived slug match
  const derived = lessons.find((l) => deriveLessonSlug(l).toLowerCase() === norm)
  if (derived) return derived

  // 3. Suffix ID match (e.g. ends with -suffix)
  const bySuffix = lessons.find((l) => norm.endsWith(l.id.slice(-6).toLowerCase()))
  if (bySuffix) return bySuffix

  // 4. Fallback slugify on title alone
  return lessons.find((l) => slugifyText(l.title) === norm)
}

/**
 * Extracts plain text from lesson content (JSON blocks, markdown, or HTML)
 * to produce clean meta descriptions or crawler fallbacks.
 */
export function extractLessonText(
  content: string | null | undefined,
  maxChars = 160
): string {
  if (!content || !content.trim()) return ""
  const trimmed = content.trim()

  let raw = ""

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed)
      const blocks: any[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.blocks)
        ? parsed.blocks
        : []

      const textParts: string[] = []
      for (const b of blocks) {
        if (typeof b === "string") {
          textParts.push(b)
        } else if (b && typeof b === "object") {
          if (b.type === "paragraph" || b.type === "text" || b.type === "heading") {
            const val = b.content || b.text || b.html || ""
            if (typeof val === "string") textParts.push(val)
          } else if (b.html) {
            textParts.push(b.html)
          } else if (b.content) {
            textParts.push(String(b.content))
          }
        }
      }
      raw = textParts.join(" ")
    } catch {
      raw = trimmed
    }
  } else {
    raw = trimmed
  }

  // Strip HTML tags and markdown symbols
  const stripped = raw
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*`_~\[\]()!]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (stripped.length <= maxChars) {
    return stripped
  }

  return `${stripped.slice(0, maxChars - 3).trim()}...`
}
