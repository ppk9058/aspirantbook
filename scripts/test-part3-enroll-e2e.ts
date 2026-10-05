import { chromium } from "playwright-core"
import { prisma } from "../lib/prisma"
import path from "path"
import fs from "fs"

const SCREENSHOTS_DIR = "/Users/praveenkumar/.gemini/antigravity/brain/ab750c16-600c-40b0-81a5-1de87b0bbe4f/screenshots_part3"

async function runPart3EnrollVerification() {
  console.log("=== [Part 3] Starting Test Series Enroll Verification ===")
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
    // STEP 2: Free Series Enrollment (e.g. bpsc-72nd-2026 or current-affairs-quizzes)
    // ----------------------------------------------------
    console.log("\n[Step 2] Testing FREE series enrollment on /test-series/bpsc-72nd-2026...")
    await page.goto("http://localhost:3000/test-series/bpsc-72nd-2026", { waitUntil: "networkidle" })
    await page.waitForTimeout(1500)

    const freeEnrollBtn = page.locator('button:has-text("Enroll Free")').first()
    await freeEnrollBtn.waitFor({ state: "visible", timeout: 8000 })
    console.log("Found 'Enroll Free' button on free series page!")
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "step2_free_series_before.png") })

    console.log("Clicking 'Enroll Free' button...")
    await freeEnrollBtn.click()
    await page.waitForTimeout(2000)

    // Button should now transition to "My Tests" with go-to arrow
    const myTestsBtn = page.locator('button:has-text("My Tests")').first()
    await myTestsBtn.waitFor({ state: "visible", timeout: 8000 })
    console.log("✓ Button successfully transitioned to 'My Tests' with go-to arrow icon!")
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "step2_free_series_enrolled.png") })

    // Verify DB enrollment record created
    const enrollment = await prisma.examSeriesEnrollment.findFirst({
      where: {
        userId: createdUserId!,
        series: { slug: "bpsc-72nd-2026" },
      },
    })
    if (!enrollment) {
      throw new Error("Expected examSeriesEnrollment record in DB for bpsc-72nd-2026, but not found!")
    }
    console.log(`✓ Verified free enrollment in DB: ID ${enrollment.id}, type ${enrollment.enrollType}`)

    // Clicking "My Tests" button should navigate to /my-tests
    console.log("Clicking 'My Tests' button...")
    await myTestsBtn.click()
    await page.waitForURL("**/my-tests", { timeout: 10000 })
    console.log(`✓ 'My Tests' button successfully navigated to: ${page.url()}`)

    // ----------------------------------------------------
    // STEP 3: Paid Series Enrollment (upsc-2027 isPro=true)
    // ----------------------------------------------------
    console.log("\n[Step 3] Testing PAID series on /test-series/upsc-2027...")
    await page.goto("http://localhost:3000/test-series/upsc-2027", { waitUntil: "networkidle" })
    await page.waitForTimeout(1500)

    const paidBtn = page.locator('button:has-text("Get Pass")').first()
    await paidBtn.waitFor({ state: "visible", timeout: 8000 })
    console.log("Found 'Get Pass' button for paid series!")
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "step3_paid_series_before.png") })

    console.log("Clicking 'Get Pass' button...")
    await paidBtn.click()
    await page.waitForURL("**/subscription", { timeout: 10000 })
    console.log(`✓ Clicking 'Get Pass' routed cleanly to subscription checkout: ${page.url()}`)
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "step3_subscription_routed.png") })

    console.log("\n🎉 ALL PART 3 ENROLLMENT VERIFICATION CHECKS PASSED SUCCESSFULLY!\n")

  } catch (error) {
    console.error("Part 3 verification failed:", error)
    throw error
  } finally {
    // Cleanup
    if (createdUserId) {
      console.log(`\n[Cleanup] Deleting enrollments and test user ${createdUserId}...`)
      await prisma.examSeriesEnrollment.deleteMany({ where: { userId: createdUserId } }).catch(() => {})
      await prisma.user.delete({ where: { id: createdUserId } }).catch(() => {})
      console.log("✓ Cleanup finished cleanly.")
    }
    await browser.close()
    await prisma.$disconnect()
  }
}

runPart3EnrollVerification().catch(err => {
  console.error(err)
  process.exit(1)
})
