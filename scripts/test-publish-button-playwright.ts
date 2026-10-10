import { chromium } from "playwright"

async function run() {
    console.log("Starting Playwright check on port 3045...")
    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()

    try {
        // 1. Log in as teacher
        console.log("Logging in as teacher_owner@test.local...")
        await page.goto("http://localhost:3045/login", { waitUntil: "networkidle" })
        await page.fill('input#email', "teacher_owner@test.local")
        await page.fill('input#password', "password123")
        await page.click('button[data-testid="login-submit"]')
        await page.waitForTimeout(2000)

        // 2. Navigate to Studio
        console.log("Navigating to /teacher/test-series/create...")
        await page.goto("http://localhost:3045/teacher/test-series/create", { waitUntil: "networkidle" })

        // 3. Step 1: Fill test title and package
        console.log("Step 1: Filling test title and selecting series package...")
        await page.fill('input[placeholder*="72nd BPSC Prelims"]', "Audit Verification Test")
        
        const selectLocator = page.locator('select').first()
        await selectLocator.waitFor({ state: "visible" })
        const val = await selectLocator.locator('option').nth(1).getAttribute('value')
        if (val) {
            await selectLocator.selectOption(val)
        }

        // Click Next to Step 2
        console.log("Clicking Next from Step 1...")
        await page.click('div.flex.justify-end button:has-text("Next")')
        await page.waitForTimeout(1000)

        // 4. Step 2: Configure 15 questions
        console.log("Step 2: Setting questions to 15...")
        const questionsInput = page.locator('input[type="number"]').first()
        await questionsInput.fill("15")
        await page.waitForTimeout(500)

        // Click Next to Step 3
        console.log("Clicking Next from Step 2...")
        await page.click('button:has-text("Next")')
        await page.waitForTimeout(1000)

        // 5. Step 3: Fill only 3 questions completely
        console.log("Step 3: Authoring 3 complete questions out of 15...")
        for (let q = 1; q <= 3; q++) {
            console.log(`  Filling question ${q}...`)
            const qTextArea = page.locator('textarea[placeholder*="Type the question"]').first()
            await qTextArea.waitFor({ state: "visible" })
            await qTextArea.fill(`This is question number ${q} for audit testing. Which of the following is correct?`)

            await page.fill('input[placeholder*="Option A (English)"]', `Option A for Q${q}`)
            await page.fill('input[placeholder*="Option B (English)"]', `Option B for Q${q}`)
            await page.fill('input[placeholder*="Option C (English)"]', `Option C for Q${q}`)
            await page.fill('input[placeholder*="Option D (English)"]', `Option D for Q${q}`)

            // Mark Option A as correct answer
            const radioA = page.locator('button.rounded-full').first()
            await radioA.click()
            await page.waitForTimeout(300)

            if (q < 3) {
                await page.click('button:has-text("Save & Next")')
                await page.waitForTimeout(600)
            }
        }

        // Navigate to Step 4
        console.log("Navigating to Step 4 via Preview & Publish...")
        await page.click('button:has-text("Preview & Publish")')
        await page.waitForTimeout(1500)

        // 6. Step 4: Check Publish Button
        const publishButton = page.locator('button:has-text("Publish Test")')
        await publishButton.waitFor({ state: "visible" })

        const isDisabled = await publishButton.isDisabled()
        const buttonClass = await publishButton.getAttribute("class") || ""
        const textContent = await publishButton.innerText()

        // Also check incomplete warning
        const incompleteBanner = page.locator('text=Incomplete Questions')
        const hasWarning = await incompleteBanner.isVisible().catch(() => false)

        console.log("\n================ RESULT ================")
        console.log(`Button Text: "${textContent.trim()}"`)
        console.log(`Button isDisabled: ${isDisabled}`)
        console.log(`Has cursor-not-allowed: ${buttonClass.includes("cursor-not-allowed")}`)
        console.log(`Has opacity-60: ${buttonClass.includes("opacity-60")}`)
        console.log(`Incomplete warning banner visible: ${hasWarning}`)
        
        if (isDisabled) {
            console.log("PASS: Step 4 with 3/15 questions filled -> Publish button IS DISABLED.")
        } else {
            console.error("FAIL: Publish button is NOT disabled!")
            process.exitCode = 1
        }
    } catch (err) {
        console.error("Playwright test error:", err)
        process.exitCode = 1
    } finally {
        await browser.close()
    }
}

run()
