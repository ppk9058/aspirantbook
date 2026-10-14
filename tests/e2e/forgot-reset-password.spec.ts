import { test, expect } from "@playwright/test"
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

test.describe("Step 4: Forgot Password and Password Reset Hardening", () => {
    test("1. Forgot password link navigates from login page to /forgot-password", async ({ page }) => {
        await page.goto(`${BASE_URL}/login`)
        await page.waitForLoadState("networkidle")

        const forgotLink = page.locator('a[href="/forgot-password"]')
        await expect(forgotLink).toBeVisible()
        await forgotLink.click()

        await page.waitForURL((url) => url.pathname.includes("/forgot-password"))
        await expect(page.locator("h1:has-text('Forgot Password?')")).toBeVisible()
    })

    test("2. Non-existent email returns identical success response (anti-enumeration)", async ({ page }) => {
        const fakeEmail = `nonexistent_${Date.now()}@example.com`

        await page.goto(`${BASE_URL}/forgot-password`)
        await page.waitForLoadState("networkidle")

        await page.fill('input[name="email"]', fakeEmail)
        await page.click('button[type="submit"]')

        await expect(
            page.locator("text=/If an account with that email exists, we have sent a password reset link/i")
        ).toBeVisible({ timeout: 10000 })
    })

    test("3. Full flow: request reset, read token from dev outbox, reset password, verify login", async ({ page }) => {
        const userEmail = `pwd_reset_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`
        const initialPass = "OriginalPass!2026"
        const newPass = "NewSecurePass!2026"

        // Step A: Register the user first
        await page.goto(`${BASE_URL}/register`)
        await page.waitForLoadState("networkidle")
        await page.fill('input[name="name"]', "Reset Flow User")
        await page.fill('input[name="email"]', userEmail)
        await page.fill('input[name="password"]', initialPass)
        await page.click('button[type="submit"]')
        await expect(page.locator("text=/Account created!/i")).toBeVisible({ timeout: 10000 })

        // Step B: Request password reset
        await page.goto(`${BASE_URL}/forgot-password`)
        await page.waitForLoadState("networkidle")
        await page.fill('input[name="email"]', userEmail)
        await page.click('button[type="submit"]')
        await expect(
            page.locator("text=/If an account with that email exists, we have sent a password reset link/i")
        ).toBeVisible({ timeout: 10000 })

        // Step C: Read token from dev outbox
        const emails = getOutboxEmails()
        const resetEmail = emails.slice().reverse().find(
            (e) => e.to.toLowerCase() === userEmail.toLowerCase() && e.subject.includes("Reset")
        )
        expect(resetEmail).toBeDefined()
        expect(resetEmail?.html || resetEmail?.text || resetEmail?.link).toContain("/reset-password?token=")

        const token =
            resetEmail?.token ||
            (resetEmail?.html || resetEmail?.text || "").match(/\/reset-password\?token=([a-f0-9]+)/)?.[1]
        expect(token).toBeTruthy()

        // Step D: Open reset password page
        await page.goto(`${BASE_URL}/reset-password?token=${token}`)
        await page.waitForLoadState("networkidle")
        await expect(page.locator("h1:has-text('Reset Your Password')")).toBeVisible()

        // Step E: Set new password
        await page.fill('input[name="password"]', newPass)
        await page.fill('input[name="confirmPassword"]', newPass)
        await page.click('button[type="submit"]')

        await expect(
            page.locator("text=/Your password has been reset successfully/i")
        ).toBeVisible({ timeout: 10000 })

        // Step F: Verify old password fails
        await page.goto(`${BASE_URL}/login`)
        await page.waitForLoadState("networkidle")
        await page.fill('input[name="email"]', userEmail)
        await page.fill('input[name="password"]', initialPass)
        await page.click('button[type="submit"]')
        await expect(page.locator("text=/Invalid email or password/i")).toBeVisible({ timeout: 10000 })

        // Step G: Verify new password succeeds
        await page.fill('input[name="email"]', userEmail)
        await page.fill('input[name="password"]', newPass)
        await page.click('button[type="submit"]')
        await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30000 })

        // Step H: Verify used token cannot be reused
        await page.goto(`${BASE_URL}/reset-password?token=${token}`)
        await page.waitForLoadState("networkidle")
        await expect(
            page.locator("text=/already been used|invalid or has already been consumed/i")
        ).toBeVisible({ timeout: 10000 })
    })

    test("4. Invalid reset token displays invalid link error", async ({ page }) => {
        await page.goto(`${BASE_URL}/reset-password?token=invalid_token_1234567890`)
        await page.waitForLoadState("networkidle")

        await expect(page.locator("h1:has-text('Invalid Reset Link')")).toBeVisible()
        await expect(
            page.locator("text=/invalid or has already been consumed/i")
        ).toBeVisible()
    })

    test("5. Reset password enforces password policy (rejects weak/short password)", async ({ page }) => {
        const testUser = `policy_test_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`

        // Register user and request reset
        await page.goto(`${BASE_URL}/register`)
        await page.waitForLoadState("networkidle")
        await page.fill('input[name="name"]', "Policy Test")
        await page.fill('input[name="email"]', testUser)
        await page.fill('input[name="password"]', "ValidPassword123!")
        await page.click('button[type="submit"]')
        await expect(page.locator("text=/Account created!/i")).toBeVisible({ timeout: 10000 })

        await page.goto(`${BASE_URL}/forgot-password`)
        await page.waitForLoadState("networkidle")
        await page.fill('input[name="email"]', testUser)
        await page.click('button[type="submit"]')
        await expect(
            page.locator("text=/If an account with that email exists, we have sent a password reset link/i")
        ).toBeVisible({ timeout: 10000 })

        const emails = getOutboxEmails()
        const resetEmail = emails.slice().reverse().find(
            (e) => e.to.toLowerCase() === testUser.toLowerCase() && e.subject.includes("Reset")
        )
        const token =
            resetEmail?.token ||
            (resetEmail?.html || resetEmail?.text || "").match(/\/reset-password\?token=([a-f0-9]+)/)?.[1]
        expect(token).toBeTruthy()

        await page.goto(`${BASE_URL}/reset-password?token=${token}`)
        await page.waitForLoadState("networkidle")
        await expect(page.locator("h1:has-text('Reset Your Password')")).toBeVisible()

        // Try submitting short password
        await page.evaluate(() => {
            document.querySelectorAll('input[type="password"]').forEach((el) => el.removeAttribute("minlength"))
        })
        await page.fill('input[name="password"]', "short")
        await page.fill('input[name="confirmPassword"]', "short")
        await page.click('button[type="submit"]')
        await expect(
            page.locator("text=/Password must be at least 8 characters long/i")
        ).toBeVisible({ timeout: 10000 })

        // Try submitting common password
        await page.fill('input[name="password"]', "password123")
        await page.fill('input[name="confirmPassword"]', "password123")
        await page.click('button[type="submit"]')
        await expect(
            page.locator("text=/This password is too common or easily guessed/i")
        ).toBeVisible({ timeout: 10000 })
    })
})
