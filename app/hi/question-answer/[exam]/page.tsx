import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { unslugify, slugify, yearHubPath, qaPath } from "@/lib/modules/content-engine/paths"
import { getHindiSubject } from "@/lib/modules/content-engine/taxonomy"
import { Badge } from "@/components/ui/badge"
import { Calendar, Layers, BookOpen } from "lucide-react"
import { Metadata } from "next"

export const revalidate = 3600

export async function generateMetadata({
  params,
}: {
  params: Promise<{ exam: string }>
}): Promise<Metadata> {
  const { exam: examSlug } = await params
  const examName = unslugify(examSlug)
  return {
    title: `${examName} पिछले वर्षों के प्रश्नोत्तर (हिन्दी) | TrillionSkill`,
    description: `${examName} परीक्षा के प्रामाणिक पिछले वर्षों के प्रश्नोत्तर और विस्तृत हिन्दी व्याख्या।`,
  }
}

export default async function HindiExamHubPage({
  params,
}: {
  params: Promise<{ exam: string }>
}) {
  const { exam: examSlug } = await params
  const examName = unslugify(examSlug)

  const [questions, years] = await Promise.all([
    prisma.contentEngineQuestion.findMany({
      where: {
        isPublished: true,
        slug: { not: null },
        exam: { equals: examName, mode: "insensitive" },
        translations: { some: { lang: "hi", isReviewed: true } },
      },
      take: 20,
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        shortId: true,
        slug: true,
        q: true,
        sub: true,
        top: true,
        exam: true,
        year: true,
        translations: {
          where: { lang: "hi", isReviewed: true },
          select: { q: true, top: true },
        },
      },
    }),
    prisma.contentEngineQuestion.groupBy({
      by: ["year"],
      where: {
        isPublished: true,
        year: { not: null },
        exam: { equals: examName, mode: "insensitive" },
        translations: { some: { lang: "hi", isReviewed: true } },
      },
      _count: { id: true },
      orderBy: { year: "desc" },
    }),
  ])

  if (questions.length === 0 && years.length === 0) {
    notFound()
  }

  const realExamName = questions[0]?.exam || examName

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl space-y-10">
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          <Link href="/hi/question-answer" className="hover:text-foreground">
            मुख्य पृष्ठ
          </Link>{" "}
          &gt; <span className="text-foreground">{realExamName}</span>
        </div>
        <h1 className="text-3xl font-extrabold text-foreground">
          {realExamName} पिछले वर्षों के प्रश्नोत्तर
        </h1>
        <p className="text-sm text-muted-foreground">
          {realExamName} परीक्षा के पिछले वर्षों के सभी प्रश्न मानव-समीक्षित हिन्दी समाधान के साथ।
        </p>
      </div>

      {/* Years Grid */}
      {years.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span>वर्ष अनुसार देखें</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {years.map((y) => {
              if (!y.year) return null
              return (
                <Link
                  key={y.year}
                  href={yearHubPath("hi", realExamName, y.year)}
                  className="p-3 rounded-lg border border-border bg-card hover:border-primary/50 text-center space-y-0.5 block transition-colors"
                >
                  <span className="font-bold text-sm text-foreground block">{y.year}</span>
                  <span className="text-[11px] text-muted-foreground block">
                    {y._count.id} प्रश्न
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Questions List */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <span>सभी प्रश्नोत्तर</span>
        </h2>
        <div className="space-y-3">
          {questions.map((q) => {
            if (!q.slug || !q.exam) return null
            const hiTr = q.translations[0]
            if (!hiTr) return null
            const url = qaPath("hi", q.exam, q.sub, q.slug)

            return (
              <Link
                key={q.id}
                href={url}
                className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors block space-y-2 group"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {getHindiSubject(q.sub || "Uncategorized")}
                  </Badge>
                  {hiTr.top && (
                    <Badge variant="outline" className="text-xs">
                      {hiTr.top}
                    </Badge>
                  )}
                  {q.year && (
                    <Badge variant="outline" className="text-xs">
                      {q.year}
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-relaxed">
                  {hiTr.q}
                </p>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
