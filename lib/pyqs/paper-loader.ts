import { prisma } from "@/lib/prisma"

export class PyqPaperDetailUnavailableError extends Error {
  readonly code = "PYQ_PAPER_DETAIL_UNAVAILABLE"

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = "PyqPaperDetailUnavailableError"
  }
}

export function isBuildTimePrerender(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build"
}

export interface PreviewQuestion {
  id: string
  questionEn: string
  questionHi?: string | null
  optionAEn?: string | null
  optionBEn?: string | null
  optionCEn?: string | null
  optionDEn?: string | null
  correctOption?: string | null
  explanationEn?: string | null
}

export interface RelatedPaperItem {
  id: string
  title: string
  slug: string
  year: number
  stage: string
  accessType: string
  categorySlug: string
}

export interface PyqPaperDetailData {
  id: string
  slug: string
  title: string
  year: number
  stage: string
  shift: string | null
  examDate: Date | null
  subject: string | null
  durationMin: number
  totalMarks: number
  totalQuestions: number
  languages: string[]
  pageCount: number | null
  pdfFileSizeKb: number | null
  accessType: string
  unlockPrice: number
  isPassIncluded: boolean
  hasCbtMode: boolean
  cbtTestId: string | null
  downloadCount: number
  attemptCount: number
  previewPercentage: number
  status: string
  updatedAt: Date
  category: {
    id: string
    name: string
    slug: string
  }
  subExam?: {
    id: string
    name: string
    slug: string
  } | null
  previewQuestions: PreviewQuestion[]
  relatedPapers: RelatedPaperItem[]
}

export async function loadPyqPaperForDetail(
  examId: string,
  slug: string
): Promise<PyqPaperDetailData | null> {
  try {
    const category = await prisma.pyqCategory.findFirst({
      where: {
        isPublished: true,
        OR: [
          { slug: examId.toLowerCase() },
          { id: examId },
          { name: { equals: examId, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, slug: true },
    })

    if (!category) {
      return null
    }

    const paper = await prisma.pyqPaper.findFirst({
      where: {
        slug: slug.toLowerCase(),
        categoryId: category.id,
        status: "PUBLISHED",
      },
      include: {
        subExam: {
          select: { id: true, name: true, slug: true },
        },
      },
    })

    if (!paper) {
      return null
    }

    const isFree = paper.accessType === "FREE"
    let previewQuestions: PreviewQuestion[] = []

    if (paper.cbtTestId) {
      try {
        const pct = Math.max(5, Math.min(paper.previewPercentage || 20, 50))
        const maxQuestions = Math.min(10, Math.max(1, Math.round((paper.totalQuestions * pct) / 100)))

        const questions = await prisma.examQuestion.findMany({
          where: {
            section: {
              testId: paper.cbtTestId,
            },
          },
          orderBy: { order: "asc" },
          take: maxQuestions,
          select: {
            id: true,
            questionEn: true,
            questionHi: true,
            optionAEn: true,
            optionBEn: true,
            optionCEn: true,
            optionDEn: true,
            ...(isFree ? { correctOption: true, explanationEn: true } : {}),
          },
        })

        previewQuestions = questions.map((q) => ({
          id: q.id,
          questionEn: q.questionEn,
          questionHi: q.questionHi,
          optionAEn: q.optionAEn,
          optionBEn: q.optionBEn,
          optionCEn: q.optionCEn,
          optionDEn: q.optionDEn,
          ...(isFree ? { correctOption: q.correctOption, explanationEn: q.explanationEn } : {}),
        }))
      } catch (err) {
        console.warn("[pyq-paper] failed to load sample questions for CBT", err)
      }
    }

    // Query related papers: same category, different slug
    let relatedPapers: RelatedPaperItem[] = []
    try {
      const related = await prisma.pyqPaper.findMany({
        where: {
          categoryId: category.id,
          status: "PUBLISHED",
          slug: { not: paper.slug },
        },
        orderBy: [{ year: "desc" }, { createdAt: "desc" }],
        take: 6,
        select: {
          id: true,
          title: true,
          slug: true,
          year: true,
          stage: true,
          accessType: true,
        },
      })

      relatedPapers = related.map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        year: r.year,
        stage: r.stage,
        accessType: r.accessType,
        categorySlug: category.slug,
      }))
    } catch {
      // Non-critical
    }

    return {
      id: paper.id,
      slug: paper.slug,
      title: paper.title,
      year: paper.year,
      stage: paper.stage,
      shift: paper.shift,
      examDate: paper.examDate,
      subject: paper.subject,
      durationMin: paper.durationMin,
      totalMarks: paper.totalMarks,
      totalQuestions: paper.totalQuestions,
      languages: paper.languages,
      pageCount: paper.pageCount,
      pdfFileSizeKb: paper.pdfFileSizeKb,
      accessType: paper.accessType,
      unlockPrice: paper.unlockPrice,
      isPassIncluded: paper.isPassIncluded,
      hasCbtMode: paper.hasCbtMode,
      cbtTestId: paper.cbtTestId,
      downloadCount: paper.downloadCount,
      attemptCount: paper.attemptCount,
      previewPercentage: paper.previewPercentage,
      status: paper.status,
      updatedAt: paper.updatedAt,
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
      },
      subExam: paper.subExam,
      previewQuestions,
      relatedPapers,
    }
  } catch (error) {
    if (isBuildTimePrerender()) {
      console.error(`[pyq-paper] DB offline during build for ${examId}/${slug}, skipping prerender.`)
      return null
    }
    throw new PyqPaperDetailUnavailableError(
      `Failed to load PYQ paper ${examId}/${slug}; keeping last good page.`,
      { cause: error }
    )
  }
}
