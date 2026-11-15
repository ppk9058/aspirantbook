import type { Metadata } from "next"

export type SupportedLocale = "en" | "hi"

export interface BreadcrumbItem {
  name: string
  url: string
}

export interface SeoHreflangLinks {
  en: string
  hi?: string
  "x-default": string
  [key: string]: string | undefined
}

export interface SeoImage {
  url: string
  width?: number
  height?: number
  alt?: string
}

export interface SharedSeoInput {
  title: string
  description: string
  canonicalPath: string
  /**
   * Emit the title as-is instead of letting the root layout's `%s | AspirantBook`
   * template append the site name a second time.
   */
  titleAbsolute?: boolean
  locale?: SupportedLocale
  isPublished?: boolean
  isIndexable?: boolean
  noFollow?: boolean
  /**
   * Optional topic keywords for `<meta name="keywords">`.
   *
   * There is no site-wide keyword list any more: the engine only emits the tag
   * when a caller supplies terms that describe this specific page. Pages
   * without keywords emit no keyword tag at all (Google ignores it; the
   * generic site-wide list was pure noise on every crawled page).
   */
  keywords?: string[]
  openGraph?: {
    title?: string
    description?: string
    type?: "website" | "article"
    images?: Array<string | SeoImage>
  }
  hindiTwin?: {
    canonicalPath: string
    isReviewed: boolean
    isPublished?: boolean
  } | null
  englishTwin?: {
    canonicalPath: string
    isPublished?: boolean
  } | null
  breadcrumbs?: BreadcrumbItem[]
  jsonLd?: Record<string, unknown>[]
}

export interface SharedSeoOutput {
  title: string
  description: string
  canonicalPath: string
  canonicalUrl: string
  robots: string
  hreflang: SeoHreflangLinks
  breadcrumbs: BreadcrumbItem[]
  jsonLd: Record<string, unknown>[]
  metadata: Metadata
  jsonLdScriptString: string
}

export interface SitemapEntry {
  url: string
  lastModified?: string | Date
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"
  priority?: number
}
