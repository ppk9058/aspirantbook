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

/**
 * Escapes characters safely for embedding inside <script type="application/ld+json">.
 * Specifically replaces `<` with `\u003c` to prevent XSS / script breakout.
 */
export function safeJsonLdStringify(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c")
}

/**
 * Builds standard SEO title, description, canonical, hreflang, and JSON-LD schemas.
 */
export function buildSeoModel(
  question: SeoQuestionInput,
  lang: "en" | "hi",
  baseUrl: string
): SeoModelOutput {
  const isHi = lang === "hi"
  const cleanBase = baseUrl.replace(/\/+$/, "")

  // Determine active text based on requested language
  const qText = isHi && question.hindiTwin?.q ? question.hindiTwin.q : question.q
  const options = isHi && question.hindiTwin?.o ? question.hindiTwin.o : question.o
  const subName = isHi
    ? getHindiSubject(question.sub || "Uncategorized")
    : question.sub || "Uncategorized"
  const topName = isHi
    ? question.hindiTwin?.top || getHindiTopic(question.top || "General")
    : question.top || "General"

  const examStr = question.exam ? ` ${question.exam}` : ""
  const yearStr = question.year ? ` ${question.year}` : ""

  const title = isHi
    ? `${qText.slice(0, 70)} | ${topName}${examStr}${yearStr} MCQ`
    : `${qText.slice(0, 80)} | ${topName}${examStr}${yearStr} MCQ`

  const correctOptionText =
    question.a > -1 && question.a < options.length ? options[question.a] : ""

  const desc = isHi
    ? `${qText.slice(0, 90)} उत्तर${correctOptionText ? ": " + correctOptionText : ""} — मुख्य बिंदु और व्याख्या सहित। ${topName}${question.exam ? ", " + question.exam : ""}${yearStr}.`.slice(
        0,
        158
      )
    : `${qText.slice(0, 90)} Answer${correctOptionText ? ": " + correctOptionText : ""} with key points and explanation. ${topName}${question.exam ? ", " + question.exam : ""}${yearStr}.`.slice(
        0,
        158
      )

  // Canonical paths
  const enPath = qaPath("en", question.exam, question.sub, question.slug)
  const hiPath = qaPath("hi", question.exam, question.sub, question.slug)
  const canonicalPath = isHi ? hiPath : enPath
  const canonicalUrl = `${cleanBase}${canonicalPath}`

  // Robots indexing rule:
  // - English is indexable if isPublished is true.
  // - Hindi is indexable only if isPublished is true AND hindiTwin.isReviewed is true.
  const isIndexable = isHi
    ? question.isPublished && Boolean(question.hindiTwin?.isReviewed)
    : question.isPublished

  const robots = isIndexable ? "index, follow" : "noindex, follow"

  // Hreflang alternates:
  // Include Hindi hreflang only if reviewed
  const hasReviewedHindi = Boolean(question.hindiTwin?.isReviewed)
  const hreflang: SeoModelOutput["hreflang"] = {
    en: `${cleanBase}${enPath}`,
    "x-default": `${cleanBase}${enPath}`,
  }
  if (hasReviewedHindi) {
    hreflang.hi = `${cleanBase}${hiPath}`
  }

  // Breadcrumbs
  const homePath = homeHubPath(lang)
  const examPath = examHubPath(question.exam || "general", lang)
  const subPath = subjectHubPath(question.exam || "general", question.sub || "general", lang)

  const breadcrumbs = [
    { name: isHi ? "होम" : "Home", url: `${cleanBase}${homePath}` },
    { name: question.exam || (isHi ? "सामान्य" : "General"), url: `${cleanBase}${examPath}` },
    { name: subName, url: `${cleanBase}${subPath}` },
    { name: shortQ(qText), url: canonicalUrl },
  ]

  const breadcrumbListJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((crumb, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  }

  // Quiz JSON-LD (only included if answer is valid)
  let quizJsonLd: Record<string, unknown> | null = null
  if (question.a > -1 && question.a < options.length) {
    const effectiveExp = (question.resolvedExp || question.exp || "").slice(0, 500)
    quizJsonLd = {
      "@context": "https://schema.org/",
      "@type": "Quiz",
      name: qText.slice(0, 110),
      about: {
        "@type": "Thing",
        name: topName,
      },
      educationalLevel: "Competitive exam",
      assesses: topName,
      ...(isHi ? { inLanguage: "hi" } : {}),
      hasPart: [
        {
          "@type": "Question",
          eduQuestionType: "Multiple choice",
          text: qText,
          acceptedAnswer: {
            "@type": "Answer",
            text: correctOptionText,
            answerExplanation: {
              "@type": "Comment",
              text: effectiveExp,
            },
          },
          suggestedAnswer: options
            .filter((_, idx) => idx !== question.a)
            .map((t) => ({
              "@type": "Answer",
              text: t,
            })),
        },
      ],
    }
  }

  const jsonLdScripts = [
    breadcrumbListJsonLd,
    isIndexable && quizJsonLd ? quizJsonLd : null,
  ].filter(Boolean)

  const jsonLdScriptString = jsonLdScripts
    .map(
      (schema) =>
        `<script type="application/ld+json">${safeJsonLdStringify(schema)}</script>`
    )
    .join("\n")

  return {
    title,
    description: desc,
    canonicalPath,
    canonicalUrl,
    robots,
    hreflang,
    breadcrumbs,
    jsonLd: {
      breadcrumbList: breadcrumbListJsonLd,
      quiz: quizJsonLd,
    },
    jsonLdScriptString,
  }
}
