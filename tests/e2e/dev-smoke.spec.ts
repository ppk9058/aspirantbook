import { test, expect } from "@playwright/test"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import fs from "fs"
import path from "path"
import dotenv from "dotenv"

// Support running against dev DB if DEV_SMOKE=1, else fall back to connected environment
if (process.env.DEV_SMOKE === "1") {
  if (fs.existsSync(".env.local")) dotenv.config({ path: ".env.local", override: true })
  else if (fs.existsSync(".env")) dotenv.config({ path: ".env", override: true })
} else {
  dotenv.config({ path: ".env.test", override: true })
  if (process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
    process.env.DIRECT_URL = process.env.TEST_DIRECT_URL || process.env.TEST_DATABASE_URL
  }
}

const DATABASE_URL = process.env.DIRECT_URL || process.env.DATABASE_URL || process.env.TEST_DATABASE_URL || "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test"
const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL })
const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3045"
const OUTBOX_PATH = path.join(process.cwd(), "logs", "dev-email-outbox.jsonl")

function readOutboxEmails(): Array<any> {
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

test.describe("Dev Smoke Suite: Critical Flows and DB Sync Safety", () => {
  const nonce = `devsmoke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const initialPassword = "InitialPassword123!"
  const newPassword = "NewSecuredPassword123!"
  const throwawayEmail = `${nonce}@test.aspirantbook.local`
  let throwawayUser: any = null

  test.beforeAll(async () => {
    // 1. Create clean throwaway user
    const passwordHash = await bcrypt.hash(initialPassword, 10)
    throwawayUser = await prisma.user.create({
      data: {
        email: throwawayEmail,
        name: `Smoke ${nonce}`,
        password: passwordHash,
        role: "FREE",
        selectedGoal: "upsc",
        isActive: true,
      },
    })
  })

  test.afterAll(async () => {
    // 2. Strict clean up: never leave artifacts in the DB
    if (throwawayUser?.id) {
      await prisma.passwordResetToken.deleteMany({
        where: { email: throwawayEmail },
      }).catch(() => {})
      await prisma.emailVerificationToken.deleteMany({
        where: { email: throwawayEmail },
      }).catch(() => {})
      await prisma.examAttempt.deleteMany({
        where: { userId: throwawayUser.id },
      }).catch(() => {})
      await prisma.user.delete({
        where: { id: throwawayUser.id },
      }).catch(() => {})
    }
    await prisma.$disconnect()
  })

  test("1. Login with throwaway user succeeds", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })
    await page.fill('input[name="email"], input[type="email"]', throwawayEmail)
    await page.fill('input[name="password"], input[type="password"]', initialPassword)
    await page.click('button[type="submit"]')

    // Must redirect to dashboard or home, not show error
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 45000 })
    expect(page.url()).not.toContain("/login")
  })

  test("2. Forgot password up to dev-outbox link and reset password flow", async ({ page }) => {
    await page.context().clearCookies()

    // Request reset
    await page.goto(`${BASE_URL}/forgot-password`, { waitUntil: "networkidle" })
    await page.fill('input[name="email"]', throwawayEmail)
    await page.click('button[type="submit"]')

    await expect(
      page.locator("text=/If an account with that email exists, we have sent a password reset link/i")
    ).toBeVisible({ timeout: 15000 })

    // Read token from dev outbox
    const emails = readOutboxEmails().filter((e) => e.to === throwawayEmail)
    const latestEmail = emails[emails.length - 1]
    expect(latestEmail).toBeTruthy()
    expect(latestEmail.token).toBeTruthy()

    // Navigate to reset link
    await page.goto(`${BASE_URL}/reset-password?token=${encodeURIComponent(latestEmail.token)}&email=${encodeURIComponent(throwawayEmail)}`, {
      waitUntil: "networkidle",
    })

    await expect(
      page.locator('h1:has-text("Reset Your Password"), h1:has-text("Reset Password")').first()
    ).toBeVisible({ timeout: 15000 })
    await page.fill('input[name="password"]', newPassword)
    await page.fill('input[name="confirmPassword"]', newPassword)
    await page.click('button[type="submit"]')

    await expect(
      page.locator("text=/Password reset successful|Your password has been reset/i")
    ).toBeVisible({ timeout: 15000 })

    // Verify login with new password
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })
    await page.fill('input[name="email"], input[type="email"]', throwawayEmail)
    await page.fill('input[name="password"], input[type="password"]', newPassword)
    await page.click('button[type="submit"]')

    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 45000 })
    expect(page.url()).not.toContain("/login")
  })

  test("3. Get Pass click opens Razorpay checkout with valid options", async ({ page }) => {
    // Log in first as throwaway user so Razorpay checkout is directly invoked
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })
    await page.fill('input[name="email"], input[type="email"]', throwawayEmail)
    await page.fill('input[name="password"], input[type="password"]', newPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 45000 })

    // Mock Razorpay SDK before loading pricing page
    await page.addInitScript(() => {
      (window as any).Razorpay = function (options: any) {
        (window as any).__lastRazorpayOpts = options
        return {
          open: function () {
            (window as any).__razorpayOpened = true
          },
          close: function () {},
          on: function () {},
        }
      }
    })

    await page.goto(`${BASE_URL}/pricing`, { waitUntil: "domcontentloaded" })

    // Find and click Get Pass Now button
    const getPassBtn = page.locator('[data-testid="pricing-get-pass-btn"][data-hydrated="true"]').first()
    await expect(getPassBtn).toBeVisible({ timeout: 15000 })
    await getPassBtn.click()

    // Assert that Razorpay was called or order summary is visible
    await page.waitForFunction(() => (window as any).__razorpayOpened === true || (window as any).__lastRazorpayOpts, {
      timeout: 15000,
    })

    const opts = await page.evaluate(() => (window as any).__lastRazorpayOpts)
    expect(opts).toBeTruthy()
    expect(opts.amount).toBe(49900)
    expect(opts.currency).toBe("INR")
  })

  test("4. Student opens Current Affairs quiz instructions page without 404", async ({ page }) => {
    // Open clean CA quiz instructions URL
    const res = await page.goto(`${BASE_URL}/current-affairs-quizzes/upsc-economy-ca/instructions`, {
      waitUntil: "networkidle",
    })

    expect(res?.status()).toBe(200)
    await expect(page.locator('h1:has-text("Looking for something?")')).not.toBeVisible()
    await expect(page.locator('h1:has-text("Instructions")').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('main').locator('text="UPSC Economy CA"').last()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('a:has-text("Next"), button:has-text("Start")').first()).toBeVisible()
  })
})
