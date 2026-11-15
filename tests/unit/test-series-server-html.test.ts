import assert from "node:assert/strict"
import { describe, test } from "node:test"
import fs from "node:fs"
import path from "node:path"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import {
  fetchPublishedSeriesForListing,
  isBuildTimePrerender,
  loadPublishedSeriesForListing,
  resolveListingForRender,
  SeriesListingUnavailableError,
  type TestSeriesItem,
} from "../../lib/exam/series-listing"
import { adaptTestSeriesCatalogSeo } from "../../lib/seo"
import { SeoJsonLd } from "../../lib/seo/json-ld"
import { TestSeriesGrid } from "../../components/exam/TestSeriesCards"

/**
 * Regression guard for the production bug where https://aspirantbook.com/test-series
 * was prerendered by `next build` with a dummy DATABASE_URL, the failed read was
 * silently turned into `[]`, and that empty HTML was then served from the ISR
 * cache ("View Test Series" count 0, no ItemList JSON-LD) until the first
 * successful revalidation.
 *
 * Three independent contracts are pinned here:
 *  1. the data layer reports a failed read instead of returning a cacheable
 *     empty list, and the render decision keeps the last good page at request
 *     time while still letting a database-less CI/Docker build succeed;
 *  2. a non-empty `initialSeries` reaches the server HTML: the card grid renders
 *     every series title and its "View Test Series" link, and the ItemList
 *     JSON-LD lists each visible series;
 *  3. the boot/admin triggers that replace the build-time shell exist.
 */

const ROOT = path.resolve(__dirname, "../..")
const PAGE = "app/(dashboard)/test-series/page.tsx"
const CLIENT = "components/exam/TestSeriesListingClient.tsx"
const CARDS = "components/exam/TestSeriesCards.tsx"

// The app compiles JSX with the classic runtime under `tsx --test` (tsconfig
// `jsx: preserve`), so component modules in lib/ look up a bare `React`.
Object.assign(globalThis, { React })

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8")
}

function series(overrides: Partial<TestSeriesItem> = {}): TestSeriesItem {
  return {
    id: "upsc-full-length",
    slug: "upsc-full-length",
    title: "UPSC Full Length Test Series",
    category: "UPSC",
    tags: ["upsc"],
    highlights: [],
    totalTests: 12,
    freeTests: 1,
    users: "1.2k",
    logoType: "upsc",
    isFree: false,
    isPro: true,
    languages: "English, Hindi",
    goalId: "upsc",
    ...overrides,
  }
}

describe("test-series server catalogue — failed reads are not an empty catalogue", () => {
  test("a failed read is reported, not turned into a valid empty list", async () => {
    const snapshot = await loadPublishedSeriesForListing(async () => {
      throw new Error("connect ECONNREFUSED 127.0.0.1:5432")
    })

    assert.equal(snapshot.available, false, "a failed read must not look available")
    assert.equal(snapshot.series.length, 0)
    assert.ok(
      snapshot.error instanceof SeriesListingUnavailableError,
      "the failure must be surfaced as SeriesListingUnavailableError"
    )
    assert.equal(snapshot.error?.code, "SERIES_LISTING_UNAVAILABLE")
  })

  test("the failure keeps its cause so the build log shows the real error", async () => {
    const cause = new Error("getaddrinfo ENOTFOUND db.build-placeholder.invalid")
    const snapshot = await loadPublishedSeriesForListing(async () => {
      throw cause
    })

    assert.equal(snapshot.available, false)
    assert.equal(snapshot.error?.cause, cause)
  })

  test("a successful read of zero rows is still a successful read", async () => {
    const snapshot = await loadPublishedSeriesForListing(async () => [])

    assert.equal(snapshot.available, true, "zero rows is not a failure")
    assert.deepEqual(snapshot.series, [])
    assert.equal(snapshot.error, undefined)
  })

  test("a successful read keeps every series", async () => {
    const rows = [series(), series({ id: "bpsc-72nd", slug: "bpsc-72nd", title: "BPSC 72nd Full Test Series" })]
    const snapshot = await loadPublishedSeriesForListing(async () => rows)

    assert.equal(snapshot.available, true)
    assert.deepEqual(
      snapshot.series.map((s) => s.title),
      ["UPSC Full Length Test Series", "BPSC 72nd Full Test Series"]
    )
  })

  test("fetchPublishedSeriesForListing throws instead of returning [] when the DB is down", async () => {
    // The dummy build DATABASE_URL used by the Docker build is unreachable by
    // design. Before the fix the query error was swallowed and baked into ISR.
    const saved = process.env.DATABASE_URL
    process.env.DATABASE_URL = "postgresql://placeholder:placeholder@db.build-placeholder.invalid:5432/placeholder_build_test?sslmode=require"
    try {
      await assert.rejects(
        () => fetchPublishedSeriesForListing(),
        (error: unknown) => error instanceof SeriesListingUnavailableError
      )
    } finally {
      if (saved === undefined) delete process.env.DATABASE_URL
      else process.env.DATABASE_URL = saved
    }
  })

  test("build-time prerender is detected from NEXT_PHASE", () => {
    const saved = process.env.NEXT_PHASE
    try {
      process.env.NEXT_PHASE = "phase-production-build"
      assert.equal(isBuildTimePrerender(), true)
      process.env.NEXT_PHASE = "phase-production-server"
      assert.equal(isBuildTimePrerender(), false)
    } finally {
      if (saved === undefined) delete process.env.NEXT_PHASE
      else process.env.NEXT_PHASE = saved
    }
  })
})

