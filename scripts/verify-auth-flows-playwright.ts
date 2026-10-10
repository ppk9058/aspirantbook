import { chromium, Page } from "playwright"
import path from "path"
import fs from "fs"

const BASE_URL = "http://localhost:3045"
const SCREENSHOT_DIR = "/Users/praveenkumar/.gemini/antigravity/brain/52e1a81a-cedf-4882-848a-9455e9288e94/screenshots_flows"

interface FlowResult {
    flow: string
    viewport: "390x844" | "1440x900"
    iconInDOM: "yes" | "no"
    placeholderCount: number
    msToUpdate: number
    screenshotPath: string
}

const results: FlowResult[] = []

async function countPlaceholders(page: Page): Promise<number> {
    return await page.evaluate(() => {
        const skeletons = document.querySelectorAll('[aria-label="Loading profile skeleton"]')
        const headerPulses = document.querySelectorAll('header .animate-pulse')
        return skeletons.length + headerPulses.length
    })
}

async function isProfileIconInDOM(page: Page, isMobile: boolean): Promise<boolean> {
    if (isMobile) {
        return await page.locator('header button[aria-label="Account profile"]').isVisible().catch(() => false)
    } else {
        return await page.locator('header button[aria-label="User menu"]').isVisible().catch(() => false)
    }
}

