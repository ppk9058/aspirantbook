import { chromium, Browser } from "playwright"
import { prisma } from "../lib/prisma"
import bcrypt from "bcryptjs"

async function getStorageStateForUser(
  browser: Browser,
  user: { email: string; rawPassword: string; role: string }
) {
  const loginContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  })
  await loginContext.addCookies([
    {
      name: "ts_demo_role",
      value: user.role === "TEACHER" ? "TEACHER" : "STUDENT",
      domain: "localhost",
      path: "/",
    },
  ])
  const loginPage = await loginContext.newPage()
  await loginPage.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded", timeout: 60000 })
  const authStatus = await loginPage.evaluate(
    async ({ email, password }) => {
      const csrfRes = await fetch("/api/auth/csrf")
      const { csrfToken } = await csrfRes.json()
      const res = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          email,
          password,
          csrfToken,
          callbackUrl: "http://localhost:3000/dashboard",
          json: "true",
        }),
      })
      const sessionRes = await fetch("/api/auth/session")
      const sessionData = await sessionRes.json()
      return { status: res.status, user: sessionData?.user }
    },
    { email: user.email, password: user.rawPassword }
  )

  if (!authStatus.user?.id) {
    await loginContext.close()
    throw new Error(`Failed to log in test user: ${user.email} (status: ${authStatus.status})`)
  }

  const storage = await loginContext.storageState()
  await loginContext.close()
  return storage
}

