import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { slugify, examHubPath, subjectHubPath, qaPath } from "@/lib/modules/content-engine/paths"
import { parsePagination, pageHref, pageWindow } from "@/lib/pyq/pagination"
import { escapeHtml } from "@/lib/pyq/render"
import { PerPageSelector } from "@/components/pyq/PerPageSelector"
import { PassBanner } from "@/components/test-series/PassBanner"
import { Badge } from "@/components/ui/badge"
import {
  BookOpenCheck,
  Building2,
  CalendarDays,
  Layers,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  ArrowRight,
  Filter,
} from "lucide-react"
import type { Metadata } from "next"
import { getBaseUrl } from "@/lib/seo/core"

export const revalidate = 3600 // 1 hour ISR cache

const BASE_URL = getBaseUrl()
const BASE_PATH = "/question-answer"

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
  if (sp.exam) params.set("exam", sp.exam)
  if (sp.year) params.set("year", sp.year)
  if (sp.subject) params.set("subject", sp.subject)
  if (sp.topic) params.set("topic", sp.topic)
  if (sp.page && Number(sp.page) > 1) params.set("page", sp.page)
  if (sp.per && sp.per !== "20") params.set("per", sp.per)

  const qs = params.toString()
  const canonicalUrl = BASE_URL
    ? `${BASE_URL}${BASE_PATH}${qs ? `?${qs}` : ""}`
    : `${BASE_PATH}${qs ? `?${qs}` : ""}`

  const baseEn = BASE_URL ? `${BASE_URL}/question-answer` : "/question-answer"
  const baseHi = BASE_URL ? `${BASE_URL}/hi/question-answer` : "/hi/question-answer"

  return {
    title: "Competitive Exam Previous Year Questions (PYQs) | AspirantBook",
    description:
      "Explore authentic previous year questions, answer keys, and detailed solutions for UPSC CSE, BPSC, UPPCS, RAS, and SSC CGL.",
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: baseEn,
        hi: baseHi,
        "x-default": baseEn,
      },
    },
  }
}

const pubWhere = { isPublished: true } as const

