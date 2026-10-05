import { chromium } from "playwright-core"
import { prisma } from "../lib/prisma"
import path from "path"
import fs from "fs"

const SCREENSHOTS_DIR = "/Users/praveenkumar/.gemini/antigravity/brain/ab750c16-600c-40b0-81a5-1de87b0bbe4f/screenshots_part1"

async function runPart1GoalVerification() {
  console.log("=== [Part 1] Starting Goal Auto-Switch Bug Verification & Real Browser Run ===")
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

  // Desktop context
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

    // Click "Continue with Mobile OTP (Instant)"
    const mobileBtn = page.locator('button:has-text("Continue with Mobile OTP")')
    await mobileBtn.click()
    await page.waitForSelector('input[placeholder="Enter 10-digit mobile number"]', { timeout: 5000 })

    // Fill phone number
    console.log(`Entering mobile number: ${maskedMobile}`)
    await page.locator('input[placeholder="Enter 10-digit mobile number"]').fill(testMobile)
    await page.waitForTimeout(300)

    // Tap "Get OTP"
    console.log("Clicking Get OTP...")
    await page.locator('button:has-text("Get OTP")').click()
    await page.waitForTimeout(500)

    page.on("console", (msg) => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`))
    page.on("response", (res) => {
      if (res.url().includes("/api/auth/")) {
        console.log(`[Browser Response] ${res.status()} ${res.url()}`)
      }
    })

    // Wait for OTP segmented inputs
    await page.waitForSelector('text=Enter 6-digit OTP', { timeout: 5000 })
    console.log("Entering 6 digits OTP (123456)...")
    const otpBoxes = page.locator('input[inputmode="numeric"]')
    const count = await otpBoxes.count()
    console.log(`Found ${count} OTP boxes`)
    for (let i = 0; i < 6; i++) {
      await otpBoxes.nth(i).click()
      await otpBoxes.nth(i).press(`${i + 1}`)
      await page.waitForTimeout(150)
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "debug_otp_entered.png") })
    console.log("Screenshot after OTP entered saved.")

    // Wait for redirect to /my-learning
    await page.waitForURL("**/my-learning", { timeout: 15000 })
    console.log("✓ Logged in successfully through real UI flow! Redirected to /my-learning")

    // Find created DB user
    const dbUser = await prisma.user.findFirst({
      where: { phoneNumber: testMobile },
      select: { id: true, phoneNumber: true, selectedGoal: true },
    })
    if (!dbUser) throw new Error("Could not find created user in DB")
    createdUserId = dbUser.id
    console.log(`✓ Confirmed session in DB for user ${createdUserId}. Initial selectedGoal in DB: ${dbUser.selectedGoal || "null"}`)

    // ----------------------------------------------------
    // STEP 2: Open Goal Modal and explicitly choose UPSC
    // ----------------------------------------------------
    console.log("\n[Step 2] Opening Goal Modal and setting goal explicitly to UPSC...")
    await page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle" })
    await page.waitForTimeout(1000)

    // Click Goal Selector Button
    const goalBtn = page.locator('button[aria-label="Switch Goal"]')
    await goalBtn.click()
    await page.waitForSelector('text=Select your Goal', { timeout: 8000 })

    // Click "UPSC" card in the goal modal
    const upscGoalCard = page.locator('button:has(h4:text-is("UPSC"))').first()
    await upscGoalCard.click()
    await page.waitForTimeout(1500)

    // Verify GoalSelectorButton shows UPSC
    const currentGoalText = await page.locator('button[aria-label="Switch Goal"]').innerText()
    console.log(`Goal selector button text after selection: "${currentGoalText.replace(/\n/g, ' ')}"`)
    if (!currentGoalText.includes("UPSC")) {
      throw new Error(`Expected UPSC in goal selector, got: ${currentGoalText}`)
    }

    // Verify DB updated to upsc
    const updatedUser = await prisma.user.findUnique({
      where: { id: createdUserId },
      select: { selectedGoal: true },
    })
    console.log(`✓ Confirmed selectedGoal persisted to PostgreSQL: ${updatedUser?.selectedGoal}`)
    if (updatedUser?.selectedGoal !== "upsc") {
      throw new Error(`Expected selectedGoal in DB to be 'upsc', got: ${updatedUser?.selectedGoal}`)
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "step2_upsc_selected.png") })

    // ----------------------------------------------------
    // STEP 3: Navigate across surfaces to test persistence
    // ----------------------------------------------------
    const testUrls = [
      "/dashboard",
      "/courses",
      "/courses/genai-engineer-zero-to-hero-pia8", // Skills course!
      "/pyqs",
      "/books",
      "/test-series",
    ]

    for (const url of testUrls) {
      console.log(`\nNavigating to ${url}...`)
      await page.goto(`http://localhost:3000${url}`, { waitUntil: "networkidle" })
      await page.waitForTimeout(1000)

      // Check localStorage
      const localGoal = await page.evaluate(() => localStorage.getItem("trillion_selected_goal"))
      console.log(`At ${url} -> localStorage goal: "${localGoal}"`)
      if (localGoal !== "upsc") {
        throw new Error(`BUG REPRODUCED! LocalStorage goal switched to "${localGoal}" at ${url}`)
      }

      // Check DB
      const userInDb = await prisma.user.findUnique({
        where: { id: createdUserId },
        select: { selectedGoal: true },
      })
      if (userInDb?.selectedGoal !== "upsc") {
        throw new Error(`BUG REPRODUCED! DB goal switched to "${userInDb?.selectedGoal}" at ${url}`)
      }

      // If page has the header goal selector button, assert button text
      const hasGoalBtn = await page.locator('button[aria-label="Switch Goal"]').isVisible().catch(() => false)
      if (hasGoalBtn) {
        const text = await page.locator('button[aria-label="Switch Goal"]').innerText().catch(() => "")
        console.log(`At ${url} -> Header Goal Button text: "${text.replace(/\n/g, ' ')}"`)
        if (!text.includes("UPSC")) {
          throw new Error(`BUG REPRODUCED! Goal switched away from UPSC at ${url}. Content: ${text}`)
        }
      }
    }

    // ----------------------------------------------------
    // STEP 4: Reload page and test new tab
    // ----------------------------------------------------
    console.log("\n[Step 4] Testing hard reload and new tab...")
    await page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle" })
    await page.reload({ waitUntil: "networkidle" })
    await page.waitForTimeout(1000)
    const afterReloadText = await page.locator('button[aria-label="Switch Goal"]').innerText()
    console.log(`After reload -> Goal Button: "${afterReloadText.replace(/\n/g, ' ')}"`)
    if (!afterReloadText.includes("UPSC")) {
      throw new Error(`Goal switched after reload! Got: ${afterReloadText}`)
    }

    const newPage = await context.newPage()
    await newPage.goto("http://localhost:3000/dashboard", { waitUntil: "domcontentloaded" })
    await newPage.waitForTimeout(1500)
    const newTabText = await newPage.locator('button[aria-label="Switch Goal"]').innerText()
    console.log(`In new tab -> Goal Button: "${newTabText.replace(/\n/g, ' ')}"`)
    if (!newTabText.includes("UPSC")) {
      throw new Error(`Goal switched in new tab! Got: ${newTabText}`)
    }
    await newPage.close()

    // ----------------------------------------------------
    // STEP 5: Mobile Viewport Verification (390 x 844)
    // ----------------------------------------------------
    console.log("\n[Step 5] Testing Mobile Viewport (390x844)...")
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle" })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "step5_mobile_viewport_upsc.png") })

    console.log("✓ All navigation and persistence assertions passed! Selected goal remained 'UPSC' across all pages without switching to 'skills'.")

  } finally {
    await browser.close()

    // Cleanup isolated test student
    if (createdUserId) {
      console.log(`\n[Cleanup] Cleaning up isolated test student ${createdUserId}...`)
      await prisma.enrollment.deleteMany({ where: { userId: createdUserId } })
      await prisma.user.delete({ where: { id: createdUserId } })
      console.log("✓ Cleanup finished cleanly.")
    }
  }
}

runPart1GoalVerification()
  .then(() => {
    console.log("=== [Part 1] Verification Finished Successfully ===")
    process.exit(0)
  })
  .catch((err) => {
    console.error("=== [Part 1] Verification Failed ===", err)
    process.exit(1)
  })
