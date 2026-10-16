import { test, expect } from "@playwright/test"

/**
 * Landing page (/) mobile contract.
 *
 * Covers:
 *  - no horizontal page scroll at 320 / 360 / 390 px (responsive-ui standard §3)
 *  - page loads with the hero H1 (no empty / error state)
 *  - one known fixture value from the homepage course data is visible
 */
test.describe("Landing page — mobile", () => {
  const KNOWN_FIXTURE_TITLE = "UPSC Prelims & Mains Comprehensive Video Batch"

  test("never scrolls horizontally on small phones and shows real course content", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" })
    expect(response?.status()).toBe(200)

    // No horizontal page scroll down to 320px
    for (const width of [320, 360, 390]) {
      await page.setViewportSize({ width, height: 800 })
      await page.waitForTimeout(150)
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(
        overflow.scrollWidth,
        `horizontal overflow at ${width}px (scrollWidth ${overflow.scrollWidth} > clientWidth ${overflow.clientWidth})`,
      ).toBeLessThanOrEqual(overflow.clientWidth)
    }

    // No empty / error state; hero renders
    await expect(page.locator('h1:has-text("Looking for something?")')).not.toBeVisible()
    await expect(page.locator('h1[data-testid="landing-hero-heading"]')).toBeVisible()

    // One known fixture value renders (a real homepage course card)
    await expect(page.getByText(KNOWN_FIXTURE_TITLE).first()).toBeVisible()
  })
})
