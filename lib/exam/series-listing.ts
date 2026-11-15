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
 * Raised when the catalogue read itself failed (connection refused, auth,
 * timeout…). It is deliberately distinct from "the query succeeded and there
 * are zero published series": a failure must never be cached as an empty
 * catalogue, because ISR would then serve "no series" for a whole revalidate
 * window.
 */
export class SeriesListingUnavailableError extends Error {
  readonly code = "SERIES_LISTING_UNAVAILABLE"

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = "SeriesListingUnavailableError"
  }
}

/**
 * Result of loading the catalogue for the server render.
 *
 * `available: false` means nothing was read. The page then renders the client
 * shell (which fills itself from /api/exam/series/list) instead of claiming
 * that the catalogue is empty.
 */
export interface SeriesListingSnapshot {
  series: TestSeriesItem[]
  available: boolean
  error?: SeriesListingUnavailableError
}

/** True while `next build` prerenders the route tree (builders have no DB). */
export function isBuildTimePrerender(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build"
}

/**
 * Published, non-archived series for the public catalogue. Read-only and
 * cacheable, so the /test-series route can stay static/ISR: no cookies, no
 * session, no search params.
 *
 * Throws `SeriesListingUnavailableError` when the query fails, so callers can
 * tell "nothing read" apart from "zero published series".
 */
export async function fetchPublishedSeriesForListing(): Promise<TestSeriesItem[]> {
  try {
    return await queryPublishedSeriesForListing()
  } catch (error) {
    throw new SeriesListingUnavailableError(
      "The published test-series query failed; no series were read.",
      { cause: error }
    )
  }
}

/**
 * Catalogue load for a server render. Never drops a failure silently: the
 * snapshot says whether anything was actually read.
 *
 * `read` is injectable so the failure contract can be unit tested without a
 * broken database.
 */
export async function loadPublishedSeriesForListing(
  read: () => Promise<TestSeriesItem[]> = fetchPublishedSeriesForListing
): Promise<SeriesListingSnapshot> {
  try {
    const series = await read()
    return { series, available: true }
  } catch (error) {
    const unavailable =
      error instanceof SeriesListingUnavailableError
        ? error
        : new SeriesListingUnavailableError(
            "The published test-series query failed; no series were read.",
            { cause: error }
          )
    return { series: [], available: false, error: unavailable }
  }
}

/**
 * Turns a catalogue snapshot into what the server render may use.
 *
 * - A successful read (including "zero published series") is rendered as-is.
 * - A failed read during `next build` (the Docker/CI build has no database)
 *   returns an empty list so the build still succeeds. That shell is never the
 *   final catalogue: the first `/api/health` check that reaches the database
 *   purges this route, so the next request regenerates it with real series
 *   before Render routes public traffic to the instance.
 * - A failed read at request time throws, so ISR keeps the last good page
 *   instead of caching an empty catalogue for a whole revalidate window.
 */
export function resolveListingForRender(
  snapshot: SeriesListingSnapshot,
  buildTime: boolean = isBuildTimePrerender()
): TestSeriesItem[] {
  if (snapshot.available) {
    return snapshot.series
  }

  const error =
    snapshot.error ??
    new SeriesListingUnavailableError(
      "The published test-series query failed; no series were read."
    )

  if (buildTime) {
    console.error(
      "[test-series] build ran without a readable database; skipping the catalogue data " +
        "(the boot health check revalidates this route before traffic is served)",
      error
    )
    return []
  }

  console.error(
    "[test-series] published series could not be read at request time; keeping the last good page",
    error
  )
  throw error
}

async function queryPublishedSeriesForListing(): Promise<TestSeriesItem[]> {
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
