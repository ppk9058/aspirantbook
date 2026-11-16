import { prisma } from "@/lib/prisma"

/**
 * Match a question's exam (e.g. "UPSC CSE", "70th BPSC") to the most relevant
 * published test series (ExamSeries). Used for the promo card on public
 * question pages: a BPSC question links to a BPSC test series, etc.
 */

export interface SeriesPromo {
  id: string
  title: string
  slug: string
  examName: string
  totalTests: number
  freeTests: number
  isPro: boolean
}

const STOP_WORDS = new Set([
  "THE", "EXAM", "AND", "OF", "PAPER", "PRELIMS", "MAINS", "OFFICIAL",
  "RE-EXAM", "REEXAM", "TEST", "HELD", "ON", "SET", "CSE",
])

export function keywords(exam: string | null | undefined): string[] {
  if (!exam) return []
  return exam
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t))
}

export function scoreSeries(
  series: { examName: string; title: string; category?: string },
  examKeywords: string[],
): number {
  if (examKeywords.length === 0) return 0
  const hay = `${series.examName} ${series.title} ${series.category ?? ""}`.toUpperCase()
  let score = 0
  for (const kw of examKeywords) {
    if (hay.includes(kw)) score += 1
  }
  return score
}

/** Best published, non-archived series for an exam string; null if none. */
export async function findRelevantSeries(
  exam: string | null | undefined,
): Promise<SeriesPromo | null> {
  const examKeywords = keywords(exam)

  const candidates = await prisma.examSeries.findMany({
    where: { isPublished: true, isArchived: false },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      slug: true,
      examName: true,
      totalTests: true,
      freeTests: true,
      isPro: true,
    },
  })
  if (candidates.length === 0) return null

  let best: SeriesPromo | null = null
  let bestScore = 0
  for (const s of candidates) {
    const sc = scoreSeries(s, examKeywords)
    if (sc > bestScore) {
      bestScore = sc
      best = s
    }
  }
  // No keyword overlap: fall back to the newest published series so the card
  // still shows something real (never fake data).
  return best || candidates[0]
}
