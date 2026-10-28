import {
  buildMetadata,
  buildSeoPackage,
  buildQuizJsonLd,
  canonicalUrl,
  getBaseUrl,
} from "../core"
import type { SharedSeoOutput } from "../types"

export function adaptCurrentAffairsCatalogSeo(baseUrl?: string): SharedSeoOutput {
  const canonicalPath = "/current-affairs-quizzes"
  const title = "Daily Current Affairs Quizzes | aspirantbook"
  const description =
    "Test your daily current affairs knowledge with high-yield MCQ speed quizzes for UPSC, BPSC, SSC, and state exams."

  return buildSeoPackage(
    {
      title,
      description,
      canonicalPath,
      isPublished: true,
      breadcrumbs: [
        { name: "Home", url: canonicalUrl("/", baseUrl) },
        {
          name: "Current Affairs Quizzes",
          url: canonicalUrl(canonicalPath, baseUrl),
        },
      ],
    },
    baseUrl
  )
}

export function adaptCurrentAffairsQuizSeo(
  quiz: {
    id: string
    title: string
    totalQuestions?: number
    durationMinutes?: number
    isPublished?: boolean
  },
  canonicalSlug: string,
  baseUrl?: string
): SharedSeoOutput {
  const cleanBase = getBaseUrl(baseUrl)
  const canonicalPath = `/current-affairs-quizzes/${canonicalSlug}`
  const totalQuestions = quiz.totalQuestions || 10
  const durationMinutes = quiz.durationMinutes || 10

  const title = `${quiz.title} - Current Affairs Quiz | aspirantbook`
  const description = `Practice ${quiz.title} with ${totalQuestions} questions in ${durationMinutes} minutes. Instant evaluation and detailed explanations.`

  const quizJsonLd = buildQuizJsonLd({
    name: quiz.title,
    description: `Current affairs speed quiz with ${totalQuestions} questions and ${durationMinutes} minutes timer.`,
    timeRequired: `PT${durationMinutes}M`,
    educationalLevel: "Competitive Examination (UPSC, BPSC, SSC)",
    url: canonicalUrl(canonicalPath, cleanBase),
    provider: {
      name: "aspirantbook",
      url: cleanBase,
    },
  })

  return buildSeoPackage(
    {
      title,
      description,
      canonicalPath,
      isPublished: quiz.isPublished ?? true,
      openGraph: {
        title: `${quiz.title} - Daily Current Affairs Speed Test`,
        description: `Test your knowledge with ${totalQuestions} high-yield Current Affairs questions for competitive examinations.`,
      },
      breadcrumbs: [
        { name: "Home", url: canonicalUrl("/", cleanBase) },
        {
          name: "Current Affairs Quizzes",
          url: canonicalUrl("/current-affairs-quizzes", cleanBase),
        },
        { name: quiz.title, url: canonicalUrl(canonicalPath, cleanBase) },
      ],
      jsonLd: [quizJsonLd],
    },
    cleanBase
  )
}
