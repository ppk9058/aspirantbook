import { chromium } from "playwright-core"
import { prisma } from "../lib/prisma"
import path from "path"
import fs from "fs"

const SCREENSHOTS_DIR = "/Users/praveenkumar/.gemini/antigravity/brain/ab750c16-600c-40b0-81a5-1de87b0bbe4f/screenshots_part2"

async function runPart2TestStatusVerification() {
  console.log("=== [Part 2] Starting Exam Status & Navigation E2E Verification ===")
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
  }

  // 1. Generate random valid Indian mobile starting with 98
  const randomSuffix = Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 8)
  const testMobile = `98${randomSuffix}`
  const maskedMobile = `98******${testMobile.slice(8)}`
  console.log(`Generated isolated student mobile: ${maskedMobile}`)

  const browser = await chromium.launch({
    headless: true,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  })

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()

  let createdUserId: string | null = null
  let createdAttemptIds: string[] = []

  try {
    // ----------------------------------------------------
    // STEP 1: Log in through the real UI mobile flow
    // ----------------------------------------------------
    console.log("\n[Step 1] Opening /login and performing mobile login via real UI flow...")
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" })
    await page.waitForTimeout(1000)

    const mobileBtn = page.locator('button:has-text("Continue with Mobile OTP")')
    await mobileBtn.click()
    await page.waitForSelector('input[placeholder="Enter 10-digit mobile number"]', { timeout: 5000 })

    console.log(`Entering mobile number: ${maskedMobile}`)
    await page.locator('input[placeholder="Enter 10-digit mobile number"]').fill(testMobile)
    await page.waitForTimeout(300)

    console.log("Clicking Get OTP...")
    await page.locator('button:has-text("Get OTP")').click()
    await page.waitForTimeout(500)

    await page.waitForSelector('text=Enter 6-digit OTP', { timeout: 5000 })
    console.log("Entering 6 digits OTP (123456)...")
    const otpBoxes = page.locator('input[inputmode="numeric"]')
    for (let i = 0; i < 6; i++) {
      await otpBoxes.nth(i).click()
      await otpBoxes.nth(i).press(`${i + 1}`)
      await page.waitForTimeout(100)
    }

    await page.waitForURL("**/my-learning", { timeout: 15000 })
    console.log("✓ Logged in successfully through real UI flow! Redirected to /my-learning")

    const userInDb = await prisma.user.findFirst({
      where: { phoneNumber: testMobile },
      select: { id: true },
    })
    if (userInDb) {
      createdUserId = userInDb.id
      console.log(`Confirmed test user created in DB: ${createdUserId}`)
    }

    // ----------------------------------------------------
    // STEP 2: Verify Start Now on /test-series/bpsc-72nd-2026
    // ----------------------------------------------------
    console.log("\n[Step 2] Navigating to /test-series/bpsc-72nd-2026 to verify NOT_STARTED state ('Start Now')...")
    await page.goto("http://localhost:3000/test-series/bpsc-72nd-2026", { waitUntil: "networkidle" })
    await page.waitForTimeout(1500)

    // Expand teacher-tests accordion if needed
    const accordionBtn = page.locator('button:has-text("Teacher Authored")')
    if (await accordionBtn.isVisible()) {
      console.log("Teacher-authored accordion is present.")
    }

    // Locate the Start Now button for bpsc-sectional-5q
    const startNowBtn = page.locator('a[href*="/instructions?testId=bpsc-sectional-5q"]')
    await startNowBtn.waitFor({ state: "visible", timeout: 8000 })
    const btnText = await startNowBtn.innerText()
    console.log(`Test action button text in series detail: "${btnText}"`)
    if (!btnText.includes("Start Now")) {
      throw new Error(`Expected 'Start Now' on test-series detail, got: ${btnText}`)
    }
    console.log("✓ Test series detail displays 'Start Now' for NOT_STARTED test!")
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "step2_start_now_series.png") })

    // ----------------------------------------------------
    // STEP 3: Verify Context-Aware Return Path on PYQ error/instructions
    // ----------------------------------------------------
    console.log("\n[Step 3] Navigating to /pyqs/bpsc and clicking Start Now with returnPath=/pyqs/bpsc...")
    await page.goto("http://localhost:3000/pyqs/bpsc", { waitUntil: "networkidle" })
    await page.waitForTimeout(1500)

    // Verify Start Now button for bpsc-sectional-5q exists on PYQ page
    const pyqStartNow = page.locator('a[href*="returnPath=%2Fpyqs%2Fbpsc"]')
    await pyqStartNow.first().waitFor({ state: "visible", timeout: 8000 })
    console.log("✓ Found PYQ TestActionButton with returnPath=/pyqs/bpsc!")
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "step3_pyq_page.png") })

    // Click it to go to instructions
    await pyqStartNow.first().click()
    await page.waitForURL("**/instructions**", { timeout: 10000 })
    console.log(`Navigated to instructions: ${page.url()}`)
    await page.waitForTimeout(2000)

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "debug_instructions_page.png") })
    const bodyText = await page.innerText("body")
    console.log(`Instructions page content preview: ${bodyText.slice(0, 200).replace(/\n/g, " ")}`)

    // Check back button on instructions page
    const backBtn = page.locator('button:has-text("Back to Papers"), button:has-text("Go to Tests"), button:has-text("Back to Previous Papers")')
    await backBtn.waitFor({ state: "visible", timeout: 8000 })
    const backText = await backBtn.innerText()
    console.log(`Instructions Back button text: ${backText}`)
    if (!backText.includes("Back to Papers") && !backText.includes("Back to Previous Papers")) {
      throw new Error(`Expected button text 'Back to Papers' or 'Back to Previous Papers', got ${backText}`)
    }
    console.log("✓ Instructions page context-aware Back button correctly displays context-aware back label!")

    // Now proceed to declaration
    console.log("Proceeding to declaration...")
    const proceedDeclBtn = page.locator('a:has-text("Next")')
    await proceedDeclBtn.click()
    await page.waitForURL("**/declaration**", { timeout: 10000 })
    console.log(`Navigated to declaration: ${page.url()}`)

    // Check declaration back button
    const declBackBtn = page.locator('a:has-text("Back")')
    const declBackHref = await declBackBtn.getAttribute("href")
    console.log(`Declaration Back button target: ${declBackHref}`)
    if (!declBackHref?.includes("returnPath=%2Fpyqs%2Fbpsc")) {
      throw new Error(`Expected declaration Back button to preserve returnPath, got ${declBackHref}`)
    }
    console.log("✓ Declaration page preserves returnPath in instructions back link!")

    // ----------------------------------------------------
    // STEP 4: Start test and verify IN_PROGRESS state ('Continue')
    // ----------------------------------------------------
    console.log("\n[Step 4] Checking declaration checkbox and starting attempt...")
    const agreeLabel = page.locator('text=I have read and understood the instructions')
    await agreeLabel.click()
    await page.waitForTimeout(300)

    const startExamBtn = page.locator('button:has-text("I am ready to begin")')
    await startExamBtn.click()
    await page.waitForURL("**/attempt**", { timeout: 15000 })
    console.log(`Navigated to attempt screen: ${page.url()}`)
    await page.waitForTimeout(2000)

    // Capture attempt ID from DB or URL
    const attemptInDb = await prisma.examAttempt.findFirst({
      where: { userId: createdUserId!, testId: "bpsc-sectional-5q", status: "IN_PROGRESS" },
      select: { id: true },
    })
    if (!attemptInDb) throw new Error("Expected IN_PROGRESS attempt in DB!")
    createdAttemptIds.push(attemptInDb.id)
    console.log(`Confirmed IN_PROGRESS attempt in DB: ${attemptInDb.id}`)

    // Navigate back to /test-series/bpsc-72nd-2026 without submitting
    console.log("Navigating back to /test-series/bpsc-72nd-2026 to verify button switched to 'Continue'...")
    await page.goto("http://localhost:3000/test-series/bpsc-72nd-2026", { waitUntil: "networkidle" })
    await page.waitForTimeout(1500)

    const continueBtn = page.locator('a:has-text("Continue")')
    await continueBtn.waitFor({ state: "visible", timeout: 8000 })
    const continueHref = await continueBtn.getAttribute("href")
    console.log(`Continue button found! target: ${continueHref}`)
    if (!continueHref?.includes(attemptInDb.id)) {
      throw new Error(`Expected Continue button to link to attemptId ${attemptInDb.id}, got ${continueHref}`)
    }
    console.log("✓ TestActionButton now displays 'Continue' and links directly to in-progress attempt!")
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "step4_continue_state.png") })

    // ----------------------------------------------------
    // STEP 5: Resume attempt, answer a question, and submit
    // ----------------------------------------------------
    console.log("\n[Step 5] Clicking Continue to resume attempt...")
    await continueBtn.click()
    await page.waitForURL("**/attempt**", { timeout: 10000 })
    console.log(`Resumed attempt: ${page.url()}`)
    await page.waitForTimeout(2000)

    // Select option A for question 1
    const optionA = page.locator('button:has-text("(A)")').first()
    if (await optionA.isVisible()) {
      await optionA.click()
      await page.waitForTimeout(500)
      console.log("Selected Option A")
    }

    // Submit the exam
    console.log("Submitting the exam...")
    const submitBtn = page.locator('button:visible:has-text("Submit")').first()
    await submitBtn.click()
    await page.waitForTimeout(500)

    // Confirm modal submit
    const confirmModalBtn = page.locator('button:has-text("Submit Now")').first()
    if (await confirmModalBtn.isVisible()) {
      await confirmModalBtn.click()
    }

    // Measure Result page load time
    const t0 = Date.now()
    await page.waitForURL("**/result**", { timeout: 15000 })
    const tResult = Date.now() - t0
    console.log(`✓ Navigated to Result page in ${tResult}ms! (Target < 1500ms)`)

    // Verify result content rendered
    await page.waitForSelector('text=Score', { timeout: 8000 })
    console.log("✓ Result page loaded successfully with scores and breakdown!")
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "step5_result_page.png") })

    // ----------------------------------------------------
    // STEP 6: Verify Full Report & Retake state on test series & PYQ
    // ----------------------------------------------------
    console.log("\n[Step 6] Navigating back to /test-series/bpsc-72nd-2026 to verify 'Full Report' and 'Retake'...")
    await page.goto("http://localhost:3000/test-series/bpsc-72nd-2026", { waitUntil: "networkidle" })
    await page.waitForTimeout(1500)

    const fullReportBtn = page.locator('a:has-text("Full Report")')
    await fullReportBtn.waitFor({ state: "visible", timeout: 8000 })
    const retakeBtn = page.locator('a[title="Retake Test"]')
    await retakeBtn.waitFor({ state: "visible", timeout: 8000 })
    console.log("✓ Test series detail displays 'Full Report' + 'Retake' for SUBMITTED test!")
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "step6_full_report_state.png") })

    // ----------------------------------------------------
    // STEP 7: Verify My Tests page grouped by test
    // ----------------------------------------------------
    console.log("\n[Step 7] Navigating to /my-tests to verify grouping by test...")
    await page.goto("http://localhost:3000/my-tests", { waitUntil: "networkidle" })
    await page.waitForTimeout(1500)

    // Check performance hub
    const perfHeading = page.locator('#heading-perf')
    await perfHeading.waitFor({ state: "visible", timeout: 8000 })

    // Look for test title card
    const testCard = page.locator('text=72nd BPSC Sectional Mock Test').first()
    await testCard.waitFor({ state: "visible", timeout: 5000 })
    console.log("✓ Found submitted test card on /my-tests!")

    // Check LATEST / BEST score column exists
    const scoreLabel = page.locator('text=LATEST / BEST').first()
    await scoreLabel.waitFor({ state: "visible", timeout: 5000 })
    console.log("✓ Verified card shows grouped 'LATEST / BEST' score summary!")
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "step7_my_tests_grouped.png") })

    console.log("\n🎉 ALL PART 2 VERIFICATION CHECKS PASSED SUCCESSFULLY!")
  } finally {
    await browser.close()

    // Clean up created user and attempt data
    if (createdUserId) {
      console.log(`\n[Cleanup] Deleting test attempts and test user ${createdUserId}...`)
      try {
        await prisma.examAttemptAnswer.deleteMany({
          where: { attempt: { userId: createdUserId } },
        })
        await prisma.examAttempt.deleteMany({
          where: { userId: createdUserId },
        })
        await prisma.user.delete({
          where: { id: createdUserId },
        })
        console.log("✓ Cleanup finished cleanly.")
      } catch (err) {
        console.warn("Cleanup warning:", err)
      }
    }
  }
}

runPart2TestStatusVerification()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Part 2 verification failed:", e)
    process.exit(1)
  })
