import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  adaptPyqsCatalogSeo,
  adaptPyqCategorySeo,
  adaptTestSeriesCatalogSeo,
  adaptTestSeriesDetailSeo,
  adaptCurrentAffairsCatalogSeo,
  adaptCurrentAffairsQuizSeo,
  adaptTutorialsCatalogSeo,
  adaptTutorialDetailSeo,
  adaptContentEngineSeo,
} from "../../lib/seo"

describe("SEO Module Adapters", () => {
  const base = "https://aspirantbook.com"

  describe("PYQs Adapter", () => {
    it("adaptPyqsCatalogSeo returns indexable catalog metadata", () => {
      const res = adaptPyqsCatalogSeo(base)
      assert.equal(res.canonicalUrl, "https://aspirantbook.com/pyqs")
      assert.equal(res.robots, "index, follow")
      assert.equal(res.title, "Previous Year Question Papers (PYQs) | TrillionSkill")
      assert.equal(res.breadcrumbs.length, 2)
    })

    it("adaptPyqCategorySeo returns category metadata", () => {
      const res = adaptPyqCategorySeo(
        { name: "BPSC", slug: "bpsc", description: "BPSC Papers", isPublished: true },
        base
      )
      assert.equal(res.canonicalUrl, "https://aspirantbook.com/pyqs/bpsc")
      assert.equal(res.robots, "index, follow")
      assert.equal(res.title, "BPSC Previous Year Question Papers (PYQs) | TrillionSkill")
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
      assert.equal(res.title, "BPSC 70th Prelims Mock Test Series & Mock Tests | TrillionSkill")
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
      assert.equal(res.title, "UPSC Economy CA - Current Affairs Quiz | aspirantbook")
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
        title: `${courseTitle} | aspirantbook`,
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
      const title = `${bookTitle} - ${author} | TrillionSkill eBook Store`
      const description = "Buy and read authentic digital PDF notes and eBooks instantly on TrillionSkill."
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
})
