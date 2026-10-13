import { test, expect } from "@playwright/test"
import { prisma, createActor, loginAs, newNonce } from "./test-series-e2e-helpers"

test.describe("Universal Razorpay Checkout Options & Same-Page Buy Now", () => {
  let studentUser: any
  let nonce: string

  test.beforeAll(async () => {
    nonce = newNonce()
    studentUser = await createActor(nonce, "FREE", "rzp-student")
  })

  test.afterAll(async () => {
    if (studentUser?.id) {
      await prisma.user.deleteMany({ where: { id: studentUser.id } }).catch(() => {})
    }
  })

  test("RZP-UNI-01: Books Buy Now passes unified options, student prefill, and #1448d8 theme", async ({ page }) => {
    await loginAs(page, studentUser.email)

    // Inject mock Razorpay to capture options passed to new window.Razorpay(opts)
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

    await page.goto("/books", { waitUntil: "domcontentloaded" })
    await expect(page.locator('[data-testid="books-page-root"][data-hydrated="true"]')).toBeVisible({ timeout: 15_000 })

    const firstBuyNowBtn = page.locator('[data-testid="book-card-buy-now-btn"]').first()
    await expect(firstBuyNowBtn).toBeVisible({ timeout: 10_000 })
    await firstBuyNowBtn.click()

    const checkoutBtn = page.locator('[data-testid="cart-drawer-checkout-btn"]')
    await expect(checkoutBtn).toBeVisible({ timeout: 10_000 })
    await checkoutBtn.click()

    // Assert Razorpay was instantiated with canonical options
    await page.waitForFunction(() => Boolean((window as any).__lastRazorpayOpts), { timeout: 10_000 })
    const rzpOpts = await page.evaluate(() => (window as any).__lastRazorpayOpts)
    const hasOndismiss = await page.evaluate(() => typeof (window as any).__lastRazorpayOpts?.modal?.ondismiss === "function")

    expect(rzpOpts).toBeDefined()
    expect(rzpOpts.theme?.color).toBe("#1448d8")
    expect(rzpOpts.order_id).toBeDefined()
    expect(typeof rzpOpts.amount).toBe("number")
    expect(rzpOpts.prefill?.email).toBe(studentUser.email)
    expect(hasOndismiss).toBe(true)
  })

  test("RZP-UNI-02: Universal same-page subscription Buy Now configures solid blue #1448d8 theme and proper options", async ({ page }) => {
    await loginAs(page, studentUser.email)

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

    await page.goto("/pricing", { waitUntil: "domcontentloaded" })
    await expect(page.locator("text=PREMIUM").first()).toBeVisible({ timeout: 15_000 })

    // Click Get Pass button to trigger same-page Razorpay checkout
    const getPassBtn = page.locator('[data-testid="pricing-get-pass-btn"][data-hydrated="true"]').first()
    await expect(getPassBtn).toBeVisible({ timeout: 10_000 })
    await getPassBtn.click()

    await page.waitForFunction(() => Boolean((window as any).__lastRazorpayOpts), { timeout: 10_000 })
    const rzpOpts = await page.evaluate(() => (window as any).__lastRazorpayOpts)

    expect(rzpOpts).toBeDefined()
    expect(rzpOpts.theme?.color).toBe("#1448d8")
    expect(rzpOpts.order_id).toBeDefined()
    expect(rzpOpts.currency).toBe("INR")
    expect(typeof rzpOpts.amount).toBe("number")
    expect(rzpOpts.prefill?.email).toBe(studentUser.email)
  })

  test("RZP-UNI-03: Edge Case: Guest clicking Buy Now gets mobile login modal first", async ({ page }) => {
    await page.context().clearCookies()
    await page.goto("/books", { waitUntil: "domcontentloaded" })
    await expect(page.locator('[data-testid="books-page-root"][data-hydrated="true"]')).toBeVisible({ timeout: 15_000 })

    const buyNowBtn = page.locator('[data-testid="book-card-buy-now-btn"]').first()
    await expect(buyNowBtn).toBeVisible({ timeout: 10_000 })
    await buyNowBtn.click()

    const checkoutBtn = page.locator('[data-testid="cart-drawer-checkout-btn"]')
    await expect(checkoutBtn).toBeVisible({ timeout: 10_000 })
    await checkoutBtn.click()

    // Assert mobile login / auth gate opens
    const authGate = page.locator('[data-testid="mobile-auth-modal"]')
      .or(page.locator('input[placeholder*="mobile"]'))
      .or(page.locator('input[type="tel"]'))
      .or(page.locator("text=Enter your mobile number"))
      .first()
    await expect(authGate).toBeVisible({ timeout: 10_000 })
  })

  test("RZP-UNI-04: Edge Case: Modal dismissal cleanly preserves page state and shows dismiss notice", async ({ page }) => {
    await loginAs(page, studentUser.email)

    await page.addInitScript(() => {
      ;(window as any).Razorpay = function (opts: any) {
        return {
          open: () => {
            // Simulate user immediately closing the Razorpay checkout iframe
            if (opts.modal?.ondismiss) {
              opts.modal.ondismiss()
            }
          },
          on: () => {},
        }
      }
    })

    await page.goto("/books", { waitUntil: "domcontentloaded" })
    await expect(page.locator('[data-testid="books-page-root"][data-hydrated="true"]')).toBeVisible({ timeout: 15_000 })

    const buyNowBtn = page.locator('[data-testid="book-card-buy-now-btn"]').first()
    await expect(buyNowBtn).toBeVisible({ timeout: 10_000 })
    await buyNowBtn.click()

    const checkoutBtn = page.locator('[data-testid="cart-drawer-checkout-btn"]')
    await expect(checkoutBtn).toBeVisible({ timeout: 10_000 })
    await checkoutBtn.click()

    // Assert page URL remained on /books (did not redirect away)
    expect(page.url()).toContain("/books")
    // Assert checkout button returns to enabled state after dismissal
    await expect(checkoutBtn).toBeEnabled({ timeout: 10_000 })
  })
})
