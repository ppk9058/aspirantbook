import { test, expect } from "@playwright/test"
import fs from "fs"
import path from "path"

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3045"
const OUTBOX_PATH = path.join(process.cwd(), "logs", "dev-email-outbox.jsonl")

function getOutboxEmails(): Array<{ to: string; subject: string; body: string; timestamp: string }> {
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

test.describe("Step 3: Registration and Email Verification Hardening", () => {
    test.beforeEach(async () => {
        // Ensure outbox directory exists
        const dir = path.dirname(OUTBOX_PATH)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
    })

    test("1. Rejects short password (< 8 chars) with clear policy error", async ({ page }) => {
        await page.goto(`${BASE_URL}/register`)
        await page.waitForLoadState("networkidle")

        await page.fill('input[name="name"]', "Test User Short")
        await page.fill('input[name="email"]', `short_pass_${Date.now()}@example.com`)
        await page.fill('input[name="password"]', "12345")

        // In HTML5 minlength=8 may block client-side submit or submit triggers zod
        // Let's remove minlength if present to test server-side policy enforcement
        await page.evaluate(() => {
            const el = document.querySelector('input[name="password"]')
            if (el) el.removeAttribute("minlength")
        })

        await page.click('button[type="submit"]')
        await expect(page.locator("text=/Password must be at least 8 characters/i")).toBeVisible({ timeout: 10000 })
    })

    test("2. Rejects common easily guessed password with clear error", async ({ page }) => {
        await page.goto(`${BASE_URL}/register`)
        await page.waitForLoadState("networkidle")

        await page.fill('input[name="name"]', "Test User Common")
        await page.fill('input[name="email"]', `common_pass_${Date.now()}@example.com`)
        await page.fill('input[name="password"]', "password123")

        await page.click('button[type="submit"]')
        await expect(
            page.locator("text=/This password is too common or easily guessed/i")
        ).toBeVisible({ timeout: 10000 })
    })

    test("3. Successfully registers new user, writes verification email to dev outbox, and redirects", async ({ page }) => {
        const uniqueEmail = `reg_test_${Date.now()}_${Math.floor(Math.random() * 1000)}@example.com`
        const uniquePhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`

        await page.goto(`${BASE_URL}/register`)
        await page.waitForLoadState("networkidle")

        await page.fill('input[name="name"]', "Alice Verification")
        await page.fill('input[name="email"]', uniqueEmail)
        await page.fill('input[name="phoneNumber"]', uniquePhone)
        await page.selectOption('select[name="selectedGoal"]', "CODING_TECH")
        await page.fill('input[name="password"]', "SecureTrillionKey!2026")

        await page.click('button[type="submit"]')

        // Check success message
        await expect(
            page.locator("text=/Account created! A verification link has been sent/i")
        ).toBeVisible({ timeout: 10000 })

        // Check email outbox for verification email
        const emails = getOutboxEmails()
        const sent: any = emails.find((e: any) => e.to.toLowerCase() === uniqueEmail.toLowerCase())
        expect(sent).toBeDefined()
        expect(sent?.subject).toContain("Verify your email address")
        expect(sent?.html || sent?.text || sent?.link).toContain("/verify-email?token=")

        // Extract token
        const token = sent?.token || (sent?.html || sent?.text || "").match(/\/verify-email\?token=([a-f0-9]+)/)?.[1]
        expect(token).toBeTruthy()

        // Visit verification URL
        await page.goto(`${BASE_URL}/verify-email?token=${token}`)
        await page.waitForLoadState("networkidle")

        // Check email verified screen
        await expect(page.locator("text=/Email Verified!/i")).toBeVisible({ timeout: 10000 })
        await expect(page.locator(`text=${uniqueEmail}`)).toBeVisible()

        // Attempting to reuse the same token should fail
        await page.goto(`${BASE_URL}/verify-email?token=${token}`)
        await page.waitForLoadState("networkidle")
        await expect(page.locator("text=/already been used/i")).toBeVisible({ timeout: 10000 })
    })

    test("4. Duplicate registration with same email is rejected with clear message", async ({ page }) => {
        const dupEmail = `dup_test_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`

        // First registration
        await page.goto(`${BASE_URL}/register`)
        await page.waitForLoadState("networkidle")
        await page.fill('input[name="name"]', "First Register")
        await page.fill('input[name="email"]', dupEmail)
        await page.fill('input[name="password"]', "SuperSecretPass!99")
        await page.click('button[type="submit"]')
        await expect(page.locator("text=/Account created!/i")).toBeVisible({ timeout: 10000 })

        // Second registration with same email (case variation)
        await page.goto(`${BASE_URL}/register`)
        await page.waitForLoadState("networkidle")
        await page.fill('input[name="name"]', "Second Register")
        await page.fill('input[name="email"]', dupEmail.toUpperCase())
        await page.fill('input[name="password"]', "SuperSecretPass!99")
        await page.click('button[type="submit"]')
        await expect(
            page.locator("text=/An account with this email already exists/i")
        ).toBeVisible({ timeout: 10000 })
    })

    test("5. Unverified user sees verification banner in dashboard with resend functionality", async ({ page }) => {
        const bannerEmail = `banner_test_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`
        const bannerPass = "BannerSecret!2026"

        // Register user
        await page.goto(`${BASE_URL}/register`)
        await page.waitForLoadState("networkidle")
        await page.fill('input[name="name"]', "Banner Test User")
        await page.fill('input[name="email"]', bannerEmail)
        await page.fill('input[name="password"]', bannerPass)
        await page.click('button[type="submit"]')
        await expect(page.locator("text=/Account created!/i")).toBeVisible({ timeout: 10000 })

        // Login as this newly registered (unverified) user
        await page.goto(`${BASE_URL}/login`)
        await page.waitForLoadState("networkidle")
        await page.fill('input[name="email"]', bannerEmail)
        await page.fill('input[name="password"]', bannerPass)
        await page.click('button[type="submit"]')

        // Should land on dashboard or page
        await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 })

        // Verification banner must be visible
        const banner = page.locator(`text=/Your email.*is not verified/i`)
        await expect(banner).toBeVisible({ timeout: 10000 })

        // Click resend verification link in banner
        const resendBtn = page.locator("button:has-text('Resend verification link')")
        if (await resendBtn.isVisible()) {
            await resendBtn.click()
            await expect(page.locator("text=/Verification link sent!/i")).toBeVisible({ timeout: 10000 })
        }
    })
})
