import type { Metadata } from "next"
import type {
  BreadcrumbItem,
  SeoHreflangLinks,
  SeoImage,
  SharedSeoInput,
  SharedSeoOutput,
  SitemapEntry,
} from "./types"

let hasLoggedMissingSiteUrlWarning = false

/**
 * Shared site name constant for SEO and JSON-LD schemas.
 * Defaults to "AspirantBook", overridable via NEXT_PUBLIC_SITE_NAME environment variable.
 */
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "AspirantBook"

/**
 * Returns canonical site origin dynamically from environment variables:
 * - Reads NEXT_PUBLIC_SITE_URL, then NEXT_PUBLIC_APP_URL.
 * - In development or test: falls back to http://127.0.0.1:3045.
 * - In production: logs one console.error and returns "" (never emits a hardcoded domain).
 */
export function getBaseUrl(overrideBaseUrl?: string): string {
  if (overrideBaseUrl) {
    return overrideBaseUrl.replace(/\/+$/, "")
  }
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, "")
  }

  const isProd = process.env.NODE_ENV === "production"
  if (isProd) {
    if (!hasLoggedMissingSiteUrlWarning) {
      console.error(
        "[SEO] Neither NEXT_PUBLIC_SITE_URL nor NEXT_PUBLIC_APP_URL is set in production. Canonical and absolute URLs omitted."
      )
      hasLoggedMissingSiteUrlWarning = true
    }
    return ""
  }

  // Development / Test fallback
  return "http://127.0.0.1:3045"
}

/**
 * Derives full canonical URL from path and base.
 */
export function canonicalUrl(canonicalPath: string, baseUrl?: string): string {
  const base = getBaseUrl(baseUrl)
  if (!base) {
    return ""
  }
  const normalizedPath = canonicalPath.startsWith("/")
    ? canonicalPath
    : `/${canonicalPath}`
  return `${base}${normalizedPath}`
}

/**
 * Evaluates robots policy.
 * - If not indexable (e.g. draft, unreviewed Hindi, empty hub), returns 'noindex, follow' (or nofollow if specified).
 * - If indexable, returns 'index, follow'.
 */
export function robotsPolicy(opts: {
  isIndexable: boolean
  noFollow?: boolean
}): string {
  const index = opts.isIndexable ? "index" : "noindex"
  const follow = opts.noFollow ? "nofollow" : "follow"
  return `${index}, ${follow}`
}

/**
 * Builds hreflang links conforming to bilingual requirements:
 * - English is always x-default and en.
 * - Hindi (hi) is ONLY included if reviewed and indexable.
 */
export function hreflangAlternates(
  paths: { en: string; hi?: string | null },
  isHindiReviewed: boolean = false,
  baseUrl?: string
): SeoHreflangLinks {
  const base = getBaseUrl(baseUrl)
  const enUrl = canonicalUrl(paths.en, base)
  const result: SeoHreflangLinks = {
    en: enUrl,
    "x-default": enUrl,
  }
  if (paths.hi && isHindiReviewed) {
    result.hi = canonicalUrl(paths.hi, base)
  }
  return result
}

/**
 * Escapes characters safely for embedding inside <script type="application/ld+json">.
 * Specifically replaces `<` with `\u003c` to prevent XSS / script breakout.
 */
export function safeJsonLdStringify(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c")
}

/**
 * Schema.org BreadcrumbList generator.
 */
export function buildBreadcrumbListJsonLd(
  breadcrumbs: BreadcrumbItem[]
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((crumb, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  }
}

/**
 * Schema.org Quiz generator.
 */
export function buildQuizJsonLd(opts: {
  name: string
  description?: string
  assesses?: string
  educationalLevel?: string
  inLanguage?: string
  timeRequired?: string
  url?: string
  provider?: { name: string; url: string }
  questions?: Array<{
    text: string
    acceptedAnswer: string
    suggestedAnswers: string[]
    explanation?: string
  }>
}): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Quiz",
    name: opts.name,
    learningResourceType: "Quiz",
    isAccessibleForFree: true,
  }

  if (opts.description) schema.description = opts.description
  if (opts.assesses) {
    schema.about = {
      "@type": "Thing",
      name: opts.assesses,
    }
    schema.assesses = opts.assesses
  }
  if (opts.educationalLevel) schema.educationalLevel = opts.educationalLevel
  if (opts.inLanguage) schema.inLanguage = opts.inLanguage
  if (opts.timeRequired) schema.timeRequired = opts.timeRequired
  if (opts.url) schema.url = opts.url
  if (opts.provider) {
    schema.provider = {
      "@type": "Organization",
      name: opts.provider.name,
      url: opts.provider.url,
    }
  }

  if (opts.questions && opts.questions.length > 0) {
    schema.hasPart = opts.questions.map((q) => ({
      "@type": "Question",
      eduQuestionType: "Multiple choice",
      text: q.text,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.acceptedAnswer,
        ...(q.explanation
          ? {
              answerExplanation: {
                "@type": "Comment",
                text: q.explanation.slice(0, 500),
              },
            }
          : {}),
      },
      suggestedAnswer: q.suggestedAnswers.map((opt) => ({
        "@type": "Answer",
        text: opt,
      })),
    }))
  }

  return schema
}

