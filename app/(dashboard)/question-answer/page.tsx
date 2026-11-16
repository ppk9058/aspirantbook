import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { parsePagination, pageHref, pageWindow, DEFAULT_PER_PAGE } from "@/lib/pyq/pagination"
import { escapeHtml } from "@/lib/pyq/render"
import { PerPageSelector } from "@/components/pyq/PerPageSelector"
import { PassBanner } from "@/components/test-series/PassBanner"
import { BookOpenCheck, FileQuestion, CalendarDays, Building2, Layers, ChevronLeft, ChevronRight, Inbox } from "lucide-react"

export const dynamic = "force-dynamic"

const BASE = "/question-answer"

const pubWhere = { status: "PUBLISHED", isPublished: true } as const

interface SearchParams {
  page?: string
  per?: string
  exam?: string
  year?: string
  subject?: string
  topic?: string
}

function spToStrings(sp: Record<string, string | string[] | undefined>): SearchParams {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  return {
    page: one(sp.page),
    per: one(sp.per),
    exam: one(sp.exam),
    year: one(sp.year),
    subject: one(sp.subject),
    topic: one(sp.topic),
  }
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<Metadata> {
  const sp = spToStrings(await searchParams)
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) if (v && k !== "page" && k !== "per") params.set(k, v)
  const qs = params.toString()
  const canonical = qs ? `${BASE}?${qs}` : BASE
  return {
    title: "Question Answers — PYQ Solutions with Key Points | TrillionSkill",
    description:
      "Previous year questions with structured solutions: correct answer, key points, option analysis and memory tips for UPSC, BPSC, SSC and more.",
    alternates: { canonical },
  }
}

async function loadHub(sp: SearchParams) {
  const where: Record<string, unknown> = { ...pubWhere }
  if (sp.exam) where.exam = sp.exam
  if (sp.year) where.year = sp.year
  if (sp.subject) where.sub = sp.subject
  if (sp.topic) where.OR = [{ top: { contains: sp.topic } }, { q: { contains: sp.topic } }]

  const total = await prisma.contentEngineQuestion.count({ where })
  const { page, per, skip, take } = parsePagination(sp, total)

  const [questions, examFacets, yearFacets, subjectFacets] = await Promise.all([
    prisma.contentEngineQuestion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
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
      by: ["exam"],
      where: { ...pubWhere, exam: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { exam: "desc" } },
    }),
    prisma.contentEngineQuestion.groupBy({
      by: ["year"],
      where: { ...pubWhere, year: { not: null } },
      _count: { _all: true },
      orderBy: { year: "desc" },
    }),
    prisma.contentEngineQuestion.groupBy({
      by: ["sub"],
      where: { ...pubWhere, sub: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { sub: "desc" } },
    }),
  ])

  return {
    questions,
    total,
    page,
    per,
    examFacets: examFacets.map((f) => ({ value: f.exam as string, count: f._count._all })),
    yearFacets: yearFacets.map((f) => ({ value: f.year as string, count: f._count._all })),
    subjectFacets: subjectFacets.map((f) => ({ value: f.sub as string, count: f._count._all })),
  }
}

