import { test, expect } from "@playwright/test"
import { prisma, createActor, loginAs, newNonce, PASSWORD } from "./test-series-e2e-helpers"
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

test.describe("Step 6: User Management and Profile", () => {
    let nonce: string
    let adminUser: any
    let teacherUser: any
    let studentUser: any

    test.beforeAll(async () => {
        nonce = newNonce()
        adminUser = await createActor(nonce, "ADMIN", "admin")
        teacherUser = await createActor(nonce, "TEACHER", "teacher")
        studentUser = await createActor(nonce, "FREE", "student")
    })

    test("1. Role matrix on /admin/users: guest, student, teacher, and admin", async ({ page }) => {
        // Guest: unauthenticated -> redirects to /login
        await page.context().clearCookies()
        await page.goto(`${BASE_URL}/admin/users`)
        await page.waitForURL((url) => url.pathname.includes("/login"), { timeout: 15000 })
        expect(page.url()).toContain("/login")

        // Student (FREE): authenticated -> redirects to home (/)
        await loginAs(page, studentUser.email)
        await page.goto(`${BASE_URL}/admin/users`)
        await page.waitForURL((url) => !url.pathname.includes("/admin/users"), { timeout: 15000 })
        expect(page.url()).not.toContain("/admin/users")

        // Teacher: authenticated -> redirects to /teacher
        await loginAs(page, teacherUser.email)
        await page.goto(`${BASE_URL}/admin/users`)
        await page.waitForURL((url) => url.pathname.includes("/teacher") || !url.pathname.includes("/admin/users"), { timeout: 15000 })
        expect(page.url()).not.toContain("/admin/users")

        // Admin: authenticated -> loads user management
        await loginAs(page, adminUser.email)
        await page.goto(`${BASE_URL}/admin/users`)
        await page.waitForLoadState("networkidle")
        await expect(page.locator("h1:has-text('User Management')")).toBeVisible({ timeout: 15000 })
        await expect(page.locator("text=Export CSV")).toBeVisible()
        await expect(page.locator("button:has-text('Create User')")).toBeVisible()
    })

    test("2. Role matrix on /api/admin/users/export: 401, 403, and 200 CSV export", async ({ page, request }) => {
        // Unauthenticated request
        const unauthRes = await request.get(`${BASE_URL}/api/admin/users/export`)
        expect(unauthRes.status()).toBe(401)

        // Student authenticated request
        await loginAs(page, studentUser.email)
        const studentRes = await page.request.get(`${BASE_URL}/api/admin/users/export`)
        expect(studentRes.status()).toBe(403)

        // Admin authenticated request
        await loginAs(page, adminUser.email)
        const adminRes = await page.request.get(`${BASE_URL}/api/admin/users/export`)
        expect(adminRes.status()).toBe(200)
        expect(adminRes.headers()["content-type"]).toContain("text/csv")
        const csvText = await adminRes.text()
        expect(csvText).toContain("ID,Name,Email,Phone,Role,Status,Verified,JoinedAt")
        expect(csvText).toContain(adminUser.email)
    })

    test("3. Deactivated/blocked user cannot log in", async ({ page }) => {
        const blockedNonce = newNonce()
        const blockedActor = await createActor(blockedNonce, "FREE", "blocked")

        // Deactivate the user
        await prisma.user.update({
            where: { id: blockedActor.id },
            data: { isActive: false },
        })

        await page.context().clearCookies()
        await page.goto(`${BASE_URL}/login`)
        await page.waitForLoadState("networkidle")

        // Fill credentials
        await page.fill('input[type="email"]', blockedActor.email)
        await page.fill('input[type="password"]', PASSWORD)
        await page.click('button[type="submit"]')

        // Check rejection with clear deactivation message
        await expect(
            page.locator("text=/Your account has been deactivated/i")
        ).toBeVisible({ timeout: 15000 })
    })

    test("4. Admin user detail view & actions: reset password & resend verification", async ({ page }) => {
        await loginAs(page, adminUser.email)
        await page.goto(`${BASE_URL}/admin/users/${studentUser.id}`)
        await page.waitForLoadState("networkidle")

        // Verify user detail sections
        await expect(page.locator("h1", { hasText: studentUser.name })).toBeVisible({ timeout: 15000 })
        await expect(page.locator("text=Profile Information")).toBeVisible()
        await expect(page.locator("text=Account Status & Actions")).toBeVisible()
        await expect(page.locator("text=Purchases & Payments")).toBeVisible()
        await expect(page.locator("text=Test Series & Assessments")).toBeVisible()
        await expect(page.locator("text=Danger Zone • Privacy & Removal")).toBeVisible()

        // Handle browser dialogs automatically
        page.on("dialog", (dialog) => dialog.accept())

        // Trigger password reset from admin console
        await page.click('button:has-text("Trigger Password Reset Link")')

        // Verify password reset was dispatched to outbox
        await expect.poll(() => {
            const outbox = getOutboxEmails()
            return outbox.some((e) => e.to.toLowerCase() === studentUser.email.toLowerCase() && e.subject.toLowerCase().includes("reset"))
        }, { timeout: 10000 }).toBe(true)

        // Resend verification email from admin console
        await page.click('button:has-text("Resend Verification Email")')

        // Verify verification was dispatched to outbox
        await expect.poll(() => {
            const outbox = getOutboxEmails()
            return outbox.some((e) => e.to.toLowerCase() === studentUser.email.toLowerCase() && e.subject.toLowerCase().includes("verify"))
        }, { timeout: 10000 }).toBe(true)
    })

    test("5. User profile self-service: update details on /settings", async ({ page }) => {
        const profileNonce = newNonce()
        const profileActor = await createActor(profileNonce, "FREE", "profileuser")
        const uniquePhone = "9" + Math.floor(100000000 + Math.random() * 900000000).toString()

        await loginAs(page, profileActor.email)
        await page.goto(`${BASE_URL}/settings`)
        await page.waitForLoadState("networkidle")

        // Switch to Profile tab via tab role selector
        await page.locator('button[role="tab"]:has-text("Profile")').click()
        await page.waitForTimeout(300)

        // Update full name, phone, and goal
        const updatedName = `Updated ${profileNonce}`
        await page.fill('input#name', updatedName)
        await page.fill('input#phone', uniquePhone)
        await page.selectOption('select#goal', "UPSC CSE")

        await page.click('button:has-text("Save Profile Changes")')

        // Check success message
        await expect(page.locator("text=Profile updated successfully!")).toBeVisible({ timeout: 10000 })

        // Verify database updated
        const dbUser = await prisma.user.findUnique({
            where: { id: profileActor.id },
            select: { name: true, phoneNumber: true, selectedGoal: true },
        })
        expect(dbUser?.name).toBe(updatedName)
        expect(dbUser?.phoneNumber).toBe(uniquePhone)
        expect(dbUser?.selectedGoal).toBe("UPSC CSE")
    })
})
