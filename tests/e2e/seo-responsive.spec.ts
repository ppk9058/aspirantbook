import { test, expect } from "@playwright/test"
import { loginAs } from "./test-series-e2e-helpers"
import { seedSeoResponsiveFixtures, cleanupSeoResponsiveFixtures } from "./helpers/seo-responsive-fixtures"

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3045"

test.describe("SEO Responsive Audit Suite", () => {
  test.setTimeout(60_000)

  test.beforeAll(async () => {
    await seedSeoResponsiveFixtures()
  })

  test.afterAll(async () => {
    await cleanupSeoResponsiveFixtures()
  })

  // 1. Meta Viewport Tag Verification (Check 5)
  test("Check 5: Rendered HTML contains valid viewport meta tag", async ({ page }) => {
    await page.goto(`${BASE_URL}/question-answer`)
    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute("content")
    expect(viewportMeta).toBeTruthy()
    expect(viewportMeta).toContain("width=device-width")
    expect(viewportMeta).toContain("initial-scale=1")
  })

  // 2. Horizontal Overflow Guard on Question Surfaces (Check 1)
  test("Check 1: Public Question Pages have document.documentElement.scrollWidth <= clientWidth", async ({
    page,
  }) => {
    const urls = [
      "/question-answer/upsc-cse/geography/test-resp-01-long-english-question-with-image",
      "/question-answer/upsc-cse/computer-science/test-resp-03-question-with-table-and-code",
      "/question-answer/upsc-cse/public-administration/test-resp-04-exceptionally-long-slug-designed-to-verify-responsive-wrapping-and-prevent-horizontal-page-overflow-on-mobile-phone-viewports-without-layout-breakage-2024",
      "/hi/question-answer/bpsc/hindi-literature/test-resp-02-hindi-question-long-words",
      "/question-answer",
    ]

    for (const urlPath of urls) {
      await page.goto(`${BASE_URL}${urlPath}`)
      const isOverflowing = await page.evaluate(() => {
        const docEl = document.documentElement
        return docEl.scrollWidth > docEl.clientWidth + 1
      })
      expect(isOverflowing, `Expected no horizontal scroll overflow on ${urlPath}`).toBe(false)
    }
  })

  // 3. Horizontal Overflow on Print Page (Check 1)
  test("Check 1: Test Series Print View has no horizontal overflow on mobile or desktop", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/test-series/test-resp-test-id/print`)
    const overflowInfo = await page.evaluate(() => {
      const docEl = document.documentElement
      return {
        hasOverflow: docEl.scrollWidth > docEl.clientWidth + 1,
        scrollW: docEl.scrollWidth,
        clientW: docEl.clientWidth,
      }
    })
    expect(
      overflowInfo.hasOverflow,
      `Print page overflowed: scrollWidth ${overflowInfo.scrollW} > clientWidth ${overflowInfo.clientW}`
    ).toBe(false)
  })

  // 4. Tap Target Enforcement on Public Headers & Buttons (Check 2)
  test("Check 2: Public Header and Question interactive elements meet 40x40px touch target minimum", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Tap target requirements apply to phone touch viewports")

    await page.goto(`${BASE_URL}/question-answer`)

    const headerBrand = page.locator('header a[href="/question-answer"], header a[href="/hi/question-answer"]').first()
    const brandBox = await headerBrand.boundingBox()
    expect(brandBox?.height ?? 0, "Header brand touch target height must be >= 40px").toBeGreaterThanOrEqual(40)

    const langToggle = page.locator('header a[href*="question-answer"]:has-text("हिन्दी"), header a[href*="question-answer"]:has-text("English")').first()
    const langBox = await langToggle.boundingBox()
    expect(langBox?.height ?? 0, "Language toggle touch target height must be >= 40px").toBeGreaterThanOrEqual(40)
  })

  // 5. Tap Target Enforcement on Test Series Print Controls (Check 2)
  test("Check 2: Test Series Print screen action buttons meet 40x40px touch target minimum", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Tap target requirements apply to phone touch viewports")

    await page.goto(`${BASE_URL}/test-series/test-resp-test-id/print`)

    const backBtn = page.locator('.print\\:hidden button:has-text("Back")').first()
    const backBox = await backBtn.boundingBox()
    expect(backBox?.height ?? 0, "Back button height must be >= 40px").toBeGreaterThanOrEqual(40)

    const printBtn = page.locator('.print\\:hidden button:has-text("Print")').first()
    const printBox = await printBtn.boundingBox()
    expect(printBox?.height ?? 0, "Print button height must be >= 40px").toBeGreaterThanOrEqual(40)
  })

  // 6. Admin Navigation Drawer & Tap Target Enforcement (Checks 1, 2, 4)
  test("Checks 1, 2, 4: Admin Nav drawer toggle, close button, and surfaces are responsive", async ({
    page,
    isMobile,
  }) => {
    await loginAs(page, "admin@aspirantbook.com", "Test@123")
    await page.goto(`${BASE_URL}/admin/seo`)

    const overflowInfo = await page.evaluate(() => {
      const docEl = document.documentElement
      return docEl.scrollWidth > docEl.clientWidth + 1
    })
    expect(overflowInfo, "Admin SEO page must not overflow horizontally").toBe(false)

    if (isMobile) {
      const menuBtn = page.locator('header button[aria-label="Toggle navigation menu"]').first()
      const menuBox = await menuBtn.boundingBox()
      expect(menuBox?.height ?? 0, "Mobile hamburger menu button must be >= 40px").toBeGreaterThanOrEqual(40)

      await menuBtn.click()
      await page.waitForTimeout(300)

      const aside = page.locator("aside").first()
      await expect(aside).toBeVisible()

      const closeBtn = page.locator('aside button[aria-label="Close navigation"]').first()
      const closeBox = await closeBtn.boundingBox()
      expect(closeBox?.height ?? 0, "Mobile drawer close button must be >= 40px").toBeGreaterThanOrEqual(40)
      expect(closeBox?.width ?? 0, "Mobile drawer close button must be >= 40px").toBeGreaterThanOrEqual(40)
    }
  })
})
