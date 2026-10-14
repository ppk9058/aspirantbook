import { test, expect } from "@playwright/test"
import { prisma, createActor, loginAs, newNonce } from "./test-series-e2e-helpers"

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3045"

test.describe("Step 5: Get Pass Now / Buy Now in Production Mode Browser", () => {
  let studentUser: any
  let unverifiedUser: any
  let actorNonce: string

  test.beforeAll(async () => {
    actorNonce = newNonce()
    studentUser = await createActor(actorNonce, "FREE", "prod-buy-learner")
    // Mark student email verified
    await prisma.user.update({
      where: { id: studentUser.id },
      data: { emailVerified: new Date() },
    })

    // Create an unverified user
    unverifiedUser = await createActor(newNonce(), "FREE", "unverified-buyer")
    await prisma.user.update({
      where: { id: unverifiedUser.id },
      data: { emailVerified: null },
    })
  })

  test.afterAll(async () => {
    if (studentUser?.id) {
      await prisma.user.delete({ where: { id: studentUser.id } }).catch(() => {})
    }
    if (unverifiedUser?.id) {
      await prisma.user.delete({ where: { id: unverifiedUser.id } }).catch(() => {})
    }
  })

  // ─── 1. CSP, CONSOLE & SCRIPT INTEGRITY ────────────────────────────────────
  test("5.1: Zero CSP violations, uncaught errors, or script failures on pricing & checkout surfaces", async ({
    page,
  }) => {
    const cspErrors: string[] = []
    const uncaughtErrors: string[] = []

    page.on("console", (msg) => {
      const text = msg.text()
      if (text.includes("violates the following Content Security Policy") || text.includes("blocked by CSP")) {
        cspErrors.push(text)
      }
    })

    page.on("pageerror", (err) => {
      uncaughtErrors.push(err.message)
    })

    const res = await page.goto(`${BASE_URL}/pricing`, { waitUntil: "domcontentloaded" })
    expect(res?.status()).toBe(200)

    const headers = res?.headers() || {}
    const csp = headers["content-security-policy"]
    expect(csp).toBeDefined()
    expect(csp).toContain("checkout.razorpay.com")
    expect(csp).toContain("api.razorpay.com")

    // Expect zero CSP violations
    expect(cspErrors).toHaveLength(0)
    // Expect zero unhandled exceptions
    expect(uncaughtErrors).toHaveLength(0)
  })

  // ─── 2. PRICING GET PASS NOW SAME-PAGE CHECKOUT & ORDER SUMMARY ───────────
  test("5.2: /pricing Get Pass Now opens Razorpay on same page, displays on-page order summary, features & handles cancel/retry", async ({
    page,
  }) => {
    await loginAs(page, studentUser.email)

    // Intercept Razorpay initialization to capture arguments and simulate cancellation
    await page.addInitScript(() => {
      ;(window as any).__lastRazorpayOpts = null
      ;(window as any).Razorpay = function (opts: any) {
        ;(window as any).__lastRazorpayOpts = opts
        return {
          open: () => {
            // Simulate user dismissing the hosted window after 300ms
            setTimeout(() => {
              if (opts.modal?.ondismiss) opts.modal.ondismiss()
            }, 300)
          },
          on: () => {},
        }
      }
    })

    await page.goto(`${BASE_URL}/pricing`, { waitUntil: "domcontentloaded" })
    await expect(page.locator("text=PREMIUM").first()).toBeVisible({ timeout: 15_000 })

    // Wait for hydration
    const getPassBtn = page.locator('[data-testid="pricing-get-pass-btn"][data-hydrated="true"]').first()
    await expect(getPassBtn).toBeVisible({ timeout: 15_000 })
    await getPassBtn.click()

    // Assert URL remains exactly on /pricing (no redirect away)
    expect(page.url()).toContain("/pricing")

    // Assert on-page Order Summary Panel is visible
    const summaryPanel = page.locator('[data-testid="pricing-order-summary"]')
    await expect(summaryPanel).toBeVisible({ timeout: 10_000 })
    await expect(summaryPanel.locator('text="PREMIUM PASS - Pro Learner"')).toBeVisible()
    await expect(summaryPanel.locator('text="₹499"')).toBeVisible()
    await expect(summaryPanel.locator('text="Included in this pass:"')).toBeVisible()

    // Verify canonical options passed to window.Razorpay(opts)
    await page.waitForFunction(() => Boolean((window as any).__lastRazorpayOpts), { timeout: 10_000 })
    const rzpOpts = await page.evaluate(() => (window as any).__lastRazorpayOpts)

    expect(rzpOpts).toBeDefined()
    expect(rzpOpts.name).toBe("aspirantbook")
    expect(rzpOpts.description).toContain("PREMIUM PASS")
    expect(rzpOpts.theme?.color).toBe("#1448d8")
    expect(rzpOpts.image).toContain("/aspirant-logo.jpg")
    expect(rzpOpts.amount).toBe(49900)
    expect(rzpOpts.prefill?.email).toBe(studentUser.email)

    // After dismiss, retry button is visible on page
    const retryBtn = page.locator('[data-testid="pricing-retry-btn"]')
    await expect(retryBtn).toBeVisible({ timeout: 10_000 })
  })

  // ─── 3. GUEST SEES LOGIN POPUP FIRST ON BUY NOW & RESUMES ────────────────
  test("5.3: Guest clicking Buy Now on /books sees login modal first without URL change", async ({ page }) => {
    await page.context().clearCookies()

    await page.goto(`${BASE_URL}/books`, { waitUntil: "domcontentloaded" })
    await expect(page.locator('[data-testid="books-page-root"][data-hydrated="true"]')).toBeVisible({ timeout: 15_000 })

    const buyNowBtn = page.locator('[data-testid="book-card-buy-now-btn"]').first()
    await expect(buyNowBtn).toBeVisible({ timeout: 10_000 })
    await buyNowBtn.click()

    const checkoutBtn = page.locator('[data-testid="cart-drawer-checkout-btn"]')
    await expect(checkoutBtn).toBeVisible({ timeout: 10_000 })
    await checkoutBtn.click()

    // Mobile auth modal opens
    const modal = page.locator('[data-testid="mobile-auth-modal"]')
    await expect(modal).toBeVisible({ timeout: 10_000 })

    // URL is still /books
    expect(page.url()).toContain("/books")
  })

  // ─── 4. EMAIL VERIFICATION PURCHASE GATE (REQUIRE_EMAIL_VERIFICATION) ────
  test("5.4: Unverified user purchase gate: clear message and never a silent failure", async ({ page }) => {
    // Log in as unverified user
    await loginAs(page, unverifiedUser.email)

    // Attempt to checkout a book via API with verification requirement active
    const res = await page.request.post(`${BASE_URL}/api/books/checkout/create-order`, {
      headers: {
        "x-require-email-verification": "true",
      },
      data: {
        items: [{ bookId: "test-book-id", quantity: 1 }],
      },
    })

    expect(res.status()).toBe(403)
    const data = await res.json()
    expect(data.error).toContain("Please verify your email address before making a purchase")
    expect(data.code).toBe("EMAIL_NOT_VERIFIED")
  })

  // ─── 5. ALREADY ACTIVE / OWNED ITEM PREVENTION ───────────────────────────
  test("5.5: Already active user cannot re-purchase subscription", async ({ page }) => {
    const activeActor = await createActor(newNonce(), "PREMIUM", "already-active-sub")
    try {
      // Create an ACTIVE subscription in DB
      await prisma.subscription.create({
        data: {
          userId: activeActor.id,
          plan: "MONTHLY",
          status: "ACTIVE",
          provider: "RAZORPAY",
          providerId: `sub_test_${Date.now()}`,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      await loginAs(page, activeActor.email)
      await page.goto(`${BASE_URL}/pricing`, { waitUntil: "domcontentloaded" })

      // Button shows "Already active" and is disabled
      const activeBtn = page.locator("button:has-text('Already active')")
      await expect(activeBtn).toBeVisible({ timeout: 15_000 })
      await expect(activeBtn).toBeDisabled()
    } finally {
      await prisma.subscription.deleteMany({
        where: { userId: activeActor.id },
      }).catch(() => {})
      await prisma.user.delete({
        where: { id: activeActor.id },
      }).catch(() => {})
    }
  })
})
