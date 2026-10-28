import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { unslugify, slugify, qaPath } from "@/lib/modules/content-engine/paths"
import { Badge } from "@/components/ui/badge"
import { Metadata } from "next"

export const dynamic = "force-static"
export const revalidate = 3600

export async function generateStaticParams() {
  return []
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ exam: string; subject: string; topic: string }>
}): Promise<Metadata> {
  const { exam: examSlug, subject: subSlug, topic: topSlug } = await params
  const exam = unslugify(examSlug)
  const subject = unslugify(subSlug)
  const topic = unslugify(topSlug)

  return {
    title: `${topic} Questions — ${exam} ${subject} | TrillionSkill`,
    description: `MCQs and detailed explanations on ${topic} for ${exam} ${subject} previous year examinations.`,
  }
}

export default async function TopicHubPage({
  params,
}: {
  params: Promise<{ exam: string; subject: string; topic: string }>
}) {
  const { exam: examSlug, subject: subSlug, topic: topSlug } = await params
  const exam = unslugify(examSlug)
  const subject = unslugify(subSlug)
  const topic = unslugify(topSlug)

  const questions = await prisma.contentEngineQuestion.findMany({
    where: {
      isPublished: true,
      slug: { not: null },
      exam: { equals: exam, mode: "insensitive" },
      sub: { equals: subject, mode: "insensitive" },
      top: { equals: topic, mode: "insensitive" },
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

  const realExam = questions[0].exam || exam
  const realSubject = questions[0].sub || subject
  const realTopic = questions[0].top || topic

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl space-y-8">
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          <Link href="/question-answer" className="hover:text-foreground">
            Home
          </Link>{" "}
          &gt;{" "}
          <Link href={`/question-answer/${slugify(realExam)}`} className="hover:text-foreground">
            {realExam}
          </Link>{" "}
          &gt;{" "}
          <Link
            href={`/question-answer/${slugify(realExam)}/${slugify(realSubject)}`}
            className="hover:text-foreground"
          >
            {realSubject}
          </Link>{" "}
          &gt; <span className="text-foreground">{realTopic}</span>
        </div>
        <h1 className="text-3xl font-extrabold text-foreground">
          {realTopic} ({realExam})
        </h1>
        <p className="text-sm text-muted-foreground">
          Topic collection of {questions.length} questions from {realExam} ({realSubject}).
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
