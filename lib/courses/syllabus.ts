/**
 * Exam-syllabus statistics, built from REAL PYQ data.
 *
 * Data source: `ContentEngineQuestion` (indexed on `[sub, top]` and `[exam, year]`).
 * A syllabus section stores `pyqSubject` (→ `.sub`) and optionally `pyqTopic` (→ `.top`).
 * If a section has no link, or the PYQ table has no matching rows, the section simply
 * carries zero questions and the UI hides its bars — we never invent numbers.
 */
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"

export interface PyqYearCount {
  year: number
  count: number
}

export interface SyllabusSectionInput {
  id: string
  title: string
  pyqSubject?: string | null
  pyqTopic?: string | null
  order?: number | null
}

export interface SyllabusSectionStats {
  id: string
  title: string
  totalQuestions: number
  byYear: PyqYearCount[]
  yearsPresent: number
  hasPyqData: boolean
}

export type PyqLookup = (subject: string, topic: string | null) => PyqYearCount[]

export function buildSyllabusStats(sections: SyllabusSectionInput[], lookup: PyqLookup): SyllabusSectionStats[] {
  return sections.map((section) => {
    const subject = (section.pyqSubject || "").trim()
    const topic = section.pyqTopic ? section.pyqTopic.trim() : null
    const byYear = subject ? lookup(subject, topic) : []
    const totalQuestions = byYear.reduce((sum, row) => sum + row.count, 0)
    return {
      id: section.id,
      title: section.title,
      totalQuestions,
      byYear,
      yearsPresent: byYear.filter((row) => row.count > 0).length,
      hasPyqData: totalQuestions > 0,
    }
  })
}

/** Sorts by real question count, dropping sections with none. */
export function mostAskedOrder(stats: SyllabusSectionStats[]): SyllabusSectionStats[] {
  return stats.filter((s) => s.totalQuestions > 0).sort((a, b) => b.totalQuestions - a.totalQuestions)
}

/** "Most asked: N questions since 2019". */
export function mostAskedLabel(stats: SyllabusSectionStats, fallbackStartYear?: number | null): string {
  if (stats.totalQuestions <= 0) return ""
  const years = stats.byYear.map((row) => row.year).filter((y) => Number.isFinite(y))
  const startYear = years.length > 0 ? Math.min(...years) : fallbackStartYear
  if (!startYear) return `${stats.totalQuestions} questions in previous papers`
  return `${stats.totalQuestions} questions since the ${ordinal(startYear)}`
}

export function ordinal(year: number): string {
  const suffix = year % 100 >= 11 && year % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][year % 10] || "th"
  return `${year}${suffix}`
}

/** Loads the real per-year counts for one subject/topic pair. */
export async function loadPyqCounts(subject: string, topic: string | null): Promise<PyqYearCount[]> {
  const where: any = { isPublished: true, sub: subject }
  if (topic) where.top = topic
  const rows = await prisma.contentEngineQuestion.groupBy({
    by: ["year"],
    where,
    _count: { _all: true },
  })
  return rows
    .map((row) => ({ year: Number(row.year), count: row._count._all }))
    .filter((row) => Number.isFinite(row.year) && row.year > 1900)
    .sort((a, b) => b.year - a.year)
}

export interface CourseSyllabusView {
  papers: Array<{
    id: string
    key: string
    title: string
    titleHi: string | null
    marks: number | null
    durationMinutes: number | null
    introText: string | null
    introTextHi: string | null
    sections: Array<
      SyllabusSectionInput & {
        titleHi: string | null
        subtopics: string[]
        subtopicsHi: string[]
        unitId: string | null
        chapterId: string | null
        unitTitle: string | null
        stats: SyllabusSectionStats
      }
    >
    mostAsked: SyllabusSectionStats[]
  }>
  hasSyllabus: boolean
}

/** Uncached loader (also used by the v1 API, which has its own caching story). */
export async function loadCourseSyllabus(courseId: string): Promise<CourseSyllabusView> {
  const papers = await prisma.courseSyllabusPaper.findMany({
      where: { courseId },
      orderBy: { order: "asc" },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: { unit: { select: { id: true, title: true, titleHi: true } } },
        },
      },
    })

    if (papers.length === 0) return { papers: [], hasSyllabus: false }

    // One query per distinct subject/topic pair, deduped.
    const keys = new Set<string>()
    for (const paper of papers) {
      for (const section of paper.sections) {
        if (section.pyqSubject) keys.add(`${section.pyqSubject}|${section.pyqTopic ?? ""}`)
      }
    }
    const cache = new Map<string, PyqYearCount[]>()
    await Promise.all(
      Array.from(keys).map(async (key) => {
        const [subject, topic] = key.split("|")
        cache.set(key, await loadPyqCounts(subject, topic || null))
      })
    )

    const lookup: PyqLookup = (subject, topic) => cache.get(`${subject}|${topic ?? ""}`) || []

    return {
      hasSyllabus: true,
      papers: papers.map((paper) => {
        const stats = buildSyllabusStats(
          paper.sections.map((s) => ({
            id: s.id,
            title: s.title,
            pyqSubject: s.pyqSubject,
            pyqTopic: s.pyqTopic,
            order: s.order,
          })),
          lookup
        )
        const statsById = new Map(stats.map((s) => [s.id, s]))
        const sections = paper.sections.map((s) => ({
          id: s.id,
          title: s.title,
          titleHi: s.titleHi,
          subtopics: s.subtopics,
          subtopicsHi: s.subtopicsHi,
          pyqSubject: s.pyqSubject,
          pyqTopic: s.pyqTopic,
          unitId: s.unitId,
          chapterId: s.chapterId,
          unitTitle: s.unit?.title ?? null,
          order: s.order,
          stats: statsById.get(s.id)!,
        }))
        return {
          id: paper.id,
          key: paper.key,
          title: paper.title,
          titleHi: paper.titleHi,
          marks: paper.marks,
          durationMinutes: paper.durationMinutes,
          introText: paper.introText,
          introTextHi: paper.introTextHi,
          sections,
          mostAsked: mostAskedOrder(stats),
        }
      }),
    }
}

/** Cached for an hour: PYQ data changes slowly and this is read on every course view. */
export const getCourseSyllabus = unstable_cache(loadCourseSyllabus, ["course-syllabus-v1"], {
  revalidate: 3600,
  tags: ["course-syllabus"],
})
