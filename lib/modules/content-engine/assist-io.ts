/**
 * Manual-Assist Import/Export Utility
 * Generates promptable copyable text/JSON for external tools and imports human review edits.
 * Source: Exam_Content_Engine-4.html
 */

export interface ExportUncategorizedItem {
  id: string
  q: string
  o: string[]
}

export interface ImportCategoryItem {
  id: string
  sub: string
  top: string
  subHi?: string
  topHi?: string
}

export interface ExportMissingHindiItem {
  id: string
  q: string
  o: string[]
  exp?: string
  top?: string
}

export interface ImportHindiItem {
  en?: string
  q: string
  o: string[]
  exp?: string
  top?: string
  rev?: boolean
}

/**
 * Normalizes question string for text-based matching (alphanumeric only).
 */
export const normalizeForMatch = (v: unknown): string =>
  String(v ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

/**
 * Generates external prompt text for uncategorized questions.
 */
export function exportUncategorizedPrompt(
  items: ExportUncategorizedItem[],
  existingTaxonomyList: string[]
): string {
  const payload = items.map((i) => ({
    id: i.id,
    q: i.q.slice(0, 300),
    o: i.o.map((x) => x.slice(0, 80)),
  }))

  return (
    `Classify these competitive-exam questions into Subject and Chapter/Topic.\n` +
    `Prefer existing Subject > Topic pairs where applicable: ${existingTaxonomyList.join("; ")}.\n` +
    `Return ONLY a JSON array in this exact shape: [{"id":"...","sub":"...","top":"...","subHi":"...","topHi":"..."}]\n\n` +
    JSON.stringify(payload, null, 2)
  )
}

/**
 * Generates copyable EN:/HQ:/HA:/HE:/HT:/OK: blocks for missing Hindi translations.
 */
export function exportMissingHindiBlocks(items: ExportMissingHindiItem[]): string {
  const instructions =
    `# INSTRUCTIONS FOR TRANSLATOR\n` +
    `# Translate each block into clear Hindi (Devanagari).\n` +
    `# Keep numbers, years, option codes, and option counts identical.\n` +
    `# Separate options in HA with " | ".\n` +
    `# Set OK: no (remains unreviewed until verified by an editor).\n\n`

  const blocks = items.map((i) => {
    return [
      `EN: ${i.q.replace(/\s+/g, " ").trim()}`,
      `HQ: `,
      `HA: ${i.o.join(" | ")}`,
      `HE: ${(i.exp || "").replace(/\n/g, "\\n")}`,
      `HT: ${i.top || ""}`,
      `OK: no`,
    ].join("\n")
  })

  return instructions + blocks.join("\n###\n")
}

/**
 * Parses category JSON returned from external manual assistance.
 */
export function parseCategoryJson(rawJson: string): ImportCategoryItem[] {
  if (!rawJson || !rawJson.trim()) return []
  const parsed = JSON.parse(rawJson)
  const list = Array.isArray(parsed) ? parsed : [parsed]
  const valid: ImportCategoryItem[] = []

  for (const item of list) {
    if (item && typeof item === "object" && item.id && item.sub && item.top) {
      valid.push({
        id: String(item.id).trim(),
        sub: String(item.sub).slice(0, 60).trim(),
        top: String(item.top).slice(0, 80).trim(),
        subHi: item.subHi ? String(item.subHi).slice(0, 60).trim() : undefined,
        topHi: item.topHi ? String(item.topHi).slice(0, 80).trim() : undefined,
      })
    }
  }

  return valid
}

/**
 * Parses Hindi translations from either JSON format or EN:/HQ:/HA:/HE:/HT:/OK: blocks.
 */
export function parseHindiImport(rawInput: string): ImportHindiItem[] {
  const trimmed = rawInput.trim()
  if (!trimmed) return []

  // Attempt JSON parsing first
  try {
    const json = JSON.parse(trimmed)
    const list = Array.isArray(json) ? json : [json]
    const result: ImportHindiItem[] = []

    for (const r of list) {
      const opts = r.o || r.options
      if (r && r.q && Array.isArray(opts)) {
        result.push({
          en: r.en ? String(r.en).trim() : undefined,
          q: String(r.q).trim(),
          o: opts.map((v: unknown) => String(v).trim()),
          exp: r.exp || r.explanation ? String(r.exp || r.explanation).trim() : "",
          top: r.top ? String(r.top).trim() : "",
          rev: Boolean(r.rev || r.isReviewed),
        })
      }
    }
    return result
  } catch {
    // Fall back to block parsing delimited by ###
  }

  const blocks = trimmed.split(/^###\s*$/m)
  const result: ImportHindiItem[] = []

  for (const block of blocks) {
    const fields: Record<string, string> = {}
    block.split("\n").forEach((line) => {
      const m = line.match(/^(EN|HQ|HA|HE|HT|OK):\s*(.*)$/)
      if (m) {
        fields[m[1]] = m[2].trim()
      }
    })

    if (fields.HQ) {
      const opts = (fields.HA || "")
        .split("|")
        .map((v) => v.trim())
        .filter(Boolean)

      result.push({
        en: fields.EN || undefined,
        q: fields.HQ,
        o: opts,
        exp: (fields.HE || "").replace(/\\n/g, "\n"),
        top: fields.HT || "",
        rev: /^(y|yes|1|true)/i.test(fields.OK || ""),
      })
    }
  }

  return result
}
