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

  test("(a) Live Preview opens safely on a BLANK wizard draft with zero errors", async ({ page }) => {
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

    const previewBtn = page.locator('[data-testid="btn-live-preview"]')
    await expect(previewBtn).toBeVisible()
    await previewBtn.click()

    // Assert preview modal opened
    const modal = page.locator(".fixed.inset-0")
    await expect(modal).toBeVisible()

    // Assert NO Unexpected Error and NO Preview Error Boundary crash
    const bodyText = await page.textContent("body")
    expect(bodyText).not.toContain("Unexpected Error")
    expect(bodyText).not.toContain("Application error")
    expect(page.locator('[data-testid="preview-error-boundary"]')).toHaveCount(0)

    // Test Mobile Toggle
    const mobileToggle = page.getByRole("button", { name: /Mobile/i })
    await mobileToggle.click()
    await page.waitForTimeout(400)
    expect(await page.textContent("body")).not.toContain("Unexpected Error")

    // Test Desktop Toggle
    const desktopToggle = page.getByRole("button", { name: /Desktop/i })
    await desktopToggle.click()
    await page.waitForTimeout(400)
    expect(await page.textContent("body")).not.toContain("Unexpected Error")

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

    const previewBtn = page.locator('[data-testid="btn-live-preview"]')
    await previewBtn.click()

    const bodyText = await page.textContent("body")
    expect(bodyText).not.toContain("Unexpected Error")
    expect(page.locator('[data-testid="preview-error-boundary"]')).toHaveCount(0)
    expect(bodyText).toContain("Live Preview Title Only Course")

    // Mobile toggle
    await page.getByRole("button", { name: /Mobile/i }).click()
    await page.waitForTimeout(300)
    expect(await page.textContent("body")).toContain("Live Preview Title Only Course")
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
    await page.waitForTimeout(800)

    const previewBody = await page.textContent("body")
    expect(previewBody).not.toContain("Unexpected Error")
    expect(page.locator('[data-testid="preview-error-boundary"]')).toHaveCount(0)

    // Verify tabs rendered in preview
    const previewTabs = await page.locator('.fixed.inset-0 nav[aria-label="Course section navigation"] [role="tab"]').allTextContents()

    // Assert parity: preview tabs must have the same items
    for (const tab of publicTabs) {
      expect(previewTabs).toContain(tab)
    }

    // Toggle Desktop and Mobile in Studio Preview
    await page.getByRole("button", { name: /Mobile \(360px\)/i }).first().click()
    await page.waitForTimeout(300)
    expect(await page.textContent("body")).not.toContain("Unexpected Error")

    await page.getByRole("button", { name: /Desktop \(1280px\)/i }).first().click()
    await page.waitForTimeout(300)
    expect(await page.textContent("body")).not.toContain("Unexpected Error")
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
    await page.waitForTimeout(500)

    const previewContent = await page.textContent("body")
    expect(previewContent).not.toContain("Unexpected Error")
    // Assert the preview instantly shows the unsaved value!
    expect(previewContent).toContain(UNPUBLISHED_PREVIEW_TITLE)

    // Toggle to mobile preview
    const mobileBtn = page.getByRole("button", { name: /Mobile/i }).first()
    await mobileBtn.click()
    await page.waitForTimeout(300)
    expect(await page.textContent("body")).toContain(UNPUBLISHED_PREVIEW_TITLE)
  })
})
