import {
  buildSeoPackage,
  buildBreadcrumbListJsonLd,
  buildProductJsonLd,
  canonicalUrl,
  getBaseUrl,
} from "../core"
import type { SharedSeoOutput } from "../types"

export function adaptBookDetailSeo(
  book: {
    title: string
    author?: string | null
    slug: string
    shortDescription?: string | null
    description?: string | null
    coverImage?: string | null
  },
  baseUrl?: string
): SharedSeoOutput {
  const canonicalPath = `/books/${book.slug}`
  const title = book.author
    ? `${book.title} - ${book.author} | AspirantBook`
    : `${book.title} | AspirantBook`
  const description =
    book.shortDescription ||
    book.description?.slice(0, 160) ||
    "Buy and read authentic digital PDF notes and eBooks instantly on AspirantBook."

  return buildSeoPackage(
    {
      title,
      description,
      canonicalPath,
      titleAbsolute: true,
      isPublished: true,
      openGraph: {
        title,
        description,
        type: "website",
        ...(book.coverImage ? { images: [book.coverImage] } : {}),
      },
      breadcrumbs: [
        { name: "Home", url: canonicalUrl("/", baseUrl) },
        { name: "eBooks", url: canonicalUrl("/books", baseUrl) },
        { name: book.title, url: canonicalUrl(canonicalPath, baseUrl) },
      ],
    },
    baseUrl
  )
}

export function adaptBooksCatalogSeo(baseUrl?: string): SharedSeoOutput {
  const canonicalPath = "/books"
  const title = "eBooks & Study Material | AspirantBook"
  const description =
    "Shop verified digital eBooks and study material for BPSC, UPSC and school exams. Instant delivery and read on any device."

  return buildSeoPackage(
    {
      title,
      description,
      canonicalPath,
      titleAbsolute: true,
      isPublished: true,
      breadcrumbs: [
        { name: "Home", url: canonicalUrl("/", baseUrl) },
        { name: "eBooks", url: canonicalUrl(canonicalPath, baseUrl) },
      ],
    },
    baseUrl
  )
}

/**
 * Product JSON-LD for a book detail page.
 *
 * `aggregateRating` is attached ONLY when `ratingSource` carries values read
 * from the stored book row. Callers must pass null for placeholder ratings, so
 * the schema never advertises a rating the database does not contain.
 */
export function buildBookDetailJsonLd(
  book: {
    title: string
    slug?: string | null
    shortDescription?: string | null
    description?: string | null
    coverImage?: string | null
    price?: number | null
  },
  ratingSource: { ratingValue: number; reviewCount: number } | null,
  baseUrl?: string
): Array<Record<string, unknown>> {
  const base = getBaseUrl(baseUrl)
  const canonicalPath = `/books/${book.slug || ""}`
  const url = canonicalUrl(canonicalPath, base)

  return [
    buildBreadcrumbListJsonLd([
      { name: "Home", url: canonicalUrl("/", base) },
      { name: "eBooks", url: canonicalUrl("/books", base) },
      { name: book.title, url },
    ]),
    buildProductJsonLd({
      name: book.title,
      description: book.shortDescription || book.description?.slice(0, 200),
      image: book.coverImage,
      url,
      price: book.price,
      aggregateRating: ratingSource,
    }),
  ]
}
