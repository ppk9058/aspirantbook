import { test, expect } from "@playwright/test"

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3045"

test.describe("Reproduction & Verification Suite for Bug 1 and Bug 2", () => {
  test("BUG 1 - Verification: Clicking Forgot Password on /login carries over email prefill", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.waitForLoadState("networkidle")

    const emailInput = page.locator('input[type="email"]')
    await emailInput.fill("learner@example.com")

    const forgotLink = page.locator('[data-testid="forgot-password-link"]')
    await expect(forgotLink).toBeVisible()
    await forgotLink.click()

    await page.waitForURL((url) => url.pathname.includes("/forgot-password"), { timeout: 8000 })
    
    const forgotEmailInput = page.locator('input[name="email"]')
    await expect(forgotEmailInput).toHaveValue("learner@example.com", { timeout: 5000 })
  })

  test("BUG 1 - Verification: Clicking Forgot Password inside MobileAuthModal closes modal and navigates to /forgot-password", async ({ page }) => {
    await page.goto(`${BASE_URL}/books`)
    await page.waitForLoadState("networkidle")

    const buyNowBtn = page.locator('[data-testid="book-card-buy-now-btn"]').first()
    await buyNowBtn.click()

    const checkoutBtn = page.locator('[data-testid="cart-drawer-checkout-btn"]')
    await expect(checkoutBtn).toBeVisible({ timeout: 10000 })
    await checkoutBtn.click()

    // Wait for MobileAuthModal
    const authGate = page
      .locator('input[placeholder*="mobile"]')
      .or(page.locator('input[type="tel"]'))
      .or(page.locator("text=Enter your mobile number"))
      .first()
    await expect(authGate).toBeVisible({ timeout: 10000 })

    // Switch to Email & Password tab
    const emailTab = page.locator('button:has-text("Email & Password")')
    await emailTab.click()

    // Find and click Forgot password link inside modal
    const modalForgotLink = page.locator('[data-testid="forgot-password-link"]')
    await expect(modalForgotLink).toBeVisible({ timeout: 5000 })
    await modalForgotLink.click()

    // Assert URL is /forgot-password and modal backdrop is closed
    await page.waitForURL((url) => url.pathname.includes("/forgot-password"), { timeout: 8000 })
    const modalBackdrop = page.locator('.fixed.inset-0.z-\\[9999\\]')
    await expect(modalBackdrop).not.toBeVisible({ timeout: 5000 })
  })

  test("BUG 2 - Verification: On /pricing, clicking Get Pass Now opens summary panel and sets up Razorpay parameters", async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`)
    await page.waitForLoadState("networkidle")

    const getPassNowBtn = page.locator('button:has-text("Get Pass Now")')
    await expect(getPassNowBtn).toBeVisible({ timeout: 8000 })
    await getPassNowBtn.click()

    // Order summary panel appears behind Razorpay / modal
    const orderSummary = page.locator('[data-testid="pricing-order-summary"]')
    await expect(orderSummary).toBeVisible({ timeout: 8000 })
    await expect(page.locator('text="PREMIUM PASS - Pro Learner"').first()).toBeVisible()
    await expect(page.locator('text="₹499"').first()).toBeVisible()
  })
})
