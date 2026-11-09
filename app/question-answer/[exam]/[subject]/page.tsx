import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { unslugify, slugify, qaPath, topicHubPath } from "@/lib/modules/content-engine/paths"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Layers } from "lucide-react"
import { Metadata } from "next"

export const dynamic = "force-static"
export const revalidate = 3600

export async function generateStaticParams() {
  try {
    const pairs = await prisma.contentEngineQuestion.findMany({
      where: { isPublished: true, exam: { not: null }, sub: { not: null } },
      select: { exam: true, sub: true },
      distinct: ["exam", "sub"],
      take: 20,
    })
    return pairs.map((p) => ({
      exam: slugify(p.exam!),
      subject: slugify(p.sub!),
    }))
  } catch {
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ exam: string; subject: string }>
}): Promise<Metadata> {
  const { exam: examSlug, subject: yearOrSubject } = await params
  const examName = unslugify(examSlug)
  const isYear = /^(19[89]\d|20[0-3]\d)$/.test(yearOrSubject)
  const label = isYear ? yearOrSubject : unslugify(yearOrSubject)

  return {
    title: `${examName} ${label} Questions | AspirantBook`,
    description: `Practice ${examName} questions for ${label} with verified answer keys and complete explanations.`,
  }
}

export default async function ExamYearOrSubjectPage({
  params,
}: {
  params: Promise<{ exam: string; subject: string }>
}) {
  const { exam: examSlug, subject: yearOrSubject } = await params
  const examName = unslugify(examSlug)
  const isYear = /^(19[89]\d|20[0-3]\d)$/.test(yearOrSubject)

  if (isYear) {
    // Year Hub
    const questions = await prisma.contentEngineQuestion.findMany({
      where: {
        isPublished: true,
        slug: { not: null },
        exam: { equals: examName, mode: "insensitive" },
        year: yearOrSubject,
      },
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
      },
    })

    if (questions.length === 0) {
      notFound()
    }

    const realExamName = questions[0].exam || examName

    return (
      <div className="container mx-auto px-4 py-10 max-w-5xl space-y-8">
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            <Link href="/question-answer" className="hover:text-foreground">
              Home
            </Link>{" "}
            &gt;{" "}
            <Link href={`/question-answer/${slugify(realExamName)}`} className="hover:text-foreground">
              {realExamName}
            </Link>{" "}
            &gt; <span className="text-foreground">{yearOrSubject}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground">
            {realExamName} {yearOrSubject} Exam Questions
          </h1>
          <p className="text-sm text-muted-foreground">
            Official question paper questions from the {yearOrSubject} {realExamName} examination.
          </p>
        </div>

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
                </div>
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-relaxed">
                  {q.q}
                </p>
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  // Subject Hub
  const subjectName = unslugify(yearOrSubject)
  const [questions, topics] = await Promise.all([
    prisma.contentEngineQuestion.findMany({
      where: {
        isPublished: true,
        slug: { not: null },
        exam: { equals: examName, mode: "insensitive" },
        sub: { equals: subjectName, mode: "insensitive" },
      },
      take: 50,
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
      by: ["top"],
      where: {
        isPublished: true,
        exam: { equals: examName, mode: "insensitive" },
        sub: { equals: subjectName, mode: "insensitive" },
      },
      _count: { id: true },
    }),
  ])

  if (questions.length === 0 && topics.length === 0) {
    notFound()
  }

  const realExamName = questions[0]?.exam || examName
  const realSubjectName = questions[0]?.sub || subjectName

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl space-y-8">
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          <Link href="/question-answer" className="hover:text-foreground">
            Home
          </Link>{" "}
          &gt;{" "}
          <Link href={`/question-answer/${slugify(realExamName)}`} className="hover:text-foreground">
            {realExamName}
          </Link>{" "}
          &gt; <span className="text-foreground">{realSubjectName}</span>
        </div>
        <h1 className="text-3xl font-extrabold text-foreground">
          {realExamName}: {realSubjectName} Questions
        </h1>
        <p className="text-sm text-muted-foreground">
          Topic-wise question bank and solutions for {realSubjectName} in {realExamName}.
        </p>
      </div>

      {/* Topics */}
      {topics.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <span>Topics in {realSubjectName}</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {topics.filter((t) => Boolean(t.top)).map((t) => (
              <Link
                key={t.top!}
                href={topicHubPath("en", realExamName, realSubjectName, t.top!)}
                className="p-3 rounded-lg border border-border bg-card hover:border-primary/50 text-xs block transition-colors space-y-0.5"
              >
                <span className="font-semibold text-foreground block truncate">{t.top}</span>
                <span className="text-[10px] text-muted-foreground block">{t._count.id} MCQs</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Questions */}
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
    </div>
  )
}