describe("test-series render decision — empty build vs. request-time failure", () => {
  test("a successful snapshot renders its series", () => {
    const rows = [series()]
    const rendered = resolveListingForRender({ series: rows, available: true }, false)
    assert.deepEqual(rendered, rows)
  })

  test("a failed read during next build keeps the build green and caches nothing as data", async () => {
    const snapshot = await loadPublishedSeriesForListing(async () => {
      throw new Error("connect ECONNREFUSED")
    })

    // CI and the Docker builder run `next build` without a reachable database.
    // Throwing there would break every deploy, so the build-time render returns
    // an empty list (never "available") and the boot purge replaces it.
    const rendered = resolveListingForRender(snapshot, true)
    assert.deepEqual(rendered, [], "the build-time shell carries no invented series")
    assert.equal(snapshot.available, false, "the shell must not claim a successful read")
  })

  test("a failed read at request time throws so ISR keeps the last good page", async () => {
    const snapshot = await loadPublishedSeriesForListing(async () => {
      throw new Error("connect ECONNREFUSED")
    })

    assert.throws(
      () => resolveListingForRender(snapshot, false),
      (error: unknown) =>
        error instanceof SeriesListingUnavailableError &&
        error.code === "SERIES_LISTING_UNAVAILABLE",
      "a runtime read failure must not be rendered (and cached) as an empty catalogue"
    )
  })
})

describe("public catalogue revalidation — boot and admin triggers", () => {
  test("the health check revalidates the public catalogues once per healthy transition", () => {
    const health = read("app/api/health/route.ts")
    const cache = read("lib/cache/public-catalogue-cache.ts")

    assert.match(health, /revalidatePublicCatalogues\("health: database healthy"\)/)
    assert.match(
      health,
      /database\?\.status === "healthy"/,
      "only a reachable database may trigger the boot revalidation"
    )
    assert.match(health, /revalidatedSinceHealthy = false/, "a DB outage must re-arm the trigger")
    assert.match(health, /if \(!revalidatedSinceHealthy\)/, "the trigger must be bounded to a transition")

    for (const page of ["/test-series", "/", "/books"]) {
      assert.ok(cache.includes(`"${page}"`), `boot revalidation must cover ${page}`)
    }
  })

  test("every admin ExamSeries mutation revalidates /test-series", () => {
    const flows = [
      "lib/exam-packages.ts", // publish gate, details, delete, restore, duplicate
      "app/api/exam/series/create/route.ts",
      "app/api/exam/test/[id]/route.ts", // publish / unpublish a test
      "app/api/exam/test/[id]/edit-data/route.ts",
      "app/api/exam/test/create/route.ts",
    ]

    for (const rel of flows) {
      const src = read(rel)
      const hit = src.includes('revalidatePath("/test-series")') || src.includes('safeRevalidatePath("/test-series")')
      assert.ok(hit, `${rel} must revalidate /test-series on mutation`)
    }
  })
})

