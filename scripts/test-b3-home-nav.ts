import { chromium } from "playwright"
import { encode } from "next-auth/jwt"

const BASE_URL = "http://127.0.0.1:3045"
const SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || (() => { throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required"); })();

async function main() {
    console.log("=== B3 HOME ICON NAVIGATION TEST ===")
    const token = await encode({
        token: {
            id: "cmuvppjo40000xpes7a4c4v2j",
            email: "mobile_9876543210@aspirantbook.local",
            name: "student",
            role: "FREE",
            subscriptionStatus: "INACTIVE",
        },
        secret: SECRET,
        salt: "authjs.session-token",
    })

    const browser = await chromium.launch({ headless: true })

    // Test 1: Logged-in user on /courses
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
    await authPage.goto(`${BASE_URL}/courses`, { waitUntil: "domcontentloaded" })
    await authPage.waitForTimeout(500)

    // Breadcrumb home
    const authBreadcrumbHome = await authPage.locator('nav[data-testid="breadcrumbs"] a[title="Home"], nav[aria-label="Breadcrumb"] a').first().getAttribute("href")
    console.log(`Logged-in Breadcrumb Home link on /courses: ${authBreadcrumbHome} (Expected: /dashboard)`)

    // Top logo
    const authLogo = await authPage.locator('header a:has(span:has-text("aspirantbook")), header a:has(div:has-text("T"))').first().getAttribute("href")
    console.log(`Logged-in TopNavBar logo link: ${authLogo} (Expected: /dashboard)`)

    // Sidebar Home link
    const authSidebarHome = await authPage.locator('aside a:has-text("Home")').first().getAttribute("href")
    console.log(`Logged-in Sidebar Home link: ${authSidebarHome} (Expected: /dashboard)`)

    // Mobile view checks
    const mobileAuthPage = await authContext.newPage()
    await mobileAuthPage.setViewportSize({ width: 390, height: 844 })
    await mobileAuthPage.goto(`${BASE_URL}/courses`, { waitUntil: "domcontentloaded" })
    await mobileAuthPage.waitForTimeout(500)

    const mobileBottomHome = await mobileAuthPage.locator('nav[data-mobile-bottom-nav="true"] a:has-text("Home")').first().getAttribute("href")
    console.log(`Logged-in Mobile Bottom Nav Home link: ${mobileBottomHome} (Expected: /dashboard)`)

    // Test 2: Logged-out user
    console.log("\n--- Test 2: Logged-Out User Home Links across layouts ---")
    const guestContext = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const guestPage = await guestContext.newPage()
    await guestPage.goto(`${BASE_URL}/courses`, { waitUntil: "domcontentloaded" })
    await guestPage.waitForTimeout(500)

    const guestBreadcrumbHome = await guestPage.locator('nav[data-testid="breadcrumbs"] a[title="Home"], nav[aria-label="Breadcrumb"] a').first().getAttribute("href")
    console.log(`Logged-out Breadcrumb Home link on /courses: ${guestBreadcrumbHome} (Expected: /)`)

    const guestLogo = await guestPage.locator('header a:has(span:has-text("aspirantbook")), header a:has(div:has-text("T"))').first().getAttribute("href")
    console.log(`Logged-out TopNavBar logo link: ${guestLogo} (Expected: /)`)

    const guestSidebarHome = await guestPage.locator('aside a:has-text("Home")').first().getAttribute("href")
    console.log(`Logged-out Sidebar Home link: ${guestSidebarHome} (Expected: /)`)

    const mobileGuestPage = await guestContext.newPage()
    await mobileGuestPage.setViewportSize({ width: 390, height: 844 })
    await mobileGuestPage.goto(`${BASE_URL}/courses`, { waitUntil: "domcontentloaded" })
    await mobileGuestPage.waitForTimeout(500)

    const guestMobileBottomHome = await mobileGuestPage.locator('nav[data-mobile-bottom-nav="true"] a:has-text("Home")').first().getAttribute("href")
    console.log(`Logged-out Mobile Bottom Nav Home link: ${guestMobileBottomHome} (Expected: /)`)

    console.log("\nB3 Regression Results:")
    console.log("Logged in breadcrumb home -> /dashboard: " + (authBreadcrumbHome === "/dashboard" ? "PASS" : "FAIL"))
    console.log("Logged in logo home -> /dashboard: " + (authLogo === "/dashboard" ? "PASS" : "FAIL"))
    console.log("Logged in sidebar home -> /dashboard: " + (authSidebarHome === "/dashboard" ? "PASS" : "FAIL"))
    console.log("Logged in mobile bottom home -> /dashboard: " + (mobileBottomHome === "/dashboard" ? "PASS" : "FAIL"))
    console.log("Logged out breadcrumb home -> /: " + (guestBreadcrumbHome === "/" ? "PASS" : "FAIL"))
    console.log("Logged out logo home -> /: " + (guestLogo === "/" ? "PASS" : "FAIL"))
    console.log("Logged out sidebar home -> /: " + (guestSidebarHome === "/" ? "PASS" : "FAIL"))
    console.log("Logged out mobile bottom home -> /: " + (guestMobileBottomHome === "/" ? "PASS" : "FAIL"))

    const allPassed = 
        authBreadcrumbHome === "/dashboard" &&
        authLogo === "/dashboard" &&
        authSidebarHome === "/dashboard" &&
        mobileBottomHome === "/dashboard" &&
        guestBreadcrumbHome === "/" &&
        guestLogo === "/" &&
        guestSidebarHome === "/" &&
        guestMobileBottomHome === "/"

    await browser.close()
    if (!allPassed) {
        process.exit(1)
    }
}

main().catch((err) => {
    console.error("Test error:", err)
    process.exit(1)
})
