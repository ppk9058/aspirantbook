import {
  buildMetadata,
  buildSeoPackage,
  buildArticleJsonLd,
  canonicalUrl,
  getBaseUrl,
} from "../core"
import type { SharedSeoOutput } from "../types"

export function adaptTutorialsCatalogSeo(baseUrl?: string): SharedSeoOutput {
  const canonicalPath = "/tutorials"
  const title = "Text-Based Tutorials | AspirantBook"
  const description =
    "In-depth, step-by-step reading tutorials with interactive code blocks, diagrams, and curriculum authored in Tutorial Studio."

  return buildSeoPackage(
    {
      title,
      description,
      canonicalPath,
      isPublished: true,
      breadcrumbs: [
        { name: "Home", url: canonicalUrl("/", baseUrl) },
        { name: "Tutorials", url: canonicalUrl(canonicalPath, baseUrl) },
      ],
    },
    baseUrl
  )
}

export function adaptTutorialDetailSeo(
  course: {
    id: string
    title: string
    slug: string
    description?: string | null
    isPublished?: boolean
    status?: string
    updatedAt?: Date | string
  },
  baseUrl?: string
): SharedSeoOutput {
  const cleanBase = getBaseUrl(baseUrl)
  const canonicalPath = `/tutorials/${course.slug}`
  const isIndexable =
    Boolean(course.isPublished) &&
    (course.status === "PUBLISHED" || !course.status)

  const articleJsonLd = buildArticleJsonLd({
    type: "TechArticle",
    headline: course.title,
    description: course.description || "",
    url: canonicalUrl(canonicalPath, cleanBase),
    dateModified: course.updatedAt
      ? new Date(course.updatedAt).toISOString()
      : undefined,
  })

  return buildSeoPackage(
    {
      title: course.title,
      description: course.description || "",
      canonicalPath,
      isIndexable,
      breadcrumbs: [
        { name: "Home", url: canonicalUrl("/", cleanBase) },
        { name: "Tutorials", url: canonicalUrl("/tutorials", cleanBase) },
        { name: course.title, url: canonicalUrl(canonicalPath, cleanBase) },
      ],
      jsonLd: [articleJsonLd],
    },
    cleanBase
  )
}
