import { chromium } from "playwright"
import { prisma } from "../lib/prisma"
import path from "path"

const BASE_URL = "http://localhost:3045"
const SHOTS_DIR = path.resolve(process.cwd(), "logs/verify-studio/shots")

async function login(page: any, email: string) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })
  await page.fill('input#email', email)
  await page.fill('input#password', "password123")
  await page.click('button[data-testid="login-submit"]')
  await page.waitForURL((url: URL) => !url.pathname.includes("/login"), { timeout: 15000 })
  await page.waitForTimeout(1000)
}

async function main() {
  console.log("=== DEBUGGING STUDENT ATTEMPT RELOAD & SUBMIT FLOW ===")
  const sPub = await prisma.examSeries.findUnique({
    where: { slug: "pb-7391-s-pub" },
    include: { tests: { orderBy: { order: "asc" } } },
  })
  const pubTest = sPub!.tests.find((t) => t.isPublished)!
  const student = await prisma.user.findUnique({ where: { email: "student_test@example.com" } })

  // Clean prior attempts on this test for student
  await prisma.examAttempt.deleteMany({
    where: { userId: student!.id, testId: pubTest.id },
  })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await login(page, "student_test@example.com")

  // Step 1: Navigate to attempt
  console.log("1. Navigating to attempt URL...")
  await page.goto(`${BASE_URL}/test-series/${sPub!.slug}/attempt?testId=${pubTest.id}`, { waitUntil: "networkidle" })
  await page.waitForTimeout(2000)
  console.log("Current URL:", page.url())

  // Select Option A
  console.log("2. Clicking Option A...")
  await page.locator('label:has-text("Option A")').first().click()
  await page.waitForTimeout(500)
  console.log("Clicked Option A")

  // Click Save & Next
  await page.locator('button:has-text("Save & Next")').first().click()
  await page.waitForTimeout(1500)
  console.log("Clicked Save & Next. URL is:", page.url())

  // Reload page
  console.log("3. Reloading page...")
  await page.reload({ waitUntil: "networkidle" })
  await page.waitForTimeout(2000)
  console.log("After reload, URL is:", page.url())

  // Take screenshot after reload to see what is on screen
  await page.screenshot({ path: path.join(SHOTS_DIR, "after_reload.png") })
  console.log("Saved after_reload.png")

  // Check buttons present on page
  const buttons = await page.locator("button").allInnerTexts()
  console.log("Buttons on page:", buttons.filter(b => b.trim().length > 0))

  // Find Submit button and click it
  const submitButton = page.getByRole("button", { name: "Submit" }).first()
  console.log("Submit button visible:", await submitButton.isVisible())
  if (await submitButton.isVisible()) {
    await submitButton.click()
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(SHOTS_DIR, "after_submit_click.png") })

    const modalButtons = await page.locator("button").allInnerTexts()
    console.log("Modal buttons on page:", modalButtons.filter(b => b.trim().length > 0))

    const confirmBtn = page.getByRole("button", { name: "Submit Now" }).first()
    console.log("Confirm button visible:", await confirmBtn.isVisible())
    await confirmBtn.click()

    await page.waitForURL((url: URL) => url.pathname.includes("/result"), { timeout: 35000 })
    console.log("Result URL:", page.url())

    // Wait for the result data to load
    await page.waitForFunction(() => !document.body.innerText.includes("Calculating and loading exam results"), { timeout: 20000 }).catch(() => {})
    await page.waitForTimeout(2000)

    await page.screenshot({ path: path.join(SHOTS_DIR, "student_result_page.png") })
    console.log("Saved student_result_page.png")

    const content = await page.content()
    console.log("Result page has score:", content.includes("Score") || content.includes("score"))
    console.log("Result page has Your Score:", content.includes("Your Score") || content.includes("Overall Score"))
    console.log("Result page has Percentile:", content.includes("Percentile") || content.includes("percentile"))
  }

  await context.close()
  await browser.close()
}

main().catch(console.error).finally(() => process.exit(0))
