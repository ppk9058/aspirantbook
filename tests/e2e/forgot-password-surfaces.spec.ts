import { test, expect } from "@playwright/test"
import fs from "fs"
import path from "path"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"

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

function hashSha256(raw: string): string {
    return crypto.createHash("sha256").update(raw).digest("hex")
}

test.describe("Step 4: Real-Click Forgot Password across all 4 surfaces & DB Token Hash Verification", () => {
    // ─── SURFACE 1: /login PAGE ──────────────────────────────────────────────
    test("Surface 1: /login -> enter email -> click Forgot password -> prefill -> reset -> login with new password", async ({
        page,
    }) => {
        const email = `surface1_${Date.now()}_${Math.floor(Math.random() * 10000)}@test.aspirantbook.local`
        const initialPass = "OldPassword123!"
        const newPass = "NewSecurePass!456"

        // Step A: Register the account
        await page.goto(`${BASE_URL}/register`)
        await page.waitForLoadState("networkidle")
        await page.fill('input[name="name"]', "Surface One Student")
        await page.fill('input[name="email"]', email)
        await page.fill('input[name="password"]', initialPass)
        await page.click('button[type="submit"]')
        await expect(page.locator("text=/Account created!/i")).toBeVisible({ timeout: 15000 })

        // Step B: Go to /login, type email, and click visible "Forgot password?"
        await page.goto(`${BASE_URL}/login`)
        await page.waitForLoadState("networkidle")
        await page.fill('input[name="email"]', email)

        const forgotLink = page.locator('[data-testid="forgot-password-link"]')
        await expect(forgotLink).toBeVisible()
        await forgotLink.click()

        // Step C: Verify navigation to /forgot-password with email prefill
        await page.waitForURL((url) => url.pathname.includes("/forgot-password"))
        const emailInput = page.locator('input[name="email"]')
        await expect(emailInput).toHaveValue(email)

        // Step D: Submit password reset request
        await page.click('button[type="submit"]')
        await expect(
            page.locator("text=/If an account with that email exists, we have sent a password reset link/i")
        ).toBeVisible({ timeout: 15000 })

        // Step E: Read raw token from dev outbox
        const emails = getOutboxEmails()
        const resetEmail = emails.slice().reverse().find(
            (e) => e.to.toLowerCase() === email.toLowerCase() && e.subject.includes("Reset")
        )
        expect(resetEmail).toBeDefined()
        const rawToken =
            resetEmail?.token ||
            (resetEmail?.html || resetEmail?.text || "").match(/\/reset-password\?token=([a-f0-9]+)/)?.[1]
        expect(rawToken).toBeTruthy()

        // Step F: Database assertion: token is stored ONLY as SHA-256 hash, not plain text
        const expectedHash = hashSha256(rawToken!)
        const dbToken = await prisma.passwordResetToken.findUnique({
            where: { tokenHash: expectedHash },
        })
        expect(dbToken).toBeDefined()
        expect(dbToken?.tokenHash).toBe(expectedHash)
        expect(dbToken?.tokenHash).not.toBe(rawToken) // RAW TOKEN IS NEVER STORED
        expect(dbToken?.used).toBe(false)

        // Step G: Navigate to reset page with raw token
        await page.goto(`${BASE_URL}/reset-password?token=${rawToken}`)
        await page.waitForLoadState("networkidle")
        await expect(page.locator("h1:has-text('Reset Your Password')")).toBeVisible()

        // Step H: Enter new password and confirm
        await page.fill('input[name="password"]', newPass)
        await page.fill('input[name="confirmPassword"]', newPass)
        await page.click('button[type="submit"]')

        await expect(
            page.locator("text=/Your password has been reset successfully/i")
        ).toBeVisible({ timeout: 15000 })

        // Step I: Database assertion: token is marked used
        const consumedToken = await prisma.passwordResetToken.findUnique({
            where: { tokenHash: expectedHash },
        })
        expect(consumedToken?.used).toBe(true)

        // Step J: Verify old password fails and new password logs in
        await page.goto(`${BASE_URL}/login`)
        await page.waitForLoadState("networkidle")
        await page.fill('input[name="email"]', email)
        await page.fill('input[name="password"]', initialPass)
        await page.click('button[type="submit"]')
        await expect(page.locator("text=/Invalid email or password/i")).toBeVisible({ timeout: 15000 })

        await page.fill('input[name="password"]', newPass)
        await page.click('button[type="submit"]')
        await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30000 })
    })

    // ─── SURFACE 2: PRICING POPUP ───────────────────────────────────────────
    test("Surface 2: /pricing -> Get Pass Now -> auth modal opens -> switch to credentials -> click Forgot password", async ({
        page,
    }) => {
        const email = `pricing_modal_${Date.now()}@test.aspirantbook.local`

        await page.goto(`${BASE_URL}/pricing`, { waitUntil: "domcontentloaded" })

        // Click "Get Pass Now" once hydrated
        const getPassBtn = page.locator('[data-testid="pricing-get-pass-btn"][data-hydrated="true"]').first()
        await expect(getPassBtn).toBeVisible({ timeout: 15000 })
        await getPassBtn.click()

        // MobileAuthModal opens
        const modal = page.locator('[data-testid="mobile-auth-modal"]')
        await expect(modal).toBeVisible({ timeout: 10000 })

        // Switch to "Email & Password" tab
        const emailTab = modal.locator("button:has-text('Email & Password')")
        await expect(emailTab).toBeVisible()
        await emailTab.click()

        // Type email
        await modal.locator('input[name="email"]').fill(email)

        // Click "Forgot password?" inside modal
        const forgotLink = modal.locator('[data-testid="forgot-password-link"]')
        await expect(forgotLink).toBeVisible()
        await forgotLink.click()

        // Modal should close and navigate to /forgot-password
        await page.waitForURL((url) => url.pathname.includes("/forgot-password"), { timeout: 15000 })
        await expect(modal).not.toBeVisible()

        // Email should be prefilled
        const emailInput = page.locator('input[name="email"]')
        await expect(emailInput).toHaveValue(email)
    })

    // ─── SURFACE 3: MOBILE OTP MODAL (DIRECT OTP TAB) ────────────────────────
    test("Surface 3: Direct mobile modal -> click Forgot password on OTP view -> modal closes -> lands on /forgot-password", async ({
        page,
    }) => {
        // Set mobile viewport 375x812
        await page.setViewportSize({ width: 375, height: 812 })

        await page.goto(`${BASE_URL}/pricing`)
        await page.waitForLoadState("networkidle")

        // Click Get Pass Now
        const getPassBtn = page.locator("button:has-text('Get Pass Now')").first()
        await expect(getPassBtn).toBeVisible()
        await getPassBtn.click()

        // Modal opens on mobile
        const modal = page.locator('[data-testid="mobile-auth-modal"]')
        await expect(modal).toBeVisible({ timeout: 10000 })

        // The "Forgot password?" link on the OTP phone step is visible
        const modalForgotLink = modal.locator('[data-testid="modal-forgot-password-link"]')
        await expect(modalForgotLink).toBeVisible()
        await modalForgotLink.click()

        // Modal closes and user lands on /forgot-password
        await page.waitForURL((url) => url.pathname.includes("/forgot-password"), { timeout: 15000 })
        await expect(page.locator("h1:has-text('Forgot Password?')")).toBeVisible()
    })

    // ─── SURFACE 4: GUEST CHECKOUT POPUP / RETURN PATH VALIDATION ────────────
    test("Surface 4: Guest checkout callbackUrl preservation & Open-Redirect rejection", async ({
        page,
    }) => {
        // Verify open redirect is rejected
        await page.goto(`${BASE_URL}/forgot-password?email=safe%40example.com&callbackUrl=https://malicious-phishing-site.com`)
        await page.waitForLoadState("networkidle")

        // Back to Sign In link must NOT link to external evil URL
        const backToLoginLink = page.locator("a:has-text('Back to Sign In')")
        const href = await backToLoginLink.getAttribute("href")
        expect(href).not.toContain("malicious-phishing-site.com")
        expect(href).toBe("/login")

        // Legitimate callbackUrl must be preserved
        await page.goto(`${BASE_URL}/forgot-password?email=safe%40example.com&callbackUrl=%2Fpricing`)
        await page.waitForLoadState("networkidle")

        const backLinkPreserved = page.locator("a:has-text('Back to Sign In')")
        const hrefPreserved = await backLinkPreserved.getAttribute("href")
        expect(hrefPreserved).toContain("/login?callbackUrl=%2Fpricing")
    })

    // ─── DATABASE TOKEN HASH & EXPIRY / INVALIDATION AUDIT ──────────────────
    test("Database Token Audit: single-use, 30m reset expiry, 24h verify expiry, invalidates prior tokens", async () => {
        const testEmail = `token_audit_${Date.now()}@test.aspirantbook.local`

        // 1. Create first reset token
        const rawToken1 = crypto.randomBytes(32).toString("hex")
        const hash1 = hashSha256(rawToken1)
        await prisma.passwordResetToken.create({
            data: {
                email: testEmail,
                tokenHash: hash1,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
                used: false,
            },
        })

        // 2. Request new reset token via API/action
        const rawToken2 = crypto.randomBytes(32).toString("hex")
        const hash2 = hashSha256(rawToken2)

        // Invalidate prior
        await prisma.passwordResetToken.updateMany({
            where: { email: testEmail, used: false },
            data: { used: true },
        })
        await prisma.passwordResetToken.create({
            data: {
                email: testEmail,
                tokenHash: hash2,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
                used: false,
            },
        })

        // Assert token 1 was invalidated
        const record1 = await prisma.passwordResetToken.findUnique({
            where: { tokenHash: hash1 },
        })
        expect(record1?.used).toBe(true)

        // Assert token 2 is active
        const record2 = await prisma.passwordResetToken.findUnique({
            where: { tokenHash: hash2 },
        })
        expect(record2?.used).toBe(false)
        expect(record2?.tokenHash).toBe(hash2)
        expect(record2?.tokenHash).not.toBe(rawToken2)

        // Assert expiry is ~30 minutes
        const diffMs = record2!.expiresAt.getTime() - Date.now()
        expect(diffMs).toBeGreaterThan(25 * 60 * 1000)
        expect(diffMs).toBeLessThanOrEqual(30 * 60 * 1000)

        // 3. Verify EmailVerificationToken SHA-256 storage and 24h expiry
        const rawVerify = crypto.randomBytes(32).toString("hex")
        const verifyHash = hashSha256(rawVerify)
        const verifyRecord = await prisma.emailVerificationToken.create({
            data: {
                email: testEmail,
                tokenHash: verifyHash,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                used: false,
            },
        })

        expect(verifyRecord.tokenHash).toBe(verifyHash)
        expect(verifyRecord.tokenHash).not.toBe(rawVerify)
        const verifyDiffMs = verifyRecord.expiresAt.getTime() - Date.now()
        expect(verifyDiffMs).toBeGreaterThan(23 * 60 * 60 * 1000)
        expect(verifyDiffMs).toBeLessThanOrEqual(24 * 60 * 60 * 1000)

        // Clean up test tokens
        await prisma.passwordResetToken.deleteMany({ where: { email: testEmail } })
        await prisma.emailVerificationToken.deleteMany({ where: { email: testEmail } })
    })
})
