import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  getBaseUrl,
  canonicalUrl,
  robotsPolicy,
  hreflangAlternates,
  safeJsonLdStringify,
  buildBreadcrumbListJsonLd,
  buildQuizJsonLd,
  buildArticleJsonLd,
  buildFaqJsonLd,
  buildMetadata,
  buildSeoPackage,
  buildSitemapEntry,
  SITE_NAME,
  buildHomeJsonLd,
} from "../../lib/seo/core"

describe("SEO Core Pure Functions", () => {
  it("getBaseUrl returns site URL without trailing slashes", () => {
    assert.equal(getBaseUrl("https://example.com/"), "https://example.com")
    assert.equal(getBaseUrl("https://example.com///"), "https://example.com")
  })

  it("getBaseUrl handles env set, unset in dev, and unset in production strictly", () => {
    const origEnv = { ...process.env }
    try {
      // 1. Env set
      process.env.NEXT_PUBLIC_SITE_URL = "https://my-domain.org"
      ;(process.env as Record<string, string | undefined>).NODE_ENV = "production"
      assert.equal(getBaseUrl(), "https://my-domain.org")

      // 2. Env unset in development
      delete process.env.NEXT_PUBLIC_SITE_URL
      delete process.env.NEXT_PUBLIC_APP_URL
      ;(process.env as Record<string, string | undefined>).NODE_ENV = "development"
      assert.equal(getBaseUrl(), "http://127.0.0.1:3045")

      // 3. Env unset in production -> returns "" (no hardcoded domain)
      ;(process.env as Record<string, string | undefined>).NODE_ENV = "production"
      let errorLogged = false
      const origError = console.error
      console.error = (...args: any[]) => {
        errorLogged = true
      }
      try {
        const prodBase = getBaseUrl()
        assert.equal(prodBase, "")
        assert.equal(canonicalUrl("/exam/test"), "")
        assert.ok(errorLogged, "Must log console.error when site URL is unset in production")
      } finally {
        console.error = origError
      }
    } finally {
      process.env = origEnv
    }
  })

  it("canonicalUrl normalizes path and appends to base URL", () => {
    const url1 = canonicalUrl("/tutorials/sample-course", "https://aspirantbook.com")
    assert.equal(url1, "https://aspirantbook.com/tutorials/sample-course")

    const url2 = canonicalUrl("pyqs/bpsc", "https://aspirantbook.com/")
    assert.equal(url2, "https://aspirantbook.com/pyqs/bpsc")
  })

  it("robotsPolicy produces index, follow or noindex, follow", () => {
    assert.equal(robotsPolicy({ isIndexable: true }), "index, follow")
    assert.equal(robotsPolicy({ isIndexable: false }), "noindex, follow")
    assert.equal(robotsPolicy({ isIndexable: false, noFollow: true }), "noindex, nofollow")
  })

  it("hreflangAlternates produces bilingual links only when Hindi is reviewed", () => {
    // Case 1: Hindi not reviewed -> only en and x-default
    const unreviewed = hreflangAlternates(
      { en: "/question-answer/q1", hi: "/hi/question-answer/q1" },
      false,
      "https://aspirantbook.com"
    )
    assert.equal(unreviewed.en, "https://aspirantbook.com/question-answer/q1")
    assert.equal(unreviewed["x-default"], "https://aspirantbook.com/question-answer/q1")
    assert.equal(unreviewed.hi, undefined)

    // Case 2: Hindi reviewed -> en, x-default, and hi
    const reviewed = hreflangAlternates(
      { en: "/question-answer/q1", hi: "/hi/question-answer/q1" },
      true,
      "https://aspirantbook.com"
    )
    assert.equal(reviewed.en, "https://aspirantbook.com/question-answer/q1")
    assert.equal(reviewed["x-default"], "https://aspirantbook.com/question-answer/q1")
    assert.equal(reviewed.hi, "https://aspirantbook.com/hi/question-answer/q1")
  })

  it("safeJsonLdStringify neutralizes < into \\u003c to prevent script injection", () => {
    const dangerousPayload = {
      title: "Test </script><script>alert('xss')</script>",
      tag: "<img src=x onerror=alert(1)>",
    }
    const safeString = safeJsonLdStringify(dangerousPayload)
    assert.equal(safeString.includes("<"), false)
    assert.equal(safeString.includes("\\u003c"), true)
  })

  it("buildBreadcrumbListJsonLd generates valid Schema.org BreadcrumbList", () => {
    const list = buildBreadcrumbListJsonLd([
      { name: "Home", url: "https://aspirantbook.com" },
      { name: "PYQs", url: "https://aspirantbook.com/pyqs" },
    ])
    assert.equal(list["@type"], "BreadcrumbList")
    const items = list.itemListElement as any[]
    assert.equal(items.length, 2)
    assert.equal(items[0].position, 1)
    assert.equal(items[0].name, "Home")
    assert.equal(items[1].position, 2)
    assert.equal(items[1].name, "PYQs")
  })

  it("buildQuizJsonLd formats questions and options correctly", () => {
    const quiz = buildQuizJsonLd({
      name: "Modern Indian History Quiz",
      assesses: "History",
      questions: [
        {
          text: "Who was the Viceroy during the Partition of Bengal?",
          acceptedAnswer: "Lord Curzon",
          suggestedAnswers: ["Lord Ripon", "Lord Minto", "Lord Chelmsford"],
          explanation: "Lord Curzon partitioned Bengal in 1905.",
        },
      ],
    })
    assert.equal(quiz["@type"], "Quiz")
    assert.equal(quiz.name, "Modern Indian History Quiz")
    const parts = quiz.hasPart as any[]
    assert.equal(parts.length, 1)
    assert.equal(parts[0].eduQuestionType, "Multiple choice")
    assert.equal(parts[0].acceptedAnswer.text, "Lord Curzon")
    assert.equal(parts[0].acceptedAnswer.answerExplanation.text, "Lord Curzon partitioned Bengal in 1905.")
    assert.equal(parts[0].suggestedAnswer.length, 3)
  })

  it("buildArticleJsonLd formats Article / TechArticle correctly", () => {
    const article = buildArticleJsonLd({
      type: "TechArticle",
      headline: "Introduction to Next.js App Router",
      description: "Comprehensive guide to App Router and SEO",
      inLanguage: "en",
    })
    assert.equal(article["@type"], "TechArticle")
    assert.equal(article.headline, "Introduction to Next.js App Router")
    assert.equal(article.inLanguage, "en")
  })

  it("buildFaqJsonLd formats FAQPage schema correctly", () => {
    const faq = buildFaqJsonLd([
      { question: "Is this course free?", answer: "Yes, fully free." },
    ])
    assert.equal(faq["@type"], "FAQPage")
    const entities = faq.mainEntity as any[]
    assert.equal(entities.length, 1)
    assert.equal(entities[0].name, "Is this course free?")
    assert.equal(entities[0].acceptedAnswer.text, "Yes, fully free.")
  })

  it("buildMetadata outputs full Next.js Metadata object", () => {
    const meta = buildMetadata({
      title: "BPSC PYQ Catalog",
      description: "Previous year question papers for BPSC",
      canonicalPath: "/pyqs/bpsc",
      isPublished: true,
    }, "https://aspirantbook.com")

    assert.equal(meta.title, "BPSC PYQ Catalog")
    assert.equal(meta.description, "Previous year question papers for BPSC")
    assert.equal(meta.robots, "index, follow")
    assert.equal((meta.alternates as any)?.canonical, "https://aspirantbook.com/pyqs/bpsc")
  })

  it("buildSeoPackage returns JSON-LD script string and complete package", () => {
    const pkg = buildSeoPackage({
      title: "Test Series",
      description: "Complete Test Series",
      canonicalPath: "/test-series",
      breadcrumbs: [
        { name: "Home", url: "https://aspirantbook.com" },
        { name: "Test Series", url: "https://aspirantbook.com/test-series" },
      ],
    }, "https://aspirantbook.com")

    assert.equal(pkg.title, "Test Series")
    assert.equal(pkg.canonicalUrl, "https://aspirantbook.com/test-series")
    assert.equal(pkg.jsonLd.length, 1)
    assert.equal(pkg.jsonLdScriptString.includes("<script type=\"application/ld+json\">"), true)
  })

  it("buildSitemapEntry returns valid sitemap shape", () => {
    const entry = buildSitemapEntry("/pyqs", {
      changeFrequency: "daily",
      priority: 0.9,
      baseUrl: "https://aspirantbook.com",
    })
    assert.equal(entry.url, "https://aspirantbook.com/pyqs")
    assert.equal(entry.changeFrequency, "daily")
    assert.equal(entry.priority, 0.9)
    assert.ok(entry.lastModified)
  })

  it("exports SITE_NAME and buildHomeJsonLd with correct schema graph", () => {
    assert.equal(SITE_NAME, "AspirantBook")
    const homeJson = buildHomeJsonLd("https://example.com")
    assert.ok(homeJson)
    const graph = (homeJson as any)["@graph"]
    assert.equal(graph.length, 2)
    assert.equal(graph[0]["@type"], "Organization")
    assert.equal(graph[0].name, "AspirantBook")
    assert.equal(graph[1]["@type"], "WebSite")
    assert.equal(graph[1].name, "AspirantBook")
  })
})
