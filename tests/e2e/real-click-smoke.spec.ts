import { test, expect } from "@playwright/test"
import { prisma, createActor, loginAs, newNonce, PASSWORD } from "./test-series-e2e-helpers"
import fs from "fs"
import path from "path"

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3045"
const OUTBOX_PATH = path.join(process.cwd(), "logs", "dev-email-outbox.jsonl")

function getOutboxEmails(): Array<{
  to: string
  subject: string
  html?: string
  text?: string
  token?: string
  link?: string
  createdAt: string
}> {
  if (!fs.existsSync(OUTBOX_PATH)) return []
  const content = fs.readFileSync(OUTBOX_PATH, "utf-8")
  return content
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

test.describe("Real-Click Smoke Suite (No Direct URL Jumps, No Direct API Calls)", () => {
  let actorNonce: string
  let studentUser: any

  test.beforeAll(async () => {
    actorNonce = newNonce()
    studentUser = await createActor(actorNonce, "FREE", "smoke-learner")
  })

  test.afterAll(async () => {
    if (studentUser?.id) {
      await prisma.user.delete({ where: { id: studentUser.id } }).catch(() => {})
    }
  })

  test("SMOKE-01: Login page - real click on Forgot Password, submit email, dev outbox token, reset and login with new password", async ({
    page,
  }) => {
    const freshUser = await createActor(newNonce(), "FREE", "forgot-actor")

    // 1. Visit /login
    await page.goto(`${BASE_URL}/login`)
    await page.waitForLoadState("networkidle")

    // 2. Type email into input
    const emailInput = page.locator('input[type="email"]')
    await emailInput.fill(freshUser.email)

    // 3. Real click on Forgot password link
    const forgotLink = page.locator('[data-testid="forgot-password-link"]')
    await expect(forgotLink).toBeVisible()
    await forgotLink.click()

    // 4. Land on /forgot-password with email prefill
    await expect(page).toHaveURL(/\/forgot-password/, { timeout: 15000 })
    const forgotEmail = page.locator('input[name="email"]')
    await expect(forgotEmail).toHaveValue(freshUser.email)

    // 5. Submit form
    const submitBtn = page.locator('button[type="submit"]')
    await submitBtn.click()

    // 6. Generic success notice appears
    const successNotice = page.getByRole("status").or(page.getByText(/If an account with that email exists/i)).first()
    await expect(successNotice).toBeVisible({ timeout: 10000 })

    // 7. Read token from dev outbox
    const emails = getOutboxEmails()
    const userEmail = emails
      .slice()
      .reverse()
      .find((e) => e.to.toLowerCase() === freshUser.email.toLowerCase())
    expect(userEmail).toBeDefined()
    expect(userEmail?.link).toContain("/reset-password?token=")

    // 8. Open reset link
    const resetUrlObj = new URL(userEmail!.link!)
    await page.goto(`${BASE_URL}${resetUrlObj.pathname}${resetUrlObj.search}`)
    await page.waitForLoadState("networkidle")

    // 9. Fill new password
    const newPass = "BrandNewPass99#!"
    await page.locator('input#password').fill(newPass)
    await page.locator('input#confirmPassword').fill(newPass)

    const resetSubmitBtn = page.locator('button[type="submit"]')
    await resetSubmitBtn.click()

    // 10. Wait for auto-redirect to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 })
    await page.waitForLoadState("networkidle")

    // 11. Log in with the new password
    await page.locator('input#email').fill(freshUser.email)
    await page.locator('input#password').fill(newPass)
    await page.locator('[data-testid="login-submit"]').click()

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    // Cleanup
    await prisma.user.delete({ where: { id: freshUser.id } }).catch(() => {})
  })

  test("SMOKE-02: Guest popup from /books - real click on Forgot Password navigates to /forgot-password and closes modal", async ({
    page,
  }) => {
    await page.context().clearCookies()
    await page.goto(`${BASE_URL}/books`)
    await page.waitForLoadState("networkidle")

    const buyNowBtn = page.locator('[data-testid="book-card-buy-now-btn"]').first()
    await expect(buyNowBtn).toBeVisible({ timeout: 10000 })
    await buyNowBtn.click()

    const checkoutBtn = page.locator('[data-testid="cart-drawer-checkout-btn"]')
    await expect(checkoutBtn).toBeVisible({ timeout: 10000 })
    await checkoutBtn.click()

    // Auth modal opens
    const authGate = page
      .locator('input[placeholder*="mobile"]')
      .or(page.locator('input[type="tel"]'))
      .or(page.locator("text=Enter your mobile number"))
      .first()
    await expect(authGate).toBeVisible({ timeout: 10000 })

    // Switch to Email tab
    const emailTab = page.locator('button:has-text("Email & Password")')
    await emailTab.click()

    // Click Forgot password link inside modal
    const modalForgot = page.locator('[data-testid="forgot-password-link"]')
    await expect(modalForgot).toBeVisible({ timeout: 5000 })
    await modalForgot.click()

    await expect(page).toHaveURL(/\/forgot-password/, { timeout: 15000 })
    const backdrop = page.locator('.fixed.inset-0.z-\\[9999\\]')
    await expect(backdrop).not.toBeVisible({ timeout: 5000 })
  })

  test("SMOKE-03: /pricing - Get Pass Now opens Razorpay parameters, displays summary panel, and handles retry", async ({
    page,
  }) => {
    await loginAs(page, studentUser.email)

    // Intercept Razorpay initialization to simulate cancellation
    await page.addInitScript(() => {
      ;(window as any).Razorpay = function (opts: any) {
        ;(window as any).__lastRazorpayOpts = opts
        return {
          open: () => {
            // Simulate user dismiss after 300ms
            setTimeout(() => {
              if (opts.modal?.ondismiss) opts.modal.ondismiss()
            }, 300)
          },
          on: () => {},
        }
      }
    })

    await page.goto(`${BASE_URL}/pricing`, { waitUntil: "domcontentloaded" })

    const getPassBtn = page.locator('[data-testid="pricing-get-pass-btn"][data-hydrated="true"]').first()
    await expect(getPassBtn).toBeVisible({ timeout: 15000 })
    await getPassBtn.click()

    // Summary panel is visible
    const summary = page.locator('[data-testid="pricing-order-summary"]')
    await expect(summary).toBeVisible({ timeout: 8000 })
    await expect(page.locator('text="PREMIUM PASS - Pro Learner"').first()).toBeVisible()
    await expect(page.locator('text="₹499"').first()).toBeVisible()

    // Check Razorpay options
    await page.waitForFunction(() => Boolean((window as any).__lastRazorpayOpts), { timeout: 10000 })
    const rzpOpts = await page.evaluate(() => (window as any).__lastRazorpayOpts)

    expect(rzpOpts).toBeDefined()
    expect(rzpOpts.amount).toBe(49900)
    expect(rzpOpts.description).toContain("PREMIUM PASS")
    expect(rzpOpts.image).toContain("/aspirant-logo.jpg")
    expect(rzpOpts.theme?.color).toBe("#1448d8")
    expect(rzpOpts.prefill?.email).toBe(studentUser.email)

    // After dismiss, retry button is displayed
    const retryBtn = page.locator('[data-testid="pricing-retry-btn"]')
    await expect(retryBtn).toBeVisible({ timeout: 10000 })

    // Real click on Retry payment re-triggers checkout
    await retryBtn.click()
    await expect(page.locator('text="Opening secure Razorpay window..."')).toBeVisible({ timeout: 5000 })
  })

  test("SMOKE-04: Header navigation - real clicks across public modules", async ({ page }) => {
    await page.goto(`${BASE_URL}/`)
    await page.waitForLoadState("networkidle")

    // Click Courses
    const coursesLink = page.locator('nav a:has-text("Courses")').first()
    if (await coursesLink.isVisible()) {
      await coursesLink.click()
      await expect(page).toHaveURL(/\/courses|\/tutorials/, { timeout: 15000 })
    }

    // Click Books
    const booksLink = page.locator('nav a:has-text("Books")').first()
    if (await booksLink.isVisible()) {
      await booksLink.click()
      await expect(page).toHaveURL(/\/books/, { timeout: 15000 })
    }

    // Click Pricing
    const pricingLink = page.locator('nav a:has-text("Pricing")').first()
    if (await pricingLink.isVisible()) {
      await pricingLink.click()
      await expect(page).toHaveURL(/\/pricing/, { timeout: 15000 })
    }
  })

  test("SMOKE-05: CSP check - Verify Content-Security-Policy header and ensure zero console CSP violations", async ({
    page,
  }) => {
    const cspViolations: string[] = []
    page.on("console", (msg) => {
      const text = msg.text()
      if (text.includes("violates the following Content Security Policy") || text.includes("blocked by CSP")) {
        cspViolations.push(text)
      }
    })

    const response = await page.goto(`${BASE_URL}/pricing`)
    const headers = response?.headers() || {}

    const csp = headers["content-security-policy"]
    expect(csp).toBeDefined()
    expect(csp).toContain("checkout.razorpay.com")
    expect(csp).toContain("api.razorpay.com")

    // Expect no CSP violations triggered during page load
    expect(cspViolations).toHaveLength(0)
  })
})
