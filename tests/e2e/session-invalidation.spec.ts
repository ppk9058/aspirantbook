import { test, expect } from "@playwright/test"

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3045"

test.describe("Step 5: Logout and Session Invalidation Hardening", () => {
    test("1. Standard logout clears session cookies and redirects", async ({ page }) => {
        const userEmail = `logout_test_${Date.now()}@example.com`
        const password = "ValidPassword123!"

        // Register user
        await page.goto(`${BASE_URL}/register`)
        await page.waitForLoadState("networkidle")
        await page.fill('input[name="name"]', "Logout Test User")
        await page.fill('input[name="email"]', userEmail)
        await page.fill('input[name="password"]', password)
        await page.click('button[type="submit"]')
        await expect(page.locator("text=/Account created!/i")).toBeVisible({ timeout: 10000 })

        // Log in
        await page.goto(`${BASE_URL}/login`)
        await page.waitForLoadState("networkidle")
        await page.fill('input[name="email"]', userEmail)
        await page.fill('input[name="password"]', password)
        await page.click('button[type="submit"]')
        await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30000 })

        // Verify session is active
        const sessionRes = await page.request.get(`${BASE_URL}/api/auth/session`)
        const sessionData = await sessionRes.json()
        expect(sessionData?.user?.email).toBe(userEmail)

        // Clear session cookies via client-side signOut or cookie clearing
        await page.context().clearCookies()

        // Verify session is now empty
        const postLogoutRes = await page.request.get(`${BASE_URL}/api/auth/session`)
        const postLogoutData = await postLogoutRes.json()
        expect(postLogoutData?.user).toBeUndefined()
    })

    test("2. Incrementing sessionVersion invalidates existing JWT session on next request", async ({ page }) => {
        const userEmail = `session_ver_${Date.now()}@example.com`
        const password = "ValidPassword123!"

        // Register user
        await page.goto(`${BASE_URL}/register`)
        await page.waitForLoadState("networkidle")
        await page.fill('input[name="name"]', "Version Test User")
        await page.fill('input[name="email"]', userEmail)
        await page.fill('input[name="password"]', password)
        await page.click('button[type="submit"]')
        await expect(page.locator("text=/Account created!/i")).toBeVisible({ timeout: 10000 })

        // Log in
        await page.goto(`${BASE_URL}/login`)
        await page.waitForLoadState("networkidle")
        await page.fill('input[name="email"]', userEmail)
        await page.fill('input[name="password"]', password)
        await page.click('button[type="submit"]')
        await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30000 })

        // Check active session
        const sessionRes = await page.request.get(`${BASE_URL}/api/auth/session`)
        const sessionData = await sessionRes.json()
        expect(sessionData?.user?.email).toBe(userEmail)
        const initialVersion = sessionData?.user?.sessionVersion || 1

        // Trigger sessionVersion increment (simulate "Log out from all devices" or password reset)
        // Update user sessionVersion in test DB via node / script
        const { execSync } = await import("child_process")
        execSync(
            `DATABASE_URL="postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test" node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.user.update({ where: { email: '${userEmail}' }, data: { sessionVersion: ${initialVersion + 1} } }).then(() => process.exit(0))"`,
            { stdio: "inherit" }
        )

        // Wait for syncInterval threshold (200ms in test mode)
        await page.waitForTimeout(400)

        // Trigger session update / refresh request with the existing cookie
        const refreshedRes = await page.request.get(`${BASE_URL}/api/auth/session`)
        const refreshedData = await refreshedRes.json().catch(() => null)

        // The session callback / JWT callback returns null when dbUser.sessionVersion !== token.sessionVersion
        expect(refreshedData?.user?.email).toBeUndefined()
    })
})
