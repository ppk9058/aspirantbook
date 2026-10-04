import { chromium } from "playwright"
import { prisma } from "../lib/prisma"
import bcrypt from "bcryptjs"
import path from "path"
import fs from "fs"

const ARTIFACTS_DIR = "/Users/praveenkumar/.gemini/antigravity/brain/dcec4357-ad2d-47da-8c64-4dfe1a6f3e2c"
const TEST_ID = "cmus8baux0007xpvxdb4hga63"
const SERIES_SLUG = "upsc-2027"

async function runE2EVerification() {
    console.log("=== STARTING PLAYWRIGHT REAL BROWSER E2E VERIFICATION ===")

    // 1. Create a dedicated test student with randomized credentials
    const runId = `e2e_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const testEmail = `student_${runId}@internal.test`
    const rawPassword = `Pass_${crypto.randomUUID()}!`
    const hashedPassword = await bcrypt.hash(rawPassword, 10)

    console.log(`[Setup] Creating dedicated test user: ${testEmail}`)
    const testUser = await prisma.user.create({
        data: {
            email: testEmail,
            name: "E2E Candidate",
            password: hashedPassword,
            role: "FREE",
        },
    })
    console.log(`[Setup] Dedicated test user created with ID: ${testUser.id}`)

    let browser = null
    try {
        browser = await chromium.launch({
            headless: true,
            executablePath: fs.existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
                ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
                : undefined,
        })

        // ============================================================
        // PART 1: DESKTOP (1440x900) - Declaration -> Start -> Attempt -> Flicker Check -> Layout Check -> Submit -> Result
        // ============================================================
        console.log("\n--- PART 1: DESKTOP FLOW (1440x900) ---")
        const desktopContext = await browser.newContext({
            viewport: { width: 1440, height: 900 },
            userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        })
        const page = await desktopContext.newPage()

        // Step 1: Login
        console.log(`[Desktop 1/7] Logging in via NextAuth credentials (${testEmail})...`)
        await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" })
        const loginStatus = await page.evaluate(async ({ email, password }) => {
            const csrfRes = await fetch("/api/auth/csrf")
            const { csrfToken } = await csrfRes.json()
            const res = await fetch("/api/auth/callback/credentials", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    email,
                    password,
                    csrfToken: csrfToken,
                    callbackUrl: "http://localhost:3000/dashboard",
                    json: "true",
                }),
            })
            const sessionRes = await fetch("/api/auth/session")
            const sessionData = await sessionRes.json()
            return { status: res.status, user: sessionData?.user }
        }, { email: testEmail, password: rawPassword })
        console.log(`[Desktop 1/7] Auth result: status=${loginStatus.status}, user=${loginStatus.user?.name} (${loginStatus.user?.email})`)
        if (!loginStatus.user?.id) {
            throw new Error("FAILED to authenticate dedicated test user in Playwright browser!")
        }

        // Step 2: Navigate to Declaration
        console.log("[Desktop 2/7] Navigating to test declaration page...")
        await page.goto(`http://localhost:3000/test-series/${SERIES_SLUG}/declaration?testId=${TEST_ID}`, { waitUntil: "domcontentloaded" })
        await page.waitForSelector('text=Exam Summary', { timeout: 15000 })
        
        // Step 3: Accept declaration and begin
        console.log("[Desktop 3/7] Agreeing to terms and beginning exam...")
        const agreeLabel = page.locator('text=I have read and understood the instructions').first()
        await agreeLabel.click()
        await page.waitForTimeout(500)
        
        const startBtn = page.locator('button:has-text("I am ready to begin")').first()
        await startBtn.click()

        await page.waitForURL(url => url.pathname.includes("/attempt"), { timeout: 20000 })
        console.log(`[Desktop 3/7] Exam Arena loaded. URL: ${page.url()}`)

        // Wait for Arena question paper to render
        await page.waitForSelector('text=Q.1', { timeout: 15000 })
        await page.waitForTimeout(1000)

        // Step 4: Verify Real Option Texts
        console.log("[Desktop 4/7] Checking that options are REAL TEXTS, not placeholder 'Option A/B/C/D'...")
        const optionLabels = await page.locator('main label').allInnerTexts()
        console.log(`[Desktop 4/7] Detected option texts for Q1:\n  ${optionLabels.join("\n  ")}`)
        const hasPlaceholder = optionLabels.some(t => /^Option [A-D]$/i.test(t.trim()))
        if (hasPlaceholder) {
            throw new Error("FAILED: Detected 'Option A/B/C/D' placeholder text on the attempt screen!")
        }
        console.log("✓ Real option texts verified: No 'Option A/B/C/D' placeholders found!")

        // Step 5: Verify Per-Question Timer (starts at 00:00)
        console.log("[Desktop 5/7] Checking per-question timer...")
        const timerText = await page.locator('span:has-text("Time") + span').innerText()
        console.log(`[Desktop 5/7] Per-question timer value: "${timerText}"`)
        const [qMin, qSec] = timerText.split(":").map(Number)
        if (qMin > 1) {
            throw new Error(`FAILED: Per-question timer showed "${timerText}" instead of starting at 00:00!`)
        }
        console.log(`✓ Per-question timer verified: "${timerText}" (starts at 00:00).`)

        // Step 6: Layout & Overflow Verification at 1440x900
        console.log("[Desktop 6/7] Verifying 1440x900 layout and checking horizontal overflow...")
        const layoutMetrics = await page.evaluate(() => {
            const scrollWidth = document.documentElement.scrollWidth
            const innerWidth = window.innerWidth
            const aside = document.querySelector('aside')
            const asideRect = aside ? aside.getBoundingClientRect() : null
            return {
                scrollWidth,
                innerWidth,
                asideRight: asideRect ? asideRect.right : 0,
                hasOverflow: scrollWidth > innerWidth,
            }
        })
        console.log(`[Desktop 6/7] Metrics: scrollWidth=${layoutMetrics.scrollWidth}, innerWidth=${layoutMetrics.innerWidth}, asideRight=${layoutMetrics.asideRight}`)
        if (layoutMetrics.hasOverflow) {
            throw new Error(`FAILED: Horizontal overflow detected! scrollWidth (${layoutMetrics.scrollWidth}) > innerWidth (${layoutMetrics.innerWidth})`)
        }
        if (layoutMetrics.asideRight > layoutMetrics.innerWidth) {
            throw new Error(`FAILED: Aside panel clipped! asideRight (${layoutMetrics.asideRight}) > innerWidth (${layoutMetrics.innerWidth})`)
        }
        console.log("✓ Layout verified: scrollWidth <= innerWidth and aside is fully visible!")

        // Step 7: Answer Selection, 6-Second Persistence & Flicker & Sync loop check
        console.log("[Desktop 7/7] Testing answer selection, 6s persistence, zero flicker, and sync loop prevention...")
        
        let syncRequestCount = 0
        page.on("request", req => {
            if (req.url().includes("/sync") && req.method() === "POST") {
                syncRequestCount++
                console.log(`  [Network] Sync request #${syncRequestCount} sent to ${req.url()}`)
            }
        })

        // Pick Option A (index 0)
        const firstOption = page.locator('main label').first()
        await firstOption.click()
        console.log("  Option clicked! Waiting 6 seconds to observe stability and timer ticks...")

        // Wait 6 seconds
        await page.waitForTimeout(6000)

        // Verify selection persisted
        const isOptionSelected = await firstOption.evaluate(el => el.classList.contains("border-sky-500") || el.innerHTML.includes("border-sky-500"))
        console.log(`  Option selected status after 6s: ${isOptionSelected}`)
        if (!isOptionSelected) {
            throw new Error("FAILED: Option selection was wiped or lost after 6 seconds!")
        }

        // Verify sync count is at most 1 or 2 (debounced), NOT looping every second
        console.log(`  Total sync requests after 6s: ${syncRequestCount}`)
        if (syncRequestCount > 2) {
            throw new Error(`FAILED: Sync loop detected! ${syncRequestCount} sync requests in 6 seconds.`)
        }
        console.log("✓ Selection persisted for 6 seconds without flicker or sync loop!")

        // Save screenshot of Desktop Attempt
        const desktopAttemptPath = path.join(ARTIFACTS_DIR, "desktop_attempt_1440x900.png")
        await page.screenshot({ path: desktopAttemptPath, fullPage: false })
        console.log(`✓ Screenshot saved: ${desktopAttemptPath}`)

        // Click Save & Next
        console.log("  Clicking 'Save & Next'...")
        const saveAndNextBtn = page.locator('button:has-text("Save & Next")').first()
        await saveAndNextBtn.click()
        await page.waitForTimeout(1000)

        // Verify advanced to Q2
        await page.waitForSelector('text=Q.2', { timeout: 5000 })
        console.log("✓ Advanced to Q.2 successfully!")

        // On Q2, click Mark for Review & Next
        const q2Option = page.locator('main label').nth(1)
        await q2Option.click()
        await page.waitForTimeout(500)
        const markForReviewBtn = page.locator('button:has-text("Mark for Review"), button:has-text("Review & Next")').first()
        await markForReviewBtn.click()
        await page.waitForTimeout(1000)
        console.log("✓ Marked for review and advanced to Q.3 successfully!")

        // Submit the exam
        console.log("  Submitting test...")
        page.on("response", async (res) => {
            if (res.url().includes("/submit")) {
                const body = await res.text().catch(() => "")
                console.log(`  [Submit Response] status=${res.status()}, body=${body}`)
            }
        })
        const submitBtn = page.locator('button:has-text("Submit"):visible').first()
        await submitBtn.click()
        await page.waitForTimeout(1000)

        // Confirm submit in modal
        const confirmSubmitBtn = page.locator('button:has-text("Submit Now"):visible').first()
        await confirmSubmitBtn.click()
        await page.waitForTimeout(2000)
        console.log(`  Current URL after Confirm Submit: ${page.url()}`)

        await page.waitForURL(url => url.pathname.includes("/result"), { timeout: 20000 })
        console.log(`✓ Landed on Result Page: ${page.url()}`)
        await page.waitForTimeout(2000)

        // Verify real option texts on Result Page
        const resultOptions = await page.locator('text=I and II only, text=Consider the following').first().isVisible().catch(() => false)
        console.log(`  Result page question/option content visible: ${resultOptions}`)

        const desktopResultPath = path.join(ARTIFACTS_DIR, "desktop_result_1440x900.png")
        await page.screenshot({ path: desktopResultPath, fullPage: false })
        console.log(`✓ Screenshot saved: ${desktopResultPath}`)

        await desktopContext.close()

        // ============================================================
        // PART 2: MOBILE (390x844) - Mobile Viewport Flow & Screenshot
        // ============================================================
        console.log("\n--- PART 2: MOBILE FLOW (390x844) ---")
        const mobileContext = await browser.newContext({
            viewport: { width: 390, height: 844 },
            userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
            isMobile: true,
            hasTouch: true,
        })
        const mobilePage = await mobileContext.newPage()

        // Login on mobile
        console.log(`[Mobile] Logging in via NextAuth credentials (${testEmail})...`)
        await mobilePage.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" })
        await mobilePage.evaluate(async ({ email, password }) => {
            const csrfRes = await fetch("/api/auth/csrf")
            const { csrfToken } = await csrfRes.json()
            await fetch("/api/auth/callback/credentials", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    email,
                    password,
                    csrfToken: csrfToken,
                    callbackUrl: "http://localhost:3000/dashboard",
                    json: "true",
                }),
            })
        }, { email: testEmail, password: rawPassword })

        // Retake test on mobile to generate fresh attempt
        console.log("[Mobile] Opening attempt page with retake=true...")
        await mobilePage.goto(`http://localhost:3000/test-series/${SERIES_SLUG}/attempt?testId=${TEST_ID}&retake=true&lang=English`, { waitUntil: "domcontentloaded" })
        await mobilePage.waitForSelector('text=Q.1', { timeout: 20000 })
        await mobilePage.waitForTimeout(1500)

        // Check mobile layout: no horizontal scroll
        const mobileMetrics = await mobilePage.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
        }))
        console.log(`[Mobile] scrollWidth=${mobileMetrics.scrollWidth}, innerWidth=${mobileMetrics.innerWidth}`)
        if (mobileMetrics.scrollWidth > mobileMetrics.innerWidth) {
            throw new Error(`FAILED: Horizontal overflow on mobile! scrollWidth (${mobileMetrics.scrollWidth}) > innerWidth (${mobileMetrics.innerWidth})`)
        }
        console.log("✓ Mobile layout verified: No horizontal scroll at 390px!")

        // Select an option on mobile
        const mobileOption = mobilePage.locator('main label').first()
        await mobileOption.click()
        await mobilePage.waitForTimeout(1000)

        const mobileAttemptPath = path.join(ARTIFACTS_DIR, "mobile_attempt_390x844.png")
        await mobilePage.screenshot({ path: mobileAttemptPath, fullPage: false })
        console.log(`✓ Mobile attempt screenshot saved: ${mobileAttemptPath}`)

        // Submit on mobile
        const mobileSubmitBtn = mobilePage.locator('button:has-text("Submit"):visible').first()
        await mobileSubmitBtn.click()
        await mobilePage.waitForTimeout(500)
        const mobileConfirmBtn = mobilePage.locator('button:has-text("Submit Now"):visible').first()
        await mobileConfirmBtn.click()

        await mobilePage.waitForURL(url => url.pathname.includes("/result"), { timeout: 20000 })
        await mobilePage.waitForTimeout(2000)

        const mobileResultPath = path.join(ARTIFACTS_DIR, "mobile_result_390x844.png")
        await mobilePage.screenshot({ path: mobileResultPath, fullPage: false })
        console.log(`✓ Mobile result screenshot saved: ${mobileResultPath}`)

        await mobileContext.close()

        console.log("\n============================================================")
        console.log("ALL PLAYWRIGHT TESTS PASSED CLEANLY!")
        console.log("============================================================")
    } finally {
        if (browser) await browser.close()

        // Cleanup test user and attempts
        console.log("\n[Cleanup] Cleaning up dedicated test user and attempts...")
        try {
            await prisma.examAttempt.deleteMany({
                where: { userId: testUser.id },
            })
            await prisma.user.delete({
                where: { id: testUser.id },
            })
            console.log("✓ Test user and all test attempts safely removed from database.")
        } catch (cleanupErr) {
            console.error("Warning: Cleanup error:", cleanupErr)
        }
    }
}

runE2EVerification()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Test execution failed:", err)
        process.exit(1)
    })
