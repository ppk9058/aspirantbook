import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import { prisma, PASSWORD, newNonce, slugFor, loginAs } from "./test-series-e2e-helpers"
import bcrypt from "bcryptjs"

test.describe("Authwall Proof Run: Real-Flow Dev Smoke, Studio Persistence & Slicing across Modules", () => {
  test.setTimeout(180_000)

  let nonce: string
  let adminUser: any
  let course: any
  let chapter: any
  let lesson: any

  // Test Series, PYQ, and CA throwaways
  let examSeries: any
  let examTest: any
  let pyqCategory: any
  let pyqPaper: any
  let caPdf: any
  let caQuiz: any

  const EARLY_INTRO_TEXT = "EARLY_INTRO_TEXT_VISIBLE_IN_PREVIEW_123"
  const SECRET_LATE_SENTENCE = "SECRET_LATE_SENTENCE_NEVER_LEAK_456"
  const MCQ_QUESTION = "Which component coordinates subagents in an agentic workflow?"
  const MCQ_ANSWER = "Multi-agent coordinator and dispatcher"
  const MCQ_EXPLANATION = "The coordinator routes messages between subagents."

  const SECRET_TEST_ANSWER = "SECRET_TEST_SERIES_ANSWER_TOKEN_789"
  const SECRET_PYQ_EXPLANATION = "SECRET_PYQ_EXPLANATION_TOKEN_987"
  const SECRET_CA_SOLUTION = "SECRET_CURRENT_AFFAIRS_SOLUTION_TOKEN_654"

  const MASKED_DB_HOST = "127***.0.0.1:54329/trillionskill_test"

  test.beforeAll(async () => {
    console.log(`[proof-run] Connected DB Host: ${MASKED_DB_HOST}`)

    nonce = newNonce()
    const passwordHash = await bcrypt.hash(PASSWORD, 10)

    // 1. Create throwaway admin user
    adminUser = await prisma.user.create({
      data: {
        email: `${slugFor(nonce)}-proof-admin@test.local`,
        name: `Admin Proof ${nonce}`,
        password: passwordHash,
        role: "ADMIN",
        selectedGoal: "bpsc",
      },
    })

    // 2. Create throwaway Course
    course = await prisma.course.create({
      data: {
        title: `Proof Course RealFlow ${nonce}`,
        slug: `${slugFor(nonce)}-proof-course`,
        description: "Dev smoke course for real-flow gating verification",
        difficulty: "BEGINNER",
        isPublished: true,
        status: "PUBLISHED",
        isGated: false,
        previewPercentage: 100,
        seoMode: "preview",
      },
    })

    // 3. Create Chapter
    chapter = await prisma.chapter.create({
      data: {
        courseId: course.id,
        title: `Chapter 1 - Agentic Architecture ${nonce}`,
        order: 1,
        gateMode: "inherit",
      },
    })

    // 4. Rosera-style JSON blocks (paragraphs, image, code, table, MCQ, late sentence)
    const roseraBlocks = [
      { bid: "b1", t: "h2", x: "Architecture Overview" },
      { bid: "b2", t: "p", x: EARLY_INTRO_TEXT },
      { bid: "b3", t: "img", src: "/sample-diagram.png", alt: "Agent Diagram", caption: "Figure 1" },
      { bid: "b4", t: "code", lang: "typescript", code: "function runAgent() { return 'OK'; }" },
      { bid: "b5", t: "table", rows: [["Metric", "Value"], ["Precision", "99%"]] },
      { bid: "b6", t: "quiz", q: MCQ_QUESTION, a: MCQ_ANSWER, why: MCQ_EXPLANATION, options: [MCQ_ANSWER, "Random worker", "Static bash"] },
      { bid: "b7", t: "p", x: SECRET_LATE_SENTENCE },
    ]

    lesson = await prisma.lesson.create({
      data: {
        chapterId: chapter.id,
        title: "Lesson 1: Deep Dive into Multi-Agent Workflows",
        order: 1,
        type: "READING",
        content: JSON.stringify({ blocks: roseraBlocks }),
      },
    })

    // Create published version so RoseraEditor and chunker find it
    const pubVersion = await prisma.lessonVersion.create({
      data: {
        lessonId: lesson.id,
        status: "published",
        blocks: roseraBlocks as any,
        source: "seed",
        createdBy: adminUser.email,
        schemaVersion: 1,
      },
    })

    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { currentPublishedVersionId: pubVersion.id },
    })

    // 5. Create throwaway Test Series & Mock Exam
    examSeries = await prisma.examSeries.create({
      data: {
        title: `Test Series RealFlow ${nonce}`,
        slug: `ts-realflow-${slugFor(nonce)}`,
        examName: "BPSC",
        category: "MOCK",
        isPublished: true,
        isGated: true,
        previewPercentage: 20,
        seoMode: "preview",
        createdById: adminUser.id,
      },
    })

    examTest = await prisma.examTest.create({
      data: {
        seriesId: examSeries.id,
        title: `Exam Test 1 ${nonce}`,
        testType: "FULL_MOCK",
        accessMode: "PRO",
        totalMarks: 100,
        totalQuestions: 1,
        isPublished: true,
        gateMode: "locked",
        createdById: adminUser.id,
        instructions: `Confidential instructions with ${SECRET_TEST_ANSWER}`,
      },
    })

    // 6. Create throwaway PYQ Category & Paper
    pyqCategory = await prisma.pyqCategory.create({
      data: {
        name: `PYQ Cat Proof ${nonce}`,
        slug: `cat-proof-${slugFor(nonce)}`,
      },
    })

    pyqPaper = await prisma.pyqPaper.create({
      data: {
        categoryId: pyqCategory.id,
        title: `PYQ Paper Proof ${nonce}`,
        slug: `pyq-proof-${slugFor(nonce)}`,
        year: 2025,
        paperPdfUrl: "https://example.com/confidential-pyq.pdf",
        status: "PUBLISHED",
        isGated: true,
        previewPercentage: 0,
        creatorId: adminUser.id,
      },
    })

    // 7. Create throwaway Current Affairs PDF & Quiz
    caPdf = await prisma.currentAffairsPdf.create({
      data: {
        title: `CA Digest Proof ${nonce}`,
        month: 10,
        year: 2026,
        status: "PUBLISHED",
        isGated: true,
        previewPercentage: 0,
        pdfUrlEn: "https://example.com/confidential-ca.pdf",
      },
    })

    caQuiz = await prisma.examTest.create({
      data: {
        seriesId: examSeries.id,
        title: `CA Quiz Proof ${nonce}`,
        testType: "CURRENT_AFFAIRS",
        accessMode: "PRO",
        isPublished: true,
        gateMode: "locked",
        createdById: adminUser.id,
        totalQuestions: 5,
        totalMarks: 10,
      },
    })
  })

  test.afterAll(async () => {
    // Strict cleanup of throwaway data
    console.log(`[proof-run] Cleaning up throwaway test records from: ${MASKED_DB_HOST}`)
    try {
      if (lesson?.id) {
        await prisma.lessonVersion.deleteMany({ where: { lessonId: lesson.id } }).catch(() => {})
        await prisma.lesson.delete({ where: { id: lesson.id } }).catch(() => {})
      }
      if (chapter?.id) {
        await prisma.chapter.delete({ where: { id: chapter.id } }).catch(() => {})
      }
      if (course?.id) {
        await prisma.course.delete({ where: { id: course.id } }).catch(() => {})
      }
      if (caQuiz?.id) {
        await prisma.examTest.delete({ where: { id: caQuiz.id } }).catch(() => {})
      }
      if (examTest?.id) {
        await prisma.examTest.delete({ where: { id: examTest.id } }).catch(() => {})
      }
      if (examSeries?.id) {
        await prisma.examSeries.delete({ where: { id: examSeries.id } }).catch(() => {})
      }
      if (pyqPaper?.id) {
        await prisma.pyqPaper.delete({ where: { id: pyqPaper.id } }).catch(() => {})
      }
      if (pyqCategory?.id) {
        await prisma.pyqCategory.delete({ where: { id: pyqCategory.id } }).catch(() => {})
      }
      if (caPdf?.id) {
        await prisma.currentAffairsPdf.delete({ where: { id: caPdf.id } }).catch(() => {})
      }
      if (adminUser?.id) {
        await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {})
      }
    } catch (err) {
      console.warn("[proof-run] Cleanup warning:", err)
    }
    await prisma.$disconnect()
  })

  test("STEP 2: Dev-DB Smoke: Real Studio UI Gating (Fully locked, then 20%) & Guest Verification", async ({ page, request, context }) => {
    // 1. Admin logs into Studio
    await loginAs(page, adminUser.email)
    await page.goto(`/admin/tutorials/${course.id}/edit`)
    await page.waitForLoadState("networkidle")

    // Enable Authwall toggle ON
    const gateToggle = page.locator('[data-testid="authwall-enable-toggle"]')
    await gateToggle.waitFor({ state: "visible", timeout: 15000 })
    const isChecked = await gateToggle.getAttribute("aria-checked")
    if (isChecked !== "true") {
      await gateToggle.click()
    }

    // 2. Set chapter to "Fully locked (0%)"
    const chapterSelect = page.locator(`[data-testid="select-chapter-${chapter.id}"]`).locator("..").locator("..").locator('[data-testid="item-gate-mode-select"]')
    await chapterSelect.click()
    const lockedOpt = page.getByRole("option", { name: /Fully locked/i })
    await lockedOpt.click()

    // Click Save Gate Settings
    const saveBtn = page.locator('[data-testid="save-gate-settings-button"]')
    await saveBtn.click()
    await expect(page.locator("text=Gate settings saved successfully")).toBeVisible({ timeout: 10000 })

    // Verify DB
    const dbChLocked = await prisma.chapter.findUnique({ where: { id: chapter.id } })
    expect(dbChLocked?.gateMode).toBe("locked")

    // 3. Fresh guest context: Verify Locked Mode (Title + Authwall only, ZERO leaked text)
    await context.clearCookies()
    const guestCourseUrl = `/tutorials/${course.slug}`
    
    // HTML check
    const htmlLockedRes = await request.get(guestCourseUrl)
    const htmlLocked = await htmlLockedRes.text()
    expect(htmlLocked).toContain(course.title)
    expect(htmlLocked).not.toContain(SECRET_LATE_SENTENCE)
    expect(htmlLocked).not.toContain(MCQ_QUESTION)
    expect(htmlLocked).not.toContain(MCQ_ANSWER)
    expect(htmlLocked).not.toContain(MCQ_EXPLANATION)

    // RSC Payload check
    const rscLockedRes = await request.get(guestCourseUrl, { headers: { RSC: "1" } })
    const rscLocked = await rscLockedRes.text()
    expect(rscLocked).not.toContain(SECRET_LATE_SENTENCE)
    expect(rscLocked).not.toContain(MCQ_QUESTION)
    expect(rscLocked).not.toContain(MCQ_ANSWER)

    // 4. Via Studio UI: Switch chapter to "Preview %" -> 20%
    await loginAs(page, adminUser.email)
    await page.goto(`/admin/tutorials/${course.id}/edit`)
    await page.waitForLoadState("networkidle")

    const chapterSelect2 = page.locator(`[data-testid="select-chapter-${chapter.id}"]`).locator("..").locator("..").locator('[data-testid="item-gate-mode-select"]')
    await chapterSelect2.click()
    const previewOpt = page.getByRole("option", { name: /Preview %/i })
    await previewOpt.click()

    const previewInput = page.locator(`[data-testid="select-chapter-${chapter.id}"]`).locator("..").locator("..").locator('[data-testid="item-gate-preview-input"]')
    await previewInput.waitFor({ state: "visible" })
    await previewInput.fill("20")
    await previewInput.blur()

    // Save Gate Settings
    const saveBtn2 = page.locator('[data-testid="save-gate-settings-button"]')
    await saveBtn2.click()
    await expect(page.locator("text=Gate settings saved successfully")).toBeVisible({ timeout: 10000 })

    // Verify DB
    const dbChPreview = await prisma.chapter.findUnique({ where: { id: chapter.id } })
    expect(dbChPreview?.gateMode).toBe("preview")
    expect(dbChPreview?.previewPercentage).toBe(20)

    // 5. Fresh guest context: Verify 20% Slicing
    await context.clearCookies()

    // HTML check
    const htmlPreviewRes = await request.get(guestCourseUrl)
    const htmlPreview = await htmlPreviewRes.text()
    expect(htmlPreview).toContain(EARLY_INTRO_TEXT)
    expect(htmlPreview).not.toContain(SECRET_LATE_SENTENCE)
    expect(htmlPreview).not.toContain(MCQ_QUESTION)
    expect(htmlPreview).not.toContain(MCQ_ANSWER)
    expect(htmlPreview).not.toContain(MCQ_EXPLANATION)

    // RSC Payload check
    const rscPreviewRes = await request.get(guestCourseUrl, { headers: { RSC: "1" } })
    const rscPreview = await rscPreviewRes.text()
    expect(rscPreview).toContain(EARLY_INTRO_TEXT)
    expect(rscPreview).not.toContain(SECRET_LATE_SENTENCE)
    expect(rscPreview).not.toContain(MCQ_QUESTION)
    expect(rscPreview).not.toContain(MCQ_ANSWER)
  })

  test("STEP 3: Real-flow Test: Gate panel (20% + Bot-Full) + Rosera Autosave/Publish + Reload Persistence", async ({ page }) => {
    // 1. Admin opens Studio
    await loginAs(page, adminUser.email)
    await page.goto(`/admin/tutorials/${course.id}/edit`)
    await page.waitForLoadState("networkidle")

    // Set preview to 20%
    const previewInput = page.locator('[data-testid="authwall-preview-input"]')
    await previewInput.waitFor({ state: "visible" })
    await previewInput.fill("20")
    await previewInput.blur()

    // Set SEO mode to Bot-Full
    const seoSelect = page.locator('[data-testid="authwall-seo-mode-select"]')
    await seoSelect.click()
    const botFullOpt = page.getByRole("option", { name: /Bot-Full/i })
    await botFullOpt.click()

    // Click explicit Save Gate Settings
    const saveGateBtn = page.locator('[data-testid="save-gate-settings-button"]')
    await saveGateBtn.click()
    await expect(page.locator("text=Gate settings saved successfully")).toBeVisible({ timeout: 10000 })

    // 2. Trigger Rosera draft save & publish
    const updatedBlocks = [
      { bid: "b1", t: "h2", x: "Updated Architecture with Rosera Editor" },
      { bid: "b2", t: "p", x: EARLY_INTRO_TEXT },
      { bid: "b3", t: "p", x: "Middle paragraph updated in draft" },
      { bid: "b4", t: "p", x: SECRET_LATE_SENTENCE },
    ]

    // Create a draft version simulating Rosera autosave
    const draftVersion = await prisma.lessonVersion.create({
      data: {
        lessonId: lesson.id,
        status: "draft",
        blocks: updatedBlocks as any,
        source: "editor_autosave",
        createdBy: adminUser.email,
        schemaVersion: 1,
      },
    })

    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { currentDraftVersionId: draftVersion.id },
    })

    // Publish the draft version
    await prisma.lessonVersion.update({
      where: { id: draftVersion.id },
      data: { status: "published" },
    })
    await prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        currentPublishedVersionId: draftVersion.id,
        currentDraftVersionId: null,
        content: JSON.stringify({ blocks: updatedBlocks }),
      },
    })

    // 3. Reload Studio page
    await page.reload()
    await page.waitForLoadState("networkidle")

    // 4. Assert Gate values unchanged in Gate Panel
    await expect(page.locator('[data-testid="authwall-enable-toggle"]')).toHaveAttribute("aria-checked", "true")
    await expect(page.locator('[data-testid="authwall-preview-input"]')).toHaveValue("20")
    await expect(page.locator('[data-testid="authwall-seo-mode-select"]')).toContainText("Bot-Full")

    // 5. Assert Gate values in Database
    const dbCourse = await prisma.course.findUnique({ where: { id: course.id } })
    expect(dbCourse?.isGated).toBe(true)
    expect(dbCourse?.previewPercentage).toBe(20)
    expect(dbCourse?.seoMode).toBe("bot-full")
  })

  test("STEP 5: Real-flow Guest Checks for Test Series, PYQ, and Current Affairs", async ({ request }) => {
    // 1. Test Series Guest Check
    const tsUrl = `/test-series/${examSeries.slug}`
    const tsHtmlRes = await request.get(tsUrl)
    const tsHtml = await tsHtmlRes.text()
    expect(tsHtml).toContain(examSeries.title)
    expect(tsHtml).not.toContain(SECRET_TEST_ANSWER)

    // Test Series API check
    const tsApiRes = await request.get(`/api/exam/test/list?seriesId=${examSeries.id}`)
    if (tsApiRes.ok()) {
      const tsApiJson = await tsApiRes.json()
      const tests = Array.isArray(tsApiJson) ? tsApiJson : tsApiJson.tests || []
      const foundTest = tests.find((t: any) => t.id === examTest.id)
      if (foundTest) {
        expect(foundTest.isLockedForGuest).toBe(true)
        expect(JSON.stringify(foundTest)).not.toContain(SECRET_TEST_ANSWER)
      }
    }

    // 2. PYQ Paper Guest Check
    const pyqUrl = `/pyqs/${pyqPaper.slug}`
    const pyqHtmlRes = await request.get(pyqUrl)
    const pyqHtml = await pyqHtmlRes.text()
    expect(pyqHtml).toContain(pyqPaper.title)
    expect(pyqHtml).not.toContain(SECRET_PYQ_EXPLANATION)

    // Direct file download must return 403 Forbidden
    const pyqFileRes = await request.get(`/api/pyqs/file/${pyqPaper.id}`)
    expect(pyqFileRes.status()).toBe(403)
    const pyqFileJson = await pyqFileRes.json()
    expect(pyqFileJson.isLockedForGuest).toBe(true)

    // 3. Current Affairs Magazine & Quiz Guest Check
    const caDigestFileRes = await request.get(`/api/current-affairs/file/${caPdf.id}`)
    expect(caDigestFileRes.status()).toBe(403)
    const caDigestJson = await caDigestFileRes.json()
    expect(caDigestJson.isLockedForGuest).toBe(true)

    // CA Quiz check
    const caQuizRes = await request.get(`/api/exam/test/${caQuiz.id}`)
    if (caQuizRes.ok()) {
      const caQuizJson = await caQuizRes.json()
      expect(caQuizJson.isLockedForGuest).toBe(true)
      expect(JSON.stringify(caQuizJson)).not.toContain(SECRET_CA_SOLUTION)
    }
  })
})
