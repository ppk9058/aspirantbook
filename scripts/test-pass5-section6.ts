import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
dotenv.config({ path: ".env" })

import { PrismaClient } from "@prisma/client"
import { chromium } from "playwright"
import path from "path"
import fs from "fs"

const prisma = new PrismaClient()
const BASE_URL = "http://localhost:3000"
const ARTIFACT_DIR = "/Users/praveenkumar/.gemini/antigravity/brain/ab750c16-600c-40b0-81a5-1de87b0bbe4f/artifacts_pass5_section6"

async function main() {
    console.log("=================================================================")
    console.log("     PASS 5: SECTION 6 UPSC 2027 FREE SAMPLE VERIFICATION        ")
    console.log("=================================================================")

    if (!fs.existsSync(ARTIFACT_DIR)) {
        fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
    }

    const series = await prisma.examSeries.findUnique({
        where: { slug: "upsc-2027" },
        include: { tests: { orderBy: { order: "asc" } } }
    })

    if (!series) {
        throw new Error("Target series 'upsc-2027' not found in database!")
    }

    console.log(`[Series] ID: ${series.id}, Slug: ${series.slug}, Title: ${series.title}, isPro: ${series.isPro}, isFree: ${series.isFree}`)
    console.log(`[Existing Tests]: ${series.tests.map(t => `${t.id} (${t.title}, ${t.accessMode})`).join("; ")}`)

    const freeTest = series.tests.find(t => t.accessMode === "FREE")
    if (!freeTest) {
        throw new Error("No free sample test found in upsc-2027 series!")
    }

    const createdUsers: string[] = []
    const createdTests: string[] = []
    const createdAttempts: string[] = []

    const browser = await chromium.launch({ headless: true })

    try {
        // Create temporary second test: upsc-2027-prelims-csat-full-1 (PAID / PRO)
        const proTestId = "upsc-2027-prelims-csat-full-1"
        const existingProTest = await prisma.examTest.findUnique({ where: { id: proTestId } })
        if (!existingProTest) {
            const createdProTest = await prisma.examTest.create({
                data: {
                    id: proTestId,
                    title: "UPSC 2027 Prelims CSAT Full Mock 1",
                    seriesId: series.id,
                    accessMode: "PRO",
                    order: 1,
                    isPublished: true,
                    totalQuestions: 10,
                    durationMinutes: 60,
                    totalMarks: 100,
                    createdById: freeTest.createdById || "system"
                }
            })
            createdTests.push(createdProTest.id)
            console.log(`[Setup] Created temporary test 2: ${createdProTest.id} (${createdProTest.title}, ${createdProTest.accessMode})`)
        }

        // Create isolated NON-pro student
        const studentPhone = Math.floor(1000000000 + Math.random() * 9000000000).toString()
        const student = await prisma.user.create({
            data: {
                name: "Non-Pro UPSC Aspirant",
                phoneNumber: studentPhone,
                email: `mobile_${studentPhone}@aspirantbook.local`,
                role: "FREE"
            }
        })
        createdUsers.push(student.id)
        console.log(`[Setup] Created isolated non-pro student: ${student.id} (role: ${student.role})`)

        const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
        const page = await context.newPage()

        process.env.ALLOW_DEV_MOBILE_LOGIN = "true"
        await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" })
        await page.click('button:has-text("Continue with Mobile OTP")')
        await page.fill('input[placeholder="Enter 10-digit mobile number"]', studentPhone)
        await page.click('button:has-text("Get OTP")')
        await page.waitForSelector('text=Enter 6-digit OTP', { timeout: 8000 })

        const otpBoxes = page.locator('input[inputmode="numeric"]')
        for (let i = 0; i < 6; i++) {
            await otpBoxes.nth(i).click()
            await otpBoxes.nth(i).press(`${i + 1}`)
        }
        await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 })
        console.log("[Auth] Student logged in successfully")

        // ── 1. TOUCHPOINT 1: SERIES DETAIL PAGE ──────────────────────────────
        console.log("\n--- Touchpoint 1: Series Detail (/test-series/upsc-2027) ---")
        await page.goto(`${BASE_URL}/test-series/upsc-2027`, { waitUntil: "networkidle" })

        const freeSampleBadges = page.locator('text=Free sample')
        const badgeCount = await freeSampleBadges.count()
        console.log(`✓ "Free sample" badges found on Series Detail page: ${badgeCount}`)
        if (badgeCount === 0) {
            throw new Error('Expected at least one "Free sample" badge on Series Detail page!')
        }

        const freeSampleButtons = page.locator('a:has-text("Start Test"), button:has-text("Start Test")')
        const buttonCount = await freeSampleButtons.count()
        console.log(`✓ "Start Test" buttons found on Series Detail page: ${buttonCount}`)

        const seriesScreenshot = path.join(ARTIFACT_DIR, "tp1_series_detail_free_sample.png")
        await page.screenshot({ path: seriesScreenshot })
        console.log(`✓ Saved Series Detail screenshot: ${seriesScreenshot}`)

        // ── 2. TOUCHPOINT 2: STUDENT DASHBOARD ───────────────────────────────
        console.log("\n--- Touchpoint 2: Student Dashboard (/dashboard) ---")
        await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" })
        const dashBadges = page.locator('text=Free sample')
        const dashCount = await dashBadges.count()
        console.log(`"Free sample" badges on Dashboard: ${dashCount}`)
        const dashScreenshot = path.join(ARTIFACT_DIR, "tp2_dashboard_free_sample.png")
        await page.screenshot({ path: dashScreenshot })
        console.log(`✓ Saved Dashboard screenshot: ${dashScreenshot}`)

        // ── 3. TOUCHPOINT 3: MY TESTS HUB ────────────────────────────────────
        console.log("\n--- Touchpoint 3: My Tests Hub (/my-tests) ---")
        await page.goto(`${BASE_URL}/my-tests`, { waitUntil: "networkidle" })
        const myTestsScreenshot = path.join(ARTIFACT_DIR, "tp3_my_tests_hub.png")
        await page.screenshot({ path: myTestsScreenshot })
        console.log(`✓ Saved My Tests screenshot: ${myTestsScreenshot}`)

        // ── 4. FLOW (a): START AND SUBMIT FREE SAMPLE TEST ───────────────────
        console.log("\n--- Flow (a): Non-pro student starts and submits Free Sample test ---")
        await page.goto(`${BASE_URL}/test-series/upsc-2027`, { waitUntil: "networkidle" })
        const startFreeBtn = page.locator('a:has-text("Start Test")').first()
        await startFreeBtn.waitFor({ state: "visible", timeout: 8000 })
        console.log(`Clicking Start Test button...`)
        await startFreeBtn.click()

        // Wait for instructions page
        await page.waitForURL((url) => url.pathname.includes("/instructions"), { timeout: 15000 })
        console.log(`On instructions page: ${page.url()}`)

        // Click "Next" on instructions page to proceed to declaration
        const nextBtn = page.locator('a:has-text("Next")').first()
        await nextBtn.waitFor({ state: "visible", timeout: 8000 })
        await nextBtn.click()

        // Wait for declaration page
        await page.waitForURL((url) => url.pathname.includes("/declaration"), { timeout: 15000 })
        console.log(`On declaration page: ${page.url()}`)

        // Click declaration agreement label
        const agreeLabel = page.locator('text=I have read and understood the instructions')
        await agreeLabel.waitFor({ state: "visible", timeout: 8000 })
        await agreeLabel.click()
        console.log(`Clicked declaration agreement label`)

        // Click "I am ready to begin"
        const beginBtn = page.locator('button:has-text("I am ready to begin")')
        await beginBtn.waitFor({ state: "visible", timeout: 8000 })
        await beginBtn.click()

        // Wait for attempt page
        await page.waitForURL((url) => url.pathname.includes("/attempt"), { timeout: 15000 })
        console.log(`Navigated to attempt page: ${page.url()}`)

        // Record attempt ID for cleanup
        const attemptUrlMatch = page.url().match(/attemptId=([^&]+)/)
        if (attemptUrlMatch) {
            createdAttempts.push(attemptUrlMatch[1])
            console.log(`Recorded in-progress attempt ID: ${attemptUrlMatch[1]}`)
        }

        // Wait for attempt main content
        await page.waitForSelector('main label, button:has-text("Save & Next")', { timeout: 15000 })
        console.log("Exam attempt page loaded successfully")

        // Select option A
        const firstOption = page.locator('main label').first()
        if (await firstOption.isVisible()) {
            await firstOption.click()
            console.log("Selected Option A")
        }

        // Click Submit
        const submitBtn = page.locator('button:has-text("Submit"):visible').first()
        await submitBtn.waitFor({ state: "visible", timeout: 8000 })
        await submitBtn.click()
        console.log("Clicked Submit button")
        await page.waitForTimeout(1000)

        // Confirm submission modal
        const confirmBtn = page.locator('button:has-text("Submit Now"):visible, button:has-text("Yes, Submit"):visible').first()
        await confirmBtn.waitFor({ state: "visible", timeout: 8000 })
        await confirmBtn.click()
        console.log("Clicked Submit Now in confirmation modal")

        // Wait for result page
        await page.waitForURL((url) => url.pathname.includes("/result"), { timeout: 20000 })
        console.log(`✓ Result page loaded successfully: ${page.url()}`)

        const resultScreenshot = path.join(ARTIFACT_DIR, "free_sample_submitted_result.png")
        await page.screenshot({ path: resultScreenshot, fullPage: true })
        console.log(`✓ Saved Result page screenshot: ${resultScreenshot}`)

        // ── 5. FLOW (b): CLICKS TEST 2 (PRO) -> BLOCKED BY PAYWALL ───────────
        console.log("\n--- Flow (b): Non-pro student clicks Test 2 (PRO) ---")
        await page.goto(`${BASE_URL}/test-series/upsc-2027`, { waitUntil: "networkidle" })

        // Find Unlock Test button on the Pro test
        const unlockBtn = page.locator('button:has-text("Unlock Test"), button:has-text("Unlock")').first()
        await unlockBtn.waitFor({ state: "visible", timeout: 8000 })
        console.log(`Clicking Unlock Test on PRO test...`)
        await unlockBtn.click()

        // Verify Paywall modal / Upgrade modal appears
        const paywallModal = page.locator('text=PASS PRO').first()
        await paywallModal.waitFor({ state: "visible", timeout: 8000 })
        console.log(`✓ Paywall / Pro upgrade modal detected: "${await paywallModal.textContent()}"`)

        const paywallScreenshot = path.join(ARTIFACT_DIR, "pro_test_paywall_blocked.png")
        await page.screenshot({ path: paywallScreenshot })
        console.log(`✓ Saved Pro test paywall screenshot: ${paywallScreenshot}`)

        console.log("\n=================================================================")
        console.log("            SECTION 6 VERIFICATION: ALL TESTS PASSED!           ")
        console.log("=================================================================")

    } finally {
        await browser.close()
        console.log("\n--- Cleaning up temporary test artifacts ---")
        if (createdAttempts.length > 0) {
            await prisma.examAttemptAnswer.deleteMany({ where: { attemptId: { in: createdAttempts } } })
            await prisma.examAttempt.deleteMany({ where: { id: { in: createdAttempts } } })
            console.log(`Deleted ${createdAttempts.length} temporary attempt(s)`)
        }
        if (createdTests.length > 0) {
            await prisma.examAttempt.deleteMany({ where: { testId: { in: createdTests } } })
            await prisma.examTest.deleteMany({ where: { id: { in: createdTests } } })
            console.log(`Deleted ${createdTests.length} temporary test(s)`)
        }
        if (createdUsers.length > 0) {
            await prisma.examAttempt.deleteMany({ where: { userId: { in: createdUsers } } })
            await prisma.user.deleteMany({ where: { id: { in: createdUsers } } })
            console.log(`Deleted ${createdUsers.length} temporary user(s)`)
        }
        await prisma.$disconnect()
    }
}

main().catch(err => {
    console.error("FATAL ERROR in Section 6 test:", err)
    process.exit(1)
})
