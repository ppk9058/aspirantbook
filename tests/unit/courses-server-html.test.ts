import assert from "node:assert/strict"
import { describe, test } from "node:test"
import fs from "node:fs"
import path from "node:path"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import {
  fetchPublishedCoursesForListing,
  isBuildTimePrerender,
  loadPublishedCoursesForListing,
  resolveCourseListingForRender,
  CourseListingUnavailableError,
  type PublishedCourseItem,
} from "../../lib/courses/course-listing"
import { PUBLIC_CATALOGUE_PATHS } from "../../lib/cache/public-catalogue-cache"
import { adaptCoursesCatalogSeo } from "../../lib/seo/adapters/courses"
import { SeoJsonLd } from "../../lib/seo/json-ld"

// The app compiles JSX with the classic runtime under `tsx --test`
Object.assign(globalThis, { React })

const ROOT = path.resolve(__dirname, "../..")
const PAGE = "app/(dashboard)/courses/page.tsx"
const CLIENT = "components/courses/CourseClient.tsx"

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8")
}

function sampleCourse(overrides: Partial<PublishedCourseItem> = {}): PublishedCourseItem {
  return {
    id: "upsc-gs-1",
    slug: "upsc-gs-foundation-2026",
    title: "UPSC GS Comprehensive Foundation Batch",
    description: "Complete general studies foundation course for civil services.",
    thumbnailUrl: "https://r2.aspirantbook.com/upsc.jpg",
    difficulty: "BEGINNER",
    rating: 4.8,
    enrollmentCount: 120,
    duration: 1200,
    isPremium: true,
    technology: "UPSC",
    isTutorial: false,
    goalId: "upsc",
    category: "UPSC",
    subject: "General Studies",
    tags: ["upsc", "gs"],
    ...overrides,
  }
}

describe("courses server catalogue — failed reads are not an empty catalogue", () => {
  test("a failed read is reported, not turned into a valid empty list", async () => {
    const broken = () =>
      Promise.reject(
        new Error(
          "Can't reach database server at 127.0.0.1:54329 (connection refused)"
        )
      )

    const snapshot = await loadPublishedCoursesForListing(broken)

    assert.equal(
      snapshot.available,
      false,
      "snapshot.available must be false when the underlying read fails"
    )
    assert.deepEqual(snapshot.courses, [])
    assert.ok(
      snapshot.error instanceof CourseListingUnavailableError,
      "the failure must be captured as CourseListingUnavailableError"
    )
    assert.equal(snapshot.error?.code, "COURSE_LISTING_UNAVAILABLE")
  })

  test("a successful read of zero rows is still a successful read", async () => {
    const empty = () => Promise.resolve([])
    const snapshot = await loadPublishedCoursesForListing(empty)

    assert.equal(snapshot.available, true)
    assert.deepEqual(snapshot.courses, [])
    assert.equal(snapshot.error, undefined)
  })

  test("a successful read keeps every course", async () => {
    const list = [
      sampleCourse({ id: "c1", slug: "upsc-course", goalId: "upsc" }),
      sampleCourse({ id: "c2", slug: "bpsc-course", title: "BPSC 72nd Foundation", goalId: "bpsc" }),
    ]
    const snapshot = await loadPublishedCoursesForListing(async () => list)

    assert.equal(snapshot.available, true)
    assert.equal(snapshot.courses.length, 2)
  })

  test("fetchPublishedCoursesForListing throws instead of returning [] when the query fails", async () => {
    const { prisma } = await import("../../lib/prisma")
    const original = prisma.course.findMany
    try {
      prisma.course.findMany = (async () => {
        throw new Error("Pool timed out")
      }) as any

      await assert.rejects(
        () => fetchPublishedCoursesForListing(),
        (err: any) => {
          assert.ok(err instanceof CourseListingUnavailableError)
          assert.equal(err.code, "COURSE_LISTING_UNAVAILABLE")
          assert.ok(err.cause)
          return true
        }
      )
    } finally {
      prisma.course.findMany = original
    }
  })
})

describe("courses render decision — empty build vs. request-time failure", () => {
  test("a successful snapshot renders its courses", () => {
    const list = [sampleCourse()]
    const rendered = resolveCourseListingForRender(
      { courses: list, available: true },
      false
    )
    assert.deepEqual(rendered, list)
  })

  test("a failed read during next build keeps the build green and caches nothing as data", () => {
    const error = new CourseListingUnavailableError(
      "Simulated build-time DB absence"
    )
    const rendered = resolveCourseListingForRender(
      { courses: [], available: false, error },
      true
    )

    assert.deepEqual(
      rendered,
      [],
      "buildTime = true must return [] so `next build` exits 0 in Docker"
    )
  })

  test("a failed read at request time throws so ISR keeps the last good page", () => {
    const error = new CourseListingUnavailableError(
      "Database unreachable at request time"
    )

    assert.throws(
      () =>
        resolveCourseListingForRender(
          { courses: [], available: false, error },
          false
        ),
      (thrown: any) => {
        assert.equal(thrown, error)
        return true
      },
      "resolveCourseListingForRender must rethrow at request time"
    )
  })
})

describe("courses server render — server HTML contains all exams' courses", () => {
  test("/courses is statically cached with 1h ISR and has no cookie/session runtime dependencies", () => {
    const source = read(PAGE)
    assert.ok(source.includes("revalidate = 3600"), "Page must declare revalidate = 3600")
    assert.equal(source.includes('dynamic = "force-dynamic"'), false, "Must not be force-dynamic")
    assert.equal(source.includes("cookies()"), false, "Server page must not read cookies()")
    assert.equal(source.includes("auth()"), false, "Server page must not call auth()")
    assert.equal(source.includes("headers()"), false, "Server page must not read headers()")
  })

  test("CourseClient initializes filterByGoal to false so crawlers see all exams' courses", () => {
    const source = read(CLIENT)
    assert.ok(
      source.includes("const [filterByGoal, setFilterByGoal] = useState(false)"),
      "CourseClient must initialize filterByGoal to false for crawlers/SSR"
    )
    assert.ok(
      source.includes("hasPersistedGoalSelection"),
      "CourseClient must personalise after hydration only if visitor has a saved exam target"
    )
  })

  test("ItemList JSON-LD and course cards are generated for multi-exam courses", () => {
    const courses = [
      sampleCourse({ id: "c1", slug: "upsc-foundation", title: "UPSC GS Foundation", goalId: "upsc" }),
      sampleCourse({ id: "c2", slug: "bpsc-mastery", title: "BPSC 72nd Bihar Special", goalId: "bpsc" }),
    ]

    const seo = adaptCoursesCatalogSeo(courses, "https://aspirantbook.com")
    const markup = renderToStaticMarkup(
      React.createElement(SeoJsonLd, { schemas: seo.jsonLd })
    )

    assert.ok(markup.includes("UPSC GS Foundation"))
    assert.ok(markup.includes("BPSC 72nd Bihar Special"))
    assert.ok(markup.includes("https://aspirantbook.com/courses/upsc-foundation"))
    assert.ok(markup.includes("https://aspirantbook.com/courses/bpsc-mastery"))
  })

  test("PUBLIC_CATALOGUE_PATHS includes /courses for boot health check revalidation", () => {
    assert.ok(
      PUBLIC_CATALOGUE_PATHS.includes("/courses" as any),
      "PUBLIC_CATALOGUE_PATHS must include /courses"
    )
  })
})
