import { chromium } from "playwright"
import { encode } from "next-auth/jwt"

const BASE_URL = "http://127.0.0.1:3045"
const SECRET = "test-secret-at-least-32-chars-long-for-testing"

async function main() {
    console.log("=== B3 HOME ICON NAVIGATION TEST ===")
    const token = await encode({
        token: {
            id: "user-student-free-001",
            email: "student@example.com",
            name: "Free Student",
            role: "FREE",
            subscriptionStatus: "INACTIVE",
        },
        secret: SECRET,
        salt: "authjs.session-token",
    })

    const browser = await chromium.launch({ headless: true })

    // Test 1: Logged-in user on /dashboard
    console.log("\n--- Test 1: Logged-In User Home Links across layouts ---")
    const authContext = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    await authContext.addCookies([
        {
            name: "authjs.session-token",
            value: token,
            domain: "127.0.0.1",
            path: "/",
            httpOnly: true,
            sameSite: "Lax",
        },
    ])
    const authPage = await authContext.newPage()
    await authPage.goto(`${BASE_URL}/courses`)
    await authPage.waitForLoadState("domcontentloaded")

    // Breadcrumb home
    const authBreadcrumbHome = await authPage.locator('nav a[title="Home"]').first().getAttribute("href")
    console.log(`Logged-in Breadcrumb Home link on /courses: ${authBreadcrumbHome} (Expected: /dashboard)`)

    // Top logo
    const authLogo = await authPage.locator('header a[href="/dashboard"]').first().getAttribute("href")
    console.log(`Logged-in TopNavBar logo link: ${authLogo} (Expected: /dashboard)`)

    // Sidebar Home link
    const authSidebarHome = await authPage.locator('aside a:has-text("Home")').first().getAttribute("href")
    console.log(`Logged-in Sidebar Home link: ${authSidebarHome} (Expected: /dashboard)`)

    // Mobile view checks
    const mobileAuthPage = await authContext.newPage()
    await mobileAuthPage.setViewportSize({ width: 390, height: 844 })
    await mobileAuthPage.goto(`${BASE_URL}/courses`)
    await mobileAuthPage.waitForLoadState("domcontentloaded")

    const mobileBottomHome = await mobileAuthPage.locator('nav button:has-text("Home"), nav a:has-text("Home")').first().getAttribute("href")
    console.log(`Logged-in Mobile Bottom Nav Home link: ${mobileBottomHome} (Expected: /dashboard)`)

    // Test 2: Logged-out user
    console.log("\n--- Test 2: Logged-Out User Home Links across layouts ---")
    const guestContext = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const guestPage = await guestContext.newPage()
    await guestPage.goto(`${BASE_URL}/courses`)
    await guestPage.waitForLoadState("domcontentloaded")

    const guestBreadcrumbHome = await guestPage.locator('nav a[title="Home"]').first().getAttribute("href")
    console.log(`Logged-out Breadcrumb Home link on /courses: ${guestBreadcrumbHome} (Expected: /)`)

    const guestLogo = await guestPage.locator('header a[href="/"]').first().getAttribute("href")
    console.log(`Logged-out TopNavBar logo link: ${guestLogo} (Expected: /)`)

    console.log("\nB3 Regression Results:")
    console.log("Logged in breadcrumb home -> /dashboard: " + (authBreadcrumbHome === "/dashboard" ? "PASS" : "FAIL"))
    console.log("Logged in logo home -> /dashboard: " + (authLogo === "/dashboard" ? "PASS" : "FAIL"))
    console.log("Logged in sidebar home -> /dashboard: " + (authSidebarHome === "/dashboard" ? "PASS" : "FAIL"))
    console.log("Logged out breadcrumb home -> /: " + (guestBreadcrumbHome === "/" ? "PASS" : "FAIL"))
    console.log("Logged out logo home -> /: " + (guestLogo === "/" ? "PASS" : "FAIL"))

    await browser.close()
}

main().catch((err) => {
    console.error("Test error:", err)
    process.exit(1)
})
