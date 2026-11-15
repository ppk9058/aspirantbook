import {
  buildSeoPackage,
  buildBreadcrumbListJsonLd,
  buildCourseJsonLd,
  canonicalUrl,
  getBaseUrl,
} from "../core"
import type { SharedSeoOutput } from "../types"

export function adaptCoursesCatalogSeo(
  courses?: Array<{ title: string; slug: string }>,
  baseUrl?: string
): SharedSeoOutput {
  const cleanBase = getBaseUrl(baseUrl)
  const canonicalPath = "/courses"
  const title = "All Video Courses & Batches | AspirantBook"
  const description =
    "Explore all comprehensive video courses, academic foundations, and competitive batches on AspirantBook."

  const breadcrumbs = [
    { name: "Home", url: canonicalUrl("/", cleanBase) },
    { name: "Courses", url: canonicalUrl(canonicalPath, cleanBase) },
  ]
  const breadcrumbJsonLd = buildBreadcrumbListJsonLd(breadcrumbs)

  const jsonLdList: Array<Record<string, unknown>> = [breadcrumbJsonLd]

  if (courses && courses.length > 0) {
    jsonLdList.push({
      "@context": "https://schema.org",
      "@type": "ItemList",
      numberOfItems: courses.length,
      itemListElement: courses.map((c, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: c.title,
        url: canonicalUrl(`/courses/${c.slug}`, cleanBase),
      })),
    })
  }

  return buildSeoPackage(
    {
      title,
      description,
      canonicalPath,
      titleAbsolute: true,
      isPublished: true,
      breadcrumbs,
      jsonLd: jsonLdList,
    },
    cleanBase
  )
}

export function adaptCourseDetailSeo(
  course: {
    id: string
    title: string
    slug?: string | null
    description?: string | null
    thumbnailUrl?: string | null
    isPublished?: boolean
    status?: string | null
  },
  baseUrl?: string
): SharedSeoOutput {
  const cleanBase = getBaseUrl(baseUrl)
  const canonicalPath = `/courses/${course.slug || course.id}`
  const title = `${course.title} | AspirantBook`
  const description = course.description || `Enroll in ${course.title} on AspirantBook`
  const isPublished =
    course.isPublished !== false &&
    (course.status === "PUBLISHED" || !course.status)

  const breadcrumbs = [
    { name: "Home", url: canonicalUrl("/", cleanBase) },
    { name: "Courses", url: canonicalUrl("/courses", cleanBase) },
    { name: course.title, url: canonicalUrl(canonicalPath, cleanBase) },
  ]

  const jsonLd = buildCourseDetailJsonLd(course, cleanBase)

  return buildSeoPackage(
    {
      title,
      description,
      canonicalPath,
      titleAbsolute: true,
      isPublished,
      isIndexable: isPublished,
      openGraph: {
        title,
        description,
        type: "website",
        ...(course.thumbnailUrl ? { images: [course.thumbnailUrl] } : {}),
      },
      breadcrumbs,
      jsonLd,
    },
    cleanBase
  )
}

/**
 * JSON-LD for a course detail page: BreadcrumbList (Home > Courses > real
 * course title) plus the Course schema. The title comes from the database row,
 * never from the slug.
 */
export function buildCourseDetailJsonLd(
  course: {
    title: string
    slug?: string | null
    description?: string | null
  },
  baseUrl?: string
): Array<Record<string, unknown>> {
  const base = getBaseUrl(baseUrl)
  const canonicalPath = `/courses/${course.slug || ""}`
  const url = canonicalUrl(canonicalPath, base)

  return [
    buildBreadcrumbListJsonLd([
      { name: "Home", url: canonicalUrl("/", base) },
      { name: "Courses", url: canonicalUrl("/courses", base) },
      { name: course.title, url },
    ]),
    buildCourseJsonLd({
      name: course.title,
      description: course.description,
      url,
      providerName: "AspirantBook",
      providerUrl: base || undefined,
    }),
  ]
}
