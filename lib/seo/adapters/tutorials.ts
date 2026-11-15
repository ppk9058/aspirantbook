import {
  buildMetadata,
  buildSeoPackage,
  buildArticleJsonLd,
  buildBreadcrumbListJsonLd,
  buildCourseJsonLd,
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
      titleAbsolute: true,
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

export function adaptTutorialLessonSeo(
  tutorial: {
    title: string
    slug: string
  },
  lesson: {
    id: string
    title: string
    slug: string
    description?: string | null
    isGated?: boolean
    isPublished?: boolean
    updatedAt?: Date | string
  },
  baseUrl?: string
): SharedSeoOutput {
  const cleanBase = getBaseUrl(baseUrl)
  const canonicalPath = `/tutorials/${tutorial.slug}/${lesson.slug}`
  const title = `${lesson.title} - ${tutorial.title}`
  const rawDesc = lesson.description || `Read ${lesson.title} from ${tutorial.title} tutorial on AspirantBook.`
  const description = rawDesc.length > 158 ? `${rawDesc.slice(0, 155)}...` : rawDesc
  const isIndexable = lesson.isPublished !== false

  const breadcrumbs = [
    { name: "Home", url: canonicalUrl("/", cleanBase) },
    { name: "Tutorials", url: canonicalUrl("/tutorials", cleanBase) },
    { name: tutorial.title, url: canonicalUrl(`/tutorials/${tutorial.slug}`, cleanBase) },
    { name: lesson.title, url: canonicalUrl(canonicalPath, cleanBase) },
  ]

  const breadcrumbJsonLd = buildBreadcrumbListJsonLd(breadcrumbs)
  const articleJsonLd = lesson.isGated
    ? {
        ...buildArticleJsonLd({
          type: "TechArticle",
          headline: lesson.title,
          description,
          url: canonicalUrl(canonicalPath, cleanBase),
          isAccessibleForFree: false,
          dateModified: lesson.updatedAt ? new Date(lesson.updatedAt).toISOString() : undefined,
        }),
        name: title,
        hasPart: {
          "@type": "WebPageElement",
          isAccessibleForFree: false,
          cssSelector: "[role='region'][aria-label='Content Gate']",
        },
      }
    : buildArticleJsonLd({
        type: "TechArticle",
        headline: lesson.title,
        description,
        url: canonicalUrl(canonicalPath, cleanBase),
        isAccessibleForFree: true,
        dateModified: lesson.updatedAt ? new Date(lesson.updatedAt).toISOString() : undefined,
      })

  return buildSeoPackage(
    {
      title,
      description,
      canonicalPath,
      titleAbsolute: true,
      isIndexable,
      openGraph: {
        title,
        description,
        type: "article",
      },
      breadcrumbs,
      jsonLd: [breadcrumbJsonLd, articleJsonLd],
    },
    cleanBase
  )
}

/**
 * JSON-LD for a tutorial detail page: BreadcrumbList (Home > Tutorials > real
 * title from the database row) plus the content schema. Gated content keeps
 * the paywalled TechArticle shape; open tutorials get a Course schema.
 */
export function buildTutorialDetailJsonLd(
  course: {
    title: string
    slug: string
    description?: string | null
    isGated?: boolean
  },
  baseUrl?: string
): Array<Record<string, unknown>> {
  const base = getBaseUrl(baseUrl)
  const canonicalPath = `/tutorials/${course.slug}`
  const url = canonicalUrl(canonicalPath, base)

  const contentSchema = course.isGated
    ? {
        ...buildArticleJsonLd({
          type: "TechArticle",
          headline: course.title,
          description: course.description || "",
          url,
          isAccessibleForFree: false,
        }),
        name: course.title,
        hasPart: {
          "@type": "WebPageElement",
          isAccessibleForFree: false,
          cssSelector: "[role='region'][aria-label='Content Gate']",
        },
      }
    : buildCourseJsonLd({
        name: course.title,
        description: course.description,
        url,
        providerName: "AspirantBook",
        providerUrl: base || undefined,
      })

  return [
    buildBreadcrumbListJsonLd([
      { name: "Home", url: canonicalUrl("/", base) },
      { name: "Tutorials", url: canonicalUrl("/tutorials", base) },
      { name: course.title, url },
    ]),
    contentSchema,
  ]
}