/**
 * Schema.org Course generator.
 */
export function buildCourseJsonLd(opts: {
  name: string
  description?: string | null
  url?: string
  providerName?: string
  providerUrl?: string
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: opts.name,
    ...(opts.description ? { description: opts.description } : {}),
    ...(opts.url ? { url: opts.url } : {}),
    provider: {
      "@type": "Organization",
      name: opts.providerName || SITE_NAME,
      ...(opts.providerUrl ? { sameAs: opts.providerUrl } : {}),
    },
  }
}

/**
 * Schema.org ItemList generator for catalogue pages.
 */
export function buildItemListJsonLd(opts: {
  name: string
  items: Array<{ name: string; url: string }>
  itemListOrder?: "Ascending" | "Descending"
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: opts.name,
    ...(opts.itemListOrder ? { itemListOrder: opts.itemListOrder } : {}),
    numberOfItems: opts.items.length,
    itemListElement: opts.items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      url: item.url,
    })),
  }
}

/**
 * Schema.org Product generator. `aggregateRating` is attached only when a
 * caller passes values that were read from real database fields.
 */
export function buildProductJsonLd(opts: {
  name: string
  description?: string | null
  image?: string | null
  url?: string
  price?: number | null
  currency?: string
  aggregateRating?: { ratingValue: number; reviewCount: number } | null
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: opts.name,
    ...(opts.description ? { description: opts.description } : {}),
    ...(opts.image ? { image: [opts.image] } : {}),
    ...(opts.url ? { url: opts.url } : {}),
    ...(typeof opts.price === "number"
      ? {
          offers: {
            "@type": "Offer",
            price: opts.price,
            priceCurrency: opts.currency || "INR",
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
    ...(opts.aggregateRating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: opts.aggregateRating.ratingValue,
            reviewCount: opts.aggregateRating.reviewCount,
          },
        }
      : {}),
  }
}

/**
 * Schema.org Article / TechArticle generator.
 */
export function buildArticleJsonLd(opts: {
  type?: "Article" | "TechArticle"
  headline: string
  description: string
  url?: string
  inLanguage?: string
  isAccessibleForFree?: boolean
  datePublished?: string
  dateModified?: string
  authorName?: string
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": opts.type || "Article",
    headline: opts.headline,
    description: opts.description,
    ...(opts.url ? { url: opts.url } : {}),
    ...(opts.inLanguage ? { inLanguage: opts.inLanguage } : {}),
    isAccessibleForFree: opts.isAccessibleForFree ?? true,
    ...(opts.datePublished ? { datePublished: opts.datePublished } : {}),
    ...(opts.dateModified ? { dateModified: opts.dateModified } : {}),
    author: {
      "@type": "Organization",
      name: opts.authorName || "AspirantBook",
    },
  }
}

/**
 * Schema.org FAQPage generator.
 */
export function buildFaqJsonLd(
  faqs: Array<{ question: string; answer: string }>
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  }
}

/**
 * Default social-share card. 1200x630 (the size Twitter's
 * `summary_large_image` and Facebook/LinkedIn expect), built from the brand
 * mark. The engine always emits it when a page has no image of its own, so an
 * engine-rendered page can never fall back to the root layout's stale card.
 */
export const DEFAULT_OG_IMAGE: SeoImage = {
  url: "/og/aspirantbook-og.jpg",
  width: 1200,
  height: 630,
  alt: `${SITE_NAME} — courses, test series and previous year papers`,
}

