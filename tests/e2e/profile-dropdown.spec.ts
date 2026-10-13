import { test, expect } from "@playwright/test"
import { createActor, newNonce, loginAs } from "./test-series-e2e-helpers"

test.describe("Profile Dropdown on /books and /dashboard (Task B)", () => {
  const nonce = newNonce()
  let student: any

  test.beforeAll(async () => {
    student = await createActor(nonce, "FREE", "dropstudent")
  })

  test("PD-01: Guest on /books sees login button; no dropdown", async ({ page }) => {
    await page.context().clearCookies()
    await page.goto("/books", { waitUntil: "domcontentloaded" })

    // Guest should see Login button in header
    const loginBtn = page.locator('[data-testid="profile-login-btn"]')
    await expect(loginBtn).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('[data-testid="profile-dropdown-trigger"]')).toHaveCount(0)

    // My Orders, Wishlist, My Cart remain present
    await expect(page.locator('text=Wishlist')).toBeVisible()
    await expect(page.locator('text=My Orders')).toBeVisible()
    await expect(page.locator('text=My Cart')).toBeVisible()
  })

  test("PD-02: Logged-in student on /books opens dropdown: sees My Profile, Settings, Sign Out, does NOT see My Purchase", async ({ page }) => {
    await loginAs(page, student.email)
    await page.goto("/books", { waitUntil: "networkidle" })

    const trigger = page.locator('[data-testid="profile-dropdown-trigger"]').first()
    await expect(trigger).toBeVisible({ timeout: 15_000 })

    // Open dropdown
    await trigger.click()
    const menu = page.locator('[data-testid="profile-dropdown-menu"]')
    await expect(menu).toBeVisible({ timeout: 10_000 })

    // Verify session data
    await expect(page.locator('[data-testid="profile-dropdown-user-email"]')).toHaveText(student.email)
    await expect(page.locator('[data-testid="profile-dropdown-role-badge"]')).toHaveText("Student")

    // Items check
    await expect(page.locator('[data-testid="profile-menu-my-profile"]')).toBeVisible()
    await expect(page.locator('[data-testid="profile-menu-settings"]')).toBeVisible()
    await expect(page.locator('[data-testid="profile-menu-signout"]')).toBeVisible()

    // Must NOT have My Purchase on /books
    await expect(page.locator('[data-testid="profile-menu-my-purchase"]')).toHaveCount(0)

    // Close on outside click
    await page.locator("body").click({ position: { x: 10, y: 10 } })
    await expect(menu).toHaveCount(0)
  })

  test("PD-03: Logged-in student on /dashboard opens dropdown: sees My Purchase intact", async ({ page }) => {
    await loginAs(page, student.email)
    await page.goto("/dashboard", { waitUntil: "networkidle" })

    const trigger = page.locator('[data-testid="profile-dropdown-trigger"]').first()
    await expect(trigger).toBeVisible({ timeout: 15_000 })

    // Open dropdown
    await trigger.click()
    const menu = page.locator('[data-testid="profile-dropdown-menu"]')
    await expect(menu).toBeVisible({ timeout: 10_000 })

    // Must show My Purchase on dashboard
    await expect(page.locator('[data-testid="profile-menu-my-purchase"]')).toBeVisible()
    await expect(page.locator('[data-testid="profile-menu-my-profile"]')).toBeVisible()

    // Press Escape closes menu
    await page.keyboard.press("Escape")
    await expect(menu).toHaveCount(0)
  })

  test("PD-04: Works on 375px mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await loginAs(page, student.email)
    await page.goto("/books", { waitUntil: "networkidle" })

    const trigger = page.locator('[data-testid="profile-dropdown-trigger"]').first()
    await expect(trigger).toBeVisible({ timeout: 15_000 })

    await trigger.click()
    const menu = page.locator('[data-testid="profile-dropdown-menu"]')
    await expect(menu).toBeVisible({ timeout: 10_000 })

    await expect(page.locator('[data-testid="profile-menu-my-profile"]')).toBeVisible()
    await expect(page.locator('[data-testid="profile-menu-my-purchase"]')).toHaveCount(0)
  })
})
