import { buildMetadata, buildSeoPackage, canonicalUrl } from "../core"
import type { SharedSeoOutput } from "../types"

export function adaptTestSeriesCatalogSeo(baseUrl?: string): SharedSeoOutput {
  const canonicalPath = "/test-series"
  const title = "Online Test Series & Mock Exams | TrillionSkill"
  const description =
    "Practice online test series, full mocks, and subject-wise tests with real-time ranking and detailed solutions."

  return buildSeoPackage(
    {
      title,
      description,
      canonicalPath,
      isPublished: true,
      breadcrumbs: [
        { name: "Home", url: canonicalUrl("/", baseUrl) },
        { name: "Test Series", url: canonicalUrl(canonicalPath, baseUrl) },
      ],
    },
    baseUrl
  )
}

export function adaptTestSeriesDetailSeo(
  series: {
    id: string
    title: string
    slug?: string | null
    description?: string | null
    isPublished?: boolean
    isArchived?: boolean
    examName?: string | null
    isFree?: boolean
    price?: number | null
  },
  baseUrl?: string
): SharedSeoOutput {
  const isAvailable = (series.isPublished ?? true) && !series.isArchived
  const canonicalSlug = series.slug || series.id
  const canonicalPath = `/test-series/${canonicalSlug}`
  const title = `${series.title} Test Series & Mock Tests | TrillionSkill`
  const description =
    series.description ||
    `Take online mock tests for ${series.title}. Real-time analytics, all-India ranking, and detailed solutions.`

  let offer: Record<string, unknown> | undefined = undefined
  if (isAvailable) {
    if (typeof series.price === "number" && series.price > 0) {
      offer = {
        "@type": "Offer",
        price: String(series.price),
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        url: canonicalUrl(canonicalPath, baseUrl),
      }
    } else if (series.isFree || series.price === 0) {
      offer = {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        url: canonicalUrl(canonicalPath, baseUrl),
      }
    }
  }

  const jsonLdItem = isAvailable
    ? offer
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: series.title,
          description,
          url: canonicalUrl(canonicalPath, baseUrl),
          offers: offer,
        }
      : {
          "@context": "https://schema.org",
          "@type": "Product",
          name: series.title,
          description,
          url: canonicalUrl(canonicalPath, baseUrl),
        }
    : null

  return buildSeoPackage(
    {
      title,
      description,
      canonicalPath,
      isPublished: isAvailable,
      breadcrumbs: [
        { name: "Home", url: canonicalUrl("/", baseUrl) },
        { name: "Test Series", url: canonicalUrl("/test-series", baseUrl) },
        { name: series.title, url: canonicalUrl(canonicalPath, baseUrl) },
      ],
      jsonLd: jsonLdItem ? [jsonLdItem] : [],
    },
    baseUrl
  )
}
