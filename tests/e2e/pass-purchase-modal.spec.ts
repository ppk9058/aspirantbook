import { test, expect, type Page } from "@playwright/test"
import fs from "fs"
import { prisma, createActor, loginAs, newNonce } from "./test-series-e2e-helpers"

const SHOTS = "/tmp/pass-modal-shots"

/**
 * The "Get Pass" CTA is a client component: the SSR HTML renders before React
 * attaches the click handler. Clicking straight after `domcontentloaded` is a
 * no-op, so retry the click until the modal actually opens.
 */
async function openPassModal(page: Page) {
  const getPassBtn = page.locator("button:has-text('Get Pass')").first()
  await expect(getPassBtn).toBeVisible({ timeout: 20_000 })

  const modal = page.locator('[data-testid="pass-modal"]')
  await expect(async () => {
    await getPassBtn.click()
    await expect(modal).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 20_000 })

  return { getPassBtn, modal }
}

test.describe("Pass Purchase Modal: Same-Page Pop-up & Checkout Flow", () => {
  let studentUser: { id: string; email: string } | null = null
  let nonce = ""

  test.beforeAll(async () => {
    if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true })
    nonce = newNonce()
    studentUser = await createActor(nonce, "FREE", "pass-modal-student")
  })

  test.afterAll(async () => {
    if (studentUser?.id) {
      await prisma.user.deleteMany({ where: { id: studentUser.id } }).catch(() => undefined)
    }
    await prisma.$disconnect().catch(() => undefined)
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

    await loginAs(page, studentUser!.email)
  })

  test("Desktop: Clicking 'Get Pass' opens modal on same page, displays benefits and Pay button, closes via X, Esc, and backdrop", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto("/test-series", { waitUntil: "domcontentloaded" })

    const initialUrl = page.url()
    const { getPassBtn, modal } = await openPassModal(page)

    // 1. Modal visible, URL unchanged (same-page pop-up)
    expect(page.url()).toBe(initialUrl)

    // 2. Real Pass benefits and Pay button
    await expect(modal.getByText("aspirantBook Pass", { exact: false }).first()).toBeVisible()
    await expect(modal.getByText("Yearly aspirantBook Pass")).toBeVisible()
    const payBtn = page.locator('[data-testid="pass-modal-pay-btn"]')
    await expect(payBtn).toBeVisible()
    await expect(payBtn).toBeEnabled()

    await page.screenshot({ path: `${SHOTS}/pass-modal-desktop.png` })

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
    await page.mouse.click(10, 10)
    await expect(modal).toBeHidden()
  })

  test("Mobile (360px): Stacked layout, no horizontal overflow, Pay button always visible", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto("/test-series", { waitUntil: "domcontentloaded" })

    const { modal } = await openPassModal(page)

    // Verify Pay button is visible in mobile viewport
    const payBtn = page.locator('[data-testid="pass-modal-pay-btn"]')
    await expect(payBtn).toBeVisible()

    // Verify no horizontal overflow at 360px
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalScroll).toBe(false)

    // Pay button sits inside the phone viewport
    const box = await payBtn.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(360)

    await page.screenshot({ path: `${SHOTS}/pass-modal-mobile-360.png` })
    await expect(modal).toBeVisible()
  })

  test("Guest: clicking 'Get Pass' goes to /login with the same-page passPopup return path", async ({
    page,
  }) => {
    await page.context().clearCookies()
    await page.goto("/test-series", { waitUntil: "domcontentloaded" })

    const getPassBtn = page.locator("button:has-text('Get Pass')").first()
    await expect(getPassBtn).toBeVisible({ timeout: 20_000 })

    await expect(async () => {
      await getPassBtn.click()
      await page.waitForURL(/\/login\?callbackUrl=/, { timeout: 3_000 })
    }).toPass({ timeout: 20_000 })

    expect(page.url()).toContain(encodeURIComponent("/test-series?passPopup=1"))
    await expect(page.locator('[data-testid="pass-modal"]')).toHaveCount(0)
  })
})
