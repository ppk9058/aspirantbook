/**
 * Canonical SEO Metadata & Structured Data (JSON-LD) Generator
 * Consumed identically by Native Next.js routes (Phase 4A) and Static ZIP Export (Phase 4B).
 * Source: Exam_Content_Engine-4.html
 */

import { qaPath, homeHubPath, examHubPath, subjectHubPath } from "./paths"
import { shortQ } from "./parser"
import { getHindiSubject, getHindiTopic } from "./taxonomy"

export interface SeoQuestionInput {
  id: string
  shortId: string
  slug: string
  q: string
  o: string[]
  a: number
  exp?: string
  resolvedExp?: string
  sub?: string
  top?: string
  exam?: string
  year?: string
  src?: string
  isPublished: boolean
  isVerified?: boolean
  // Hindi twin info
  hindiTwin?: {
    q: string
    o: string[]
    exp?: string
    top?: string
    isReviewed: boolean
  } | null
}

export interface SeoModelOutput {
  title: string
  description: string
  canonicalPath: string
  canonicalUrl: string
  robots: string
  hreflang: {
    en: string
    hi?: string
    "x-default": string
  }
  breadcrumbs: {
    name: string
    url: string
  }[]
  jsonLd: {
    breadcrumbList: Record<string, unknown>
    quiz: Record<string, unknown> | null
  }
  jsonLdScriptString: string
}

import { adaptContentEngineSeo } from "../../seo/adapters/content-engine"

/**
 * Escapes characters safely for embedding inside <script type="application/ld+json">.
 * Specifically replaces `<` with `\u003c` to prevent XSS / script breakout.
 */
export function safeJsonLdStringify(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c")
}

/**
 * Builds standard SEO title, description, canonical, hreflang, and JSON-LD schemas.
 * Delegates directly to the unified shared SEO core.
 */
export function buildSeoModel(
  question: SeoQuestionInput,
  lang: "en" | "hi",
  baseUrl: string
): SeoModelOutput {
  return adaptContentEngineSeo(question, lang, baseUrl)
}
