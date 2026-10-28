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

export interface SharedSeoInput {
  title: string
  description: string
  canonicalPath: string
  locale?: SupportedLocale
  isPublished?: boolean
  isIndexable?: boolean
  noFollow?: boolean
  openGraph?: {
    title?: string
    description?: string
    type?: "website" | "article"
    images?: string[]
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
