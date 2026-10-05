import { chromium, Page } from "playwright"
import { PrismaClient } from "@prisma/client"
import fs from "fs"
import path from "path"

const prisma = new PrismaClient()
const BASE_URL = "http://localhost:3000"
const outDir = path.join(process.cwd(), "artifacts_pass6", "section7_touchpoints")
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
}

async function findTestActionButton(page: Page, testText: string) {
    // Check if test title exists on page
    const titleLocator = page.locator(`text=${testText}`).first()
    const count = await titleLocator.count()
    if (count === 0) {
        return { found: false, text: "NOT PRESENT ON PAGE", href: "NONE" }
    }

    // Find closest container that has an action button / link
    const actionElement = await page.evaluate((titleSubstr) => {
        // Find text nodes or elements matching title
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        let matchedNode: Node | null = null
        while (walker.nextNode()) {
            if (walker.currentNode.textContent?.includes(titleSubstr)) {
                matchedNode = walker.currentNode
                break
            }
        }
        if (!matchedNode || !matchedNode.parentElement) return null

        // Walk up parents up to 6 levels to find container
        let parent: HTMLElement | null = matchedNode.parentElement
        for (let i = 0; i < 6 && parent; i++) {
            // Find links or buttons inside this container
            const actions = Array.from(parent.querySelectorAll('a, button'))
            const actionBtn = actions.find((el) => {
                const txt = el.textContent?.trim().toLowerCase() || ""
                const href = el.getAttribute("href") || ""
                return (
                    txt.includes("start") ||
                    txt.includes("continue") ||
                    txt.includes("report") ||
                    txt.includes("result") ||
                    txt.includes("view") ||
                    txt.includes("resume") ||
                    href.includes("/instructions") ||
                    href.includes("/attempt") ||
                    href.includes("/result")
                )
            })
            if (actionBtn) {
                return {
                    text: actionBtn.textContent?.trim().replace(/\s+/g, " ") || "",
                    href: actionBtn.getAttribute("href") || "NONE",
                    tag: actionBtn.tagName.toLowerCase(),
                }
            }
            parent = parent.parentElement
        }
        return null
    }, "Daily Current Affairs Speed Quiz")

    if (actionElement) {
        return { found: true, text: actionElement.text, href: actionElement.href }
    }
    return { found: true, text: "TITLE PRESENT BUT NO ACTION BUTTON FOUND", href: "NONE" }
}

