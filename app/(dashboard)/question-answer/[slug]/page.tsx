import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { escapeHtml } from "@/lib/pyq/render"
import { findRelevantSeries } from "@/lib/pyq/series-match"
import { SolutionBlocks } from "@/components/pyq/SolutionBlocks"
import { QuestionActions } from "@/components/pyq/QuestionActions"
import { PassBanner } from "@/components/test-series/PassBanner"
import { ChevronRight, ChevronLeft, CalendarDays, Zap, Link2 } from "lucide-react"

export const dynamic = "force-dynamic"

const BASE = "/question-answer"
const LETTERS = ["A", "B", "C", "D", "E"]

const pubWhere = { status: "PUBLISHED", isPublished: true } as const

async function loadQuestion(param: string) {
  const decoded = decodeURIComponent(param)
  return prisma.contentEngineQuestion.findFirst({
    where: {
      OR: [{ slug: decoded }, { shortId: decoded }],
      ...pubWhere,
    },
    select: {
      id: true,
      shortId: true,
      slug: true,
      q: true,
      options: true,
      answer: true,
      answerIndex: true,
      solution: true,
      sub: true,
      top: true,
      exam: true,
      year: true,
      publishedAt: true,
    },
  })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const question = await loadQuestion(slug)
  if (!question) {
    return { title: "Question not found | TrillionSkill", robots: { index: false, follow: false } }
  }
  const title = question.q.length > 70 ? `${question.q.slice(0, 67)}...` : question.q
  return {
    title: `${title} | Question Answer | TrillionSkill`,
    description: `Detailed solution with correct answer, key points and option analysis${question.exam ? ` — asked in ${question.exam}${question.year ? ` ${question.year}` : ""}` : ""}.`,
    alternates: { canonical: `${BASE}/${encodeURIComponent(question.slug || question.shortId)}` },
  }
}

function correctOptionIndex(
  options: unknown,
  answer: string,
  answerIndex: number,
): number {
  const opts = Array.isArray(options) ? (options as string[]) : []
  const byText = opts.findIndex((o) => o === answer)
  if (byText >= 0) return byText
  // answerIndex is 1-based in Format v1; tolerate legacy 0-based rows.
  if (answerIndex >= 1 && answerIndex <= opts.length) return answerIndex - 1
  if (answerIndex >= 0 && answerIndex < opts.length) return answerIndex
  return -1
}

