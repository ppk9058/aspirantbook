import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import { prisma, PASSWORD, newNonce, createActor, loginAs } from "./test-series-e2e-helpers"
import { UserRole } from "@prisma/client"

test.describe("Authwall: Exhaustive Leak Verification Across Every Module & Gate Mode", () => {
  test.setTimeout(120_000)

  let nonce: string
  let adminUser: any
  let teacherUser: any
  let studentUser: any

  // Test entities
  let course: any
  let chInherit: any
  let chLocked: any
  let chCustomPreview: any
  let chFree: any
  let chOneBlock: any
  let chNestedHtml: any

  let pyqCategory: any
  let pyqPaper: any
  let caPdf: any
  let testSeries: any
  let examTest: any
  let caQuiz: any

  const SECRET_BLOCK = "UNLOCKED_LEAK_SECRET_TOKEN_DO_NOT_EXPOSE"
  const PREVIEW_BLOCK = "PUBLIC_PREVIEW_TOKEN_ALLOWED"

  test.beforeAll(async () => {
    nonce = newNonce()
    adminUser = await createActor(nonce, UserRole.ADMIN, "leak-admin")
    teacherUser = await createActor(nonce, UserRole.TEACHER, "leak-teacher")
    studentUser = await createActor(nonce, UserRole.FREE, "leak-student")

    // 1. Course with container gate
    course = await prisma.course.create({
      data: {
        title: `Leak Audit Course ${nonce}`,
        slug: `leak-course-${nonce.toLowerCase()}`,
        description: "Course for auditing zero leakage to guests across all vectors",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        isGated: true,
        previewPercentage: 20,
        seoMode: "preview",
        gateTitle: "Premium Content Restricted",
        gateSubtitle: "Please sign in to view the full curriculum",
      },
    })

    // Chapter 1: gateMode = "inherit" (20% from course)
    chInherit = await prisma.chapter.create({
      data: {
        title: "Chapter Inherit",
        courseId: course.id,
        order: 1,
        gateMode: "inherit",
      },
    })
    await prisma.lesson.create({
      data: {
        title: "Lesson Inherit 20%",
        chapterId: chInherit.id,
        order: 1,
        type: "TUTORIAL",
        content: [
          `<h2>${PREVIEW_BLOCK}</h2>`,
          `<p>Paragraph 2 general concept description.</p>`,
          `<p>Paragraph 3 additional details.</p>`,
          `<p>Paragraph 4 intermediate analysis.</p>`,
          `<p>${SECRET_BLOCK}_INHERIT_20</p>`,
        ].join("\n"),
      },
    })

    // Chapter 2: gateMode = "locked" (0% preview)
    chLocked = await prisma.chapter.create({
      data: {
        title: "Chapter Locked 0%",
        courseId: course.id,
        order: 2,
        gateMode: "locked",
      },
    })
    await prisma.lesson.create({
      data: {
        title: "Lesson Locked 0%",
        chapterId: chLocked.id,
        order: 1,
        type: "TUTORIAL",
        content: [
          `<h2>Header Should Be Gated</h2>`,
          `<p>${SECRET_BLOCK}_LOCKED_0</p>`,
        ].join("\n"),
      },
    })

    // Chapter 3: gateMode = "preview" with custom 50%
    chCustomPreview = await prisma.chapter.create({
      data: {
        title: "Chapter Preview 50%",
        courseId: course.id,
        order: 3,
        gateMode: "preview",
        previewPercentage: 50,
      },
    })
    await prisma.lesson.create({
      data: {
        title: "Lesson Preview 50%",
        chapterId: chCustomPreview.id,
        order: 1,
        type: "TUTORIAL",
        content: [
          `<h2>${PREVIEW_BLOCK}_PREVIEW_50</h2>`,
          `<p>Paragraph 2 of preview 50%.</p>`,
          `<p>${SECRET_BLOCK}_PREVIEW_50_PARAGRAPH_3</p>`,
          `<p>${SECRET_BLOCK}_PREVIEW_50_PARAGRAPH_4</p>`,
        ].join("\n"),
      },
    })

    // Chapter 4: gateMode = "free" (100% accessible)
    chFree = await prisma.chapter.create({
      data: {
        title: "Chapter Free 100%",
        courseId: course.id,
        order: 4,
        gateMode: "free",
      },
    })
    await prisma.lesson.create({
      data: {
        title: "Lesson Free 100%",
        chapterId: chFree.id,
        order: 1,
        type: "TUTORIAL",
        content: `<h2>Free Header</h2><p>This whole lesson is free.</p>`,
      },
    })

    // Chapter 5: One-block content
    chOneBlock = await prisma.chapter.create({
      data: {
        title: "Chapter One Block",
        courseId: course.id,
        order: 5,
        gateMode: "inherit",
      },
    })
    await prisma.lesson.create({
      data: {
        title: "Lesson One Block",
        chapterId: chOneBlock.id,
        order: 1,
        type: "TUTORIAL",
        content: `<p>Single atomic block of text.</p>`,
      },
    })

    // Chapter 6: Nested HTML & Code Block Integrity
    chNestedHtml = await prisma.chapter.create({
      data: {
        title: "Chapter Nested HTML & Code",
        courseId: course.id,
        order: 6,
        gateMode: "preview",
        previewPercentage: 40,
      },
    })
    await prisma.lesson.create({
      data: {
        title: "Lesson Nested Code Integrity",
        chapterId: chNestedHtml.id,
        order: 1,
        type: "TUTORIAL",
        content: [
          `<h2>Code Integrity Preview</h2>`,
          `<pre><code class="language-typescript">const x: number = 42;\nfunction test() {\n  return x * 2;\n}</code></pre>`,
          `<blockquote><p>Nested quote paragraph inside blockquote tag</p></blockquote>`,
          `<table><thead><tr><th>Header 1</th><th>Header 2</th></tr></thead><tbody><tr><td>Data 1</td><td>Data 2</td></tr></tbody></table>`,
          `<p>${SECRET_BLOCK}_NESTED_TAIL</p>`,
        ].join("\n"),
      },
    })

    // PYQ Paper
    pyqCategory = await prisma.pyqCategory.create({
      data: {
        name: `Leak PYQ Cat ${nonce}`,
        slug: `leak-cat-${nonce.toLowerCase()}`,
      },
    })
    pyqPaper = await prisma.pyqPaper.create({
      data: {
        title: `Gated PYQ Leak Test ${nonce}`,
        slug: `leak-pyq-${nonce.toLowerCase()}`,
        year: 2024,
        categoryId: pyqCategory.id,
        paperPdfUrl: "https://example.com/confidential-pyq.pdf",
        status: "PUBLISHED",
        isGated: true,
        previewPercentage: 20,
        creatorId: adminUser.id,
      },
    })

    // Current Affairs PDF
    caPdf = await prisma.currentAffairsPdf.create({
      data: {
        title: `Gated CA Magazine Leak Test ${nonce}`,
        month: 11,
        year: 2026,
        isGated: true,
        previewPercentage: 20,
        pdfUrlEn: "https://example.com/confidential-ca.pdf",
        status: "PUBLISHED",
      },
    })

    // Test Series & Mock Exam
    testSeries = await prisma.examSeries.create({
      data: {
        title: `Leak Test Series ${nonce}`,
        slug: `leak-series-${nonce.toLowerCase()}`,
        examName: "Test Exam",
        category: "Test Cat",
        isPublished: true,
        isGated: true,
        previewPercentage: 20,
        seoMode: "preview",
        gateTitle: "Test Series Restricted",
        gateSubtitle: "Sign in to access mock tests",
        createdById: adminUser.id,
      },
    })

    examTest = await prisma.examTest.create({
      data: {
        title: `Leak Gated Test ${nonce}`,
        seriesId: testSeries.id,
        testType: "FULL_MOCK",
        accessMode: "PRO",
        isPublished: true,
        gateMode: "inherit",
        createdById: adminUser.id,
        totalQuestions: 5,
        totalMarks: 50,
      },
    })

    // Current Affairs Quiz (gated)
    caQuiz = await prisma.examTest.create({
      data: {
        title: `Leak CA Quiz ${nonce}`,
        seriesId: testSeries.id,
        testType: "CURRENT_AFFAIRS",
        accessMode: "PRO",
        isPublished: true,
        gateMode: "locked",
        createdById: adminUser.id,
        totalQuestions: 10,
        totalMarks: 20,
      },
    })
  })

  test.afterAll(async () => {
    try {
      await prisma.lesson.deleteMany({ where: { chapter: { courseId: course.id } } }).catch(() => {})
      await prisma.chapter.deleteMany({ where: { courseId: course.id } }).catch(() => {})
      await prisma.course.delete({ where: { id: course.id } }).catch(() => {})
      await prisma.pyqPaper.delete({ where: { id: pyqPaper.id } }).catch(() => {})
      await prisma.pyqCategory.delete({ where: { id: pyqCategory.id } }).catch(() => {})
      await prisma.currentAffairsPdf.delete({ where: { id: caPdf.id } }).catch(() => {})
      if (examTest?.id) await prisma.examTest.delete({ where: { id: examTest.id } }).catch(() => {})
      if (caQuiz?.id) await prisma.examTest.delete({ where: { id: caQuiz.id } }).catch(() => {})
      if (testSeries?.id) await prisma.examSeries.delete({ where: { id: testSeries.id } }).catch(() => {})
      const uIds = [adminUser?.id, teacherUser?.id, studentUser?.id].filter(Boolean)
      if (uIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: uIds } } }).catch(() => {})
      }
    } catch {}
  })

  test("LEAK-01: HTML Response Leak Audit across all vectors (HTML, JSON-LD, OG tags)", async ({ request }) => {
    // 1. Fetch raw page HTML as anonymous guest
    const res = await request.get(`/tutorials/${course.slug}`, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
      },
    })
    expect(res.status()).toBe(200)
    const html = await res.text()

    // Preview block MUST be present
    expect(html).toContain(PREVIEW_BLOCK)

    // Sliced secret tokens MUST NOT be anywhere in HTML
    expect(html).not.toContain(SECRET_BLOCK)
    expect(html).not.toContain(`${SECRET_BLOCK}_INHERIT_20`)
    expect(html).not.toContain(`${SECRET_BLOCK}_LOCKED_0`)
    expect(html).not.toContain(`${SECRET_BLOCK}_PREVIEW_50_PARAGRAPH_3`)
    expect(html).not.toContain(`${SECRET_BLOCK}_NESTED_TAIL`)

    // JSON-LD schema check: verify isAccessibleForFree: false and paywalled region selector
    expect(html).toContain(`"isAccessibleForFree":false`)
    expect(html).toContain(`[role='region'][aria-label='Content Gate']`)

    // OG & Twitter metadata check: verify no secret content in description or og:description
    expect(html).not.toContain(`content="${SECRET_BLOCK}`)
  })

  test("LEAK-02: Next.js RSC Payload & Prefetch Leak Audit", async ({ request }) => {
    // Fetch with Next.js App Router RSC header
    const rscRes = await request.get(`/tutorials/${course.slug}`, {
      headers: {
        RSC: "1",
        "Next-Router-Prefetch": "1",
      },
    })
    expect(rscRes.status()).toBe(200)
    const rscText = await rscRes.text()

    // Verify secret tokens never leak inside RSC flight stream chunks
    expect(rscText).not.toContain(SECRET_BLOCK)
    expect(rscText).not.toContain(`${SECRET_BLOCK}_INHERIT_20`)
    expect(rscText).not.toContain(`${SECRET_BLOCK}_LOCKED_0`)
    expect(rscText).not.toContain(`${SECRET_BLOCK}_PREVIEW_50_PARAGRAPH_3`)
    expect(rscText).not.toContain(`${SECRET_BLOCK}_NESTED_TAIL`)
  })

  async function selectLesson(page: any, nameRegex: RegExp) {
    const indexBtn = page.getByRole("button", { name: /Index/i }).first()
    if (await indexBtn.isVisible()) {
      await indexBtn.click()
      await page.waitForTimeout(300)
    }
    const lessonBtn = page.getByRole("button", { name: nameRegex }).first()
    await lessonBtn.waitFor({ state: "visible", timeout: 5000 })
    await lessonBtn.click()
    await page.waitForTimeout(300)
  }

  test("LEAK-03: gateMode 'locked' (0% preview) gives title and CTA only, zero content blocks", async ({ page, context }) => {
    await context.clearCookies()
    await page.goto(`/tutorials/${course.slug}`)

    // Click into the locked 0% chapter/lesson
    await selectLesson(page, /Lesson Locked 0%/i)

    const content = await page.content()

    // No secret text
    expect(content).not.toContain(`${SECRET_BLOCK}_LOCKED_0`)

    // Authwall gate MUST be visible
    const gate = page.locator('section[role="region"][aria-label="Content Gate"]')
    await expect(gate).toBeVisible()
    await expect(gate.locator("text=Sign In to Unlock Free Access")).toBeVisible()
  })

  test("LEAK-04: gateMode 'inherit' dynamically follows container course percentage changes", async ({ page, request, context }) => {
    await context.clearCookies()

    // Initially container preview is 20%
    await page.goto(`/tutorials/${course.slug}`)
    await selectLesson(page, /Lesson Inherit/i)

    let content = await page.content()
    expect(content).toContain(PREVIEW_BLOCK)
    expect(content).not.toContain(`${SECRET_BLOCK}_INHERIT_20`)

    // Now update course container to 100%
    await prisma.course.update({
      where: { id: course.id },
      data: { previewPercentage: 100 },
    })

    // Re-fetch page: now the inherit lesson should reveal all blocks because course percentage is 100%
    await page.goto(`/tutorials/${course.slug}`)
    await selectLesson(page, /Lesson Inherit/i)

    content = await page.content()
    expect(content).toContain(`${SECRET_BLOCK}_INHERIT_20`)

    // Reset course container back to 20%
    await prisma.course.update({
      where: { id: course.id },
      data: { previewPercentage: 20 },
    })
  })

  test("LEAK-05: HTML Splitter Integrity: Nested tags and code blocks are never truncated mid-tag", async ({ page, context }) => {
    await context.clearCookies()
    await page.goto(`/tutorials/${course.slug}`)

    await selectLesson(page, /Lesson Nested Code Integrity/i)

    const content = await page.content()

    // Code block must remain syntactically complete without unclosed tags
    expect(content).toContain("const x: number = 42;")
    expect(content).toContain("function test()")
    expect(content).toContain("return x * 2;")
    expect(content).toContain("</code></pre>")

    // Secret tail block beyond preview percentage must NOT appear
    expect(content).not.toContain(`${SECRET_BLOCK}_NESTED_TAIL`)
  })

  test("LEAK-06: Direct file download routes for PYQs and Current Affairs return 403 Forbidden for guests", async ({ request }) => {
    const pyqRes = await request.get(`/api/pyqs/file/${pyqPaper.id}`)
    expect(pyqRes.status()).toBe(403)
    const pyqJson = await pyqRes.json()
    expect(pyqJson.isLockedForGuest).toBe(true)
    expect(pyqJson.error).toContain("Gated document")

    const caRes = await request.get(`/api/current-affairs/file/${caPdf.id}`)
    expect(caRes.status()).toBe(403)
    const caJson = await caRes.json()
    expect(caJson.isLockedForGuest).toBe(true)
    expect(caJson.error).toContain("Gated document")
  })

  test("LEAK-07: Test Series API returns isLockedForGuest=true and completely excludes questions & answers for guests", async ({ request }) => {
    const res = await request.get(`/api/exam/test/list?seriesId=${testSeries.id}`)
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toBeDefined()
    expect(json.data.length).toBeGreaterThan(0)

    const testItem = json.data.find((t: any) => t.id === examTest.id)
    expect(testItem).toBeDefined()
    expect(testItem.isLockedForGuest).toBe(true)
    expect(testItem.gateMode).toBe("inherit")
    expect(testItem.effectivePercentage).toBe(20)

    // Verify question list is strictly empty for anonymous guest
    expect(testItem.questionsList).toEqual([])
  })

  test("LEAK-08: Current Affairs Quiz page renders AuthwallGate and leaks no solutions or full questions to guest", async ({ page, request, context }) => {
    await context.clearCookies()

    // 1. Check direct page render as guest
    await page.goto(`/current-affairs-quizzes/${caQuiz.id}`)
    const content = await page.content()

    // Gate region must be rendered
    const gate = page.locator('section[role="region"][aria-label="Content Gate"]')
    await expect(gate).toBeVisible()
    await expect(gate.locator("text=Sign In to Unlock Free Access")).toBeVisible()

    // Start instructions button must NOT be rendered when locked
    await expect(page.getByRole("link", { name: /Start Quiz Instructions/i })).not.toBeVisible()

    // Verify JSON-LD paywalled schema in page HTML
    expect(content).toContain(`"isAccessibleForFree":false`)
    expect(content).toContain(`[role='region'][aria-label='Content Gate']`)

    // 2. RSC Payload Leak Check
    const rscRes = await request.get(`/current-affairs-quizzes/${caQuiz.id}`, {
      headers: { RSC: "1" },
    })
    expect(rscRes.status()).toBe(200)
    const rscText = await rscRes.text()
    expect(rscText).toContain("isAccessibleForFree")
    expect(rscText).toContain("Content Gate")
  })
})
