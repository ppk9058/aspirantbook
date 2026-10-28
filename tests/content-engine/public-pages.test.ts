import { describe, it } from "node:test"
import assert from "node:assert/strict"
import robots from "@/app/robots"
import sitemapEn from "@/app/question-answer/sitemap"
import sitemapHi from "@/app/hi/question-answer/sitemap"
import { qaPath, examHubPath, yearHubPath, topicHubPath } from "@/lib/modules/content-engine/paths"
import { buildSeoModel, SeoQuestionInput } from "@/lib/modules/content-engine/seo-model"

// Connect to test database
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test"

describe("Phase 4 — Public SEO Routes & Sitemaps", () => {
  it("1. robots.ts: includes both English and Hindi question-answer sitemaps", () => {
    const rob = robots()
    assert.ok(Array.isArray(rob.sitemap), "robots.sitemap must be an array")
    assert.ok(
      rob.sitemap.some((s) => s.endsWith("/sitemap.xml")),
      "Must include main sitemap.xml"
    )
    assert.ok(
      rob.sitemap.some((s) => s.endsWith("/question-answer/sitemap.xml")),
      "Must include question-answer/sitemap.xml"
    )
    assert.ok(
      rob.sitemap.some((s) => s.endsWith("/hi/question-answer/sitemap.xml")),
      "Must include hi/question-answer/sitemap.xml"
    )
  })

  it("2. Path Builders: formats canonical URLs correctly for both English and Hindi", () => {
    const enQa = qaPath("en", "UPSC CSE", "History", "q-12345678-slug")
    assert.equal(enQa, "/question-answer/upsc-cse/history/q-12345678-slug")

    const hiQa = qaPath("hi", "UPSC CSE", "History", "q-12345678-slug")
    assert.equal(hiQa, "/hi/question-answer/upsc-cse/history/q-12345678-slug")

    const examHub = examHubPath("en", "UPSC CSE")
    assert.equal(examHub, "/question-answer/upsc-cse")

    const hiExamHub = examHubPath("hi", "UPSC CSE")
    assert.equal(hiExamHub, "/hi/question-answer/upsc-cse")

    const yearHub = yearHubPath("en", "UPSC CSE", "2023")
    assert.equal(yearHub, "/question-answer/upsc-cse/2023")

    const topicHub = topicHubPath("en", "UPSC CSE", "History", "Indus Valley Civilization")
    assert.equal(
      topicHub,
      "/question-answer/upsc-cse/history/topic/indus-valley-civilization"
    )
  })

  it("3. Native Sitemaps: generates valid sitemap entries", async () => {
    const enEntries = await sitemapEn()
    assert.ok(Array.isArray(enEntries), "English sitemap must return array")
    assert.ok(
      enEntries.some((e) => e.url.includes("/question-answer")),
      "Must contain home hub entry"
    )

    const hiEntries = await sitemapHi()
    assert.ok(Array.isArray(hiEntries), "Hindi sitemap must return array")
    assert.ok(
      hiEntries.some((e) => e.url.includes("/hi/question-answer")),
      "Must contain Hindi home hub entry"
    )
  })

  it("4. SEO Model & JSON-LD: canonical, hreflang, breadcrumbs, and XSS safety", () => {
    const sampleInput: SeoQuestionInput = {
      id: "q-1",
      shortId: "12345678",
      slug: "q-12345678-security-test",
      q: 'Consider the following about <script>alert("xss")</script> and Indus Valley:',
      o: ["Opt A", "Opt B", "Opt C", "Opt D"],
      a: 0,
      exp: "Explanation containing <b>HTML</b> and <script>alert(1)</script> for testing.",
      sub: "History",
      top: "Indus Valley Civilization",
      exam: "UPSC CSE",
      year: "2023",
      isPublished: true,
      hindiTwin: {
        q: "सिंधु घाटी सभ्यता के संबंध में निम्नलिखित कथनों पर विचार कीजिए:",
        o: ["विकल्प 1", "विकल्प 2", "विकल्प 3", "विकल्प 4"],
        exp: "विस्तृत व्याख्या।",
        isReviewed: true,
      },
    }

    const enModel = buildSeoModel(sampleInput, "en", "https://aspirantbook.com")
    assert.equal(enModel.robots, "index, follow")
    assert.equal(
      enModel.canonicalUrl,
      "https://aspirantbook.com/question-answer/upsc-cse/history/q-12345678-security-test"
    )
    assert.ok(enModel.hreflang.en)
    assert.ok(enModel.hreflang.hi)
    assert.ok(enModel.hreflang["x-default"])

    // JSON-LD safety verification: NO raw < allowed in script string
    assert.ok(
      !enModel.jsonLdScriptString.includes("<script>"),
      "JSON-LD script string must NOT contain unescaped <script>"
    )
    assert.ok(
      enModel.jsonLdScriptString.includes("\\u003c"),
      "JSON-LD script string must escape < as \\u003c"
    )

    // Unreviewed Hindi test: must have robots noindex
    const unrevSample: SeoQuestionInput = {
      ...sampleInput,
      hindiTwin: {
        ...sampleInput.hindiTwin!,
        isReviewed: false, // NOT reviewed
      },
    }
    const hiUnrevModel = buildSeoModel(unrevSample, "hi", "https://aspirantbook.com")
    assert.equal(
      hiUnrevModel.robots,
      "noindex, follow",
      "Unreviewed Hindi twin must be flagged noindex, follow"
    )
  })

  it("5. /q/[shortId] route handler returns 404 for unknown shortId", async () => {
    const { GET } = await import("@/app/q/[shortId]/route")
    const req = new Request("http://127.0.0.1:3045/q/nonexistent-short-id")
    const res = await GET(req, { params: Promise.resolve({ shortId: "nonexistent-short-id" }) })
    assert.equal(res.status, 404, `Expected 404 for unknown question, got ${res.status}`)
  })
})