/**
 * Normalizes the images a page passes to the engine into absolute og:image
 * entries. Relative paths are resolved against the engine base URL (never a
 * hardcoded host); absolute CDN/upload URLs are kept as-is. When the caller
 * provides no image, the default 1200x630 brand card is used.
 */
export function resolveSeoImages(
  images?: Array<string | SeoImage> | null,
  baseUrl?: string,
  fallback: SeoImage = DEFAULT_OG_IMAGE
): SeoImage[] {
  const base = getBaseUrl(baseUrl)

  const toAbsolute = (url: string): string => {
    if (!url) return url
    if (/^https?:\/\//i.test(url)) return url
    if (!base) return url
    return canonicalUrl(url, base)
  }

  const source: Array<string | SeoImage> =
    images && images.length > 0 ? images : [fallback]

  return source.map((image) => {
    if (typeof image === "string") {
      return { url: toAbsolute(image), width: 1200, height: 630, alt: SITE_NAME }
    }
    return {
      url: toAbsolute(image.url),
      width: image.width || 1200,
      height: image.height || 630,
      alt: image.alt || SITE_NAME,
    }
  })
}

/**
 * Generates Schema.org Organization and WebSite schemas for the homepage JSON-LD graph.
 */
export function buildHomeJsonLd(baseUrl?: string): Record<string, unknown> | null {
  const base = getBaseUrl(baseUrl)
  if (!base) return null
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${base}/#organization`,
        name: SITE_NAME,
        url: base,
        logo: {
          "@type": "ImageObject",
          url: `${base}/aspirant-logo.jpg`,
        },
      },
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        url: base,
        name: SITE_NAME,
        publisher: {
          "@id": `${base}/#organization`,
        },
        potentialAction: {
          "@type": "SearchAction",
          target: `${base}/courses?search={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  }
}

/**
 * Schema.org LearningResource generator.
 *
 * Used for previous-year question papers and other practice material. Only
 * facts the database actually stores are passed in; there is deliberately no
 * rating/review field (we do not collect paper reviews) and no answer key, so a
 * gated paper can never leak its solutions through markup.
 */
export function buildLearningResourceJsonLd(opts: {
  name: string
  description: string
  url?: string
  inLanguage?: string
  isAccessibleForFree?: boolean
  learningResourceType?: string
  educationalLevel?: string
  about?: string
  datePublished?: string
  dateModified?: string
  providerUrl?: string
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: opts.name,
    description: opts.description,
    learningResourceType: opts.learningResourceType || "QuestionPaper",
    ...(opts.url ? { url: opts.url } : {}),
    ...(opts.inLanguage ? { inLanguage: opts.inLanguage } : {}),
    ...(opts.educationalLevel ? { educationalLevel: opts.educationalLevel } : {}),
    ...(opts.about ? { about: { "@type": "Thing", name: opts.about } } : {}),
    ...(opts.datePublished ? { datePublished: opts.datePublished } : {}),
    ...(opts.dateModified ? { dateModified: opts.dateModified } : {}),
    isAccessibleForFree: opts.isAccessibleForFree ?? true,
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      ...(opts.providerUrl ? { url: opts.providerUrl } : {}),
    },
  }
}

/**
 * Builds standard Next.js Metadata object from shared SEO input.
 */
export function buildMetadata(
  input: SharedSeoInput,
  baseUrl?: string
): Metadata {
  const base = getBaseUrl(baseUrl)
  const fullCanonical = canonicalUrl(input.canonicalPath, base)

  const isIndexable =
    input.isIndexable !== undefined
      ? input.isIndexable
      : input.locale === "hi"
      ? Boolean(input.isPublished && input.hindiTwin?.isReviewed)
      : Boolean(input.isPublished ?? true)

  const robots = robotsPolicy({
    isIndexable,
    noFollow: input.noFollow,
  })

  const enPath =
    input.locale === "hi" && input.englishTwin?.canonicalPath
      ? input.englishTwin.canonicalPath
      : input.canonicalPath

  const hiPath =
    input.locale === "hi"
      ? input.canonicalPath
      : input.hindiTwin?.canonicalPath

  const hasReviewedHindi = Boolean(
    input.locale === "hi"
      ? isIndexable
      : input.hindiTwin?.isReviewed && input.hindiTwin?.isPublished !== false
  )

  const alternates: Metadata["alternates"] = fullCanonical
    ? {
        canonical: fullCanonical,
        languages: hreflangAlternates({ en: enPath, hi: hiPath }, hasReviewedHindi, base),
      }
    : undefined

  // Every engine page gets a complete social set derived from its OWN
  // title/description/image. Next.js merges metadata per top-level field, so
  // the root layout's static `twitter` block used to survive on any page that
  // defined `openGraph` but not `twitter` (the /test-series production bug).
  // Emitting both objects here makes the page values always win.
  const socialTitle = input.openGraph?.title || input.title
  const socialDescription = input.openGraph?.description || input.description
  const socialImages = resolveSeoImages(
    input.openGraph?.images,
    base,
    input.locale === "hi"
      ? { ...DEFAULT_OG_IMAGE, alt: `${SITE_NAME} — पाठ्यक्रम और प्रश्न पत्र` }
      : DEFAULT_OG_IMAGE
  )

  const metadata: Metadata = {
    title: input.titleAbsolute ? { absolute: input.title } : input.title,
    description: input.description,
    alternates,
    robots,
    ...(input.keywords && input.keywords.length > 0
      ? { keywords: input.keywords }
      : {}),
    openGraph: {
      title: socialTitle,
      description: socialDescription,
      url: fullCanonical,
      type: input.openGraph?.type || "website",
      siteName: SITE_NAME,
      locale: input.locale === "hi" ? "hi_IN" : "en_IN",
      images: socialImages,
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: socialDescription,
      images: socialImages.map((image) => image.url),
    },
  }

  return metadata
}

/**
 * Complete SEO Package builder: returns Metadata, JSON-LD, breadcrumbs, script tags.
 */
export function buildSeoPackage(
  input: SharedSeoInput,
  baseUrl?: string
): SharedSeoOutput {
  const base = getBaseUrl(baseUrl)
  const fullCanonical = canonicalUrl(input.canonicalPath, base)

  const isIndexable =
    input.isIndexable !== undefined
      ? input.isIndexable
      : input.locale === "hi"
      ? Boolean(input.isPublished && input.hindiTwin?.isReviewed)
      : Boolean(input.isPublished ?? true)

  const robots = robotsPolicy({
    isIndexable,
    noFollow: input.noFollow,
  })

  const enPath =
    input.locale === "hi" && input.englishTwin?.canonicalPath
      ? input.englishTwin.canonicalPath
      : input.canonicalPath

  const hiPath =
    input.locale === "hi"
      ? input.canonicalPath
      : input.hindiTwin?.canonicalPath

  const hasReviewedHindi = Boolean(
    input.locale === "hi"
      ? isIndexable
      : input.hindiTwin?.isReviewed && input.hindiTwin?.isPublished !== false
  )

  const hreflang = hreflangAlternates(
    { en: enPath, hi: hiPath },
    hasReviewedHindi,
    base
  )

  const breadcrumbs = input.breadcrumbs || []
  const jsonLdSchemas: Record<string, unknown>[] = []

  if (breadcrumbs.length > 0) {
    jsonLdSchemas.push(buildBreadcrumbListJsonLd(breadcrumbs))
  }

  if (input.jsonLd && input.jsonLd.length > 0) {
    for (const schema of input.jsonLd) {
      if (schema) jsonLdSchemas.push(schema)
    }
  }

  const jsonLdScriptString = jsonLdSchemas
    .map(
      (schema) =>
        `<script type="application/ld+json">${safeJsonLdStringify(schema)}</script>`
    )
    .join("\n")

  const metadata = buildMetadata(input, base)

  return {
    title: input.title,
    description: input.description,
    canonicalPath: input.canonicalPath,
    canonicalUrl: fullCanonical,
    robots,
    hreflang,
    breadcrumbs,
    jsonLd: jsonLdSchemas,
    metadata,
    jsonLdScriptString,
  }
}

/**
 * Builds standard SitemapEntry.
 */
export function buildSitemapEntry(
  pathOrUrl: string,
  opts?: {
    lastModified?: string | Date
    changeFrequency?: SitemapEntry["changeFrequency"]
    priority?: number
    baseUrl?: string
  }
): SitemapEntry {
  const url = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : canonicalUrl(pathOrUrl, opts?.baseUrl)

  return {
    url,
    lastModified: opts?.lastModified || new Date().toISOString().split("T")[0],
    changeFrequency: opts?.changeFrequency || "weekly",
    priority: opts?.priority ?? 0.7,
  }
}
