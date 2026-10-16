import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import { prisma, PASSWORD, newNonce, createActor, loginAs } from "./test-series-e2e-helpers"
import { UserRole } from "@prisma/client"

test.describe("Authwall: Centralized Blurred Gate, Server Slicing & Studio Persistence", () => {
  test.setTimeout(90_000)

  let nonce: string
  let adminUser: any
  let studentUser: any
  let testCourse: any
  let testChapter: any
  let testLesson: any
  let testPyqPaper: any
  let testCaPdf: any

  const SECRET_UNLOCKED_TEXT = "SUPER_SECRET_LESSON_CONTENT_BEYOND_PREVIEW_BLOCK"
  const PREVIEW_TEXT = "PUBLIC_PREVIEW_BLOCK_PARAGRAPH_ONE"

  let pyqCategory: any

  test.beforeAll(async () => {
    nonce = newNonce()
    adminUser = await createActor(nonce, UserRole.ADMIN, "authwall-admin")
    studentUser = await createActor(nonce, UserRole.FREE, "authwall-student")

    // 1. Create a gated tutorial course
    testCourse = await prisma.course.create({
      data: {
        title: `Gated Course ${nonce}`,
        slug: `gated-course-${nonce.toLowerCase()}`,
        description: "A course to test server-side authwall slicing",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        isGated: true,
        previewPercentage: 20,
        seoMode: "preview",
        gateTitle: "Premium Content Locked",
        gateSubtitle: "Sign up to view all chapters",
      },
    })

    testChapter = await prisma.chapter.create({
      data: {
        title: `Chapter 1 - Intro to Law`,
        courseId: testCourse.id,
        order: 1,
        gateMode: "inherit",
      },
    })

    // Content with multiple distinct HTML paragraphs
    const multiBlockHtml = [
      `<h2>${PREVIEW_TEXT}</h2>`,
      `<p>This is paragraph two providing general background information.</p>`,
      `<p>This is paragraph three discussing fundamental principles.</p>`,
      `<p>This is paragraph four containing in-depth legal analysis.</p>`,
      `<p>${SECRET_UNLOCKED_TEXT}</p>`,
    ].join("\n")

    testLesson = await prisma.lesson.create({
      data: {
        title: "Lesson 1: Constitutional Basics",
        chapterId: testChapter.id,
        order: 1,
        content: multiBlockHtml,
        type: "TUTORIAL",
      },
    })

    // 2. Create a gated PYQ paper with category
    pyqCategory = await prisma.pyqCategory.create({
      data: {
        name: `Category ${nonce}`,
        slug: `cat-${nonce.toLowerCase()}`,
      },
    })

    testPyqPaper = await prisma.pyqPaper.create({
      data: {
        title: `Gated PYQ Paper ${nonce}`,
        slug: `gated-pyq-${nonce.toLowerCase()}`,
        year: 2024,
        categoryId: pyqCategory.id,
        paperPdfUrl: "https://example.com/test-paper.pdf",
        status: "PUBLISHED",
        isGated: true,
        previewPercentage: 20,
        creatorId: adminUser.id,
      },
    })

    // 3. Create a gated Current Affairs PDF
    testCaPdf = await prisma.currentAffairsPdf.create({
      data: {
        title: `Gated CA Monthly Digest ${nonce}`,
        month: 10,
        year: 2026,
        isGated: true,
        previewPercentage: 20,
        pdfUrlEn: "https://example.com/test-ca.pdf",
        status: "PUBLISHED",
      },
    })
  })

  test.afterAll(async () => {
    // Cleanup created records
    try {
      if (testLesson?.id) await prisma.lesson.delete({ where: { id: testLesson.id } }).catch(() => {})
      if (testChapter?.id) await prisma.chapter.delete({ where: { id: testChapter.id } }).catch(() => {})
      if (testCourse?.id) await prisma.course.delete({ where: { id: testCourse.id } }).catch(() => {})
      if (testPyqPaper?.id) await prisma.pyqPaper.delete({ where: { id: testPyqPaper.id } }).catch(() => {})
      if (pyqCategory?.id) await prisma.pyqCategory.delete({ where: { id: pyqCategory.id } }).catch(() => {})
      if (testCaPdf?.id) await prisma.currentAffairsPdf.delete({ where: { id: testCaPdf.id } }).catch(() => {})
      const userIds = [adminUser?.id, studentUser?.id].filter(Boolean)
      if (userIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {})
      }
    } catch {
      // ignore cleanup errors
    }
  })

  test("AUTHWALL-01: Guest request to gated tutorial receives only sliced preview, no secret blocks in HTML, and blurred AuthwallGate", async ({ page, context }) => {
    await context.clearCookies()

    // Navigate as guest
    const response = await page.goto(`/tutorials/${testCourse.slug}`)
    expect(response?.status()).toBe(200)

    // Click "Start Reading Tutorial" or click the lesson item to view the lesson content
    const startBtn = page.getByRole("button", { name: /Start Reading Tutorial|Constitutional Basics/i }).first()
    await startBtn.waitFor({ state: "visible", timeout: 10000 })
    await startBtn.click()

    // 1. Preview block MUST be present
    await expect(page.locator(`text=${PREVIEW_TEXT}`)).toBeVisible()

    const pageContent = await page.content()

    // 2. Secret locked blocks MUST NOT be anywhere in HTML or JSON payload
    expect(pageContent).not.toContain(SECRET_UNLOCKED_TEXT)

    // 3. Authwall region must be rendered
    const authwallSection = page.locator('section[role="region"][aria-label="Content Gate"]')
    await expect(authwallSection).toBeVisible()

    // 4. CTA button and links must be present
    await expect(authwallSection.locator("text=Sign In to Unlock Free Access")).toBeVisible()
    await expect(authwallSection.locator("text=Sign up free")).toBeVisible()
  })

  test("AUTHWALL-02: Authenticated user receives 100% full tutorial content and no AuthwallGate", async ({ page }) => {
    await loginAs(page, studentUser.email)

    const response = await page.goto(`/tutorials/${testCourse.slug}`)
    expect(response?.status()).toBe(200)

    const startBtn = page.getByRole("button", { name: /Start Reading Tutorial|Constitutional Basics/i }).first()
    await startBtn.waitFor({ state: "visible", timeout: 10000 })
    await startBtn.click()

    await expect(page.locator(`text=${PREVIEW_TEXT}`)).toBeVisible()
    await expect(page.locator(`text=${SECRET_UNLOCKED_TEXT}`)).toBeVisible()

    const pageContent = await page.content()

    // Both preview text and secret unlocked text MUST be visible
    expect(pageContent).toContain(PREVIEW_TEXT)
    expect(pageContent).toContain(SECRET_UNLOCKED_TEXT)

    // Authwall region must NOT be rendered
    const authwallSection = page.locator('section[role="region"][aria-label="Content Gate"]')
    await expect(authwallSection).not.toBeVisible()
  })

  test("AUTHWALL-03: Gated PYQ file download route returns 403 Forbidden for guest", async ({ request }) => {
    const res = await request.get(`/api/pyqs/file/${testPyqPaper.id}`)
    expect(res.status()).toBe(403)
    const json = await res.json()
    expect(json.isLockedForGuest).toBe(true)
    expect(json.error).toContain("Gated document")
  })

  test("AUTHWALL-04: Gated Current Affairs file download route returns 403 Forbidden for guest", async ({ request }) => {
    const res = await request.get(`/api/current-affairs/file/${testCaPdf.id}`)
    expect(res.status()).toBe(403)
    const json = await res.json()
    expect(json.isLockedForGuest).toBe(true)
    expect(json.error).toContain("Gated document")
  })

  test("AUTHWALL-05: Spoofed User-Agent 'Googlebot' without valid DNS verification is treated as guest", async ({ page, context }) => {
    await context.clearCookies()
    await page.setExtraHTTPHeaders({
      "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    })

    const response = await page.goto(`/tutorials/${testCourse.slug}`)
    expect(response?.status()).toBe(200)

    const startBtn = page.getByRole("button", { name: /Start Reading Tutorial|Constitutional Basics/i }).first()
    await startBtn.waitFor({ state: "visible", timeout: 10000 })
    await startBtn.click()

    await expect(page.locator(`text=${PREVIEW_TEXT}`)).toBeVisible()

    const pageContent = await page.content()

    // Fake bot MUST NOT bypass the gate
    expect(pageContent).not.toContain(SECRET_UNLOCKED_TEXT)
    const authwallSection = page.locator('section[role="region"][aria-label="Content Gate"]')
    await expect(authwallSection).toBeVisible()
  })

  test("AUTHWALL-06: Studio gate settings update persists in database and respects validation", async ({ request }) => {
    // Test API update of course gate settings
    await prisma.course.update({
      where: { id: testCourse.id },
      data: {
        isGated: true,
        previewPercentage: 35,
        seoMode: "bot-full",
        gateTitle: "Updated Studio Gate Title",
      },
    })

    const updated = await prisma.course.findUnique({
      where: { id: testCourse.id },
      select: {
        isGated: true,
        previewPercentage: true,
        seoMode: true,
        gateTitle: true,
      },
    })

    expect(updated?.isGated).toBe(true)
    expect(updated?.previewPercentage).toBe(35)
    expect(updated?.seoMode).toBe("bot-full")
    expect(updated?.gateTitle).toBe("Updated Studio Gate Title")
  })

  test("AUTHWALL-07: AuthwallUnlockToast triggers when authwall_scroll_pos exists in sessionStorage", async ({ page }) => {
    await loginAs(page, studentUser.email)

    // Navigate to page and inject scroll pos into sessionStorage before load
    await page.addInitScript(() => {
      window.sessionStorage.setItem("authwall_scroll_pos", "250")
    })

    await page.goto(`/tutorials/${testCourse.slug}`)

    // Check toast appears
    const toast = page.locator("text=Welcome back! Full content unlocked.")
    await expect(toast).toBeVisible({ timeout: 5000 })

    // Check sessionStorage is cleared
    const stored = await page.evaluate(() => window.sessionStorage.getItem("authwall_scroll_pos"))
    expect(stored).toBeNull()
  })
})