async function main() {
    console.log("=== PASS 6 SECTION 7: QUIZZES TOUCHPOINT (FULL STUDENT WALK) ===")

    const timestamp = Date.now()
    const testStudent = await prisma.user.create({
        data: {
            id: `u-p6-quiz-${timestamp}`,
            phoneNumber: `97777${String(timestamp).slice(-5)}`,
            email: `quiz_student_${timestamp}@example.test`,
            name: "Quiz Student Pass6",
            role: "FREE",
        },
    })

    const testId = "ca-daily-quiz-sep27"
    const seriesId = "current-affairs-quizzes"

    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext()
    const page = await context.newPage()

    let attemptId: string | null = null

    const cleanup = async () => {
        await browser.close()
        await prisma.examAttemptAnswer.deleteMany({
            where: { attempt: { userId: testStudent.id } },
        })
        await prisma.examAttempt.deleteMany({
            where: { userId: testStudent.id },
        })
        await prisma.user.deleteMany({
            where: { id: testStudent.id },
        })
    }

    try {
        // --- LOGIN ---
        console.log("[Auth] Logging in as test student...")
        await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" })
        await page.click('button:has-text("Continue with Mobile OTP")')
        await page.fill('input[placeholder="Enter 10-digit mobile number"]', testStudent.phoneNumber!)
        await page.click('button:has-text("Get OTP")')
        await page.waitForSelector('text=Enter 6-digit OTP', { timeout: 8000 })
        const otpBoxes = page.locator('input[inputmode="numeric"]')
        for (let i = 0; i < 6; i++) {
            await otpBoxes.nth(i).click()
            await otpBoxes.nth(i).press(`${i + 1}`)
        }
        await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 })
        console.log("[Auth] Test student logged in successfully.")

        // Helper to query button in each touchpoint
        const inspectTouchpoints = async (stage: "not_started" | "in_progress" | "submitted") => {
            console.log(`\n================ STAGE: ${stage.toUpperCase()} ================`)

            // 1. Quizzes hub (/current-affairs-quizzes)
            console.log(`\n--- 1. Quizzes Hub (/current-affairs-quizzes) [${stage}] ---`)
            await page.goto(`${BASE_URL}/current-affairs-quizzes`, { waitUntil: "domcontentloaded" })
            await page.waitForTimeout(1500)
            const hubInfo = await findTestActionButton(page, "Daily Current Affairs Speed Quiz")
            console.log(`Quizzes Hub Result: Found=${hubInfo.found} | Button="${hubInfo.text}" | Href="${hubInfo.href}"`)
            const shot1 = path.join(outDir, `tp1_quizzes_hub_${stage}.png`)
            await page.screenshot({ path: shot1 })
            console.log(`Screenshot saved: ${shot1}`)

            // 2. Series Detail (/test-series/current-affairs-quizzes)
            console.log(`\n--- 2. Series Detail (/test-series/${seriesId}) [${stage}] ---`)
            await page.goto(`${BASE_URL}/test-series/${seriesId}`, { waitUntil: "domcontentloaded" })
            await page.waitForTimeout(1500)
            const seriesInfo = await findTestActionButton(page, "Daily Current Affairs Speed Quiz")
            console.log(`Series Detail Result: Found=${seriesInfo.found} | Button="${seriesInfo.text}" | Href="${seriesInfo.href}"`)
            const shot2 = path.join(outDir, `tp2_series_detail_${stage}.png`)
            await page.screenshot({ path: shot2 })
            console.log(`Screenshot saved: ${shot2}`)

            // Also check alias /test-series/daily-current-affairs-quiz
            const aliasRes = await page.goto(`${BASE_URL}/test-series/daily-current-affairs-quiz`, { waitUntil: "domcontentloaded" })
            console.log(`(Alias check: GET /test-series/daily-current-affairs-quiz -> HTTP ${aliasRes?.status()})`)

            // 3. My Tests (/my-tests)
            console.log(`\n--- 3. My Tests (/my-tests) [${stage}] ---`)
            await page.goto(`${BASE_URL}/my-tests`, { waitUntil: "domcontentloaded" })
            await page.waitForTimeout(1500)
            const myTestsInfo = await findTestActionButton(page, "Daily Current Affairs Speed Quiz")
            console.log(`My Tests Result: Found=${myTestsInfo.found} | Button="${myTestsInfo.text}" | Href="${myTestsInfo.href}"`)
            const shot3 = path.join(outDir, `tp3_my_tests_${stage}.png`)
            await page.screenshot({ path: shot3 })
            console.log(`Screenshot saved: ${shot3}`)

            // 4. Dashboard (/dashboard)
            console.log(`\n--- 4. Dashboard (/dashboard) [${stage}] ---`)
            await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" })
            await page.waitForTimeout(1500)
            // Click Mock Tests tab
            const testsTab = page.locator('button:has-text("Mock Tests")')
            if ((await testsTab.count()) > 0) {
                await testsTab.click()
                await page.waitForTimeout(1000)
            }
            const dashInfo = await findTestActionButton(page, "Daily Current Affairs Speed Quiz")
            console.log(`Dashboard Result: Found=${dashInfo.found} | Button="${dashInfo.text}" | Href="${dashInfo.href}"`)
            const shot4 = path.join(outDir, `tp4_dashboard_${stage}.png`)
            await page.screenshot({ path: shot4 })
            console.log(`Screenshot saved: ${shot4}`)

            return { hub: hubInfo, series: seriesInfo, myTests: myTestsInfo, dashboard: dashInfo }
        }

        // --- 1. STAGE 1: NOT STARTED ---
        const r1 = await inspectTouchpoints("not_started")

        // --- TRANSITION TO IN_PROGRESS ---
        console.log("\n>>> Starting attempt on ca-daily-quiz-sep27 (Transition to IN_PROGRESS)...")
        const attempt = await prisma.examAttempt.create({
            data: {
                id: `att-p6-quiz-${timestamp}`,
                userId: testStudent.id,
                testId,
                status: "IN_PROGRESS",
                score: 0,
                totalMarks: 20,
                startedAt: new Date(),
            },
        })
        attemptId = attempt.id
        console.log(`Created IN_PROGRESS attempt: ${attemptId.slice(0, 8)}...`)

        // --- 2. STAGE 2: IN PROGRESS ---
        const r2 = await inspectTouchpoints("in_progress")

        // --- TRANSITION TO SUBMITTED ---
        console.log("\n>>> Submitting attempt on ca-daily-quiz-sep27 (Transition to SUBMITTED)...")
        await prisma.examAttempt.update({
            where: { id: attemptId },
            data: {
                status: "SUBMITTED",
                score: 18.0,
                correctCount: 9,
                wrongCount: 1,
                skippedCount: 0,
                timeTakenSecs: 420,
                submittedAt: new Date(),
            },
        })
        console.log(`Updated attempt to SUBMITTED: score=18.0`)

        // --- 3. STAGE 3: SUBMITTED ---
        const r3 = await inspectTouchpoints("submitted")

        console.log("\n=================== SECTION 7 SUMMARY TABLE ===================")
        console.log("Touchpoint | Not Started | In Progress | Submitted")
        console.log(`Quizzes Hub (/current-affairs-quizzes) | "${r1.hub.text}" | "${r2.hub.text}" | "${r3.hub.text}"`)
        console.log(`Series Detail (/test-series/${seriesId}) | "${r1.series.text}" | "${r2.series.text}" | "${r3.series.text}"`)
        console.log(`My Tests (/my-tests) | "${r1.myTests.text}" | "${r2.myTests.text}" | "${r3.myTests.text}"`)
        console.log(`Dashboard (/dashboard) | "${r1.dashboard.text}" | "${r2.dashboard.text}" | "${r3.dashboard.text}"`)
        console.log("===============================================================")
        console.log("\nALL 12 SCREENSHOTS SAVED SUCCESSFULLY TO artifacts_pass6/section7_touchpoints/")
    } finally {
        await cleanup()
        await prisma.$disconnect()
    }
}

main().catch((err) => {
    console.error("FATAL ERROR in Section 7 test:", err)
    process.exit(1)
})
