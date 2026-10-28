import { buildMetadata, buildSeoPackage, buildBreadcrumbListJsonLd, canonicalUrl } from "../core"
import type { SharedSeoOutput } from "../types"
import type { Metadata } from "next"

export function adaptPyqsCatalogSeo(baseUrl?: string): SharedSeoOutput {
  const canonicalPath = "/pyqs"
  const title = "Previous Year Question Papers (PYQs) | TrillionSkill"
  const description =
    "Download and practice verified previous year examination papers for BPSC, UPSC, NCERT, and State Boards with answer keys and CBT simulations."

  return buildSeoPackage(
    {
      title,
      description,
      canonicalPath,
      isPublished: true,
      breadcrumbs: [
        { name: "Home", url: canonicalUrl("/", baseUrl) },
        { name: "PYQs", url: canonicalUrl(canonicalPath, baseUrl) },
      ],
    },
    baseUrl
  )
}

export function adaptPyqCategorySeo(
  category: {
    name: string
    slug: string
    description?: string | null
    isPublished?: boolean
  },
  baseUrl?: string
): SharedSeoOutput {
  const canonicalPath = `/pyqs/${category.slug}`
  const title = `${category.name} Previous Year Question Papers (PYQs) | TrillionSkill`
  const description =
    category.description ||
    `Download and practice ${category.name} previous year papers with answer keys and detailed analysis.`

  return buildSeoPackage(
    {
      title,
      description,
      canonicalPath,
      isPublished: category.isPublished ?? true,
      breadcrumbs: [
        { name: "Home", url: canonicalUrl("/", baseUrl) },
        { name: "PYQs", url: canonicalUrl("/pyqs", baseUrl) },
        { name: category.name, url: canonicalUrl(canonicalPath, baseUrl) },
      ],
    },
    baseUrl
  )
}
