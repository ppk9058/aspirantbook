import { test, expect } from "@playwright/test"
import { prisma, createActor, loginAs, newNonce } from "./test-series-e2e-helpers"
import path from "path"

const OUT_DIR = path.resolve(process.cwd(), "logs/verify-studio/buy-now")

test.describe("Capture Same-Page Buy Now Visual Flow", () => {
  let studentUser: any
  let nonce: string

  test.beforeAll(async () => {
    nonce = newNonce()
    studentUser = await createActor(nonce, "FREE", "buynow-student")
  })

  test.afterAll(async () => {
    if (studentUser?.id) {
      await prisma.user.deleteMany({ where: { id: studentUser.id } }).catch(() => {})
    }
  })

  test("Capture Books Buy Now flow - Guest Auth Modal", async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name === "mobile"
    const prefix = isMobile ? "mobile" : "desktop"

    await page.context().clearCookies()
    await page.goto("/books", { waitUntil: "domcontentloaded" })
    await page.evaluate(() => localStorage.clear())
    await expect(page.locator('[data-testid="books-page-root"][data-hydrated="true"]')).toBeVisible({ timeout: 15_000 })
    await page.screenshot({ path: path.join(OUT_DIR, `${prefix}_books_before_click.png`) })

    const buyBtn = page.locator('[data-testid="book-card-buy-now-btn"]').first()
    await expect(buyBtn).toBeVisible({ timeout: 10_000 })
    await buyBtn.click()

    const checkoutBtn = page.locator('[data-testid="cart-drawer-checkout-btn"]')
    await expect(checkoutBtn).toBeVisible({ timeout: 10_000 })
    await checkoutBtn.click()

    const authModal = page.locator('[data-testid="mobile-auth-modal"]')
      .or(page.locator('input[placeholder*="mobile"]'))
      .or(page.locator('input[type="tel"]'))
      .or(page.locator("text=Enter your mobile number"))
      .first()
    await expect(authModal).toBeVisible({ timeout: 10_000 })
    await page.screenshot({ path: path.join(OUT_DIR, `${prefix}_books_guest_auth_modal.png`) })
  })

  test("Capture Books Buy Now flow - Logged In Checkout & Success", async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name === "mobile"
    const prefix = isMobile ? "mobile" : "desktop"

    await loginAs(page, studentUser.email)
    await page.addInitScript(() => {
      ;(window as any).Razorpay = function (opts: any) {
        ;(window as any).__lastRazorpayOpts = opts
        return {
          open: () => {
            ;(window as any).__razorpayOpened = true
            setTimeout(() => {
              if (opts.handler) {
                opts.handler({
                  razorpay_payment_id: "pay_mock_123456",
                  razorpay_order_id: opts.order_id,
                  razorpay_signature: "mock_sig_valid",
                })
              }
            }, 300)
          },
          on: () => {},
        }
      }
    })

    await page.route("**/api/books/checkout/verify", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          order: {
            id: "ord_mock_123",
            orderId: "ord_mock_123",
            razorpayOrderId: "order_mock_rzp",
            items: [{ bookId: "mock_book", title: "Complete UPSC Handbook", price: 499, quantity: 1 }],
            totalAmount: 499,
            status: "COMPLETED",
            createdAt: new Date().toISOString(),
          },
        }),
      })
    })

    await page.goto("/books", { waitUntil: "domcontentloaded" })
    await page.evaluate(() => localStorage.clear())
    await expect(page.locator('[data-testid="books-page-root"][data-hydrated="true"]')).toBeVisible({ timeout: 15_000 })

    const loggedInBuyBtn = page.locator('[data-testid="book-card-buy-now-btn"]').first()
    await loggedInBuyBtn.click()

    const loggedInCheckoutBtn = page.locator('[data-testid="cart-drawer-checkout-btn"]')
    await expect(loggedInCheckoutBtn).toBeVisible({ timeout: 10_000 })
    await page.screenshot({ path: path.join(OUT_DIR, `${prefix}_books_razorpay_opening.png`) })

    await loggedInCheckoutBtn.click()
    const successModal = page.locator('[data-testid="payment-success-modal"]')
      .or(page.locator("text=Payment Successful!"))
      .or(page.locator("text=Your eBook is ready to read"))
      .first()
    await expect(successModal).toBeVisible({ timeout: 10_000 })
    await page.screenshot({ path: path.join(OUT_DIR, `${prefix}_books_success.png`) })
  })

  test("Capture Pricing Pass Buy Now flow", async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name === "mobile"
    const prefix = isMobile ? "mobile" : "desktop"

    await loginAs(page, studentUser.email)
    await page.addInitScript(() => {
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
    await page.screenshot({ path: path.join(OUT_DIR, `${prefix}_pricing_before_click.png`) })

    const getPassBtn = page.locator('[data-testid="pricing-get-pass-btn"][data-hydrated="true"]').first()
    await expect(getPassBtn).toBeVisible({ timeout: 10_000 })
    await getPassBtn.click()

    await page.waitForFunction(() => Boolean((window as any).__lastRazorpayOpts), { timeout: 10_000 })
    await page.screenshot({ path: path.join(OUT_DIR, `${prefix}_pricing_razorpay_opening.png`) })
  })

  test("Capture Course single-item Buy Now flow", async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name === "mobile"
    const prefix = isMobile ? "mobile" : "desktop"

    await loginAs(page, studentUser.email)
    await page.addInitScript(() => {
      ;(window as any).Razorpay = function (opts: any) {
        ;(window as any).__lastRazorpayOpts = opts
        return {
          open: () => {},
          on: () => {},
        }
      }
    })

    await page.goto("/courses/generative-ai", { waitUntil: "domcontentloaded" })
    const enrollBtn = page.locator('[data-testid="enroll-buy-btn"][data-hydrated="true"]').first()
    if (await enrollBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await page.screenshot({ path: path.join(OUT_DIR, `${prefix}_courses_before_click.png`) })
      await enrollBtn.click()
      await page.waitForFunction(() => Boolean((window as any).__lastRazorpayOpts), { timeout: 10_000 })
      await page.screenshot({ path: path.join(OUT_DIR, `${prefix}_courses_razorpay_opening.png`) })
    }
  })

  test("Capture Test Series Buy Now flow", async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name === "mobile"
    const prefix = isMobile ? "mobile" : "desktop"

    await loginAs(page, studentUser.email)
    await page.addInitScript(() => {
      ;(window as any).Razorpay = function (opts: any) {
        ;(window as any).__lastRazorpayOpts = opts
        return {
          open: () => {},
          on: () => {},
        }
      }
    })

    await page.goto("/test-series/upsc-prelims-2026", { waitUntil: "domcontentloaded" })
    const seriesBtn = page.locator('[data-testid="series-enroll-btn"][data-hydrated="true"]').first()
    if (await seriesBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await page.screenshot({ path: path.join(OUT_DIR, `${prefix}_test_series_before_click.png`) })
      await seriesBtn.click()
      await page.waitForFunction(() => Boolean((window as any).__lastRazorpayOpts), { timeout: 10_000 })
      await page.screenshot({ path: path.join(OUT_DIR, `${prefix}_test_series_razorpay_opening.png`) })
    }
  })
})
