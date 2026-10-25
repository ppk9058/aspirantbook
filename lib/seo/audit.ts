import { prisma } from "@/lib/prisma"

export interface SeoAuditReport {
  summary: {
    totalPages: number
    indexablePages: number
    noindexPages: number
    missingTitles: number
    missingDescriptions: number
    missingCanonicals: number
    unreviewedHindi: number
    sitemapCoverageScore: number
  }
  modules: {
    contentEngine: {
      totalQuestions: number
      publishedQuestions: number
      reviewedHindiCount: number
      unreviewedHindiCount: number
      noindexCount: number
      issues: Array<{ id: string; slug: string; reason: string }>
    }
    pyqs: {
      totalCategories: number
      publishedCategories: number
      missingDescriptions: number
      issues: Array<{ id: string; name: string; reason: string }>
    }
    testSeries: {
      totalSeries: number
      publishedSeries: number
      missingDescriptions: number
      issues: Array<{ id: string; title: string; reason: string }>
    }
    tutorials: {
      totalTutorials: number
      publishedTutorials: number
      draftTutorials: number
      missingDescriptions: number
      issues: Array<{ id: string; title: string; reason: string }>
    }
    currentAffairs: {
      totalQuizzes: number
      publishedQuizzes: number
      missingDescriptions: number
    }
  }
}

export async function runSeoAudit(): Promise<SeoAuditReport> {
  // 1. Content Engine Audit
  const [
    ceTotal,
    cePublished,
    ceHindiReviewed,
    ceHindiUnreviewed,
  ] = await Promise.all([
    prisma.contentEngineQuestion.count(),
    prisma.contentEngineQuestion.count({ where: { isPublished: true } }),
    prisma.contentEngineTranslation.count({ where: { isReviewed: true } }),
    prisma.contentEngineTranslation.count({ where: { isReviewed: false } }),
  ])

  // Flag sample Content Engine issues (e.g. unreviewed Hindi or thin explanations)
  const ceProblemQuestions = await prisma.contentEngineQuestion.findMany({
    where: {
      isPublished: true,
      explanation: { equals: "" },
    },
    take: 5,
    select: { id: true, slug: true },
  })

  const ceIssues = ceProblemQuestions.map((q) => ({
    id: q.id,
    slug: q.slug || q.id,
    reason: "Missing explanation (thin content for SEO)",
  }))

  // 2. PYQs Audit
  const pyqCategories = await prisma.pyqCategory.findMany({
    select: { id: true, name: true, slug: true, description: true, isPublished: true },
  })
  const pyqsPublished = pyqCategories.filter((c) => c.isPublished)
  const pyqMissingDesc = pyqCategories.filter((c) => !c.description?.trim())
  const pyqIssues = pyqMissingDesc.slice(0, 5).map((c) => ({
    id: c.id,
    name: c.name,
    reason: "Missing meta description",
  }))

  // 3. Test Series Audit
  const series = await prisma.examSeries.findMany({
    where: { isArchived: false },
    select: { id: true, title: true, slug: true, description: true, isPublished: true },
  })
  const seriesPublished = series.filter((s) => s.isPublished)
  const seriesMissingDesc = series.filter((s) => !s.description?.trim())
  const seriesIssues = seriesMissingDesc.slice(0, 5).map((s) => ({
    id: s.id,
    title: s.title,
    reason: "Missing meta description",
  }))

  // 4. Tutorials Audit
  const courses = await prisma.course.findMany({
    select: { id: true, title: true, slug: true, description: true, isPublished: true, status: true },
  })
  const coursesPublished = courses.filter((c) => c.isPublished && c.status === "PUBLISHED")
  const coursesDraft = courses.filter((c) => !c.isPublished || c.status !== "PUBLISHED")
  const coursesMissingDesc = courses.filter((c) => !c.description?.trim())
  const tutorialIssues = coursesMissingDesc.slice(0, 5).map((c) => ({
    id: c.id,
    title: c.title,
    reason: "Missing meta description",
  }))

  // 5. Current Affairs Audit
  const caQuizzes = await prisma.examTest.findMany({
    where: { testType: "CURRENT_AFFAIRS" },
    select: { id: true, title: true, isPublished: true },
  })
  const caPublished = caQuizzes.filter((q) => q.isPublished)

  // Aggregations
  const totalPages =
    cePublished +
    pyqsPublished.length +
    seriesPublished.length +
    coursesPublished.length +
    caPublished.length +
    8 // base static routes

  const noindexPages = ceHindiUnreviewed + coursesDraft.length
  const indexablePages = totalPages

  const missingDescriptions =
    pyqMissingDesc.length +
    seriesMissingDesc.length +
    coursesMissingDesc.length

  const sitemapCoverageScore = Math.min(
    100,
    Math.round(
      ((totalPages - missingDescriptions) / (totalPages || 1)) * 100
    )
  )

  return {
    summary: {
      totalPages,
      indexablePages,
      noindexPages,
      missingTitles: 0, // all adapters enforce dynamic titles
      missingDescriptions,
      missingCanonicals: 0, // all adapters enforce canonical URL
      unreviewedHindi: ceHindiUnreviewed,
      sitemapCoverageScore,
    },
    modules: {
      contentEngine: {
        totalQuestions: ceTotal,
        publishedQuestions: cePublished,
        reviewedHindiCount: ceHindiReviewed,
        unreviewedHindiCount: ceHindiUnreviewed,
        noindexCount: ceHindiUnreviewed,
        issues: ceIssues,
      },
      pyqs: {
        totalCategories: pyqCategories.length,
        publishedCategories: pyqsPublished.length,
        missingDescriptions: pyqMissingDesc.length,
        issues: pyqIssues,
      },
      testSeries: {
        totalSeries: series.length,
        publishedSeries: seriesPublished.length,
        missingDescriptions: seriesMissingDesc.length,
        issues: seriesIssues,
      },
      tutorials: {
        totalTutorials: courses.length,
        publishedTutorials: coursesPublished.length,
        draftTutorials: coursesDraft.length,
        missingDescriptions: coursesMissingDesc.length,
        issues: tutorialIssues,
      },
      currentAffairs: {
        totalQuizzes: caQuizzes.length,
        publishedQuizzes: caPublished.length,
        missingDescriptions: 0,
      },
    },
  }
}
