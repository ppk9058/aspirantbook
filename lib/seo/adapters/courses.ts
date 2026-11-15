import { buildSeoPackage, buildBreadcrumbListJsonLd, buildCourseJsonLd, canonicalUrl, getBaseUrl } from "../core"
import type { SharedSeoOutput } from "../types"

export function adaptCoursesCatalogSeo(baseUrl?: string): SharedSeoOutput {
  const canonicalPath = "/courses"
  const title = "All Video Courses & Batches | AspirantBook"
  const description =
    "Explore all comprehensive video courses, academic foundations, and competitive batches on AspirantBook."

  return buildSeoPackage(
    {
      title,
      description,
      canonicalPath,
      titleAbsolute: true,
      isPublished: true,
      breadcrumbs: [
        { name: "Home", url: canonicalUrl("/", baseUrl) },
        { name: "Courses", url: canonicalUrl(canonicalPath, baseUrl) },
      ],
    },
    baseUrl
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
