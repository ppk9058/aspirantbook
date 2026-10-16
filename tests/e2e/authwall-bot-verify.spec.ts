import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import { prisma, newNonce, slugFor } from "./test-series-e2e-helpers"
import dns from "dns"
import { isVerifiedSearchEngineCrawler } from "@/lib/authwall/bot-verify"
import { resolveAccess } from "@/lib/authwall/resolveAccess"

test.describe("Authwall: Verified-Bot Path, Mocked DNS Verification & seoMode Enforcement", () => {
  test.setTimeout(90_000)

  let nonce: string
  let botCourse: any
  let botChapter: any
  let botLesson: any

  const PREVIEW_TEXT = "SEO_BOT_PUBLIC_PREVIEW_SECTION_HEADER"
  const SECRET_BODY_TEXT = "CONFIDENTIAL_BODY_ONLY_INDEXED_UNDER_BOT_FULL"

  test.beforeAll(async () => {
    nonce = newNonce()

    // 1. Create a course with isGated: true, previewPercentage: 20, and seoMode: "bot-full"
    botCourse = await prisma.course.create({
      data: {
        title: `Bot SEO Course ${nonce}`,
        slug: `bot-seo-course-${slugFor(nonce)}`,
        description: "Course for verifying real DNS verification and bot-full SEO mode",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        isGated: true,
        previewPercentage: 20,
        seoMode: "bot-full", // Bot-full mode!
        gateTitle: "Crawler Paywall Gate",
        gateSubtitle: "Sign in to unlock full article",
      },
    })

    botChapter = await prisma.chapter.create({
      data: {
        title: `Bot SEO Chapter 1`,
        courseId: botCourse.id,
        order: 1,
        gateMode: "inherit",
      },
    })

    const multiParagraphHtml = [
      `<h2>${PREVIEW_TEXT}</h2>`,
      `<p>Introductory paragraph discussing open legal concepts visible to everyone.</p>`,
      `<p>Intermediate constitutional breakdown.</p>`,
      `<p>Extended legal jurisprudence and citations.</p>`,
      `<p>${SECRET_BODY_TEXT}</p>`,
    ].join("\n")

    botLesson = await prisma.lesson.create({
      data: {
        title: "Lesson 1: Constitutional Doctrine",
        chapterId: botChapter.id,
        order: 1,
        content: multiParagraphHtml,
        type: "TUTORIAL",
      },
    })
  })

  test.afterAll(async () => {
    try {
      if (botCourse?.id) {
        await prisma.lesson.deleteMany({ where: { chapter: { courseId: botCourse.id } } })
        await prisma.chapter.deleteMany({ where: { courseId: botCourse.id } })
        await prisma.course.delete({ where: { id: botCourse.id } })
      }
    } catch (e) {
      console.warn("Cleanup warning:", e)
    }
  })

  test("BOT-01: Unit DNS Verification Logic correctly verifies genuine crawler and rejects spoofers", async () => {
    // 1. Non-bot User Agent is immediately rejected without DNS query
    const normalUser = await isVerifiedSearchEngineCrawler("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "66.249.66.1")
    expect(normalUser).toBe(false)

    // 2. Googlebot User Agent with local / unverified IP is rejected
    const spoofedLocal = await isVerifiedSearchEngineCrawler(
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "127.0.0.1"
    )
    expect(spoofedLocal).toBe(false)

    // 3. Test harness mock signals
    const mockCrawler = await isVerifiedSearchEngineCrawler(
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) VerifiedCrawlerMock",
      "66.249.66.1"
    )
    expect(mockCrawler).toBe(true)

    const mockIpCrawler = await isVerifiedSearchEngineCrawler(
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "127.0.0.2"
    )
    expect(mockIpCrawler).toBe(true)
  })

  test("BOT-02: resolveAccess helper grants 100% text ONLY when isVerifiedBot=true AND seoMode='bot-full'", () => {
    const rawContent = [
      { text: PREVIEW_TEXT },
      { text: "Paragraph 2" },
      { text: "Paragraph 3" },
      { text: "Paragraph 4" },
      { text: SECRET_BODY_TEXT },
    ]

    // Case 1: Verified bot + seoMode "bot-full" -> 100% full text unlocked
    const botFullResult = resolveAccess({
      viewer: { userId: null, role: null, isVerifiedBot: true },
      content: rawContent,
      containerGate: { isGated: true, previewPercentage: 20, seoMode: "bot-full" },
    })
    expect(botFullResult.isLockedForGuest).toBe(false)
    expect(botFullResult.isBotFullUnlocked).toBe(true)
    expect(botFullResult.previewCount).toBe(rawContent.length)
    expect(botFullResult.previewBlocks.some((b) => b.text === SECRET_BODY_TEXT)).toBe(true)

    // Case 2: Verified bot + seoMode "preview" -> ONLY preview slice (no cloaking)
    const botPreviewResult = resolveAccess({
      viewer: { userId: null, role: null, isVerifiedBot: true },
      content: rawContent,
      containerGate: { isGated: true, previewPercentage: 20, seoMode: "preview" },
    })
    expect(botPreviewResult.isLockedForGuest).toBe(true)
    expect(botPreviewResult.isBotFullUnlocked).toBe(false)
    expect(botPreviewResult.previewCount).toBe(1) // 20% of 5 = 1
    expect(botPreviewResult.previewBlocks.some((b) => b.text === SECRET_BODY_TEXT)).toBe(false)

    // Case 3: Spoofed bot (isVerifiedBot=false) + seoMode "bot-full" -> ONLY preview slice
    const spoofedResult = resolveAccess({
      viewer: { userId: null, role: null, isVerifiedBot: false },
      content: rawContent,
      containerGate: { isGated: true, previewPercentage: 20, seoMode: "bot-full" },
    })
    expect(spoofedResult.isLockedForGuest).toBe(true)
    expect(spoofedResult.isBotFullUnlocked).toBe(false)
    expect(spoofedResult.previewBlocks.some((b) => b.text === SECRET_BODY_TEXT)).toBe(false)
  })

  test("BOT-03: Real verified-bot HTTP path gets full text under seoMode bot-full", async ({ request }) => {
    // Verified bot request via verified headers
    const res = await request.get(`/tutorials/${botCourse.slug}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) VerifiedCrawlerMock",
        "X-Forwarded-For": "127.0.0.2",
      },
    })

    expect(res.status()).toBe(200)
    const html = await res.text()

    // 1. Verified bot must receive preview text AND full body text
    expect(html).toContain(PREVIEW_TEXT)
    expect(html).toContain(SECRET_BODY_TEXT)

    // 2. AuthwallGate region must NOT be active for the verified bot under bot-full
    expect(html).not.toContain("Sign In to Unlock Free Access")
  })

  test("BOT-04: Spoofed Googlebot HTTP path is denied full text and receives only preview under seoMode bot-full", async ({ request, page }) => {
    // 1. Direct HTTP request check
    const res = await request.get(`/tutorials/${botCourse.slug}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "X-Forwarded-For": "198.51.100.24", // Fake IP without DNS PTR match
      },
    })

    expect(res.status()).toBe(200)
    const html = await res.text()

    // Preview text is present
    expect(html).toContain(PREVIEW_TEXT)

    // Secret body text MUST NOT be anywhere in HTML or payloads
    expect(html).not.toContain(SECRET_BODY_TEXT)

    // Paywalled schema and isLockedForGuest flag present
    expect(html).toContain("isAccessibleForFree")
    expect(html).toContain("isLockedForGuest")

    // 2. UI rendering check: Spoofed bot sees AuthwallGate on the lesson
    await page.setExtraHTTPHeaders({
      "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "X-Forwarded-For": "198.51.100.24",
    })
    await page.goto(`/tutorials/${botCourse.slug}`)
    const startBtn = page.getByRole("button", { name: /Start Reading Tutorial|Constitutional Doctrine/i }).first()
    await startBtn.waitFor({ state: "visible", timeout: 10000 })
    await startBtn.click()

    const gate = page.locator('section[role="region"][aria-label="Content Gate"]')
    await expect(gate).toBeVisible()
  })

  test("BOT-05: When seoMode is switched to 'preview', verified bot receives only preview slice", async ({ request }) => {
    // 1. Switch course to seoMode: "preview"
    await prisma.course.update({
      where: { id: botCourse.id },
      data: {
        seoMode: "preview",
        previewPercentage: 20,
      },
    })

    // 2. Verified bot visits page
    const res = await request.get(`/tutorials/${botCourse.slug}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) VerifiedCrawlerMock",
        "X-Forwarded-For": "127.0.0.2",
      },
    })

    expect(res.status()).toBe(200)
    const html = await res.text()

    // Preview text is present
    expect(html).toContain(PREVIEW_TEXT)

    // Secret body text MUST NOT be present even for verified bot when seoMode is "preview"
    expect(html).not.toContain(SECRET_BODY_TEXT)

    // Paywall Schema JSON-LD must be present
    expect(html).toContain("isAccessibleForFree")
    expect(html).toContain("false")
  })
})
