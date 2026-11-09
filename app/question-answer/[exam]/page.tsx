import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { unslugify, slugify, yearHubPath, qaPath } from "@/lib/modules/content-engine/paths"
import { Badge } from "@/components/ui/badge"
import { Calendar, Layers, BookOpen, ArrowRight } from "lucide-react"
import { Metadata } from "next"

export const dynamic = "force-static"
export const revalidate = 3600

export async function generateStaticParams() {
  try {
    const exams = await prisma.contentEngineQuestion.groupBy({
      by: ["exam"],
      where: { isPublished: true, exam: { not: null } },
    })
    return exams.filter((e) => Boolean(e.exam)).map((e) => ({ exam: slugify(e.exam!) }))
  } catch {
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ exam: string }>
}): Promise<Metadata> {
  const { exam: examSlug } = await params
  const examName = unslugify(examSlug)
  return {
    title: `${examName} Previous Year Questions (PYQs) | AspirantBook`,
    description: `Complete archive of ${examName} previous year exam questions with verified solutions, answer keys, and year-wise breakdown.`,
  }
}

export default async function ExamHubPage({
  params,
}: {
  params: Promise<{ exam: string }>
}) {
  const { exam: examSlug } = await params
  const examName = unslugify(examSlug)

  const [questions, years, subjects] = await Promise.all([
    prisma.contentEngineQuestion.findMany({
      where: {
        isPublished: true,
        slug: { not: null },
        exam: { equals: examName, mode: "insensitive" },
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
      },
    }),
    prisma.contentEngineQuestion.groupBy({
      by: ["year"],
      where: {
        isPublished: true,
        year: { not: null },
        exam: { equals: examName, mode: "insensitive" },
      },
      _count: { id: true },
      orderBy: { year: "desc" },
    }),
    prisma.contentEngineQuestion.groupBy({
      by: ["sub"],
      where: {
        isPublished: true,
        exam: { equals: examName, mode: "insensitive" },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
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
          <Link href="/question-answer" className="hover:text-foreground">
            Home
          </Link>{" "}
          &gt; <span className="text-foreground">{realExamName}</span>
        </div>
        <h1 className="text-3xl font-extrabold text-foreground">
          {realExamName} Previous Year Questions
        </h1>
        <p className="text-sm text-muted-foreground">
          Browse all official questions from {realExamName} papers with subject categorization and detailed explanations.
        </p>
      </div>

      {/* Years Grid */}
      {years.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span>Select Examination Year</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {years.map((y) => {
              if (!y.year) return null
              return (
                <Link
                  key={y.year}
                  href={yearHubPath("en", realExamName, y.year)}
                  className="p-3 rounded-lg border border-border bg-card hover:border-primary/50 text-center space-y-0.5 block transition-colors"
                >
                  <span className="font-bold text-sm text-foreground block">{y.year}</span>
                  <span className="text-[11px] text-muted-foreground block">
                    {y._count.id} MCQs
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Subjects Grid */}
      {subjects.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <span>Subjects in {realExamName}</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {subjects.map((s) => (
              <div
                key={s.sub}
                className="p-3.5 rounded-lg border border-border bg-card space-y-1"
              >
                <span className="font-semibold text-xs text-foreground block">{s.sub}</span>
                <span className="text-[11px] text-muted-foreground block">
                  {s._count.id} Questions
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Questions List */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <span>All Questions</span>
        </h2>
        <div className="space-y-3">
          {questions.map((q) => {
            if (!q.slug || !q.exam) return null
            const url = qaPath("en", q.exam, q.sub, q.slug)
            return (
              <Link
                key={q.id}
                href={url}
                className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors block space-y-2 group"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {q.sub}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {q.top}
                  </Badge>
                  {q.year && (
                    <Badge variant="outline" className="text-xs">
                      {q.year}
                    </Badge>
                  )}
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
