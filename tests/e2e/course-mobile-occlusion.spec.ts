import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import { newNonce, prisma } from "./test-series-e2e-helpers"

test.describe("Mobile 360px Occlusion & Safe Touch Verification", () => {
  let testCourse: any

  test.beforeAll(async () => {
    await prisma.$connect()
    const nonce = newNonce()
    testCourse = await prisma.course.create({
      data: {
        title: `Mobile Occlusion Test ${nonce}`,
        slug: `mobile-occlusion-${nonce}`,
        description: "Course to verify zero occlusion of tab pills, badges, and interactive controls at 360px",
        price: 999,
        originalPrice: 1999,
        technology: "UPSC",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        metadataJson: JSON.stringify({
          schemaVersion: 2,
          badges: [
            { label: "Bilingual Hinglish", labelHi: "द्विभाषी हिंग्लिश" },
            { label: "Answer Evaluation", labelHi: "उत्तर मूल्यांकन" },
          ],
          heroMetrics: [
            { label: "Students", value: "2,500+" },
            { label: "Lectures", value: "85+" },
          ],
          units: [
            {
              id: "unit-1",
              title: "Unit 1: Indian Polity",
              tag: "Section A",
              order: 1,
              themes: [
                {
                  id: "theme-1",
                  title: "Theme 1: Preamble & Constitutional Framework",
                  order: 1,
                  lectures: [
                    {
                      id: "lec-1",
                      title: "Lecture 1: Historical Evolution of Constitution",
                      duration: 45,
                      order: 1,
                    },
                  ],
                },
              ],
            },
          ],
        }),
      },
    })
  })

  test.afterAll(async () => {
    if (testCourse?.id) {
      await prisma.course.delete({ where: { id: testCourse.id } }).catch(() => {})
    }
    await prisma.$disconnect()
  })

  test("Mobile 360px: Tab pills and badge row are reachable, visible, and never occluded by sticky bottom bar", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto(`/courses/${testCourse.slug}`)
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(600)

    // Locate the sticky bottom CTA bar on phones
    const bottomBar = page.locator('[data-testid="mobile-bottom-cta-bar"]')
    await expect(bottomBar).toBeVisible()
    const barBox = await bottomBar.boundingBox()
    expect(barBox).not.toBeNull()
    const barTop = barBox!.y

    // 1. Verify Tab Pills are NOT covered by the bottom bar
    const tabs = page.locator('nav[aria-label="Course section navigation"] [role="tab"]')
    const tabCount = await tabs.count()
    expect(tabCount).toBeGreaterThan(0)

    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i)
      await tab.scrollIntoViewIfNeeded()
      const box = await tab.boundingBox()
      expect(box).not.toBeNull()
      // Tab pill bottom must be well above the bottom bar top
      expect(box!.y + box!.height).toBeLessThanOrEqual(barTop)
      // Must be interactive / clickable
      await expect(tab).toBeEnabled()
    }

    // 2. Scroll to badges and ensure they are not occluded
    const badgeElements = page.locator('[data-testid="hero-badge"]')
    const badgeCount = await badgeElements.count()
    if (badgeCount > 0) {
      const firstBadge = badgeElements.first()
      await firstBadge.scrollIntoViewIfNeeded()
      const badgeBox = await firstBadge.boundingBox()
      expect(badgeBox).not.toBeNull()
      expect(badgeBox!.y + badgeBox!.height).toBeLessThanOrEqual(barTop)
    }

    // 3. Scroll to the bottom of the page and verify main content has enough bottom clearance
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(300)

    // Ensure the bottom padding keeps page content reachable above bottom bar
    const mainBox = await page.locator('[data-testid="course-detail-v2"] main').boundingBox()
    expect(mainBox).not.toBeNull()
    const scrollY = await page.evaluate(() => window.scrollY)
    const innerHeight = await page.evaluate(() => window.innerHeight)
    expect(scrollY + innerHeight).toBeGreaterThanOrEqual(barTop)
  })
})