export default async function QuestionAnswerDetail({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const question = await loadQuestion(slug)
  if (!question) notFound()

  const opts = Array.isArray(question.options) ? (question.options as string[]) : []
  const correctIdx = correctOptionIndex(opts, question.answer, question.answerIndex)
  const answerLetter = correctIdx >= 0 ? LETTERS[correctIdx] : null

  const [series, related] = await Promise.all([
    findRelevantSeries(question.exam),
    question.top
      ? prisma.contentEngineQuestion.findMany({
          where: {
            ...pubWhere,
            id: { not: question.id },
            top: question.top,
          },
          orderBy: { createdAt: "desc" },
          take: 4,
          select: { id: true, shortId: true, slug: true, q: true },
        })
      : Promise.resolve([]),
  ])

  const detailHref = (s: string) => `${BASE}/${encodeURIComponent(s)}`

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
        <ol className="flex flex-wrap items-center gap-1 min-w-0">
          <li>
            <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400">Home</Link>
          </li>
          <li aria-hidden="true"><ChevronRight className="h-3 w-3" /></li>
          <li>
            <Link href={BASE} className="text-sky-600 dark:text-sky-400 hover:underline">Question Answers</Link>
          </li>
          {question.sub && (
            <>
              <li aria-hidden="true"><ChevronRight className="h-3 w-3" /></li>
              <li>
                <Link href={`${BASE}?subject=${encodeURIComponent(question.sub)}`} className="text-sky-600 dark:text-sky-400 hover:underline">
                  {escapeHtml(question.sub)}
                </Link>
              </li>
            </>
          )}
          {question.top && (
            <>
              <li aria-hidden="true"><ChevronRight className="h-3 w-3" /></li>
              <li className="text-gray-700 dark:text-gray-300 truncate max-w-[180px] sm:max-w-xs">{escapeHtml(question.top)}</li>
            </>
          )}
        </ol>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main column */}
        <div className="lg:col-span-8 min-w-0 space-y-5">
          {/* Question card (pic2) */}
          <article className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#071d33] p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
              <h1 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">Question</h1>
              <QuestionActions />
            </div>

            <div className="pt-4 space-y-4">
              <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white leading-relaxed whitespace-pre-line">
                {question.q}
              </p>

              {opts.length > 0 && (
                <ul className="space-y-2" role="list">
                  {opts.map((opt, i) => {
                    const isCorrect = i === correctIdx
                    return (
                      <li
                        key={i}
                        className={`rounded-xl border px-3 py-2.5 text-sm sm:text-[15px] leading-relaxed ${
                          isCorrect
                            ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/25 text-emerald-900 dark:text-emerald-100"
                            : "border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200"
                        }`}
                      >
                        <strong className="mr-2" aria-hidden="true">({LETTERS[i]})</strong>
                        {opt}
                      </li>
                    )
                  })}
                </ul>
              )}

              {/* Previously asked in (pic2) */}
              {(question.exam || question.year) && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.03] p-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">This question was previously asked in</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {escapeHtml(question.exam || "")}{question.year ? ` ${escapeHtml(question.year)}` : ""}
                    </p>
                  </div>
                  {series && (
                    <Link
                      href={`/test-series/${series.slug}`}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-xl text-sm font-bold text-gray-900 dark:text-white bg-sky-300 dark:bg-sky-700 hover:bg-sky-400 dark:hover:bg-sky-600 transition-colors"
                    >
                      <Zap className="h-4 w-4" aria-hidden="true" />
                      Attempt Online
                    </Link>
                  )}
                </div>
              )}
            </div>
          </article>

          {/* Detailed Solution card (pic3) */}
          <article className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#071d33] p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-gray-800 mb-4">
              <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">Detailed Solution</h2>
              <QuestionActions />
            </div>
            <SolutionBlocks
              solution={question.solution}
              answerLetter={answerLetter}
              answerText={question.answer}
              topicFilterKey="topic"
            />
          </article>

          {/* Relevant test series (colorful card) */}
          {series && (
            <Link
              href={`/test-series/${series.slug}`}
              className="block rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 text-white p-4 sm:p-5 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-white/20 rounded-full px-2 py-0.5">
                    <Zap className="h-3 w-3" aria-hidden="true" /> Test Series
                  </p>
                  <p className="mt-1.5 text-sm sm:text-base font-black leading-snug">{series.title}</p>
                  <p className="mt-1 text-xs text-white/85">
                    {series.totalTests} Total Tests · {series.freeTests} Free Tests
                    {question.exam ? ` · For ${escapeHtml(question.exam)} aspirants` : ""}
                  </p>
                </div>
                <span className="flex-shrink-0 inline-flex items-center min-h-[44px] px-4 rounded-xl bg-white text-indigo-700 text-sm font-black">
                  Start Now
                </span>
              </div>
            </Link>
          )}

          {/* Related questions */}
          {related.length > 0 && (
            <section aria-label="Related questions" className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#071d33] p-4 sm:p-5">
              <h2 className="flex items-center gap-1.5 text-sm font-black text-gray-900 dark:text-white mb-3">
                <Link2 className="h-4 w-4 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                Related Questions
              </h2>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {related.map((r) => (
                  <li key={r.id}>
                    <Link href={detailHref(r.slug || r.shortId)} className="flex items-center gap-2 py-2.5 group">
                      <span className="text-sm text-gray-800 dark:text-gray-200 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex-1 min-w-0">
                        {r.q}
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Link
            href={BASE}
            className="inline-flex items-center gap-1.5 min-h-[44px] text-sm font-semibold text-sky-600 dark:text-sky-400 hover:underline print:hidden"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> View all questions
          </Link>
        </div>

        {/* Right column: Pass banner top-right, flush (no top gap) */}
        <aside className="lg:col-span-4 min-w-0 print:hidden">
          <div className="lg:sticky lg:top-[76px] space-y-5">
            <PassBanner />
            {(question.exam || question.year) && (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#071d33] p-4">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Exam info
                </p>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  Asked in <strong className="text-gray-900 dark:text-white">{escapeHtml(question.exam || "—")}</strong>
                  {question.year ? ` (${escapeHtml(question.year)})` : ""}
                </p>
                {question.sub && (
                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                    Subject: {escapeHtml(question.sub)}
                    {question.top ? ` · ${escapeHtml(question.top)}` : ""}
                  </p>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