describe("test-series server render — cards and ItemList are in the server HTML", () => {
  const rows = [
    series(),
    series({ id: "bpsc-72nd", slug: "bpsc-72nd", title: "BPSC 72nd Full Test Series", category: "BPSC", goalId: "bpsc", tags: ["bpsc"] }),
    series({ id: "upsc-2027", slug: "upsc-2027", title: "UPSC 2027", totalTests: 4 }),
  ]

  test("the card grid renders every series title and its View Test Series link", () => {
    const html = renderToStaticMarkup(
      React.createElement(TestSeriesGrid, { series: rows, savedSeries: [] })
    )

    for (const row of rows) {
      assert.ok(html.includes(row.title), `server HTML must contain ${row.title}`)
      assert.ok(
        html.includes(`href="/test-series/${row.id}"`),
        `server HTML must link to /test-series/${row.id}`
      )
    }

    const ctaCount = html.split("View Test Series").length - 1
    assert.equal(ctaCount, rows.length, "each card keeps its View Test Series call to action")
    assert.ok(html.includes("12 Total Tests"), "the card keeps its published test count")
  })

  test("the ItemList JSON-LD lists every visible series in the rendered markup", () => {
    const seo = adaptTestSeriesCatalogSeo("https://aspirantbook.com", rows)
    const html = renderToStaticMarkup(SeoJsonLd({ schemas: seo.jsonLd }))

    assert.ok(html.includes('type="application/ld+json"'), "the JSON-LD script must render")
    assert.ok(html.includes('"@type":"ItemList"'), "the catalogue must emit an ItemList")
    assert.ok(html.includes('"numberOfItems":3'), `numberOfItems must be 3, got: ${html}`)

    for (const row of rows) {
      assert.ok(html.includes(row.title), `ItemList must contain ${row.title}`)
    }
  })

  test("series with zero published tests are excluded from the ItemList", () => {
    // The page filters before building the ItemList; mirror that here.
    const initialSeries = [
      series(),
      series({ id: "empty", slug: "empty", title: "Draft Series Without Tests", totalTests: 0 }),
    ]
    const visibleSeries = initialSeries.filter((row) => row.totalTests > 0)
    const seo = adaptTestSeriesCatalogSeo("https://aspirantbook.com", visibleSeries)
    const html = renderToStaticMarkup(SeoJsonLd({ schemas: seo.jsonLd }))

    assert.ok(html.includes('"numberOfItems":1'), `numberOfItems must be 1, got: ${html}`)
    assert.ok(html.includes("UPSC Full Length Test Series"))
    assert.equal(
      html.includes("Draft Series Without Tests"),
      false,
      "a series with zero published tests must not be advertised"
    )
  })

  test("the page hands server-read series to the client child", () => {
    const page = read(PAGE)

    assert.match(page, /loadPublishedSeriesForListing\(/, "the page must use the failure-aware loader")
    assert.match(page, /resolveListingForRender\(/, "the page must use the build/request render decision")
    assert.doesNotMatch(
      page,
      /\.catch\(\s*\(/,
      "the page must not swallow the catalogue error with .catch(...) => []"
    )
    assert.match(
      page,
      /<TestSeriesListingClient\s+initialSeries=\{initialSeries\}/,
      "the server-read series must be passed to the client child"
    )
    assert.match(page, /export const revalidate = 3600/, "the route stays ISR at 3600s")
    assert.doesNotMatch(page, /force-dynamic|export const dynamic/, "the route must stay static/ISR")
    assert.doesNotMatch(page, /\bcookies\(|\bheaders\(|searchParams/, "no request-time APIs on the page")
  })

  test("the client renders the server series without a hydration gate", () => {
    const client = read(CLIENT)
    const cards = read(CARDS)

    // State is seeded from the server payload, so the first server render and
    // the first client render both contain the cards.
    assert.match(
      client,
      /useState<TestSeriesItem\[\]>\(initialSeries\)/,
      "series state must be seeded from initialSeries"
    )
    assert.match(
      client,
      /useState\(initialSeries\.length === 0\)/,
      "the loading state must be computed from initialSeries, not defaulted to true"
    )
    assert.match(
      client,
      /useRef\(initialSeries\.length > 0\)/,
      "the first effect must keep the server series instead of replacing them"
    )

    // A mount/hydration flag must never gate the list itself.
    assert.doesNotMatch(client, /isHydrated/, "no isHydrated gate on the catalogue")

    // The card grid is the real presentational component tested above.
    assert.match(
      client,
      /<TestSeriesGrid\s+series=\{filteredSeries\}/,
      "the catalogue must render the server series through TestSeriesGrid"
    )
    assert.ok(
      cards.includes("View Test Series"),
      "each card keeps its View Test Series call to action"
    )

    // Personalisation happens after hydration and only for visitors who saved a
    // goal, so the server-rendered cards survive for crawlers.
    assert.match(
      client,
      /if \(!hasPersistedGoalSelection\(\)\) return/,
      "the first client effect must not refetch without a saved goal"
    )
  })
})
