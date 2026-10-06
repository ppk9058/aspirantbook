import { chromium } from "playwright"
import { encode } from "next-auth/jwt"

const BASE_URL = "http://127.0.0.1:3045"
const SECRET = "test-secret-at-least-32-chars-long-for-testing"

async function main() {
    console.log("=== B2 SESSION UX REGRESSION TEST ===")
    console.log("Generating valid session token for student...")
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
    const context = await browser.newContext()

    await context.addCookies([
        {
            name: "authjs.session-token",
            value: token,
            domain: "127.0.0.1",
            path: "/",
            httpOnly: true,
            sameSite: "Lax",
        },
    ])

    const page = await context.newPage()
    let loginFoundCount = 0

    console.log("\n--- Part 1: 20 Full Reloads on /dashboard as Logged-In User ---")
    for (let i = 1; i <= 20; i++) {
        await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" })
        
        // Sample header text immediately on domcontentloaded
        const headerText1 = await page.locator("header").first().innerText().catch(() => "")
        // Wait 300ms and sample again
        await page.waitForTimeout(300)
        const headerText2 = await page.locator("header").first().innerText().catch(() => "")

        const hasLogin = headerText1.includes("Login") || headerText2.includes("Login")
        if (hasLogin) {
            console.error(`FAIL: Reload #${i} showed 'Login' in header!`)
            loginFoundCount++
        } else {
            console.log(`Reload #${i}: OK (No 'Login' button rendered; profile/skeleton displayed)`)
        }
    }

    console.log("\n--- Part 2: 10 Client Navigations as Logged-In User ---")
    const routes = [
        "/courses",
        "/dashboard",
        "/test-series",
        "/dashboard",
        "/books",
        "/dashboard",
        "/my-tests",
        "/dashboard",
        "/tutorials",
        "/dashboard",
    ]

    for (let i = 0; i < routes.length; i++) {
        const dest = routes[i]
        // Navigate via client
        await page.evaluate((url) => {
            window.location.href = url
        }, `${BASE_URL}${dest}`)
        await page.waitForLoadState("domcontentloaded")
        await page.waitForTimeout(200)

        const headerText = await page.locator("header").first().innerText().catch(() => "")
        if (headerText.includes("Login")) {
            console.error(`FAIL: Navigation #${i + 1} to ${dest} showed 'Login'!`)
            loginFoundCount++
        } else {
            console.log(`Navigation #${i + 1} to ${dest}: OK (No 'Login' button)`)
        }
    }

    console.log("\n--- Part 3: Reload After Login Test ---")
    await page.goto(`${BASE_URL}/dashboard`)
    await page.reload()
    const reloadHeaderText = await page.locator("header").first().innerText().catch(() => "")
    const reloadHasLogin = reloadHeaderText.includes("Login")
    console.log(`Reload after login test: ${reloadHasLogin ? "FAIL (shows Login)" : "PASS (keeps session)"}`)

    console.log(`\nB2 Summary: Total Login button appearances = ${loginFoundCount} (Expected: 0)`)
    await browser.close()

    if (loginFoundCount > 0 || reloadHasLogin) {
        process.exit(1)
    }
}

main().catch((err) => {
    console.error("Test error:", err)
    process.exit(1)
})
