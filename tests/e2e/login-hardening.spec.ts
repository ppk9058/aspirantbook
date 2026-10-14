import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

import { test, expect } from "@playwright/test"
import { createActor, prisma, PASSWORD } from "./test-series-e2e-helpers"
import { clearLoginLockout } from "@/lib/auth/rate-limiter"

const BASE = process.env.BASE_URL || "http://127.0.0.1:3045"

test.describe("Step 2: Login Hardening & Reliability", () => {
  let user: any

  test.beforeAll(async () => {
    user = await createActor(`LOGIN-HARDEN-${Date.now()}`, "FREE", "student")
  })

  test.afterAll(async () => {
    if (user?.id) {
      await clearLoginLockout(user.email, "127.0.0.1").catch(() => {})
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
    }
  })

  test("1. Email normalization: mixed-case and leading/trailing whitespace logs in reliably", async ({ page }) => {
    await page.context().clearCookies()
    await clearLoginLockout(user.email, "127.0.0.1")

    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" })

    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    const submitBtn = page.locator('button[type="submit"]')

    await emailInput.waitFor({ state: "visible", timeout: 10_000 })
    // Input mixed-case and spaces
    const mixedEmail = `  ${user.email.toUpperCase()}  `
    await emailInput.fill(mixedEmail)
    await passwordInput.fill(PASSWORD)

    await submitBtn.click()

    // Verify session
    let session: any = null
    for (let i = 0; i < 20; i++) {
      session = await page.evaluate(async () => {
        const res = await fetch("/api/auth/session")
        return res.ok ? await res.json() : null
      })
      if (session?.user?.email?.toLowerCase() === user.email.toLowerCase()) {
        break
      }
      await page.waitForTimeout(500)
    }

    expect(session?.user?.email?.toLowerCase()).toBe(user.email.toLowerCase())
  })

  test("2. Show/hide password toggles visibility correctly", async ({ page }) => {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" })

    const passwordInput = page.locator('input[name="password"]')
    const toggleBtn = page.locator('button[aria-label="Show password"], button[aria-label="Hide password"]')

    await expect(passwordInput).toHaveAttribute("type", "password")
    await toggleBtn.click()
    await expect(passwordInput).toHaveAttribute("type", "text")
    await toggleBtn.click()
    await expect(passwordInput).toHaveAttribute("type", "password")
  })

  test("3. Open redirect prevention: evil callbackUrl rejected, safe callbackUrl respected", async ({ page }) => {
    await page.context().clearCookies()
    await clearLoginLockout(user.email, "127.0.0.1")

    // A. Open-redirect attempt: https://evil.com
    await page.goto(`${BASE}/login?callbackUrl=https://evil.com/phishing`, { waitUntil: "networkidle" })

    await page.locator('input[type="email"]').fill(user.email)
    await page.locator('input[type="password"]').fill(PASSWORD)
    await page.locator('button[type="submit"]').click()

    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 })
    const currentUrl = page.url()
    expect(currentUrl).not.toContain("evil.com")
    expect(new URL(currentUrl).origin).toBe(new URL(BASE).origin)
  })

  test("4. Rate-limiting & Lockout: 5 failed attempts locks account for 15 minutes with clear error", async ({ page }) => {
    await page.context().clearCookies()
    const victimActor = await createActor(`VICTIM-${Date.now()}`, "FREE", "student")

    try {
      await clearLoginLockout(victimActor.email, "127.0.0.1")
      await page.goto(`${BASE}/login`, { waitUntil: "networkidle" })

      const emailInput = page.locator('input[type="email"]')
      const passwordInput = page.locator('input[name="password"]')
      const submitBtn = page.locator('button[type="submit"]')
      const errorMsg = page.locator('[data-testid="login-error-message"]')

      // Fail 5 times with proper response wait
      for (let i = 1; i <= 5; i++) {
        await expect(submitBtn).toBeEnabled({ timeout: 5_000 })
        await emailInput.fill(victimActor.email)
        await passwordInput.fill("WrongPassword123!")
        const respPromise = page.waitForResponse((r) => r.url().includes("/api/auth/callback/credentials"))
        await submitBtn.click()
        await respPromise
        await expect(submitBtn).toBeEnabled({ timeout: 5_000 })
      }

      // 6th attempt should show lockout message
      await expect(submitBtn).toBeEnabled({ timeout: 5_000 })
      await emailInput.fill(victimActor.email)
      await passwordInput.fill("WrongPassword123!")
      const finalResp = page.waitForResponse((r) => r.url().includes("/api/auth/callback/credentials"))
      await submitBtn.click()
      await finalResp

      await expect(errorMsg).toBeVisible({ timeout: 5_000 })
      const errorText = await errorMsg.textContent()
      expect(errorText).toContain("temporarily locked")
    } finally {
      await clearLoginLockout(victimActor.email, "127.0.0.1")
      await prisma.user.delete({ where: { id: victimActor.id } }).catch(() => {})
    }
  })
})
