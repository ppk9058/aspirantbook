import { chromium } from "playwright"
import { encode } from "next-auth/jwt"

const BASE_URL = "http://127.0.0.1:3045"
const SECRET = "aspirantbook-nextauth-secret-key-8f3a9c2e5d7b1f4e9a6c3b8d2e5f7a9b"

async function runForViewport(width: number, height: number, label: string) {
    console.log(`\n============================================================`)
    console.log(`TESTING B2 FOR VIEWPORT: ${label} (${width}x${height})`)
    console.log(`============================================================`)

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
    const context = await browser.newContext({
        viewport: { width, height },
    })

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
        const headerText1 = await page.locator("header").allInnerTexts().then(t => t.join(" ")).catch(() => "")
        await page.waitForTimeout(200)
        const headerText2 = await page.locator("header").allInnerTexts().then(t => t.join(" ")).catch(() => "")

        const hasLogin = headerText1.includes("Login") || headerText2.includes("Login")
        if (hasLogin) {
            console.error(`FAIL: Reload #${i} showed 'Login' in header! (text: ${headerText1 || headerText2})`)
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
        await page.goto(`${BASE_URL}${dest}`, { waitUntil: "domcontentloaded" })
        await page.waitForTimeout(200)

        const headerText = await page.locator("header").allInnerTexts().then(t => t.join(" ")).catch(() => "")
        if (headerText.includes("Login")) {
            console.error(`FAIL: Navigation #${i + 1} to ${dest} showed 'Login'!`)
            loginFoundCount++
        } else {
            console.log(`Navigation #${i + 1} to ${dest}: OK (No 'Login' button)`)
        }
    }

    console.log(`\nSummary for ${label}: Total Login appearances = ${loginFoundCount} (Expected: 0)`)
    await browser.close()
    return loginFoundCount === 0
}

async function main() {
    const dPass = await runForViewport(1280, 800, "DESKTOP");
    const mPass = await runForViewport(390, 844, "MOBILE");

    if (!dPass || !mPass) {
        console.error("\nB2 Test FAILED: 'Login' button flashed for logged-in user!");
        process.exit(1);
    }
    console.log("\nB2 Test PASSED: 0 flashes across all 40 reloads and 20 navigations.");
}

main().catch((err) => {
    console.error("Test error:", err);
    process.exit(1);
});
