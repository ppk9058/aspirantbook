import { prisma } from "@/lib/prisma"

/**
 * Public test-series listing shape. Kept byte-compatible with the payload the
 * existing /api/exam/series/list route returns so the SSR page can hand the
 * same objects to the client component (the API itself is untouched).
 */
export interface TestSeriesItem {
  id: string
  slug?: string
  title: string
  category: string
  description?: string
  goalId?: string
  tags: string[]
  highlights: string[]
  totalTests: number
  freeTests: number
  users: string
  logoType: string
  isFree: boolean
  isPro: boolean
  languages: string
  examName?: string
}

/**
 * Published, non-archived series for the public catalogue. Read-only and
 * cacheable, so the /test-series route can stay static/ISR: no cookies, no
 * session, no search params.
 */
export async function fetchPublishedSeriesForListing(): Promise<TestSeriesItem[]> {
  const seriesList = await prisma.examSeries.findMany({
    where: { isPublished: true, isArchived: false },
    include: {
      tests: {
        where: { isPublished: true },
        select: { accessMode: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return seriesList.map((s) => {
    let highlights: string[] = Array.isArray(s.highlights) && s.highlights.length > 0 ? s.highlights : []
    let cleanDescription = (s.description || "").trim()
    let logoType = s.logoType && s.logoType !== "general" ? s.logoType : null

    // Safe legacy fallback: parse metadata if logoType/highlights columns are
    // empty and the description still contains the old JSON blob.
    if (cleanDescription.startsWith("{") && cleanDescription.endsWith("}")) {
      try {
        const meta = JSON.parse(cleanDescription)
        if (!logoType && meta.logoType) {
          logoType = meta.logoType
        }
        if (highlights.length === 0 && Array.isArray(meta.highlights)) {
          highlights = meta.highlights.filter(
            (h: unknown) => typeof h === "string" && h.trim().length > 0
          )
        }
        cleanDescription = (meta.description || meta.overview || meta.subtitle || "").trim()
      } catch {
        cleanDescription = ""
      }
    }

    if (!logoType) {
      logoType =
        s.logoType ||
        (s.slug.includes("upsc") ? "upsc" : s.slug.includes("bpsc") ? "bpsc" : "general")
    }

    const publishedTests = s.tests || []
    const totalTestsCount = publishedTests.length
    const freeTestsCount = publishedTests.filter((t) => t.accessMode === "FREE").length
    const usersCount = s.usersCount
    const usersStr = usersCount >= 1000 ? `${(usersCount / 1000).toFixed(1)}k` : `${usersCount}`

    return {
      id: s.slug || s.id,
      slug: s.slug,
      title: s.title,
      category: s.category,
      examName: s.examName,
      logoType,
      users: usersStr,
      totalTests: totalTestsCount,
      freeTests: freeTestsCount,
      languages: s.languages,
      highlights,
      description: cleanDescription,
      goalId: s.category.toLowerCase().replace(/\s+/g, "-"),
      tags: [s.category.toLowerCase()],
      isFree: s.isFree ?? false,
      isPro: s.isPro ?? false,
    }
  })
}
