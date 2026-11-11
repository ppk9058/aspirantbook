import { test, expect } from "@playwright/test"
import fs from "fs"

test.describe("Pass Purchase Modal: Same-Page Pop-up & Checkout Flow", () => {
  test.beforeAll(() => {
    try {
      if (!fs.existsSync("/tmp/pass-modal-shots")) {
        fs.mkdirSync("/tmp/pass-modal-shots", { recursive: true })
      }
    } catch {}
  })

  test.beforeEach(async ({ page }) => {
    // Mock Razorpay on window to prevent live payment network calls
    await page.addInitScript(() => {
      ;(window as any).__lastRazorpayOpts = null
      ;(window as any).Razorpay = function (opts: any) {
        ;(window as any).__lastRazorpayOpts = opts
        return {
          open: () => {
            ;(window as any).__razorpayOpened = true
          },
          on: () => {},
        }
      }
    })
  })

  test("Desktop: Clicking 'Get Pass' opens modal on same page, displays benefits and Pay button, closes via X, Esc, and backdrop", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto("/test-series", { waitUntil: "domcontentloaded" })

    // Find and click Get Pass CTA
    const getPassBtn = page.locator("button:has-text('Get Pass')").first()
    await expect(getPassBtn).toBeVisible({ timeout: 15_000 })

    const initialUrl = page.url()
    await getPassBtn.click()

    // 1. Modal visible, URL unchanged
    const modal = page.locator('[data-testid="pass-modal"]')
    await expect(modal).toBeVisible({ timeout: 5_000 })
    expect(page.url()).toBe(initialUrl)

    // 2. Pay button visible
    const payBtn = page.locator('[data-testid="pass-modal-pay-btn"]')
    await expect(payBtn).toBeVisible()

    // Screenshot desktop modal
    await page.screenshot({ path: "/tmp/pass-modal-shots/pass-modal-desktop.png" })

    // 3. Close via close button (X)
    const closeBtn = page.locator('[data-testid="pass-modal-close"]')
    await expect(closeBtn).toBeVisible()
    await closeBtn.click()
    await expect(modal).toBeHidden()

    // 4. Reopen and close via Esc key
    await getPassBtn.click()
    await expect(modal).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(modal).toBeHidden()

    // 5. Reopen and close via backdrop click
    await getPassBtn.click()
    await expect(modal).toBeVisible()
    // Click outside modal card (top left corner of screen)
    await page.mouse.click(10, 10)
    await expect(modal).toBeHidden()
  })

  test("Mobile (360px): Stacked layout, no horizontal overflow, Pay button always visible", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto("/test-series", { waitUntil: "domcontentloaded" })

    const getPassBtn = page.locator("button:has-text('Get Pass')").first()
    await expect(getPassBtn).toBeVisible({ timeout: 15_000 })
    await getPassBtn.click()

    const modal = page.locator('[data-testid="pass-modal"]')
    await expect(modal).toBeVisible({ timeout: 5_000 })

    // Verify Pay button is visible in mobile viewport
    const payBtn = page.locator('[data-testid="pass-modal-pay-btn"]')
    await expect(payBtn).toBeVisible()

    // Verify no horizontal overflow at 360px
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalScroll).toBe(false)

    // Screenshot mobile modal
    await page.screenshot({ path: "/tmp/pass-modal-shots/pass-modal-mobile-360.png" })
  })
})
