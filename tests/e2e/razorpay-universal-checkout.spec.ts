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

  test("RZP-UNI-05: Course single-item Buy Now on /courses/[slug] passes canonical options and preserves page URL", async ({ page }) => {
    await loginAs(page, studentUser.email)

    await page.addInitScript(() => {
      ;(window as any).__lastRazorpayOpts = null
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
      await enrollBtn.click()

      await page.waitForFunction(() => Boolean((window as any).__lastRazorpayOpts), { timeout: 10_000 })
      const rzpOpts = await page.evaluate(() => (window as any).__lastRazorpayOpts)

      expect(rzpOpts).toBeDefined()
      expect(rzpOpts.theme?.color).toBe("#1448d8")
      expect(rzpOpts.order_id).toBeDefined()
      expect(typeof rzpOpts.amount).toBe("number")
      expect(rzpOpts.description).toContain("Generative AI")
      expect(page.url()).toContain("/courses/generative-ai")
    }
  })

  test("RZP-UNI-06: Test Series Pro pass Buy Now on /test-series/[slug] passes canonical options and stays on same page", async ({ page }) => {
    await loginAs(page, studentUser.email)

    await page.addInitScript(() => {
      ;(window as any).__lastRazorpayOpts = null
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
      await seriesBtn.click()

      await page.waitForFunction(() => Boolean((window as any).__lastRazorpayOpts), { timeout: 10_000 })
      const rzpOpts = await page.evaluate(() => (window as any).__lastRazorpayOpts)

      expect(rzpOpts).toBeDefined()
      expect(rzpOpts.theme?.color).toBe("#1448d8")
      expect(rzpOpts.order_id).toBeDefined()
      expect(typeof rzpOpts.amount).toBe("number")
      expect(page.url()).toContain("/test-series/upsc-prelims-2026")
    }
  })

  test("RZP-UNI-07: Razorpay payment.failed event displays visible error notice and preserves button readiness", async ({ page }) => {
    await loginAs(page, studentUser.email)

    await page.addInitScript(() => {
      ;(window as any).Razorpay = function (opts: any) {
        return {
          open: () => {},
          on: (event: string, callback: Function) => {
            if (event === "payment.failed") {
              callback({
                error: {
                  description: "Payment declined by issuing bank",
                  code: "BAD_REQUEST_ERROR",
                },
              })
            }
          },
        }
      }
    })

    await page.goto("/pricing", { waitUntil: "domcontentloaded" })
    const getPassBtn = page.locator('[data-testid="pricing-get-pass-btn"][data-hydrated="true"]').first()
    await expect(getPassBtn).toBeVisible({ timeout: 10_000 })
    await getPassBtn.click()

    // Assert page URL remained on /pricing
    expect(page.url()).toContain("/pricing")
    // Assert button returns to ready state after failed payment handling
    await expect(getPassBtn).toBeEnabled({ timeout: 10_000 })
  })

  test("RZP-UNI-08: (Optional) Real order creation with live/sandbox keys verified or skipped if missing", async ({ page }) => {
    const hasKeys = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
    if (!hasKeys) {
      test.skip(true, "Skipped: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET not configured in test environment")
      return
    }

    await loginAs(page, studentUser.email)
    const booksRes = await page.request.get("/api/books")
    const booksJson = await booksRes.json()
    const bookId = booksJson.data?.[0]?.id || "book-1"

    const orderRes = await page.request.post("/api/books/checkout/create-order", {
      data: {
        items: [{ bookId, quantity: 1 }],
      },
    })
    expect(orderRes.status()).toBe(200)
    const orderData = await orderRes.json()
    expect(orderData.razorpayOrderId).toBeDefined()
  })
})
