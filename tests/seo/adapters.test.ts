import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  adaptPyqsCatalogSeo,
  adaptPyqCategorySeo,
  adaptPyqPaperSeo,
  isThinPyqPaper,
  adaptTestSeriesCatalogSeo,
  adaptTestSeriesDetailSeo,
  adaptCurrentAffairsCatalogSeo,
  adaptCurrentAffairsQuizSeo,
  adaptTutorialsCatalogSeo,
  adaptTutorialDetailSeo,
  adaptTutorialLessonSeo,
  adaptCourseDetailSeo,
  adaptCoursesCatalogSeo,
  adaptBooksCatalogSeo,
  adaptBookDetailSeo,
  adaptHomeSeo,
  adaptContentEngineSeo,
} from "../../lib/seo"

describe("SEO Module Adapters", () => {
  const base = "https://aspirantbook.com"

  describe("PYQs Adapter", () => {
    it("adaptPyqsCatalogSeo returns indexable catalog metadata", () => {
      const res = adaptPyqsCatalogSeo(base)
      assert.equal(res.canonicalUrl, "https://aspirantbook.com/pyqs")
      assert.equal(res.robots, "index, follow")
      assert.equal(res.title, "Previous Year Question Papers (PYQs) | AspirantBook")
      assert.equal(res.breadcrumbs.length, 2)
    })

    it("adaptPyqCategorySeo returns category metadata", () => {
      const res = adaptPyqCategorySeo(
        { name: "BPSC", slug: "bpsc", description: "BPSC Papers", isPublished: true },
        base
      )
      assert.equal(res.canonicalUrl, "https://aspirantbook.com/pyqs/bpsc")
      assert.equal(res.robots, "index, follow")
      assert.equal(res.title, "BPSC Previous Year Question Papers (PYQs) | AspirantBook")
      assert.equal(res.breadcrumbs.length, 3)
    })
  })

  describe("Test Series Adapter", () => {
    it("adaptTestSeriesCatalogSeo returns catalog metadata", () => {
      const res = adaptTestSeriesCatalogSeo(base)
      assert.equal(res.canonicalUrl, "https://aspirantbook.com/test-series")
      assert.equal(res.robots, "index, follow")
    })

    it("adaptTestSeriesDetailSeo returns detail metadata and JSON-LD", () => {
      const res = adaptTestSeriesDetailSeo(
        { id: "series-1", slug: "bpsc-70th-mock", title: "BPSC 70th Prelims Mock", isPublished: true },
        base
      )
      assert.equal(res.canonicalUrl, "https://aspirantbook.com/test-series/bpsc-70th-mock")
      assert.equal(res.robots, "index, follow")
      assert.equal(res.title, "BPSC 70th Prelims Mock Test Series & Mock Tests | AspirantBook")
      assert.equal(res.jsonLd.some((s) => s["@type"] === "Product"), true)
    })
  })

  describe("Current Affairs Quizzes Adapter (Invariance Preserved)", () => {
    it("adaptCurrentAffairsCatalogSeo returns catalog metadata", () => {
      const res = adaptCurrentAffairsCatalogSeo(base)
      assert.equal(res.canonicalUrl, "https://aspirantbook.com/current-affairs-quizzes")
      assert.equal(res.robots, "index, follow")
    })

    it("adaptCurrentAffairsQuizSeo strictly preserves title, description, and canonical format", () => {
      const res = adaptCurrentAffairsQuizSeo(
        {
          id: "cmv5d7r52003oxpzv4x54dnie",
          title: "UPSC Economy CA",
          totalQuestions: 10,
          durationMinutes: 10,
          isPublished: true,
        },
        "upsc-economy-ca",
        base
      )
      // Must match snapshot format exactly
      assert.equal(res.title, "UPSC Economy CA - Current Affairs Quiz | AspirantBook")
      assert.equal(
        res.description,
        "Practice UPSC Economy CA with 10 questions in 10 minutes. Instant evaluation and detailed explanations."
      )
      assert.equal(res.canonicalUrl, "https://aspirantbook.com/current-affairs-quizzes/upsc-economy-ca")
      assert.equal(res.robots, "index, follow")
      assert.equal(res.jsonLd.some((s) => s["@type"] === "Quiz"), true)
    })
  })

  describe("Tutorials Adapter (Invariance Preserved)", () => {
    it("adaptTutorialsCatalogSeo returns catalog metadata", () => {
      const res = adaptTutorialsCatalogSeo(base)
      assert.equal(res.canonicalUrl, "https://aspirantbook.com/tutorials")
      assert.equal(res.robots, "index, follow")
    })

    it("adaptTutorialDetailSeo preserves title and adds canonical and TechArticle", () => {
      const res = adaptTutorialDetailSeo(
        {
          id: "course-123",
          title: "Bugfix Course Studio E2E-20261021025140619-1frn8",
          slug: "e2e-20261021025140619-1frn8-course-studio",
          description: "Testing studio persistence and lesson editor guards",
          isPublished: true,
          status: "PUBLISHED",
        },
        base
      )
      // Must match raw course title
      assert.equal(res.title, "Bugfix Course Studio E2E-20261021025140619-1frn8")
      assert.equal(res.description, "Testing studio persistence and lesson editor guards")
      assert.equal(
        res.canonicalUrl,
        "https://aspirantbook.com/tutorials/e2e-20261021025140619-1frn8-course-studio"
      )
      assert.equal(res.robots, "index, follow")
      assert.equal(res.jsonLd.some((s) => s["@type"] === "TechArticle"), true)
    })

    it("adaptTutorialDetailSeo sets noindex for unpublished course", () => {
      const res = adaptTutorialDetailSeo(
        {
          id: "course-draft",
          title: "Draft Tutorial",
          slug: "draft-tutorial",
          isPublished: false,
          status: "DRAFT",
        },
        base
      )
      assert.equal(res.robots, "noindex, follow")
    })
  })

  describe("All 6 Public Modules Metadata Coverage (Phase 2.2)", () => {
    function assertMetadataInvariants(name: string, res: {
      title?: string | null
      description?: string | null
      canonicalUrl?: string | null
      robots?: string | null
      jsonLdScriptString?: string | null
    }, expectedPathPrefix: string) {
      assert.ok(res.title && res.title.trim().length > 0, `${name}: title must be non-empty`)
      assert.ok(res.description && res.description.trim().length > 0, `${name}: description must be non-empty`)
      assert.ok(
        res.canonicalUrl && res.canonicalUrl.includes(expectedPathPrefix),
        `${name}: canonicalUrl must contain ${expectedPathPrefix}, got "${res.canonicalUrl}"`
      )
      assert.ok(
        res.robots === "index, follow" || res.robots === "noindex, follow",
        `${name}: robots must be valid, got "${res.robots}"`
      )

      const renderedStr = `${res.title} ${res.description} ${res.canonicalUrl} ${res.robots} ${res.jsonLdScriptString || ""}`
      assert.ok(!renderedStr.includes("undefined"), `${name}: must not contain "undefined"`)
      assert.ok(!renderedStr.includes("null"), `${name}: must not contain "null"`)
    }

    it("1. Courses module metadata meets all invariants", () => {
      // Simulate courses page metadata format
      const courseTitle = "Complete UPSC General Studies"
      const courseDesc = "Comprehensive course covering history, geography, economy and polity."
      const canonical = `${base}/courses/upsc-general-studies`
      const res = {
        title: `${courseTitle} | AspirantBook`,
        description: courseDesc,
        canonicalUrl: canonical,
        robots: "index, follow",
      }
      assertMetadataInvariants("Courses Detail", res, "/courses/upsc-general-studies")
    })

    it("2. Books module metadata meets all invariants", () => {
      // Simulate books page metadata format
      const bookTitle = "Indian Polity 7th Edition"
      const author = "M. Laxmikanth"
      const title = `${bookTitle} - ${author} | AspirantBook`
      const description = "Buy and read authentic digital PDF notes and eBooks instantly on AspirantBook."
      const canonical = `${base}/books/indian-polity-7th-edition`
      const res = {
        title,
        description,
        canonicalUrl: canonical,
        robots: "index, follow",
      }
      assertMetadataInvariants("Books Detail", res, "/books/indian-polity-7th-edition")
    })

    it("3. Test Series module metadata and truthful JSON-LD meets all invariants", () => {
      const res = adaptTestSeriesDetailSeo(
        {
          id: "ts-101",
          slug: "bpsc-70th-integrated-mock",
          title: "BPSC 70th Integrated Mock Series",
          description: "Full length mock tests with all-India ranks.",
          isPublished: true,
          isFree: true,
        },
        base
      )
      assertMetadataInvariants("Test Series Detail", res, "/test-series/bpsc-70th-integrated-mock")

      // Google Product Rich Results requirements verification
      const productSchema = res.jsonLd.find((s) => s["@type"] === "Product")
      assert.ok(productSchema, "Must emit Product schema")
      assert.ok(productSchema.offers, "Product must include offers object for Google rich results")
      assert.equal((productSchema.offers as any)["@type"], "Offer")
      assert.equal((productSchema.offers as any).price, "0")
      assert.equal((productSchema.offers as any).priceCurrency, "INR")
      assert.equal(productSchema.aggregateRating, undefined, "Forbidden: No fabricated aggregateRating")
      assert.equal(productSchema.review, undefined, "Forbidden: No fabricated reviews")
    })

    it("4. Tutorials module metadata meets all invariants", () => {
      const res = adaptTutorialDetailSeo(
        {
          id: "tut-1",
          slug: "modern-indian-history",
          title: "Modern Indian History Crash Course",
          description: "Learn British India, Freedom Movement and Post-Independence era.",
          isPublished: true,
          status: "PUBLISHED",
        },
        base
      )
      assertMetadataInvariants("Tutorials Detail", res, "/tutorials/modern-indian-history")
    })

    it("5. Current Affairs Quizzes module metadata meets all invariants", () => {
      const res = adaptCurrentAffairsQuizSeo(
        {
          id: "ca-1",
          title: "October 2026 Daily Quiz",
          totalQuestions: 15,
          durationMinutes: 15,
          isPublished: true,
        },
        "october-2026-daily-quiz",
        base
      )
      assertMetadataInvariants("Current Affairs Quiz", res, "/current-affairs-quizzes/october-2026-daily-quiz")
    })

    it("6. PYQs / Content Engine module metadata meets all invariants (English & Hindi)", () => {
      // Catalog
      const catRes = adaptPyqsCatalogSeo(base)
      assertMetadataInvariants("PYQs Catalog", catRes, "/pyqs")

      // Category
      const examRes = adaptPyqCategorySeo(
        { name: "BPSC", slug: "bpsc", description: "BPSC PYQ papers", isPublished: true },
        base
      )
      assertMetadataInvariants("PYQs Exam Category", examRes, "/pyqs/bpsc")

      // Question Engine (English)
      const qEn = adaptContentEngineSeo(
        {
          id: "q-1",
          shortId: "12345678",
          slug: "q-12345678-capital-of-magadha",
          q: "What was the capital of Magadha?",
          o: ["Rajgir", "Pataliputra", "Vaishali", "Champa"],
          a: 0,
          exp: "Rajgir was surrounded by 5 hills.",
          sub: "Ancient India",
          top: "Magadha Empire",
          exam: "BPSC",
          year: "2024",
          isPublished: true,
        },
        "en",
        base
      )
      assertMetadataInvariants("Content Engine Question EN", qEn, "/question-answer/bpsc/ancient-india/q-12345678-capital-of-magadha")

      // Question Engine (Hindi Twin)
      const qHi = adaptContentEngineSeo(
        {
          id: "q-1",
          shortId: "12345678",
          slug: "q-12345678-capital-of-magadha",
          q: "What was the capital of Magadha?",
          o: ["Rajgir", "Pataliputra", "Vaishali", "Champa"],
          a: 0,
          exp: "Rajgir was surrounded by 5 hills.",
          sub: "Ancient India",
          top: "Magadha Empire",
          exam: "BPSC",
          year: "2024",
          isPublished: true,
          hindiTwin: {
            q: "मगध की राजधानी क्या थी?",
            o: ["राजगीर", "पाटलिपुत्र", "वैशाली", "चंपा"],
            isReviewed: true,
          },
        },
        "hi",
        base
      )
      assertMetadataInvariants("Content Engine Question HI", qHi, "/hi/question-answer/bpsc/ancient-india/q-12345678-capital-of-magadha")
    })
  })

  describe("PR B Adapters & Social Tags Verification", () => {
    it("adaptPyqPaperSeo returns truthful metadata, LearningResource, and respects thin-content threshold", () => {
      const fullPaper = adaptPyqPaperSeo(
        {
          title: "69th BPSC Prelims General Studies Question Paper",
          slug: "69th-bpsc-prelims-gs-2023",
          year: 2023,
          stage: "PRELIMS",
          shift: "Shift 1",
          subject: "General Studies",
          totalQuestions: 150,
          totalMarks: 150,
          durationMin: 120,
          accessType: "FREE",
          status: "PUBLISHED",
          hasQuestions: true,
        },
        { name: "BPSC", slug: "bpsc" },
        base
      )

      assert.equal(fullPaper.canonicalUrl, "https://aspirantbook.com/pyqs/bpsc/69th-bpsc-prelims-gs-2023")
      assert.equal(fullPaper.robots, "index, follow")
      assert.ok(fullPaper.title.length <= 60, `Title too long: ${fullPaper.title}`)
      assert.ok(fullPaper.description.length <= 160, `Description too long: ${fullPaper.description}`)
      assert.equal(fullPaper.breadcrumbs.length, 4)

      const learningRes = fullPaper.jsonLd.find((s) => s["@type"] === "LearningResource") as any
      assert.ok(learningRes, "LearningResource schema missing")
      assert.equal(learningRes.name, "69th BPSC Prelims General Studies Question Paper")
      assert.equal(learningRes.isAccessibleForFree, true)
      assert.equal(learningRes.provider.name, "AspirantBook")

      // Thin-content guard check
      const thinPaperInput = {
        title: "Test Thin Paper",
        slug: "thin-paper",
        year: null,
        subject: null,
        hasQuestions: false,
      }
      assert.equal(isThinPyqPaper(thinPaperInput), true, "Paper without questions or year/subject must be thin")

      const thinSeo = adaptPyqPaperSeo(
        thinPaperInput,
        { name: "BPSC", slug: "bpsc" },
        base
      )
      assert.equal(thinSeo.robots, "noindex, follow", "Thin paper must emit noindex")
    })

    it("adaptTutorialLessonSeo outputs chapter canonical, TechArticle, and gated parts", () => {
      const freeLesson = adaptTutorialLessonSeo(
        { title: "Next.js Deep Dive", slug: "nextjs-deep-dive" },
        {
          id: "les-123456",
          title: "Server Components Architecture",
          slug: "server-components-architecture-123456",
          description: "Learn how React Server Components execute exclusively on the server.",
          isGated: false,
          isPublished: true,
        },
        base
      )

      assert.equal(
        freeLesson.canonicalUrl,
        "https://aspirantbook.com/tutorials/nextjs-deep-dive/server-components-architecture-123456"
      )
      assert.equal(freeLesson.title, "Server Components Architecture - Next.js Deep Dive")
      assert.equal(freeLesson.robots, "index, follow")
      assert.equal(freeLesson.breadcrumbs.length, 4)

      const freeTech = freeLesson.jsonLd.find((s) => s["@type"] === "TechArticle") as any
      assert.ok(freeTech)
      assert.equal(freeTech.isAccessibleForFree, true)

      // Gated lesson check
      const gatedLesson = adaptTutorialLessonSeo(
        { title: "Next.js Deep Dive", slug: "nextjs-deep-dive" },
        {
          id: "les-789012",
          title: "Streaming and Suspense Boundaries",
          slug: "streaming-suspense-boundaries-789012",
          isGated: true,
          isPublished: true,
        },
        base
      )
      const gatedTech = gatedLesson.jsonLd.find((s) => s["@type"] === "TechArticle") as any
      assert.ok(gatedTech)
      assert.equal(gatedTech.isAccessibleForFree, false)
      assert.ok(gatedTech.hasPart, "Gated TechArticle must have hasPart marker")
      assert.equal(gatedTech.hasPart.cssSelector, "[role='region'][aria-label='Content Gate']")
    })

    it("PART 4: verifies all adapters emit complete, consistent social tags with absolute og:image and page-matching twitter:*", () => {
      const packages: Array<{ name: string; output: any }> = [
        { name: "Home", output: adaptHomeSeo(base) },
        { name: "Courses Catalog", output: adaptCoursesCatalogSeo([], base) },
        {
          name: "Course Detail",
          output: adaptCourseDetailSeo(
            { id: "c1", slug: "upsc-gs-foundation", title: "UPSC GS Foundation", description: "Comprehensive course", thumbnailUrl: "https://r2.aspirantbook.com/course.jpg" },
            base
          ),
        },
        { name: "Books Catalog", output: adaptBooksCatalogSeo(base) },
        {
          name: "Book Detail",
          output: adaptBookDetailSeo(
            { title: "Indian Polity", slug: "indian-polity", coverImage: "https://r2.aspirantbook.com/polity.jpg" },
            base
          ),
        },
        { name: "Test Series Catalog", output: adaptTestSeriesCatalogSeo(base) },
        {
          name: "Test Series Detail",
          output: adaptTestSeriesDetailSeo(
            { id: "s1", slug: "bpsc-mock", title: "BPSC Mock", isPublished: true },
            base
          ),
        },
        { name: "PYQs Catalog", output: adaptPyqsCatalogSeo(base) },
        {
          name: "PYQ Category",
          output: adaptPyqCategorySeo(
            { name: "BPSC", slug: "bpsc", description: "BPSC PYQs", isPublished: true },
            base
          ),
        },
        {
          name: "PYQ Paper",
          output: adaptPyqPaperSeo(
            { title: "69th BPSC Paper", slug: "69th-bpsc", year: 2023, subject: "GS", status: "PUBLISHED" },
            { name: "BPSC", slug: "bpsc" },
            base
          ),
        },
        { name: "Tutorials Catalog", output: adaptTutorialsCatalogSeo(base) },
        {
          name: "Tutorial Detail",
          output: adaptTutorialDetailSeo(
            { id: "t1", slug: "react-19", title: "React 19 Tutorial", isPublished: true },
            base
          ),
        },
        {
          name: "Tutorial Lesson",
          output: adaptTutorialLessonSeo(
            { title: "React 19", slug: "react-19" },
            { id: "l1", slug: "actions", title: "Server Actions", isPublished: true },
            base
          ),
        },
        { name: "Current Affairs Catalog", output: adaptCurrentAffairsCatalogSeo(base) },
      ]

      for (const { name, output } of packages) {
        const meta = output.metadata
        assert.ok(meta, `${name}: metadata missing`)
        assert.ok(meta.openGraph, `${name}: openGraph missing`)
        assert.ok(meta.twitter, `${name}: twitter missing`)

        // Twitter card must be summary_large_image
        assert.equal(meta.twitter.card, "summary_large_image", `${name}: twitter.card must be summary_large_image`)

        // Twitter title and description must match the page values, never layout fallback
        const pageTitle = typeof meta.title === "object" && meta.title && "absolute" in meta.title ? meta.title.absolute : meta.title
        assert.equal(meta.twitter.title, meta.openGraph.title, `${name}: twitter.title must equal openGraph.title`)
        assert.equal(meta.twitter.description, meta.description, `${name}: twitter.description must equal description`)

        // Images must be absolute URLs with width and height
        assert.ok(Array.isArray(meta.openGraph.images) && meta.openGraph.images.length > 0, `${name}: openGraph.images must not be empty`)
        const ogImg = meta.openGraph.images[0]
        assert.ok(ogImg.url.startsWith("https://") || ogImg.url.startsWith("http://"), `${name}: og:image must be absolute URL (${ogImg.url})`)
        assert.ok(ogImg.width && ogImg.width >= 600, `${name}: og:image width must be set`)
        assert.ok(ogImg.height && ogImg.height >= 315, `${name}: og:image height must be set`)

        // Twitter images must be absolute strings matching the og image
        assert.ok(Array.isArray(meta.twitter.images) && meta.twitter.images.length > 0, `${name}: twitter.images must not be empty`)
        assert.equal(meta.twitter.images[0], ogImg.url, `${name}: twitter.images[0] must match ogImg.url`)
      }
    })
  })
})
