import {
  buildSeoPackage,
  buildBreadcrumbListJsonLd,
  buildLearningResourceJsonLd,
  canonicalUrl,
  getBaseUrl,
} from "../core"
import type { SharedSeoOutput } from "../types"

export interface PyqPaperSeoInput {
  title: string
  slug: string
  year?: number | null
  stage?: string | null
  shift?: string | null
  examDate?: Date | string | null
  subject?: string | null
  durationMin?: number | null
  totalMarks?: number | null
  totalQuestions?: number | null
  languages?: string[]
  pdfFileSizeKb?: number | null
  pageCount?: number | null
  accessType?: string | null
  isPassIncluded?: boolean
  unlockPrice?: number | null
  status?: string | null
  updatedAt?: Date | string | null
  hasQuestions?: boolean
}

export interface PyqCategoryInfo {
  name: string
  slug: string
}

/**
 * Generates an SEO title under 60 characters for a PYQ paper.
 * Preserves the full paper title and truncates only the descriptive suffix.
 */
export function buildPyqPaperTitle(paperTitle: string): string {
  const fullSuffix = " - Question Paper PDF, Answer Key & Mock Test"
  if (paperTitle.length >= 55) {
    return paperTitle
  }
  if (paperTitle.length + fullSuffix.length <= 60) {
    return `${paperTitle}${fullSuffix}`
  }
  const candidateSuffixes = [
    " - Question Paper PDF & Mock Test",
    " - Question Paper PDF & Answer Key",
    " - Question Paper PDF",
    " - Question Paper",
    " - PYQ PDF",
  ]
  for (const s of candidateSuffixes) {
    if (paperTitle.length + s.length <= 60) {
      return `${paperTitle}${s}`
    }
  }
  return paperTitle
}

/**
 * Generates a concise factual description under 160 characters from stored fields only.
 */
export function buildPyqPaperDescription(paper: PyqPaperSeoInput, categoryName: string): string {
  const parts: string[] = []
  parts.push(`Download ${paper.title}`)
  if (paper.year) parts.push(`(${paper.year})`)
  if (paper.stage) parts.push(`for ${categoryName} ${paper.stage}`)
  else parts.push(`for ${categoryName}`)
  if (paper.subject) parts.push(`on ${paper.subject}.`)
  else parts.push(".")

  const facts: string[] = []
  if (paper.totalQuestions && paper.totalQuestions > 0) facts.push(`${paper.totalQuestions} questions`)
  if (paper.totalMarks && paper.totalMarks > 0) facts.push(`${paper.totalMarks} marks`)
  if (paper.durationMin && paper.durationMin > 0) facts.push(`${paper.durationMin} mins`)
  if (facts.length > 0) {
    parts.push(`Features ${facts.join(", ")}.`)
  }
  if (paper.accessType === "FREE") {
    parts.push("Free PDF download and practice test.")
  } else if (paper.isPassIncluded) {
    parts.push("Included with AspirantBook Pass.")
  }

  const full = parts.join(" ").replace(/\s+/g, " ").trim()
  return full.length > 158 ? `${full.slice(0, 155)}...` : full
}

/**
 * Thin-content guard: A paper is thin if it has NO sample preview questions
 * AND lacks both year and subject metadata. Thin papers are excluded from
 * the sitemap and emitted with robots noindex.
 */
export function isThinPyqPaper(paper: {
  year?: number | null
  subject?: string | null
  hasQuestions?: boolean
  totalQuestions?: number | null
  pageCount?: number | null
}): boolean {
  const hasYear = typeof paper.year === "number" && paper.year > 1900
  const hasSubject = Boolean(paper.subject && paper.subject.trim().length > 0)
  const hasQuestions = Boolean(paper.hasQuestions)
  return !hasQuestions && (!hasYear || !hasSubject)
}

/**
 * Builds standard SEO package for a PYQ paper detail page.
 */
export function adaptPyqPaperSeo(
  paper: PyqPaperSeoInput,
  category: PyqCategoryInfo,
  baseUrl?: string
): SharedSeoOutput {
  const base = getBaseUrl(baseUrl)
  const canonicalPath = `/pyqs/${category.slug}/${paper.slug}`
  const title = buildPyqPaperTitle(paper.title)
  const description = buildPyqPaperDescription(paper, category.name)
  const isPublished = paper.status === "PUBLISHED" || !paper.status
  const isThin = isThinPyqPaper(paper)
  const isIndexable = isPublished && !isThin

  const breadcrumbs = [
    { name: "Home", url: canonicalUrl("/", base) },
    { name: "Previous Year Papers", url: canonicalUrl("/pyqs", base) },
    { name: category.name, url: canonicalUrl(`/pyqs/${category.slug}`, base) },
    { name: paper.title, url: canonicalUrl(canonicalPath, base) },
  ]

  const breadcrumbJsonLd = buildBreadcrumbListJsonLd(breadcrumbs)
  const learningResourceJsonLd = buildLearningResourceJsonLd({
    name: paper.title,
    description,
    url: canonicalUrl(canonicalPath, base),
    learningResourceType: "QuestionPaper",
    educationalLevel: category.name,
    about: paper.subject || category.name,
    datePublished: paper.examDate ? new Date(paper.examDate).toISOString() : undefined,
    dateModified: paper.updatedAt ? new Date(paper.updatedAt).toISOString() : undefined,
    isAccessibleForFree: paper.accessType === "FREE",
    providerUrl: base || undefined,
  })

  return buildSeoPackage(
    {
      title,
      description,
      canonicalPath,
      titleAbsolute: true,
      isPublished,
      isIndexable,
      openGraph: {
        title,
        description,
        type: "article",
      },
      breadcrumbs,
      jsonLd: [breadcrumbJsonLd, learningResourceJsonLd],
    },
    base
  )
}