function Chip({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex items-center gap-1.5 min-h-[44px] rounded-full px-3.5 text-xs font-semibold border transition-colors ${
        active
          ? "bg-indigo-600 text-white border-indigo-600"
          : "bg-white dark:bg-[#071d33] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-600"
      }`}
    >
      {children}
    </Link>
  )
}

export default async function QuestionAnswerHub({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = spToStrings(await searchParams)
  const hub = await loadHub(sp)

  const totalPages = Math.max(1, Math.ceil(hub.total / hub.per))
  const activeFilters: Record<string, string | undefined> = {
    exam: sp.exam,
    year: sp.year,
    subject: sp.subject,
    topic: sp.topic,
  }
  const filterParams = Object.fromEntries(Object.entries(activeFilters).filter(([, v]) => v))

  const cardHref = (slug: string | null, shortId: string) =>
    `${BASE}/${encodeURIComponent(slug || shortId)}`

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <header className="mb-6">
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
          <BookOpenCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          Question Answers
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Previous year questions with structured solutions — key points, option analysis and memory tips.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main column */}
        <div className="lg:col-span-8 min-w-0 space-y-6">
          {/* Hubs: Exams / Years / Subjects */}
          <div className="space-y-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#071d33] p-4">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                <Building2 className="h-3.5 w-3.5" aria-hidden="true" /> Exams
              </p>
              <div className="flex flex-wrap gap-2">
                {hub.examFacets.map((f) => (
                  <Chip
                    key={f.value}
                    active={sp.exam === f.value}
                    href={pageHref(BASE, { ...filterParams, exam: sp.exam === f.value ? undefined : f.value }, 1, hub.per)}
                  >
                    {f.value}
                    <span className={sp.exam === f.value ? "text-white/80" : "text-gray-400"}>({f.count})</span>
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Years
              </p>
              <div className="flex flex-wrap gap-2">
                {hub.yearFacets.map((f) => (
                  <Chip
                    key={f.value}
                    active={sp.year === f.value}
                    href={pageHref(BASE, { ...filterParams, year: sp.year === f.value ? undefined : f.value }, 1, hub.per)}
                  >
                    {f.value}
                    <span className={sp.year === f.value ? "text-white/80" : "text-gray-400"}>({f.count})</span>
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                <Layers className="h-3.5 w-3.5" aria-hidden="true" /> Subjects
              </p>
              <div className="flex flex-wrap gap-2">
                {hub.subjectFacets.map((f) => (
                  <Chip
                    key={f.value}
                    active={sp.subject === f.value}
                    href={pageHref(BASE, { ...filterParams, subject: sp.subject === f.value ? undefined : f.value }, 1, hub.per)}
                  >
                    {f.value}
                    <span className={sp.subject === f.value ? "text-white/80" : "text-gray-400"}>({f.count})</span>
                  </Chip>
                ))}
              </div>
            </div>
          </div>

          {/* Result toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {hub.total} question{hub.total === 1 ? "" : "s"}
              {sp.exam ? ` · ${sp.exam}` : ""}
              {sp.year ? ` · ${sp.year}` : ""}
              {sp.subject ? ` · ${sp.subject}` : ""}
              {sp.topic ? ` · ${sp.topic}` : ""}
            </p>
            <PerPageSelector current={hub.per} />
          </div>

          {/* Question list */}
          {hub.questions.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#071d33] p-8 text-center">
              <Inbox className="h-8 w-8 text-gray-400 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm font-semibold text-gray-900 dark:text-white">No questions found</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Try removing a filter — published questions will appear here.
              </p>
              <Link
                href={BASE}
                className="mt-4 inline-flex items-center min-h-[44px] px-4 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Show all questions
              </Link>
            </div>
          ) : (
            <ol className="space-y-3">
              {hub.questions.map((q, i) => (
                <li key={q.id}>
                  <Link
                    href={cardHref(q.slug, q.shortId)}
                    className="block rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#071d33] p-4 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition-all"
                  >
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      #{(hub.page - 1) * hub.per + i + 1}
                      {q.exam ? ` · ${escapeHtml(q.exam)}` : ""}
                      {q.year ? ` ${escapeHtml(q.year)}` : ""}
                      {q.sub ? ` · ${escapeHtml(q.sub)}` : ""}
                    </p>
                    <p className="mt-1 text-sm sm:text-[15px] font-semibold text-gray-900 dark:text-white leading-snug">
                      {q.q}
                    </p>
                  </Link>
                </li>
              ))}
            </ol>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 print:hidden">
              {hub.page > 1 ? (
                <Link
                  href={pageHref(BASE, filterParams, hub.page - 1, hub.per)}
                  className="inline-flex items-center gap-1 min-h-[44px] px-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:border-indigo-400"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Prev
                </Link>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-1">
                {pageWindow(hub.page, totalPages).map((p, idx, arr) => (
                  <span key={p} className="flex items-center">
                    {idx > 0 && p - arr[idx - 1] > 1 && (
                      <span className="px-1 text-gray-400" aria-hidden="true">…</span>
                    )}
                    <Link
                      href={pageHref(BASE, filterParams, p, hub.per)}
                      aria-current={p === hub.page ? "page" : undefined}
                      className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-sm font-semibold border ${
                        p === hub.page
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-400"
                      }`}
                    >
                      {p}
                    </Link>
                  </span>
                ))}
              </div>
              {hub.page < totalPages ? (
                <Link
                  href={pageHref(BASE, filterParams, hub.page + 1, hub.per)}
                  className="inline-flex items-center gap-1 min-h-[44px] px-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:border-indigo-400"
                >
                  Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </div>

        {/* Right column: Pass banner top-right (flush, no top gap) */}
        <aside className="lg:col-span-4 min-w-0">
          <div className="lg:sticky lg:top-[76px] space-y-5">
            <PassBanner />
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#071d33] p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <FileQuestion className="h-3.5 w-3.5" aria-hidden="true" /> How it works
              </p>
              <ul className="mt-2 space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                <li>• Every solution shows the correct option with the because part.</li>
                <li>• Key Points, Additional Info and Memory Tips are colour-coded.</li>
                <li>• Use Download Solution PDF to save or print any solution.</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