async function loadQuestionsData(sp: SearchParams) {
  const where: Record<string, unknown> = {
    ...pubWhere,
    slug: { not: null },
  }

  if (sp.exam) where.exam = { equals: sp.exam, mode: "insensitive" }
  if (sp.year) where.year = sp.year
  if (sp.subject) where.sub = { equals: sp.subject, mode: "insensitive" }
  if (sp.topic) {
    where.OR = [
      { top: { contains: sp.topic, mode: "insensitive" } },
      { q: { contains: sp.topic, mode: "insensitive" } },
    ]
  }

  const [total, examFacets, yearFacets, subjectFacets] = await Promise.all([
    prisma.contentEngineQuestion.count({ where }).catch(() => 0),
    prisma.contentEngineQuestion
      .groupBy({
        by: ["exam"],
        where: { isPublished: true, exam: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      })
      .catch(() => []),
    prisma.contentEngineQuestion
      .groupBy({
        by: ["year"],
        where: { isPublished: true, year: { not: null } },
        _count: { id: true },
        orderBy: { year: "desc" },
      })
      .catch(() => []),
    prisma.contentEngineQuestion
      .groupBy({
        by: ["sub"],
        where: { isPublished: true, sub: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      })
      .catch(() => []),
  ])

  const { page, per, skip, take } = parsePagination(sp, total)

  const questions = await prisma.contentEngineQuestion
    .findMany({
      where,
      skip,
      take,
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
    })
    .catch(() => [])

  return {
    questions,
    total,
    page,
    per,
    examFacets: examFacets
      .filter((f) => Boolean(f.exam))
      .map((f) => ({ value: f.exam as string, count: f._count.id })),
    yearFacets: yearFacets
      .filter((f) => Boolean(f.year))
      .map((f) => ({ value: f.year as string, count: f._count.id })),
    subjectFacets: subjectFacets
      .filter((f) => Boolean(f.sub))
      .map((f) => ({ value: f.sub as string, count: f._count.id })),
  }
}

function HubChip({
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
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-foreground border-border hover:border-primary/50"
      }`}
    >
      {children}
    </Link>
  )
}

export default async function QuestionAnswerHomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = spToStrings(await searchParams)
  const data = await loadQuestionsData(sp)

  const totalPages = Math.max(1, Math.ceil(data.total / data.per))
  const activeFilters: Record<string, string | undefined> = {
    exam: sp.exam,
    year: sp.year,
    subject: sp.subject,
    topic: sp.topic,
  }
  const filterParams = Object.fromEntries(Object.entries(activeFilters).filter(([, v]) => v))
  const hasActiveFilters = Object.keys(filterParams).length > 0
  const pagesList = pageWindow(data.page, totalPages)

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      {/* Hero Header */}
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
          <BookOpenCheck className="h-7 w-7 text-primary shrink-0" aria-hidden="true" />
          <span>Question Answers</span>
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
          Previous year questions with verified solutions, official answer keys, and structured explanations for competitive exams.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Column */}
        <div className="lg:col-span-8 min-w-0 space-y-6">
          {/* Hub Facet Chips (Exams / Years / Subjects) */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
            {/* Exam chips */}
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                <Building2 className="h-3.5 w-3.5" aria-hidden="true" /> Exams
              </p>
              <div className="flex flex-wrap gap-2">
                {data.examFacets.slice(0, 10).map((f) => (
                  <HubChip
                    key={f.value}
                    active={sp.exam?.toLowerCase() === f.value.toLowerCase()}
                    href={pageHref(
                      BASE_PATH,
                      { ...filterParams, exam: sp.exam?.toLowerCase() === f.value.toLowerCase() ? undefined : f.value },
                      1,
                      data.per
                    )}
                  >
                    <span>{f.value}</span>
                    <span className="opacity-75 font-normal">({f.count})</span>
                  </HubChip>
                ))}
              </div>
            </div>

            {/* Year chips */}
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Years
              </p>
              <div className="flex flex-wrap gap-2">
                {data.yearFacets.slice(0, 10).map((f) => (
                  <HubChip
                    key={f.value}
                    active={sp.year === f.value}
                    href={pageHref(
                      BASE_PATH,
                      { ...filterParams, year: sp.year === f.value ? undefined : f.value },
                      1,
                      data.per
                    )}
                  >
                    <span>{f.value}</span>
                    <span className="opacity-75 font-normal">({f.count})</span>
                  </HubChip>
                ))}
              </div>
            </div>

            {/* Subject chips */}
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                <Layers className="h-3.5 w-3.5" aria-hidden="true" /> Subjects
              </p>
              <div className="flex flex-wrap gap-2">
                {data.subjectFacets.slice(0, 10).map((f) => (
                  <HubChip
                    key={f.value}
                    active={sp.subject?.toLowerCase() === f.value.toLowerCase()}
                    href={pageHref(
                      BASE_PATH,
                      { ...filterParams, subject: sp.subject?.toLowerCase() === f.value.toLowerCase() ? undefined : f.value },
                      1,
                      data.per
                    )}
                  >
                    <span>{f.value}</span>
                    <span className="opacity-75 font-normal">({f.count})</span>
                  </HubChip>
                ))}
              </div>
            </div>
          </div>

          {/* Active Filter Bar */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-muted/40 border border-border text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-primary" /> Active Filter:
                </span>
                {Object.entries(filterParams).map(([k, v]) => (
                  <Badge key={k} variant="secondary" className="text-xs">
                    {k}: {v}
                  </Badge>
                ))}
              </div>
              <Link
                href={BASE_PATH}
                className="text-primary hover:underline font-semibold"
              >
                Clear all filters
              </Link>
            </div>
          )}

          {/* Questions Header with PerPageSelector */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              {hasActiveFilters ? "Filtered Questions" : "All Questions"} ({data.total})
            </h2>
            <PerPageSelector current={data.per} />
          </div>

          {/* Questions List */}
          {data.questions.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-border bg-card text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">No questions found</p>
              <p className="text-xs">Try clearing or adjusting your filters to see more results.</p>
              {hasActiveFilters && (
                <div className="pt-2">
                  <Link
                    href={BASE_PATH}
                    className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    View All Questions
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3.5">
              {data.questions.map((q) => {
                if (!q.slug || !q.exam) return null
                const url = qaPath("en", q.exam, q.sub, q.slug)
                return (
                  <Link
                    key={q.id}
                    href={url}
                    className="p-4 sm:p-5 rounded-2xl border border-border bg-card hover:border-primary/50 transition-colors block space-y-2.5 group"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="default" className="text-xs bg-primary/80">
                        {q.exam} {q.year || ""}
                      </Badge>
                      {q.sub && (
                        <Badge variant="secondary" className="text-xs">
                          {q.sub}
                        </Badge>
                      )}
                      {q.top && (
                        <Badge variant="outline" className="text-xs">
                          {q.top}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm sm:text-base font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-relaxed">
                      {q.q}
                    </p>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <nav
              aria-label="Pagination"
              className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border"
            >
              <div className="text-xs text-muted-foreground">
                Page {data.page} of {totalPages} ({data.total} total)
              </div>

              <div className="flex items-center gap-1.5">
                {data.page > 1 ? (
                  <Link
                    href={pageHref(BASE_PATH, filterParams, data.page - 1, data.per)}
                    className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-border bg-card text-foreground hover:border-primary/50 text-xs font-semibold transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Link>
                ) : (
                  <span
                    className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-border/50 bg-muted/30 text-muted-foreground text-xs opacity-50 cursor-not-allowed"
                    aria-disabled="true"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </span>
                )}

                {pagesList.map((p, idx) => (
                  <Link
                    key={idx}
                    href={pageHref(BASE_PATH, filterParams, p, data.per)}
                    aria-current={p === data.page ? "page" : undefined}
                    className={`inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl text-xs font-semibold border transition-colors ${
                      p === data.page
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {p}
                  </Link>
                ))}

                {data.page < totalPages ? (
                  <Link
                    href={pageHref(BASE_PATH, filterParams, data.page + 1, data.per)}
                    className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-border bg-card text-foreground hover:border-primary/50 text-xs font-semibold transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span
                    className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-border/50 bg-muted/30 text-muted-foreground text-xs opacity-50 cursor-not-allowed"
                    aria-disabled="true"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </div>
            </nav>
          )}
        </div>

        {/* Sidebar Column */}
        <aside className="lg:col-span-4 min-w-0 space-y-6">
          <div className="lg:sticky lg:top-[76px] space-y-6">
            {/* Pass Banner */}
            <PassBanner />

            {/* Browse by Examination */}
            <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary" />
                <span>Browse by Examination</span>
              </h3>
              <div className="divide-y divide-border text-xs">
                {data.examFacets.slice(0, 8).map((e) => (
                  <Link
                    key={e.value}
                    href={examHubPath("en", e.value)}
                    className="py-2.5 flex items-center justify-between group hover:text-primary transition-colors"
                  >
                    <span className="font-medium text-foreground group-hover:text-primary">{e.value}</span>
                    <span className="text-muted-foreground">({e.count})</span>
                  </Link>
                ))}
              </div>
            </section>

            {/* Browse by Subject */}
            <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span>Browse by Subject</span>
              </h3>
              <div className="divide-y divide-border text-xs">
                {data.subjectFacets.slice(0, 8).map((s) => (
                  <Link
                    key={s.value}
                    href={subjectHubPath("en", "all", s.value)}
                    className="py-2.5 flex items-center justify-between group hover:text-primary transition-colors"
                  >
                    <span className="font-medium text-foreground group-hover:text-primary">{s.value}</span>
                    <span className="text-muted-foreground">({s.count})</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  )
}
