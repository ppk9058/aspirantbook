import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import { newNonce, prisma } from "./test-series-e2e-helpers"

test.describe("Course Thumbnail Fallback & Cover Verification", () => {
  let courseWithBrokenThumb: any

  test.beforeAll(async () => {
    await prisma.$connect()
    const nonce = newNonce()
    // Create course with a guaranteed 404 broken thumbnail URL
    courseWithBrokenThumb = await prisma.course.create({
      data: {
        title: `Broken Thumb Course ${nonce}`,
        slug: `broken-thumb-${nonce}`,
        description: "Course designed to verify generated SVG fallback cover on broken 404 image URLs",
        price: 999,
        originalPrice: 1999,
        technology: "Banking",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        thumbnailUrl: "http://127.0.0.1:3045/images/guaranteed-404-nonexistent-image.jpg",
        metadataJson: JSON.stringify({
          schemaVersion: 2,
          language: "hi",
          hideIllustration: false,
        }),
        units: {
          create: [
            {
              title: "Unit 1: Banking Awareness",
              order: 1,
            },
          ],
        },
      },
    })
  })

  test.afterAll(async () => {
    if (courseWithBrokenThumb?.id) {
      await prisma.courseUnit.deleteMany({ where: { courseId: courseWithBrokenThumb.id } }).catch(() => {})
      await prisma.course.delete({ where: { id: courseWithBrokenThumb.id } }).catch(() => {})
    }
    await prisma.$disconnect()
  })

  test("Desktop: Broken/404 thumbnail displays generated cover with no broken img visible", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(`/courses/${courseWithBrokenThumb.slug}`)
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(600)

    // Assert that the generated fallback cover is displayed
    const cover = page.locator('[data-testid="generated-cover"]:visible').first()
    await expect(cover).toBeVisible()

    // Assert that no broken image is visible
    const brokenImg = page.locator('img[src*="guaranteed-404"]:visible')
    expect(await brokenImg.count()).toBe(0)
  })

  test("Mobile: Broken/404 thumbnail displays generated cover with no broken img visible at 360px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto(`/courses/${courseWithBrokenThumb.slug}`)
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(600)

    // Assert that the generated fallback cover is displayed in the active mobile view
    const cover = page.locator('[data-testid="generated-cover"]:visible').first()
    await expect(cover).toBeVisible()

    // Assert that no broken image is visible
    const brokenImg = page.locator('img[src*="guaranteed-404"]:visible')
    expect(await brokenImg.count()).toBe(0)
  })
})