async function run() {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
    }

    const browser = await chromium.launch({
        headless: true,
        executablePath: fs.existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
            ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
            : undefined,
    })

    console.log("==============================================================")
    console.log("STARTING PLAYWRIGHT EMPIRICAL AUDIT ON PORT 3045")
    console.log("==============================================================\n")

    // =========================================================================
    // FLOW 1: EMAIL LOGIN
    // =========================================================================
    console.log(">>> [1/5] Testing EMAIL LOGIN Flow...")

    // 1A. Email Desktop (1440x900)
    {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
        const page = await context.newPage()
        await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })

        await page.fill('input#email', "student_test@aspirantbook.com")
        await page.fill('input#password', "password123")

        const t0 = Date.now()
        await page.click('button[data-testid="login-submit"]')
        await page.waitForSelector('header button[aria-label="User menu"]', { timeout: 30000 })
        const elapsed = Date.now() - t0

        const hasIcon = await isProfileIconInDOM(page, false)
        const placeholders = await countPlaceholders(page)
        const shotPath = path.join(SCREENSHOT_DIR, "email_desktop_1440x900.png")
        await page.screenshot({ path: shotPath })

        results.push({
            flow: "email",
            viewport: "1440x900",
            iconInDOM: hasIcon ? "yes" : "no",
            placeholderCount: placeholders,
            msToUpdate: elapsed,
            screenshotPath: shotPath,
        })
        console.log(`    ✓ Email Desktop: icon=${hasIcon ? "yes" : "no"}, placeholders=${placeholders}, time=${elapsed}ms`)
        await context.close()
    }

    // 1B. Email Mobile (390x844)
    {
        const context = await browser.newContext({
            viewport: { width: 390, height: 844 },
            userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
            isMobile: true,
            hasTouch: true,
        })
        const page = await context.newPage()
        await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })

        await page.fill('input#email', "student_test@aspirantbook.com")
        await page.fill('input#password', "password123")

        const t0 = Date.now()
        await page.click('button[data-testid="login-submit"]')
        await page.waitForSelector('header button[aria-label="Account profile"]', { timeout: 30000 })
        const elapsed = Date.now() - t0

        const hasIcon = await isProfileIconInDOM(page, true)
        const placeholders = await countPlaceholders(page)
        const shotPath = path.join(SCREENSHOT_DIR, "email_mobile_390x844.png")
        await page.screenshot({ path: shotPath })

        results.push({
            flow: "email",
            viewport: "390x844",
            iconInDOM: hasIcon ? "yes" : "no",
            placeholderCount: placeholders,
            msToUpdate: elapsed,
            screenshotPath: shotPath,
        })
        console.log(`    ✓ Email Mobile: icon=${hasIcon ? "yes" : "no"}, placeholders=${placeholders}, time=${elapsed}ms`)
        await context.close()
    }

    // =========================================================================
    // FLOW 2: GOOGLE / OAUTH LOGIN
    // =========================================================================
    console.log("\n>>> [2/5] Testing GOOGLE/OAUTH Flow...")

    // 2A. Google Desktop (1440x900)
    {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
        const page = await context.newPage()
        await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })

        page.on("dialog", async (dialog) => {
            await dialog.accept()
        })

        const t0 = Date.now()
        await page.click('button:has-text("Continue with Google")')
        await page.waitForTimeout(600)
        const elapsed = Date.now() - t0

        const hasIcon = await isProfileIconInDOM(page, false)
        const placeholders = await countPlaceholders(page)
        const shotPath = path.join(SCREENSHOT_DIR, "google_desktop_1440x900.png")
        await page.screenshot({ path: shotPath })

        results.push({
            flow: "Google/OAuth",
            viewport: "1440x900",
            iconInDOM: hasIcon ? "yes" : "no",
            placeholderCount: placeholders,
            msToUpdate: elapsed,
            screenshotPath: shotPath,
        })
        console.log(`    ✓ Google Desktop: icon=${hasIcon ? "yes" : "no"}, placeholders=${placeholders}, time=${elapsed}ms`)
        await context.close()
    }

    // 2B. Google Mobile (390x844)
    {
        const context = await browser.newContext({
            viewport: { width: 390, height: 844 },
            userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
            isMobile: true,
            hasTouch: true,
        })
        const page = await context.newPage()
        await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })

        page.on("dialog", async (dialog) => {
            await dialog.accept()
        })

        const t0 = Date.now()
        await page.click('button:has-text("Continue with Google")')
        await page.waitForTimeout(600)
        const elapsed = Date.now() - t0

        const hasIcon = await isProfileIconInDOM(page, true)
        const placeholders = await countPlaceholders(page)
        const shotPath = path.join(SCREENSHOT_DIR, "google_mobile_390x844.png")
        await page.screenshot({ path: shotPath })

        results.push({
            flow: "Google/OAuth",
            viewport: "390x844",
            iconInDOM: hasIcon ? "yes" : "no",
            placeholderCount: placeholders,
            msToUpdate: elapsed,
            screenshotPath: shotPath,
        })
        console.log(`    ✓ Google Mobile: icon=${hasIcon ? "yes" : "no"}, placeholders=${placeholders}, time=${elapsed}ms`)
        await context.close()
    }

    // =========================================================================
    // FLOW 3: MOBILE OTP LOGIN
    // =========================================================================
    console.log("\n>>> [3/5] Testing MOBILE OTP Flow...")

    // 3A. Mobile OTP Desktop (1440x900)
    {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
        const page = await context.newPage()
        await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })

        await page.click('button:has-text("Continue with Mobile OTP (Instant)")')
        await page.waitForSelector('input[placeholder*="mobile number"]', { timeout: 10000 })

        const randomSuffix = Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 8)
        const testMobile = `98${randomSuffix}`

        await page.fill('input[placeholder*="mobile number"]', testMobile)
        await page.click('button:has-text("Get OTP")')

        await page.waitForSelector('text=Enter 6-digit OTP', { timeout: 10000 })
        const otpInputs = page.locator('div.flex.items-center.justify-center.gap-2 input[type="tel"]')

        const t0 = Date.now()
        for (let i = 0; i < 6; i++) {
            await otpInputs.nth(i).fill(`${i + 1}`)
        }

        await page.waitForSelector('header button[aria-label="User menu"]', { timeout: 30000 })
        const elapsed = Date.now() - t0

        const hasIcon = await isProfileIconInDOM(page, false)
        const placeholders = await countPlaceholders(page)
        const shotPath = path.join(SCREENSHOT_DIR, "mobile_otp_desktop_1440x900.png")
        await page.screenshot({ path: shotPath })

        results.push({
            flow: "mobile OTP",
            viewport: "1440x900",
            iconInDOM: hasIcon ? "yes" : "no",
            placeholderCount: placeholders,
            msToUpdate: elapsed,
            screenshotPath: shotPath,
        })
        console.log(`    ✓ Mobile OTP Desktop: icon=${hasIcon ? "yes" : "no"}, placeholders=${placeholders}, time=${elapsed}ms`)
        await context.close()
    }

    // 3B. Mobile OTP Mobile (390x844)
    {
        const context = await browser.newContext({
            viewport: { width: 390, height: 844 },
            userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
            isMobile: true,
            hasTouch: true,
        })
        const page = await context.newPage()
        await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })

        await page.click('button:has-text("Continue with Mobile OTP (Instant)")')
        await page.waitForSelector('input[placeholder*="mobile number"]', { timeout: 10000 })

        const randomSuffix = Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 8)
        const testMobile = `98${randomSuffix}`

        await page.fill('input[placeholder*="mobile number"]', testMobile)
        await page.click('button:has-text("Get OTP")')

        await page.waitForSelector('text=Enter 6-digit OTP', { timeout: 10000 })
        const otpInputs = page.locator('div.flex.items-center.justify-center.gap-2 input[type="tel"]')

        const t0 = Date.now()
        for (let i = 0; i < 6; i++) {
            await otpInputs.nth(i).fill(`${i + 1}`)
        }

        await page.waitForSelector('header button[aria-label="Account profile"]', { timeout: 30000 })
        const elapsed = Date.now() - t0

        const hasIcon = await isProfileIconInDOM(page, true)
        const placeholders = await countPlaceholders(page)
        const shotPath = path.join(SCREENSHOT_DIR, "mobile_otp_mobile_390x844.png")
        await page.screenshot({ path: shotPath })

        results.push({
            flow: "mobile OTP",
            viewport: "390x844",
            iconInDOM: hasIcon ? "yes" : "no",
            placeholderCount: placeholders,
            msToUpdate: elapsed,
            screenshotPath: shotPath,
        })
        console.log(`    ✓ Mobile OTP Mobile: icon=${hasIcon ? "yes" : "no"}, placeholders=${placeholders}, time=${elapsed}ms`)
        await context.close()
    }

    // =========================================================================
    // FLOW 4: LOGOUT FLOW
    // =========================================================================
    console.log("\n>>> [4/5] Testing LOGOUT Flow...")

    // 4A. Logout Desktop (1440x900)
    {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
        const page = await context.newPage()
        await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })
        await page.fill('input#email', "student_test@aspirantbook.com")
        await page.fill('input#password', "password123")
        await page.click('button[data-testid="login-submit"]')
        await page.waitForSelector('header button[aria-label="User menu"]', { timeout: 30000 })

        const t0 = Date.now()
        await page.click('header button[aria-label="User menu"]')
        await page.waitForSelector('button:has-text("Sign Out")', { timeout: 5000 })
        await page.click('button:has-text("Sign Out")')

        // Wait for redirect and login CTA visible in header
        await page.waitForSelector('header :is(button, a)[aria-label="Login or Register"], header :is(button, a):has-text("Login")', { timeout: 15000 })
        const elapsed = Date.now() - t0

        const hasIcon = await isProfileIconInDOM(page, false)
        const placeholders = await countPlaceholders(page)
        const shotPath = path.join(SCREENSHOT_DIR, "logout_desktop_1440x900.png")
        await page.screenshot({ path: shotPath })

        results.push({
            flow: "logout",
            viewport: "1440x900",
            iconInDOM: hasIcon ? "yes" : "no",
            placeholderCount: placeholders,
            msToUpdate: elapsed,
            screenshotPath: shotPath,
        })
        console.log(`    ✓ Logout Desktop: icon=${hasIcon ? "yes" : "no"}, placeholders=${placeholders}, time=${elapsed}ms`)
        await context.close()
    }

    // 4B. Logout Mobile (390x844)
    {
        const context = await browser.newContext({
            viewport: { width: 390, height: 844 },
            userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
            isMobile: true,
            hasTouch: true,
        })
        const page = await context.newPage()
        await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })
        await page.fill('input#email', "student_test@aspirantbook.com")
        await page.fill('input#password', "password123")
        await page.click('button[data-testid="login-submit"]')
        await page.waitForSelector('header button[aria-label="Account profile"]', { timeout: 30000 })

        const t0 = Date.now()
        await page.click('header button[aria-label="Account profile"]')
        await page.waitForSelector('button:has-text("Logout")', { timeout: 5000 })
        await page.click('button:has-text("Logout")')

        await page.waitForSelector('header :is(button, a)[aria-label="Login or Register"], header :is(button, a):has-text("Login")', { timeout: 15000 })
        const elapsed = Date.now() - t0

        const hasIcon = await isProfileIconInDOM(page, true)
        const placeholders = await countPlaceholders(page)
        const shotPath = path.join(SCREENSHOT_DIR, "logout_mobile_390x844.png")
        await page.screenshot({ path: shotPath })

        results.push({
            flow: "logout",
            viewport: "390x844",
            iconInDOM: hasIcon ? "yes" : "no",
            placeholderCount: placeholders,
            msToUpdate: elapsed,
            screenshotPath: shotPath,
        })
        console.log(`    ✓ Logout Mobile: icon=${hasIcon ? "yes" : "no"}, placeholders=${placeholders}, time=${elapsed}ms`)
        await context.close()
    }

    // =========================================================================
    // FLOW 5: GOAL CHANGE FLOW
    // =========================================================================
    console.log("\n>>> [5/5] Testing GOAL CHANGE Flow...")

    // 5A. Goal Change Desktop (1440x900)
    {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
        const page = await context.newPage()
        await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })
        await page.fill('input#email', "student_test@aspirantbook.com")
        await page.fill('input#password', "password123")
        await page.click('button[data-testid="login-submit"]')
        await page.waitForSelector('header button[aria-label="User menu"]', { timeout: 30000 })

        await page.click('button[aria-label="Switch or Add Goals"]')
        await page.waitForSelector('div[role="dialog"]', { timeout: 5000 })

        const upscGoal = page.locator('div[role="dialog"] button:has-text("UPSC")').first()
        const t0 = Date.now()
        await upscGoal.click()
        await page.click('div[role="dialog"] button:has-text("Done")')
        await page.waitForSelector('div[role="dialog"]', { state: "detached", timeout: 5000 })
        const elapsed = Date.now() - t0

        const hasIcon = await isProfileIconInDOM(page, false)
        const placeholders = await countPlaceholders(page)
        const shotPath = path.join(SCREENSHOT_DIR, "goal_change_desktop_1440x900.png")
        await page.screenshot({ path: shotPath })

        results.push({
            flow: "goal change",
            viewport: "1440x900",
            iconInDOM: hasIcon ? "yes" : "no",
            placeholderCount: placeholders,
            msToUpdate: elapsed,
            screenshotPath: shotPath,
        })
        console.log(`    ✓ Goal Change Desktop: icon=${hasIcon ? "yes" : "no"}, placeholders=${placeholders}, time=${elapsed}ms`)
        await context.close()
    }

    // 5B. Goal Change Mobile (390x844)
    {
        const context = await browser.newContext({
            viewport: { width: 390, height: 844 },
            userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
            isMobile: true,
            hasTouch: true,
        })
        const page = await context.newPage()
        await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })
        await page.fill('input#email', "student_test@aspirantbook.com")
        await page.fill('input#password', "password123")
        await page.click('button[data-testid="login-submit"]')
        await page.waitForSelector('header button[aria-label="Account profile"]', { timeout: 30000 })

        // Open mobile drawer to access GoalSelectorButton
        await page.click('header button[aria-label="Open navigation menu"]')
        await page.waitForSelector('button[aria-label="Switch or Add Goals"]:visible', { timeout: 10000 })
        await page.click('button[aria-label="Switch or Add Goals"]:visible')
        await page.waitForSelector('div[role="dialog"]', { timeout: 10000 })

        const goalCard = page.locator('div.grid button:has-text("UPSC"), div.grid button:has-text("BPSC")').first()
        const t0 = Date.now()
        await goalCard.click()
        await page.click('button:has-text("Done")')
        await page.waitForTimeout(600)
        const elapsed = Date.now() - t0

        // Close drawer if still open
        const drawerClose = page.locator('button[data-testid="drawer-close"]')
        if (await drawerClose.isVisible()) {
            await drawerClose.click()
        }

        const hasIcon = await isProfileIconInDOM(page, true)
        const placeholders = await countPlaceholders(page)
        const shotPath = path.join(SCREENSHOT_DIR, "goal_change_mobile_390x844.png")
        await page.screenshot({ path: shotPath })

        results.push({
            flow: "goal change",
            viewport: "390x844",
            iconInDOM: hasIcon ? "yes" : "no",
            placeholderCount: placeholders,
            msToUpdate: elapsed,
            screenshotPath: shotPath,
        })
        console.log(`    ✓ Goal Change Mobile: icon=${hasIcon ? "yes" : "no"}, placeholders=${placeholders}, time=${elapsed}ms`)
        await context.close()
    }

    await browser.close()

    console.log("\n==============================================================")
    console.log("FINAL RAW PER-FLOW VERIFICATION RESULTS TABLE")
    console.log("==============================================================")
    console.table(results)

    console.log("\nRAW_JSON_BEGIN")
    console.log(JSON.stringify(results, null, 2))
    console.log("RAW_JSON_END")
}

run().catch((err) => {
    console.error("FATAL ERROR IN TEST SCRIPT:", err)
    process.exit(1)
})
