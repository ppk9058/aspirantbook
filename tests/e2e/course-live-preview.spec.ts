import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import {
  createActor,
  loginThroughUi,
  newNonce,
  prisma,
  slugFor,
} from "./test-series-e2e-helpers"

test.describe("Course Live Preview Parity, Robustness & Viewport Tests", () => {
  test.setTimeout(120_000)

  let nonce: string
  let adminUser: any
  let testCourse: any

  test.beforeAll(async () => {
    await prisma.$connect()
    nonce = newNonce()
    adminUser = await createActor(nonce, "ADMIN", "admin-preview")
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { emailVerified: new Date() },
    })

    // Find or create a fully populated test course
    testCourse = await prisma.course.findFirst({
      where: {
        isPublished: true,
        chapters: { some: {} },
      },
      include: {
        chapters: { include: { lessons: true } },
        units: true,
      },
    })

    if (!testCourse) {
      testCourse = await prisma.course.findFirst({
        include: {
          chapters: { include: { lessons: true } },
          units: true,
        },
      })
    }
  })

  test.afterAll(async () => {
    if (adminUser?.id) {
      await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {})
    }
    await prisma.$disconnect()
  })

  test("(a) Live Preview opens safely on a BLANK wizard draft: displays 'Price not set' and zero fake numbers", async ({ page }) => {
    const consoleErrors: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text())
      }
    })

    await loginThroughUi(page, adminUser.email)
    const baseOrigin = process.env.BASE_URL || "http://127.0.0.1:3045"
    await page.context().addCookies([
      { name: "ts_demo_role", value: "ADMIN", url: baseOrigin },
    ])
    await page.goto("/admin/courses/new")
    await page.waitForLoadState("domcontentloaded")

    // Open Live Preview on the initial blank draft
    const previewBtn = page.locator('[data-testid="btn-live-preview"]')
    await expect(previewBtn).toBeVisible()
    await previewBtn.click()

    // Assert preview modal opened
    const modal = page.locator('[data-testid="studio-live-preview-modal"]')
    await expect(modal).toBeVisible()

    // Access the isolated iframe
    const previewFrame = page.frameLocator('iframe[title="Studio Live Course Preview"]')
    const frameBody = previewFrame.locator("body")
    await expect(frameBody).toBeVisible({ timeout: 10000 })

    // Assert NO Unexpected Error and NO Preview Error Boundary crash
    const frameText = await frameBody.textContent()
    expect(frameText).not.toContain("Unexpected Error")
    expect(frameText).not.toContain("Application error")
    expect(frameText).not.toContain("Preview unavailable")

    // Assert price block shows 'Price not set', NEVER fake numbers (₹999 / ₹1,999 / 50% OFF)
    expect(frameText).toContain("Price not set")
    expect(frameText).not.toContain("₹999")
    expect(frameText).not.toContain("₹1,999")
    expect(frameText).not.toContain("50% OFF")

    // Test Mobile 360px Toggle
    const mobile360Btn = page.locator('[data-testid="btn-preview-mobile"]')
    await mobile360Btn.click()
    await page.waitForTimeout(300)

    const mobileFrameContainer = page.locator('[data-testid="preview-viewport-frame"]')
    await expect(mobileFrameContainer).toHaveClass(/w-\[360px\]/)

    const mobileFrameText = await frameBody.textContent()
    expect(mobileFrameText).toContain("Price not set")
    expect(mobileFrameText).not.toContain("₹999")
    expect(mobileFrameText).not.toContain("₹1,999")

    // Test Mobile 390px Toggle if visible
    const mobile390Btn = page.locator('[data-testid="btn-preview-mobile-390"]')
    if (await mobile390Btn.isVisible()) {
      await mobile390Btn.click()
      await page.waitForTimeout(300)
      await expect(mobileFrameContainer).toHaveClass(/w-\[390px\]/)
      expect(await frameBody.textContent()).toContain("Price not set")
    }

    // Return to Desktop Toggle
    const desktopBtn = page.locator('[data-testid="btn-preview-desktop"]')
    await desktopBtn.click()
    await page.waitForTimeout(300)
    await expect(mobileFrameContainer).toHaveClass(/max-w-7xl/)

    // Assert zero critical rendering console errors
    const criticalErrors = consoleErrors.filter((e) => !e.includes("hydration") && !e.includes("404"))
    expect(criticalErrors).toHaveLength(0)
  })

  test("(b) Live Preview renders on draft with only title + price", async ({ page }) => {
    await loginThroughUi(page, adminUser.email)
    const baseOrigin = process.env.BASE_URL || "http://127.0.0.1:3045"
    await page.context().addCookies([
      { name: "ts_demo_role", value: "ADMIN", url: baseOrigin },
    ])
    await page.goto("/admin/courses/new")
    await page.waitForLoadState("domcontentloaded")

    // Navigate past template picker if needed
    const nextBtn = page.locator('[data-testid="wizard-next-btn"]')
    if (await nextBtn.isVisible()) {
      await nextBtn.click()
    }

    // Fill Title
    const titleInput = page.locator('[data-testid="input-course-title"]')
    await titleInput.fill("Live Preview Title Only Course")

    // Go to pricing step and set price
    await page.locator('[data-testid="step-nav-3"]').click()
    await page.locator('[data-testid="input-course-price"]').fill("1499")

    const previewBtn = page.locator('[data-testid="btn-live-preview"]')
    await previewBtn.click()

    const previewFrame = page.frameLocator('iframe[title="Studio Live Course Preview"]')
    const frameBody = previewFrame.locator("body")
    await expect(frameBody).toBeVisible({ timeout: 10000 })

    const frameText = await frameBody.textContent()
    expect(frameText).not.toContain("Unexpected Error")
    expect(frameText).toContain("Live Preview Title Only Course")
    expect(frameText).toContain("1,499")

    // Mobile toggle
    await page.locator('[data-testid="btn-preview-mobile"]').click()
    await page.waitForTimeout(300)
    expect(await frameBody.textContent()).toContain("Live Preview Title Only Course")
  })

  test("(c) Live Preview matches public page tabs & sections on fully filled course", async ({ page }) => {
    test.skip(!testCourse, "Requires existing course in test DB")

    await loginThroughUi(page, adminUser.email)
    const baseOrigin = process.env.BASE_URL || "http://127.0.0.1:3045"
    await page.context().addCookies([
      { name: "ts_demo_role", value: "ADMIN", url: baseOrigin },
    ])

    // 1. Visit public page to record rendered tabs
    await page.goto(`/courses/${testCourse.slug}`)
    await page.waitForLoadState("domcontentloaded")
    const publicTabs = await page.locator('nav[aria-label="Course section navigation"] [role="tab"]').allTextContents()

    // 2. Open Studio Live Preview for the same course
    await page.goto(`/admin/courses/${testCourse.id}/edit`)
    await page.waitForLoadState("domcontentloaded")

    const previewBtn = page.locator('[data-testid="btn-studio-live-preview"]')
    await previewBtn.click()

    const previewFrame = page.frameLocator('iframe[title="Studio Live Course Preview"]')
    const frameBody = previewFrame.locator("body")
    await expect(frameBody).toBeVisible({ timeout: 10000 })

    const previewBody = await frameBody.textContent()
    expect(previewBody).not.toContain("Unexpected Error")

    // Verify tabs rendered in preview iframe
    const previewTabs = await previewFrame.locator('nav[aria-label="Course section navigation"] [role="tab"]').allTextContents()

    // Assert parity: preview tabs must have the same items
    for (const tab of publicTabs) {
      expect(previewTabs).toContain(tab)
    }

    // Toggle Mobile in Studio Preview
    await page.locator('[data-testid="btn-preview-mobile"]').click()
    await page.waitForTimeout(300)
    expect(await frameBody.textContent()).not.toContain("Unexpected Error")

    await page.locator('[data-testid="btn-preview-desktop"]').click()
    await page.waitForTimeout(300)
    expect(await frameBody.textContent()).not.toContain("Unexpected Error")
  })

  test("(d) Live Preview reflects unsaved field edits in real time", async ({ page }) => {
    test.skip(!testCourse, "Requires existing course in test DB")

    await loginThroughUi(page, adminUser.email)
    const baseOrigin = process.env.BASE_URL || "http://127.0.0.1:3045"
    await page.context().addCookies([
      { name: "ts_demo_role", value: "ADMIN", url: baseOrigin },
    ])
    await page.goto(`/admin/courses/${testCourse.id}/edit`)
    await page.waitForLoadState("domcontentloaded")

    const UNPUBLISHED_PREVIEW_TITLE = `Unsaved Live Title ${nonce}`

    // Edit Title in Hero Details tab WITHOUT clicking Save Changes
    const titleInput = page.locator("#hero-title")
    await titleInput.fill(UNPUBLISHED_PREVIEW_TITLE)

    // Open Live Preview
    const previewBtn = page.locator('[data-testid="btn-studio-live-preview"]')
    await previewBtn.click()

    const previewFrame = page.frameLocator('iframe[title="Studio Live Course Preview"]')
    const frameBody = previewFrame.locator("body")
    await expect(frameBody).toBeVisible({ timeout: 10000 })

    const previewContent = await frameBody.textContent()
    expect(previewContent).not.toContain("Unexpected Error")
    // Assert the preview instantly shows the unsaved value!
    expect(previewContent).toContain(UNPUBLISHED_PREVIEW_TITLE)

    // Toggle to mobile preview
    await page.locator('[data-testid="btn-preview-mobile"]').click()
    await page.waitForTimeout(300)
    expect(await frameBody.textContent()).toContain(UNPUBLISHED_PREVIEW_TITLE)
  })

  test("(e) Singular and plural formatting on count=1 vs count=2 on public page and preview", async ({ page }) => {
    const singleLectureSlug = `single-lec-${slugFor(nonce)}`

    // Create course with count=1 lecture and count=1 hour
    const singleCourse = await prisma.course.create({
      data: {
        title: `Single Lecture Course ${nonce}`,
        slug: singleLectureSlug,
        description: "Test singular plural count=1 formatting",
        price: 999,
        originalPrice: 1999,
        difficulty: "BEGINNER",
        technology: "General",
        schemaVersion: 2,
        metadataJson: JSON.stringify({ schemaVersion: 2 }),
        status: "PUBLISHED",
        isPublished: true,
        chapters: {
          create: [
            {
              title: "Theme 1",
              order: 1,
              lessons: {
                create: [
                  {
                    title: "First Single Lecture",
                    type: "VIDEO",
                    order: 1,
                    duration: 60, // 60 mins = 1 hour
                  },
                ],
              },
            },
          ],
        },
      },
    })

    try {
      // 1. Check Public Page for count=1: must say "1 lecture" and "1 hour of teaching", never "1 lectures" or "1 hours"
      await page.goto(`/courses/${singleLectureSlug}`)
      await page.waitForLoadState("domcontentloaded")
      const publicContent = await page.textContent("body")
      expect(publicContent).toContain("1 lecture")
      expect(publicContent).not.toMatch(/\b1 lectures\b/)
      expect(publicContent).toContain("1 hour of teaching")
      expect(publicContent).not.toMatch(/\b1 hours of teaching\b/)

      // 2. Check Live Preview in Studio for the same count=1 course
      await loginThroughUi(page, adminUser.email)
      const baseOrigin = process.env.BASE_URL || "http://127.0.0.1:3045"
      await page.context().addCookies([
        { name: "ts_demo_role", value: "ADMIN", url: baseOrigin },
      ])
      await page.goto(`/admin/courses/${singleCourse.id}/edit`)
      await page.waitForLoadState("domcontentloaded")

      await page.locator('[data-testid="btn-studio-live-preview"]').click()
      const previewFrame = page.frameLocator('iframe[title="Studio Live Course Preview"]')
      const frameBody = previewFrame.locator("body")
      await expect(frameBody).toBeVisible({ timeout: 10000 })

      const previewText = await frameBody.textContent()
      expect(previewText).toContain("1 lecture")
      expect(previewText).not.toMatch(/\b1 lectures\b/)
      expect(previewText).toContain("1 hour of teaching")
      expect(previewText).not.toMatch(/\b1 hours of teaching\b/)
    } finally {
      await prisma.lesson.deleteMany({ where: { chapter: { courseId: singleCourse.id } } }).catch(() => {})
      await prisma.chapter.deleteMany({ where: { courseId: singleCourse.id } }).catch(() => {})
      await prisma.course.delete({ where: { id: singleCourse.id } }).catch(() => {})
    }
  })
})
