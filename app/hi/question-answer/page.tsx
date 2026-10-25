import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { slugify, examHubPath, qaPath } from "@/lib/modules/content-engine/paths"
import { getHindiSubject } from "@/lib/modules/content-engine/taxonomy"
import { Badge } from "@/components/ui/badge"
import { BookOpen, GraduationCap, ArrowRight, Layers } from "lucide-react"
import { Metadata } from "next"

export const revalidate = 3600 // 1 hour cache

export const metadata: Metadata = {
  title: "प्रतियोगी परीक्षा पिछले वर्ष के प्रश्नोत्तर (PYQs) | TrillionSkill हिन्दी",
  description:
    "यूपीएससी, बीपीएससी, यूपीपीसीएस, आरएएस और एसएससी परीक्षाओं के प्रामाणिक पिछले वर्षों के प्रश्नोत्तर और विस्तृत हिन्दी समाधान।",
  alternates: {
    canonical: "https://aspirantbook.com/hi/question-answer",
    languages: {
      en: "https://aspirantbook.com/question-answer",
      hi: "https://aspirantbook.com/hi/question-answer",
      "x-default": "https://aspirantbook.com/question-answer",
    },
  },
}

export default async function HindiQuestionAnswerHomePage() {
  const [exams, subjects, recent] = await Promise.all([
    prisma.contentEngineQuestion.groupBy({
      by: ["exam"],
      where: {
        isPublished: true,
        exam: { not: null },
        translations: { some: { lang: "hi", isReviewed: true } },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.contentEngineQuestion.groupBy({
      by: ["sub"],
      where: {
        isPublished: true,
        translations: { some: { lang: "hi", isReviewed: true } },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.contentEngineQuestion.findMany({
      where: {
        isPublished: true,
        slug: { not: null },
        exam: { not: null },
        translations: { some: { lang: "hi", isReviewed: true } },
      },
      take: 12,
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
  ])

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl space-y-12">
      {/* Hero Header */}
      <div className="space-y-3 text-center sm:text-left">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          पिछले वर्षों के परीक्षा प्रश्नोत्तर (हिन्दी)
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
          मानव-समीक्षित प्रामाणिक हिन्दी प्रश्नोत्तर, उत्तर कुंजी और विस्तृत व्याख्या सहित।
        </p>
      </div>

      {/* Exams Grid */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          <span>परीक्षा अनुसार देखें</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {exams.map((e) => {
            if (!e.exam) return null
            return (
              <Link
                key={e.exam}
                href={examHubPath("hi", e.exam)}
                className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors space-y-1 block group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                    {e.exam}
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </div>
                <span className="text-xs text-muted-foreground block">
                  {e._count.id} प्रश्न
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Subjects Grid */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <span>विषय अनुसार देखें</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {subjects.map((s) => (
            <div
              key={s.sub}
              className="p-4 rounded-xl border border-border bg-card space-y-1 block"
            >
              <span className="font-semibold text-foreground text-sm block">
                {getHindiSubject(s.sub || "Uncategorized")}
              </span>
              <span className="text-xs text-muted-foreground block">
                {s._count.id} प्रश्न
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Questions List */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <span>हालिया प्रश्न</span>
        </h2>

        <div className="space-y-3">
          {recent.map((q) => {
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
                  <Badge variant="default" className="text-xs bg-primary/80">
                    {q.exam} {q.year || ""}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {getHindiSubject(q.sub || "Uncategorized")}
                  </Badge>
                  {hiTr.top && (
                    <Badge variant="outline" className="text-xs">
                      {hiTr.top}
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