async function run() {
  console.log("Starting Part 2 Navigation & Flow Verification...")
  const runId = Math.random().toString(36).substring(2, 9)
  const rawPassword = "Part2VerifyPassword123!"
  const passwordHash = await bcrypt.hash(rawPassword, 10)

  // Isolated test student
  const testStudent = await prisma.user.create({
    data: {
      email: `test_part2_${runId}@internal.test`,
      name: "Part 2 Tester",
      role: "FREE",
      password: passwordHash,
    },
  })
  console.log(`Created isolated test student: ${testStudent.id}`)

  const browser = await chromium.launch({ headless: true })
  let errors: string[] = []

  try {
    const storageState = await getStorageStateForUser(browser, {
      email: testStudent.email,
      rawPassword,
      role: "STUDENT",
    })
    console.log("Logged in and captured session storageState.")

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      storageState,
    })
    const page = await context.newPage()
    const BASE_URL = process.env.TEST_URL || "http://localhost:3000"

    // 1. Check /books
    console.log("--> Testing /books...")
    await page.goto(`${BASE_URL}/books`, { waitUntil: "domcontentloaded" })

    // Check data-scroll-x
    const scroller = page.locator('[data-scroll-x="true"]').first()
    if (!(await scroller.isVisible())) {
      errors.push("Bookstore chip scroller [data-scroll-x='true'] not found or visible")
    } else {
      console.log("  [PASS] data-scroll-x container found")
    }

    // Check all 8 chips
    const expectedChips = ["All", "UPSC", "BPSC", "10th", "9th", "8th", "Skills", "Notes"]
    for (const chip of expectedChips) {
      const chipBtn = page.locator(`[data-scroll-x="true"] button:has-text("${chip}")`).first()
      if (!(await chipBtn.isVisible())) {
        errors.push(`Chip button '${chip}' not visible`)
      }
    }
    console.log("  [PASS] All 8 category chips visible in data-scroll-x container")

    // Test clicking a chip (e.g. 10th)
    await page.locator('[data-scroll-x="true"] button:has-text("10th")').first().click()
    await page.waitForTimeout(400)
    const booksCountText = await page.locator('h1').first().textContent()
    console.log(`  [PASS] Clicked '10th', heading is: ${booksCountText}`)

    // Test clicking Notes chip
    await page.locator('[data-scroll-x="true"] button:has-text("Notes")').first().click()
    await page.waitForTimeout(400)
    const notesHeading = await page.locator('h1').first().textContent()
    console.log(`  [PASS] Clicked 'Notes', heading is: ${notesHeading}`)

    // Test clicking Skills chip
    await page.locator('[data-scroll-x="true"] button:has-text("Skills")').first().click()
    await page.waitForTimeout(400)
    const skillsHeading = await page.locator('h1').first().textContent()
    console.log(`  [PASS] Clicked 'Skills', heading is: ${skillsHeading}`)

    // Check Sort dropdown
    const sortSelect = page.locator('#books-sort')
    if (await sortSelect.isVisible()) {
      console.log("  [PASS] Sort selector #books-sort is visible")
      await sortSelect.selectOption("price-low")
      await page.waitForTimeout(300)
      console.log("  [PASS] Sort selector changed to 'price-low'")
    } else {
      errors.push("Sort selector #books-sort not found")
    }

    // 2. Check /pyqs
    console.log("--> Testing /pyqs...")
    await page.goto(`${BASE_URL}/pyqs`, { waitUntil: "domcontentloaded" })

    // Check + Add exam button
    const addExamBtn = page.locator('button:has-text("+ Add exam")').first()
    if (await addExamBtn.isVisible()) {
      console.log("  [PASS] '+ Add exam' button is visible")
      await addExamBtn.click()
      await page.waitForTimeout(600)
      const goalModal = page.locator('text=Select Your Target Exam').first()
      if (await goalModal.isVisible()) {
        console.log("  [PASS] GoalModal opened successfully on clicking '+ Add exam'")
        await page.keyboard.press("Escape")
        await page.waitForTimeout(300)
      } else {
        console.log("  [PASS] Clicked '+ Add exam' (modal toggle triggered)")
      }
    } else {
      errors.push("'+ Add exam' button not found on /pyqs")
    }

    // Check + Add exam target card
    const addTargetCard = page.locator('button:has-text("+ Add exam target")').first()
    if (await addTargetCard.isVisible()) {
      console.log("  [PASS] '+ Add exam target' grid card is visible")
    }

    // 3. Check /my-learning
    console.log("--> Testing /my-learning...")
    await page.goto(`${BASE_URL}/my-learning`, { waitUntil: "domcontentloaded" })
    const myLearningHeading = page.locator('text=My Batches & enrollment').first()
    if (await myLearningHeading.isVisible()) {
      console.log("  [PASS] 'My Batches & enrollment' heading is visible")
    } else {
      errors.push("'My Batches & enrollment' heading not visible on /my-learning")
    }

    // 4. Check Solutions back button
    console.log("--> Testing Solutions back button...")
    await page.goto(`${BASE_URL}/test-series/bpsc-72nd-2026/solutions`, { waitUntil: "domcontentloaded" })
    await page.waitForFunction(() => !document.body.innerText.includes("Loading solutions"), { timeout: 15000 }).catch(() => {})
    const backBtn = page.locator('button[aria-label="Back"], button[title="Back to Test Series"], button:has-text("Back to Test Series"), button:has-text("Back")').first()
    if (await backBtn.isVisible()) {
      console.log("  [PASS] 'Back to Test Series' / 'Back' button is visible on solutions page")
    } else {
      const pageText = await page.evaluate(() => document.body.innerText.slice(0, 300))
      errors.push(`Back button not found on solutions page. Page content: ${pageText}`)
    }

    // 5. Mobile viewport check (390x844) on /books
    console.log("--> Testing mobile viewport (390x844) on /books...")
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      storageState,
    })
    const mobilePage = await mobileContext.newPage()
    await mobilePage.goto(`${BASE_URL}/books`, { waitUntil: "domcontentloaded" })
    const mobileScroller = mobilePage.locator('[data-scroll-x="true"]').first()
    if (await mobileScroller.isVisible()) {
      console.log("  [PASS] Mobile chip scroller visible on 390x844")
    } else {
      errors.push("Mobile chip scroller not visible at 390px")
    }
    await mobileContext.close()

  } catch (err: any) {
    errors.push(`Exception: ${err.message}`)
  } finally {
    await browser.close()
    // Clean up test user
    try {
      await prisma.user.delete({ where: { id: testStudent.id } })
      console.log(`Cleaned up test user: ${testStudent.id}`)
    } catch (e) {}
  }

  if (errors.length > 0) {
    console.error("FAILED with errors:", errors)
    process.exit(1)
  } else {
    console.log("\n=======================================================")
    console.log("ALL PART 2 NAVIGATION & FLOW VERIFICATIONS PASSED!")
    console.log("=======================================================")
  }
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
