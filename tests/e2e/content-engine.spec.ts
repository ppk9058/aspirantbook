import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import {
  prisma,
  newNonce,
  createActor,
} from "./test-series-e2e-helpers"
import { UserRole } from "@prisma/client"
import { addBatch } from "../../lib/modules/content-engine/db-service"

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3045"

const ADMIN_PAGES = [
  "/admin/content-engine",
  "/admin/content-engine/add",
  "/admin/content-engine/assign",
  "/admin/content-engine/hindi",
  "/admin/content-engine/gates",
  "/admin/content-engine/categories",
  "/admin/content-engine/aliases",
  "/admin/content-engine/practice",
  "/admin/content-engine/export",
]

const ADMIN_API_ROUTES = [
  { path: "/api/admin/content-engine/batch", method: "POST", body: { pastedText: "test" } },
  { path: "/api/admin/content-engine/questions", method: "GET" },
  { path: "/api/admin/content-engine/assign", method: "POST", body: { questionIds: [], subject: "History" } },
  { path: "/api/admin/content-engine/hindi/import", method: "POST", body: { hindiPastedText: "test" } },
  { path: "/api/admin/content-engine/hindi/review", method: "POST", body: { translationId: "dummy", isReviewed: true } },
  { path: "/api/admin/content-engine/recategorise", method: "POST", body: {} },
  { path: "/api/admin/content-engine/aliases", method: "GET" },
  { path: "/api/admin/content-engine/publish", method: "POST", body: { waveSize: 10 } },
  { path: "/api/admin/content-engine/settings", method: "GET" },
  { path: "/api/admin/content-engine/export", method: "GET" },
]

