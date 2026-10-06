import { chromium } from "playwright"
import { encode } from "next-auth/jwt"

const BASE_URL = "http://127.0.0.1:3045"
const SECRET = "test-secret-at-least-32-chars-long-for-testing"

async function makeToken() {
    return await encode({
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
}

async function main() {
    console.log("=== STEP 7: LOGOUT FROM EVERY LAYOUT & RELOAD AFTER LOGIN ===")
    const token = await makeToken()
    const browser = await chromium.launch({ headless: true })

    // 1. Desktop TopNavBar Logout
    console.log("\n--- Sub-test 1: Desktop TopNavBar Logout ---")
    const dContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await dContext.addCookies([{ name: "authjs.session-token", value: token, domain: "127.0.0.1", path: "/" }])
    const dPage = await dContext.newPage()
    await dPage.goto(`${BASE_URL}/dashboard`)
    await dPage.waitForLoadState("domcontentloaded")

    // Click user menu button in desktop header
    const userMenuBtn = dPage.locator('button[aria-label="User menu"]').first()
    await userMenuBtn.click()
    await dPage.waitForTimeout(300)

    // Click Sign Out button
    const logoutBtn = dPage.locator('button:has-text("Sign Out")').first()
    await logoutBtn.click()
    await dPage.waitForTimeout(1000)

    const cookiesAfter = await dContext.cookies()
    const sessionCookie = cookiesAfter.find(c => c.name.includes("session-token") && c.value)
    console.log("Desktop Logout result: Session cookie cleared? " + (!sessionCookie ? "PASS" : "FAIL"))
    await dContext.close()

    // 2. Mobile Profile Sheet Logout
    console.log("\n--- Sub-test 2: Mobile Profile Sheet Logout ---")
    const mContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
    await mContext.addCookies([{ name: "authjs.session-token", value: token, domain: "127.0.0.1", path: "/" }])
    const mPage = await mContext.newPage()
    await mPage.goto(`${BASE_URL}/dashboard`)
    await mPage.waitForLoadState("domcontentloaded")

    // Click mobile account profile avatar
    const mobileAvatarBtn = mPage.locator('button[aria-label="Account profile"]').first()
    await mobileAvatarBtn.click()
    await mPage.waitForTimeout(400)

    // Click Logout button inside the sheet
    const mobileLogoutBtn = mPage.locator('button:has-text("Logout")').first()
    await mobileLogoutBtn.click()
    await mPage.waitForTimeout(1000)

    const mCookiesAfter = await mContext.cookies()
    const mSessionCookie = mCookiesAfter.find(c => c.name.includes("session-token") && c.value)
    console.log("Mobile Logout result: Session cookie cleared? " + (!mSessionCookie ? "PASS" : "FAIL"))
    await mContext.close()

    // 3. Reload-After-Login Test
    console.log("\n--- Sub-test 3: Reload After Login Session Persistence ---")
    const rContext = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    await rContext.addCookies([{ name: "authjs.session-token", value: token, domain: "127.0.0.1", path: "/" }])
    const rPage = await rContext.newPage()
    await rPage.goto(`${BASE_URL}/dashboard`)
    await rPage.waitForLoadState("domcontentloaded")
    console.log("Initial load on /dashboard: URL = " + rPage.url())

    await rPage.reload()
    await rPage.waitForLoadState("domcontentloaded")
    console.log("After reload on /dashboard: URL = " + rPage.url())

    const headerText = await rPage.locator("header").first().innerText().catch(() => "")
    const hasLogin = headerText.includes("Login")
    console.log("Reload after login shows 'Login'? " + (hasLogin ? "FAIL" : "PASS (Session preserved seamlessly)"))

    await browser.close()
}

main().catch((err) => {
    console.error("Test error:", err)
    process.exit(1)
})
