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
    examName?: string | null
    isFree?: boolean
    price?: number | null
  },
  baseUrl?: string
): SharedSeoOutput {
  const canonicalSlug = series.slug || series.id
  const canonicalPath = `/test-series/${canonicalSlug}`
  const title = `${series.title} Test Series & Mock Tests | TrillionSkill`
  const description =
    series.description ||
    `Take online mock tests for ${series.title}. Real-time analytics, all-India ranking, and detailed solutions.`

  const priceValue = typeof series.price === "number" ? String(series.price) : (series.isFree ? "0" : "0")

  return buildSeoPackage(
    {
      title,
      description,
      canonicalPath,
      isPublished: series.isPublished ?? true,
      breadcrumbs: [
        { name: "Home", url: canonicalUrl("/", baseUrl) },
        { name: "Test Series", url: canonicalUrl("/test-series", baseUrl) },
        { name: series.title, url: canonicalUrl(canonicalPath, baseUrl) },
      ],
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "Product",
          name: series.title,
          description,
          url: canonicalUrl(canonicalPath, baseUrl),
          offers: {
            "@type": "Offer",
            price: priceValue,
            priceCurrency: "INR",
            availability: "https://schema.org/InStock",
            url: canonicalUrl(canonicalPath, baseUrl),
          },
        },
      ],
    },
    baseUrl
  )
}
