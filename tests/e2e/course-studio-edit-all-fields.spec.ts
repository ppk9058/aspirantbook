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

test.describe("Real Studio UI Edit-After-Create Verification", () => {
  test.setTimeout(180_000)

  let nonce: string
  let adminUser: any
  let testCourse: any

  test.beforeAll(async () => {
    await prisma.$connect()
    nonce = newNonce()
    adminUser = await createActor(nonce, "ADMIN", "admin-edit")
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { emailVerified: new Date() },
    })

    const courseSlug = `base-studio-edit-${slugFor(nonce)}`
    // Create a base published course to edit in Studio
    testCourse = await prisma.course.create({
      data: {
        title: `Base Initial Title ${nonce}`,
        slug: courseSlug,
        description: "Initial description for real edit-after-create UI verification",
        price: 999,
        originalPrice: 1999,
        technology: "UPSC",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        metadataJson: JSON.stringify({
          schemaVersion: 2,
          goalLabel: "Initial Target Goal",
          enrollCtaLabel: "Enroll in Initial Batch",
          badges: [{ label: "Initial Feature Badge", labelHi: "प्रारंभिक फीचर बैज" }],
          heroMetrics: [{ label: "Initial Mentors", value: "10+" }],
        }),
        chapters: {
          create: [
            {
              title: "Theme 1: Indian Polity",
              order: 1,
              lessons: {
                create: [
                  {
                    title: "Lecture 1: Preamble",
                    type: "VIDEO",
                    order: 1,
                    duration: 45,
                  },
                ],
              },
            },
          ],
        },
      },
    })
  })

  test.afterAll(async () => {
    if (testCourse?.id) {
      await prisma.lesson.deleteMany({ where: { chapter: { courseId: testCourse.id } } }).catch(() => {})
      await prisma.chapter.deleteMany({ where: { courseId: testCourse.id } }).catch(() => {})
      await prisma.course.delete({ where: { id: testCourse.id } }).catch(() => {})
    }
    if (adminUser?.id) {
      await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {})
    }
    await prisma.$disconnect()
  })

  test("Edits course via Studio UI across all major fields, saves, and asserts public page updates", async ({ page }) => {
    // Automatically accept any confirmation dialogs (e.g. 0 lectures or unsaved guard)
    page.on("dialog", (dialog) => dialog.accept())

    await loginThroughUi(page, adminUser.email)
    const baseOrigin = process.env.BASE_URL || "http://127.0.0.1:3045"
    await page.context().addCookies([
      { name: "ts_demo_role", value: "ADMIN", url: baseOrigin },
    ])

    // 1. Navigate to Studio Editor
    await page.goto(`/admin/courses/${testCourse.id}/edit`)
    await page.waitForLoadState("domcontentloaded")
    await expect(page.locator('[data-testid="btn-save-course"]')).toBeVisible()

    const EDITED_TITLE = `Edited Studio Title ${nonce}`
    const EDITED_SUBTITLE = `Edited Subtitle with Comprehensive Notes ${nonce}`
    const EDITED_GOAL = `Edited Target Goal ${nonce}`
    const EDITED_CTA = `Join Edited Batch Now`
    const EDITED_STAT_LBL = `Live Expert Hours`
    const EDITED_BADGE_LBL = `Verified Course Badge`

    // 2. Edit Hero & Details Tab fields
    await page.locator("#hero-title").fill(EDITED_TITLE)
    await page.locator("#hero-subtitle").fill(EDITED_SUBTITLE)
    await page.locator("#hero-goal-label").fill(EDITED_GOAL)
    await page.locator("#hero-cta-en").fill(EDITED_CTA)

    // Edit Stat metric
    const statLbl = page.locator("#metric-lbl-0")
    if (await statLbl.isVisible()) {
      await statLbl.fill(EDITED_STAT_LBL)
    }

    // Edit Badge
    const badgeLbl = page.locator("#badge-lbl-0")
    if (await badgeLbl.isVisible()) {
      await badgeLbl.fill(EDITED_BADGE_LBL)
    }

    // 3. Edit Pricing
    const sellingPrice = page.locator('input[aria-label="Selling Price"]')
    await sellingPrice.fill("1799")
    const mrpPrice = page.locator('input[aria-label="Original Price / MRP"]')
    await mrpPrice.fill("3499")

    // 4. Save Course in Studio UI
    const saveBtn = page.locator('[data-testid="btn-save-course"]')
    await saveBtn.click()

    // Assert save success indicator appears
    await expect(page.locator("text=Course specifications & pricing saved successfully!").or(page.locator("text=saved successfully"))).toBeVisible({ timeout: 15000 })

    // 5. Visit Public Page and assert all edited values appear
    await page.goto(`/courses/${testCourse.slug}`)
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(600)

    const publicContent = await page.textContent("body")
    expect(publicContent).toContain(EDITED_TITLE)
    expect(publicContent).toContain(EDITED_SUBTITLE)
    expect(publicContent).toContain(EDITED_GOAL)
    expect(publicContent).toContain(EDITED_CTA)
    expect(publicContent).toContain("1,799")
    expect(publicContent).toContain("3,499")
    expect(publicContent).toContain(EDITED_STAT_LBL)
    expect(publicContent).toContain(EDITED_BADGE_LBL)
  })
})
