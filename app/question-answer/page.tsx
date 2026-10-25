import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { slugify, examHubPath, subjectHubPath, qaPath } from "@/lib/modules/content-engine/paths"
import { Badge } from "@/components/ui/badge"
import { BookOpen, GraduationCap, ArrowRight, Layers } from "lucide-react"
import { Metadata } from "next"

export const revalidate = 3600 // 1 hour cache

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://aspirantbook.com"

export const metadata: Metadata = {
  title: "Competitive Exam Previous Year Questions (PYQs) | TrillionSkill",
  description:
    "Explore authentic previous year questions, answer keys, and detailed solutions for UPSC CSE, BPSC, UPPCS, RAS, and SSC CGL.",
  alternates: {
    canonical: `${BASE_URL}/question-answer`,
    languages: {
      en: `${BASE_URL}/question-answer`,
      hi: `${BASE_URL}/hi/question-answer`,
      "x-default": `${BASE_URL}/question-answer`,
    },
  },
}

export default async function QuestionAnswerHomePage() {
  const [exams, subjects, recent] = await Promise.all([
    prisma.contentEngineQuestion.groupBy({
      by: ["exam"],
      where: { isPublished: true, exam: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.contentEngineQuestion.groupBy({
      by: ["sub"],
      where: { isPublished: true },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.contentEngineQuestion.findMany({
      where: { isPublished: true, slug: { not: null }, exam: { not: null } },
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
      },
    }),
  ])

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl space-y-12">
      {/* Hero Header */}
      <div className="space-y-3 text-center sm:text-left">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Previous Year Exam Questions
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
          Master competitive examinations with verified questions, official answer keys, and structured solutions categorized by subject and year.
        </p>
      </div>

      {/* Exams Grid */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          <span>Browse by Examination</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {exams.map((e) => {
            if (!e.exam) return null
            return (
              <Link
                key={e.exam}
                href={examHubPath("en", e.exam)}
                className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors space-y-1 block group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                    {e.exam}
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </div>
                <span className="text-xs text-muted-foreground block">
                  {e._count.id} Question{e._count.id === 1 ? "" : "s"}
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
          <span>Browse by Subject</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {subjects.map((s) => (
            <div
              key={s.sub}
              className="p-4 rounded-xl border border-border bg-card space-y-1 block"
            >
              <span className="font-semibold text-foreground text-sm block">
                {s.sub}
              </span>
              <span className="text-xs text-muted-foreground block">
                {s._count.id} Question{s._count.id === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Questions List */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <span>Recent Questions</span>
        </h2>

        <div className="space-y-3">
          {recent.map((q) => {
            if (!q.slug || !q.exam) return null
            const url = qaPath("en", q.exam, q.sub, q.slug)
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
                    {q.sub}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {q.top}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-relaxed">
                  {q.q}
                </p>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
