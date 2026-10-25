import { prisma } from "@/lib/prisma"
import { ContentEngineHeader } from "@/components/admin/content-engine/ContentEngineHeader"
import { ContentEngineLibraryClient } from "@/components/admin/content-engine/ContentEngineLibraryClient"

export const dynamic = "force-dynamic"

export default async function ContentEngineLibraryPage() {
  // Aggregate high-level stats
  const [
    totalCount,
    publishedCount,
    hindiCount,
    reviewedCount,
    uncategorizedCount,
    questions,
  ] = await Promise.all([
    prisma.contentEngineQuestion.count(),
    prisma.contentEngineQuestion.count({ where: { isPublished: true } }),
    prisma.contentEngineTranslation.count({ where: { lang: "hi" } }),
    prisma.contentEngineTranslation.count({ where: { lang: "hi", isReviewed: true } }),
    prisma.contentEngineQuestion.count({
      where: {
        OR: [{ sub: "Uncategorized" }, { top: "General" }],
      },
    }),
    prisma.contentEngineQuestion.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        translations: true,
      },
    }),
  ])

  // Detect topics with 3+ questions that have sub == "Uncategorized"
  const uncatByTopic = await prisma.contentEngineQuestion.groupBy({
    by: ["top"],
    where: { sub: "Uncategorized", top: { not: "General" } },
    _count: { id: true },
    having: { id: { _count: { gte: 3 } } },
  })

  const topicWarnings = uncatByTopic.map((item) => ({
    topic: item.top,
    count: item._count.id,
  }))

  const initialItems = questions.map((q) => ({
    id: q.id,
    shortId: q.shortId,
    slug: q.slug,
    q: q.q,
    options: q.options as string[],
    answer: q.answer,
    answerIndex: q.answerIndex,
    explanation: q.explanation,
    sub: q.sub,
    top: q.top,
    exam: q.exam,
    year: q.year,
    status: q.status,
    isPublished: q.isPublished,
    isVerified: q.isVerified,
    isInferred: q.isInferred,
    sourceTag: q.sourceTag,
    translations: q.translations.map((t) => ({
      id: t.id,
      lang: t.lang,
      q: t.q,
      options: t.options as string[],
      explanation: t.explanation,
      top: t.top,
      isReviewed: t.isReviewed,
    })),
  }))

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <ContentEngineHeader
        title="Content Engine Library"
        description="Filter, review, verify, and inspect multilingual question repository."
      />

      <ContentEngineLibraryClient
        initialItems={initialItems}
        stats={{
          total: totalCount,
          published: publishedCount,
          hindi: hindiCount,
          reviewed: reviewedCount,
          uncategorized: uncategorizedCount,
        }}
        topicWarnings={topicWarnings}
      />
    </div>
  )
}
