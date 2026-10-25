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
})
