import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { unslugify, slugify, qaPath, topicHubPath } from "@/lib/modules/content-engine/paths"
import { getHindiSubject } from "@/lib/modules/content-engine/taxonomy"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Layers } from "lucide-react"
import { Metadata } from "next"

export const revalidate = 3600

export async function generateMetadata({
  params,
}: {
  params: Promise<{ exam: string; yearOrSubject: string }>
}): Promise<Metadata> {
  const { exam: examSlug, yearOrSubject } = await params
  const examName = unslugify(examSlug)
  const isYear = /^\d{4}$/.test(yearOrSubject)
  const label = isYear ? yearOrSubject : unslugify(yearOrSubject)

  return {
    title: `${examName} ${label} प्रश्नोत्तर (हिन्दी) | TrillionSkill`,
    description: `${examName} परीक्षा के ${label} विषय पर आधारित पिछले वर्षों के प्रश्न और हिन्दी समाधान।`,
  }
}

export default async function HindiExamYearOrSubjectPage({
  params,
}: {
  params: Promise<{ exam: string; yearOrSubject: string }>
}) {
  const { exam: examSlug, yearOrSubject } = await params
  const examName = unslugify(examSlug)
  const isYear = /^\d{4}$/.test(yearOrSubject)

  const whereClause: any = {
    isPublished: true,
    slug: { not: null },
    exam: { equals: examName, mode: "insensitive" },
    translations: { some: { lang: "hi", isReviewed: true } },
  }

  if (isYear) {
    whereClause.year = yearOrSubject
  } else {
    whereClause.sub = { equals: unslugify(yearOrSubject), mode: "insensitive" }
  }

  const questions = await prisma.contentEngineQuestion.findMany({
    where: whereClause,
    take: 50,
    orderBy: { createdAt: "asc" },
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
  })

  if (questions.length === 0) {
    notFound()
  }

  const realExamName = questions[0].exam || examName
  const titleLabel = isYear ? `${yearOrSubject}` : getHindiSubject(questions[0].sub)

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl space-y-8">
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          <Link href="/hi/question-answer" className="hover:text-foreground">
            मुख्य पृष्ठ
          </Link>{" "}
          &gt;{" "}
          <Link href={`/hi/question-answer/${slugify(realExamName)}`} className="hover:text-foreground">
            {realExamName}
          </Link>{" "}
          &gt; <span className="text-foreground">{titleLabel}</span>
        </div>
        <h1 className="text-3xl font-extrabold text-foreground">
          {realExamName}: {titleLabel} प्रश्नोत्तर
        </h1>
        <p className="text-sm text-muted-foreground">
          मानव-समीक्षित हिन्दी प्रश्नोत्तर और प्रामाणिक उत्तर कुंजी।
        </p>
      </div>

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
                  {getHindiSubject(q.sub)}
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
    </div>
  )
}
