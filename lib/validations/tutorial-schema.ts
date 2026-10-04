import { z } from "zod"
import crypto from "crypto"

// Base block validator
export const BlockSchema = z
  .object({
    bid: z.string().optional(),
    t: z.string(),
  })
  .passthrough()

export const ThemeColorsSchema = z.object({
  bg: z.string().optional(),
  card: z.string().optional(),
  ink: z.string().optional(),
  primary: z.string().optional(),
  green: z.string().optional(),
  yellow: z.string().optional(),
  soft: z.string().optional(),
  code: z.string().optional(),
  muted: z.string().optional(),
  codeink: z.string().optional(),
}).passthrough()

export const ThemeFontsSchema = z.object({
  head: z.string().optional(),
  body: z.string().optional(),
  mono: z.string().optional(),
}).passthrough()

export const ThemeSchema = z.object({
  colors: ThemeColorsSchema.optional(),
  fonts: ThemeFontsSchema.optional(),
}).passthrough()

export const MetaSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  brand: z.string().optional(),
  subject: z.string().optional(),
  level: z.string().optional(),
  status: z.string().optional(),
  intro: z.string().optional(),
  rating: z.union([z.string(), z.number()]).optional(),
  learners: z.string().optional(),
  includes: z.array(z.string()).optional(),
  stats: z.array(z.tuple([z.string(), z.string()])).optional(),
}).passthrough()

export const ChapterItemSchema = z.object({
  id: z.string().min(1, "Chapter/Lesson ID is required"),
  title: z.string().min(1, "Chapter/Lesson title is required"),
  soon: z.union([z.boolean(), z.number()]).optional(),
  order: z.number().optional(),
  blocks: z.array(z.any()).optional().default([]),
}).passthrough()

export const PhaseItemSchema = z.object({
  id: z.string().min(1, "Phase ID is required"),
  title: z.string().min(1, "Phase title is required"),
  order: z.number().optional(),
  chapters: z.array(ChapterItemSchema).default([]),
}).passthrough()

export const TutorialPackageSchema = z.object({
  schema: z.number().optional().default(1),
  theme: ThemeSchema.optional(),
  meta: MetaSchema,
  phases: z.array(PhaseItemSchema).min(1, "At least one phase is required"),
})

export type TutorialPackage = z.infer<typeof TutorialPackageSchema>
export type PhaseItem = z.infer<typeof PhaseItemSchema>
export type ChapterItem = z.infer<typeof ChapterItemSchema>

/**
 * Normalizes any block into a guaranteed valid block with a stable `bid`.
 * If unknown, gracefully wraps as an HTML review block so it never crashes.
 */
export function normalizeBlockWithBid(rawBlock: any): Record<string, any> {
  if (!rawBlock) {
    return { bid: crypto.randomUUID(), t: "p", x: "" }
  }

  const bid = rawBlock.bid || crypto.randomUUID()
  const rawType = String(rawBlock.t || rawBlock.type || "p").toLowerCase()

  // Supported block types in Schema v1
  switch (rawType) {
    case "h2":
    case "heading":
      return { bid, t: "h2", x: rawBlock.x || rawBlock.content || "" }

    case "sub":
    case "subheading":
      return { bid, t: "sub", x: rawBlock.x || rawBlock.content || "" }

    case "p":
    case "paragraph":
    case "text":
      return { bid, t: "p", x: rawBlock.x || rawBlock.content || "" }

    case "list":
      return {
        bid,
        t: "list",
        items: Array.isArray(rawBlock.items) ? rawBlock.items : [rawBlock.x || ""],
      }

    case "code":
      return {
        bid,
        t: "code",
        lang: rawBlock.lang || rawBlock.language || "python",
        title: rawBlock.title || rawBlock.filename || "",
        x: rawBlock.x || rawBlock.code || "",
        ...(rawBlock.expectedOutput ? { expectedOutput: rawBlock.expectedOutput } : {}),
      }

    case "callout":
      return {
        bid,
        t: "callout",
        k: rawBlock.k || rawBlock.calloutType || "tip",
        x: rawBlock.x || rawBlock.content || "",
      }

    case "flow":
      return {
        bid,
        t: "flow",
        steps: Array.isArray(rawBlock.steps) ? rawBlock.steps : [],
      }

    case "infographic":
      return {
        bid,
        t: "infographic",
        items: Array.isArray(rawBlock.items) ? rawBlock.items : [],
      }

    case "table":
      return {
        bid,
        t: "table",
        h: Array.isArray(rawBlock.h) ? rawBlock.h : (rawBlock.headers || []),
        r: Array.isArray(rawBlock.r) ? rawBlock.r : (rawBlock.rows || []),
      }

    case "chart":
      return {
        bid,
        t: "chart",
        title: rawBlock.title || "",
        d: Array.isArray(rawBlock.d) ? rawBlock.d : [],
      }

    case "diagram":
    case "pipeline":
    case "architecture":
      return {
        bid,
        t: "diagram",
        diagramFlow: rawBlock.diagramFlow || {
          title: rawBlock.title || "",
          caption: rawBlock.caption || "",
          type: rawBlock.diagramType || "pipeline",
          bgColor: rawBlock.bgColor,
          borderColor: rawBlock.borderColor,
          stages: rawBlock.stages,
          nodes: rawBlock.nodes,
          steps: rawBlock.steps,
          rawSvg: rawBlock.rawSvg || rawBlock.svg,
          rawHtml: rawBlock.rawHtml || rawBlock.html,
        },
      }

    case "art":
      return {
        bid,
        t: "art",
        ...(rawBlock.name ? { name: rawBlock.name } : {}),
        ...(rawBlock.svg || rawBlock.rawSvg ? { svg: rawBlock.svg || rawBlock.rawSvg } : {}),
      }

    case "interactive":
    case "widget":
      return {
        bid,
        t: "interactive",
        widget: rawBlock.widget || "",
        title: rawBlock.title || "",
        ...(rawBlock.content ? { content: rawBlock.content } : {}),
      }

    case "quiz":
      return {
        bid,
        t: "quiz",
        q: rawBlock.q || rawBlock.question || "",
        o: Array.isArray(rawBlock.o) ? rawBlock.o : (rawBlock.options || []),
        a: typeof rawBlock.a === "number" ? rawBlock.a : (rawBlock.correctIndex ?? 0),
        ...(rawBlock.why || rawBlock.explanation ? { why: rawBlock.why || rawBlock.explanation } : {}),
      }

    case "image":
      return {
        bid,
        t: "image",
        src: rawBlock.src || rawBlock.url || "",
        ...(rawBlock.alt ? { alt: rawBlock.alt } : {}),
        ...(rawBlock.caption ? { caption: rawBlock.caption } : {}),
      }

    case "html":
      return {
        bid,
        t: "html",
        x: rawBlock.x || rawBlock.content || rawBlock.html || "",
      }

    default:
      // Unknown block type: fallback to html flagged for review
      return {
        bid,
        t: "html",
        x: `<div class="p-3 my-2 border border-amber-300 bg-amber-50 text-amber-900 rounded-lg text-xs font-mono"><b>[Unknown Block Type: ${rawType}]</b><br/>${JSON.stringify(rawBlock)}</div>`,
        _unsupportedType: rawType,
      }
  }
}