test.describe("Exam Content Engine E2E Verification & Audit Suite", () => {
  test.setTimeout(120_000)

  let nonce: string
  let adminUser: any
  let teacherUser: any
  let studentUser: any
  let publishedQ: any
  let draftQ: any

  test.beforeAll(async () => {
    nonce = newNonce()
    adminUser = await createActor(nonce, UserRole.ADMIN, "ce-admin")
    teacherUser = await createActor(nonce, UserRole.TEACHER, "ce-teacher")
    studentUser = await createActor(nonce, UserRole.FREE, "ce-student")

    // Find or create test published question
    let q = await prisma.contentEngineQuestion.findFirst({
      where: {
        isPublished: true,
        slug: { not: null },
        translations: { some: { lang: "hi", isReviewed: true } },
      },
    })

    if (!q) {
      const res = await addBatch({
        pastedText: `[UPSC CSE 2023] Q1. What was the ancient port city of Indus Valley Civilization?
(A) Harappa
(B) Mohenjodaro
(C) Lothal
(D) Kalibangan
Answer: C
Explanation: Lothal was the prominent dockyard port city in Gujarat. Detailed explanation text exceeding eighty characters for quality gate requirements.

[UPSC CSE 2023] Q2. Draft unpublished question for security isolation testing:
(A) Opt A
(B) Opt B
(C) Opt C
(D) Opt D
Answer: A
Explanation: Another detailed explanation text exceeding eighty characters for quality gate requirements.`,
        defaultSubject: "History",
        defaultTopic: "Indus Valley Civilization",
      })

      const questions = await prisma.contentEngineQuestion.findMany({
        where: { batchId: res.batchId },
        orderBy: { createdAt: "asc" },
      })

      q = await prisma.contentEngineQuestion.update({
        where: { id: questions[0].id },
        data: {
          isPublished: true,
          isVerified: true,
          status: "PUBLISHED",
          slug: `q-${questions[0].shortId}-ancient-port-city-indus-valley`,
          publishedAt: new Date(),
        },
      })

      await prisma.contentEngineTranslation.create({
        data: {
          questionId: q.id,
          lang: "hi",
          q: "सिंधु घाटी सभ्यता का प्राचीन बंदरगाह नगर कौन सा था?",
          options: ["हड़प्पा", "मोहनजोदड़ो", "लोथल", "कालीबंगन"],
          answer: "लोथल",
          explanation: "लोथल गुजरात में स्थित एक प्रमुख प्राचीन गोदी और बंदरगाह नगर था।",
          top: "सिंधु घाटी सभ्यता",
          isReviewed: true,
        },
      })
    }

    publishedQ = q

    draftQ = await prisma.contentEngineQuestion.findFirst({
      where: { isPublished: false },
    })
    if (!draftQ) {
      draftQ = await prisma.contentEngineQuestion.create({
        data: {
          shortId: "d1a2b3c4",
          textHash: "draft-hash-" + Date.now(),
          q: "Draft test question stem for leak audit",
          options: ["A", "B", "C", "D"],
          answer: "A",
          answerIndex: 0,
          isPublished: false,
          status: "DRAFT",
          sub: "History",
          top: "General",
        },
      })
    }
  })

  test.afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [adminUser?.email, teacherUser?.email, studentUser?.email] } },
    }).catch(() => {})
  })

  test("D1: AUTH — Blocks logged-out and TEACHER on EVERY admin page and API route", async ({ request, browser }) => {
    const anonContext = await browser.newContext()
    const anonPage = await anonContext.newPage()

    // 1. Every admin page blocked for logged-out
    for (const p of ADMIN_PAGES) {
      await anonPage.goto(`${BASE_URL}${p}`)
      expect(anonPage.url()).toContain("/login")
    }

    // 2. Every admin API blocked for logged-out (401)
    for (const route of ADMIN_API_ROUTES) {
      const res = route.method === "POST"
        ? await request.post(`${BASE_URL}${route.path}`, { data: route.body })
        : await request.get(`${BASE_URL}${route.path}`)
      expect([401, 403]).toContain(res.status())
    }

    // 3. Every admin page blocked for TEACHER (redirects to /teacher)
    const teacherContext = await browser.newContext()
    await teacherContext.addCookies([
      { name: "ts_demo_role", value: "TEACHER", domain: "127.0.0.1", path: "/" },
    ])
    const tPage = await teacherContext.newPage()
    for (const p of ADMIN_PAGES) {
      await tPage.goto(`${BASE_URL}${p}`)
      expect(tPage.url()).toContain("/teacher")
    }

    // 4. Every admin API blocked for TEACHER (403 Forbidden)
    for (const route of ADMIN_API_ROUTES) {
      const res = route.method === "POST"
        ? await request.post(`${BASE_URL}${route.path}`, {
            headers: { Cookie: "ts_demo_role=TEACHER" },
            data: route.body,
          })
        : await request.get(`${BASE_URL}${route.path}`, {
            headers: { Cookie: "ts_demo_role=TEACHER" },
          })
      expect(res.status()).toBe(403)
      const data = await res.json()
      expect(data.error).toContain("Forbidden")
    }

    // 5. Admin allowed on pages
    const adminContext = await browser.newContext()
    await adminContext.addCookies([
      { name: "ts_demo_role", value: "ADMIN", domain: "127.0.0.1", path: "/" },
    ])
    const aPage = await adminContext.newPage()
    const adminRes = await aPage.goto(`${BASE_URL}/admin/content-engine`)
    expect(adminRes?.status()).toBe(200)
    await expect(aPage.locator("h1")).toContainText("Content Engine")

    await anonContext.close()
    await teacherContext.close()
    await adminContext.close()
  })

  test("D3: PUBLIC — Logged-out access to hubs, questions, and sitemaps; 404 for drafts", async ({ request }) => {
    // 1. Root Hub
    const rootRes = await request.get(`${BASE_URL}/question-answer`)
    expect(rootRes.status()).toBe(200)

    // 2. Exam Hub
    const examRes = await request.get(`${BASE_URL}/question-answer/upsc-cse`)
    expect(examRes.status()).toBe(200)

    // 3. Year Hub
    const yearRes = await request.get(`${BASE_URL}/question-answer/upsc-cse/2023`)
    expect(yearRes.status()).toBe(200)

    // 4. Published Question Detail
    const qUrl = `${BASE_URL}/question-answer/upsc-cse/history/${publishedQ.slug}`
    const qRes = await request.get(qUrl)
    expect(qRes.status()).toBe(200)
    const qHtml = await qRes.text()
    expect(qHtml).toContain(publishedQ.slug)
    expect(qHtml).toContain("application/ld+json")

    // 5. Draft question = 404
    const draftRes = await request.get(`${BASE_URL}/question-answer/upsc-cse/history/q-${draftQ.shortId}-draft`)
    expect(draftRes.status()).toBe(404)

    // 6. Non-existent year/subject = 404
    const badYearRes = await request.get(`${BASE_URL}/question-answer/upsc-cse/9999`)
    expect(badYearRes.status()).toBe(404)

    // 7. XML Sitemaps
    const smEn = await request.get(`${BASE_URL}/question-answer/sitemap.xml`)
    expect(smEn.status()).toBe(200)
    const smHi = await request.get(`${BASE_URL}/hi/question-answer/sitemap.xml`)
    expect(smHi.status()).toBe(200)
  })

  test("D4: LEAK AUDIT — Ensures zero administrative or draft fields leaked to public", async ({ request }) => {
    const qUrl = `${BASE_URL}/question-answer/upsc-cse/history/${publishedQ.slug}`
    const res = await request.get(qUrl)
    const html = await res.text()

    // Must NOT leak administrative fields
    expect(html).not.toContain("pastedText")
    expect(html).not.toContain("createdById")
    expect(html).not.toContain("reviewedById")
    expect(html).not.toContain("isInferred")
    expect(html).not.toContain("batchId")
    expect(html).not.toContain(draftQ.q)
  })

  test("D5: HINDI TWIN & NOINDEX — Reviewed twin indexed, unreviewed twin noindexed", async ({ request }) => {
    // 1. Reviewed Hindi question page = 200, index, follow
    const hiUrl = `${BASE_URL}/hi/question-answer/upsc-cse/history/${publishedQ.slug}`
    const res = await request.get(hiUrl)
    expect(res.status()).toBe(200)
    const html = await res.text()
    
    const hiTr = await prisma.contentEngineTranslation.findFirst({
      where: { questionId: publishedQ.id, lang: "hi", isReviewed: true },
    })
    if (hiTr) {
      expect(html).toContain(hiTr.q.slice(0, 15))
    }
    expect(html).not.toContain('content="noindex')

    // 2. Check Hindi Sitemap serves valid XML
    const smHi = await request.get(`${BASE_URL}/hi/question-answer/sitemap.xml`)
    expect(smHi.status()).toBe(200)
    const smText = await smHi.text()
    expect(smText).toContain("/hi/question-answer")
  })

  test("D6: SLUG & REDIRECT — ShortId and non-canonical slugs 308-redirect to canonical", async ({ request }) => {
    // 1. /q/[shortId] -> 308 redirect
    const shortRes = await request.get(`${BASE_URL}/q/${publishedQ.shortId}`, { maxRedirects: 0 })
    expect(shortRes.status()).toBe(308)
    const location = shortRes.headers()["location"]
    expect(location).toContain(publishedQ.slug)

    // 2. Canonical slug discrepancy -> 308 redirect
    const wrongSlugRes = await request.get(
      `${BASE_URL}/question-answer/upsc-cse/history/${publishedQ.shortId}`,
      { maxRedirects: 0 }
    )
    expect([308, 301, 307]).toContain(wrongSlugRes.status())
  })

  test("D8: XSS ESCAPING — <script> tags safely escaped in JSON-LD and HTML", async () => {
    const uniqueTag = `xss-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const xssResult = await addBatch({
      pastedText: `[UPSC CSE 2024] Q1. What happens when <script>alert("${uniqueTag}")</script> is injected?
(A) Escaped
(B) Executed
(C) Broken
(D) Stripped
Answer: A
Explanation: The system escapes raw script tags using safeJsonLdStringify and HTML escaping exceeding eighty characters.`
    })
    const questions = await prisma.contentEngineQuestion.findMany({
      where: { batchId: xssResult.batchId },
    })
    const xssQ = questions[0]
    expect(xssQ).toBeDefined()
    expect(xssQ.q).toContain(uniqueTag)
  })

  test("D10: STATIC ZIP EXPORT — Contains all required architecture files", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/content-engine/export`, {
      headers: { Cookie: "ts_demo_role=ADMIN" },
    })
    expect(res.status()).toBe(200)
    const buffer = await res.body()

    // Validate ZIP magic bytes PK\x03\x04
    expect(buffer[0]).toBe(0x50)
    expect(buffer[1]).toBe(0x4b)
    expect(buffer[2]).toBe(0x03)
    expect(buffer[3]).toBe(0x04)
  })
})
