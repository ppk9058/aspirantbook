import { chromium } from "playwright"
import { encode } from "next-auth/jwt"

const BASE_URL = "http://127.0.0.1:3045"
const REAL_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || (() => { throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required"); })();

async function makeToken() {
    return await encode({
        token: {
            id: "cmuvppjo40000xpes7a4c4v2j",
            email: "mobile_9876543210@aspirantbook.local",
            name: "student",
            role: "FREE",
            subscriptionStatus: "INACTIVE",
        },
        secret: REAL_SECRET,
        salt: "authjs.session-token",
    })
}

async function main() {
    console.log("=== LOGOUT FROM EVERY LAYOUT & RELOAD AFTER LOGIN ===")
    const token = await makeToken()
    const browser = await chromium.launch({ headless: true })

    // 1. Desktop TopNavBar Logout
    console.log("\n--- Sub-test 1: Desktop TopNavBar Logout ---")
    const dContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await dContext.addCookies([{ name: "authjs.session-token", value: token, domain: "127.0.0.1", path: "/" }])
    const dPage = await dContext.newPage()
    await dPage.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" })
    await dPage.waitForTimeout(500)

    // Click user menu button in desktop header
    const userMenuBtn = dPage.locator('button[aria-label="User menu"]').first()
    if (await userMenuBtn.isVisible()) {
        await userMenuBtn.click()
        await dPage.waitForTimeout(300)

        // Click Sign Out button
        const logoutBtn = dPage.locator('button:has-text("Sign Out")').first()
        await Promise.all([
            dPage.waitForNavigation({ timeout: 5000 }).catch(() => {}),
            logoutBtn.click(),
        ])
        await dPage.waitForTimeout(1000)

        const cookiesAfter = await dContext.cookies()
        const sessionCookie = cookiesAfter.find(c => c.name.includes("session-token") && c.value)
        console.log("Desktop TopNavBar Logout: Session cookie cleared? " + (!sessionCookie ? "PASS" : "FAIL"))
    } else {
        console.log("Desktop TopNavBar Logout: User menu button not visible FAIL")
    }
    await dContext.close()

    // 2. Mobile Profile Sheet Logout
    console.log("\n--- Sub-test 2: Mobile Profile Sheet Logout ---")
    const mContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
    await mContext.addCookies([{ name: "authjs.session-token", value: token, domain: "127.0.0.1", path: "/" }])
    const mPage = await mContext.newPage()
    await mPage.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" })
    await mPage.waitForTimeout(500)

    // Click mobile account profile avatar
    const mobileAvatarBtn = mPage.locator('button[aria-label="Account profile"]').first()
    if (await mobileAvatarBtn.isVisible()) {
        await mobileAvatarBtn.click()
        await mPage.waitForTimeout(400)

        // Click Logout button inside the sheet
        const mobileLogoutBtn = mPage.locator('button:has-text("Logout"), button:has-text("Sign Out")').first()
        if (await mobileLogoutBtn.isVisible()) {
            await mobileLogoutBtn.click()
            await mPage.waitForTimeout(1000)

            const mCookiesAfter = await mContext.cookies()
            const mSessionCookie = mCookiesAfter.find(c => c.name.includes("session-token") && c.value)
            console.log("Mobile Profile Sheet Logout: Session cookie cleared? " + (!mSessionCookie ? "PASS" : "FAIL"))
        } else {
            console.log("Mobile Profile Sheet Logout: Logout button not visible in sheet")
        }
    } else {
        console.log("Mobile Profile Sheet Logout: Avatar button not visible FAIL")
    }
    await mContext.close()

    // 3. Reload-After-Login Test
    console.log("\n--- Sub-test 3: Reload After Login Session Persistence ---")
    const rContext = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    await rContext.addCookies([{ name: "authjs.session-token", value: token, domain: "127.0.0.1", path: "/" }])
    const rPage = await rContext.newPage()
    await rPage.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" })
    await rPage.waitForTimeout(500)
    console.log("Initial load on /dashboard: URL = " + rPage.url())

    await rPage.reload({ waitUntil: "domcontentloaded" })
    await rPage.waitForTimeout(500)
    console.log("After reload on /dashboard: URL = " + rPage.url())

    const headerText = await rPage.locator("header").allInnerTexts().then(t => t.join(" ")).catch(() => "")
    const hasLogin = headerText.includes("Login")
    console.log("Reload after login shows 'Login'? " + (hasLogin ? "FAIL" : "PASS (Session preserved seamlessly)"))

    await browser.close()
}

main().catch((err) => {
    console.error("Test error:", err)
    process.exit(1)
})
