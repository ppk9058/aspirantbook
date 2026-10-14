import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import { prisma, createActor, loginAs, newNonce } from "./test-series-e2e-helpers"

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3045"

test.describe("Current Affairs & PYQ Result Back Navigation and Hidden Series Safety", () => {
  let studentUser: any

  test.beforeAll(async () => {
    const nonce = newNonce()
    studentUser = await createActor(nonce, "FREE", "ca-result-nav-student")
  })

  test.afterAll(async () => {
    if (studentUser?.id) {
      await prisma.examAttempt.deleteMany({
        where: { userId: studentUser.id },
      }).catch(() => {})
      await prisma.user.delete({ where: { id: studentUser.id } }).catch(() => {})
    }
  })

  test("1. Direct visit to /test-series/current-affairs-system-series redirects (308) to /current-affairs-quizzes", async ({
    page,
  }) => {
    // Both guest and authenticated users get redirected, no 404
    const response = await page.goto(`${BASE_URL}/test-series/current-affairs-system-series`, {
      waitUntil: "networkidle",
    })

    expect(response?.status()).toBe(200)
    expect(page.url()).toContain("/current-affairs-quizzes")
    expect(page.url()).not.toContain("/test-series/current-affairs-system-series")
    await expect(page.locator('h1:has-text("Looking for something?")')).not.toBeVisible()
    await expect(page.locator('h1:has-text("Current Affairs & Quizzes"), h1:has-text("Current Affairs")').first()).toBeVisible()
  })

  test("2. Direct visit to /test-series/pyq-system-series redirects (308) to /pyqs", async ({
    page,
  }) => {
    const response = await page.goto(`${BASE_URL}/test-series/pyq-system-series`, {
      waitUntil: "networkidle",
    })

    expect(response?.status()).toBe(200)
    expect(page.url()).toContain("/pyqs")
    expect(page.url()).not.toContain("/test-series/pyq-system-series")
    await expect(page.locator('h1:has-text("Looking for something?")')).not.toBeVisible()
  })

  test("3. Student completes CA quiz: Result Back button, Solutions Back button, and Bottom Back all return to /current-affairs-quizzes", async ({
    page,
  }) => {
    await loginAs(page, studentUser.email)

    // A. Start from CA quiz instructions
    await page.goto(`${BASE_URL}/current-affairs-quizzes/upsc-economy-ca/instructions`, {
      waitUntil: "networkidle",
    })
    const nextBtn = page.locator('a:has-text("Next")').first()
    await expect(nextBtn).toBeVisible({ timeout: 15000 })
    await nextBtn.click()

    // B. Declaration page
    await page.waitForURL((url) => url.pathname.includes("declaration"), { timeout: 25000 })
    await expect(page.locator('text="Loading exam details..."')).not.toBeVisible({ timeout: 25000 }).catch(() => {})
    const agreeLabel = page.locator('label:has-text("I have read and understood the instructions")')
    await expect(agreeLabel).toBeVisible({ timeout: 25000 })
    await agreeLabel.click()

    const proceedBtn = page.locator('button:has-text("I am ready to begin")').first()
    await expect(proceedBtn).toBeEnabled({ timeout: 10000 })
    await proceedBtn.click()

    // C. Attempt arena
    await page.waitForURL((url) => url.pathname.includes("attempt"), { timeout: 35000 })
    await expect(page.locator('text="Preparing CBT Exam Arena..."')).not.toBeVisible({ timeout: 40000 }).catch(() => {})

    // Pick an answer option if available
    const option = page.locator('label:has-text("2% to 6%"), label:has-text("A"), label:has-text("B")').first()
    if (await option.isVisible({ timeout: 10000 }).catch(() => false)) {
      await option.click()
    }

    // Submit attempt
    const submitBtn = page.locator('button:visible:has-text("Submit"), button:visible:has-text("Submit Test")').first()
    await expect(submitBtn).toBeVisible({ timeout: 25000 })
    await submitBtn.click()

    const confirmBtn = page.locator('button:visible:has-text("Submit Now")').first()
    await expect(confirmBtn).toBeVisible({ timeout: 10000 })
    await confirmBtn.click()

    // D. Result page
    await page.waitForURL((url) => url.pathname.includes("result"), { timeout: 35000 })
    await expect(page.locator('text=/YOUR SCORE|Score Breakdown|ALL INDIA RANK/i').first()).toBeVisible({ timeout: 25000 })

    const resultUrl = page.url()

    // E. Test Header Back button on Result page
    const headerBackBtn = page.locator('button[title*="Back to Current Affairs"], button[aria-label*="Back to Current Affairs"]').first()
    await expect(headerBackBtn).toBeVisible({ timeout: 10000 })
    await headerBackBtn.click()

    // Must navigate to /current-affairs-quizzes, never show 404
    await page.waitForURL((url) => url.pathname.includes("/current-affairs-quizzes"), { timeout: 25000 })
    expect(page.url()).not.toContain("/test-series/current-affairs-system-series")
    await expect(page.locator('h1:has-text("Looking for something?")')).not.toBeVisible()
    expect(page.url()).toContain("/current-affairs-quizzes")

    // F. Return to Result page to test Bottom "Back to Quizzes"
    await page.goto(resultUrl, { waitUntil: "networkidle" })
    await expect(page.locator('text=/YOUR SCORE|Score Breakdown|ALL INDIA RANK/i').first()).toBeVisible({ timeout: 25000 })

    const bottomBackBtn = page.locator('button:has-text("Back to Quizzes")').first()
    await expect(bottomBackBtn).toBeVisible({ timeout: 10000 })
    await bottomBackBtn.click()

    await page.waitForURL((url) => url.pathname.includes("/current-affairs-quizzes"), { timeout: 25000 })
    expect(page.url()).not.toContain("/test-series/current-affairs-system-series")
    await expect(page.locator('h1:has-text("Looking for something?")')).not.toBeVisible()
    expect(page.url()).toContain("/current-affairs-quizzes")

    // G. Return to Result page to test Solutions page Back button
    await page.goto(resultUrl, { waitUntil: "networkidle" })
    await expect(page.locator('text=/YOUR SCORE|Score Breakdown|ALL INDIA RANK/i').first()).toBeVisible({ timeout: 25000 })

    const solutionsBtn = page.locator('button:has-text("Full Solutions & Explanations")').first()
    await expect(solutionsBtn).toBeVisible({ timeout: 10000 })
    await solutionsBtn.click()

    await page.waitForURL((url) => url.pathname.includes("solutions"), { timeout: 25000 })
    await expect(page.locator('text=/Solution|Explanation|Correct Answer/i').first()).toBeVisible({ timeout: 25000 })

    const solutionsBackBtn = page.locator('button[title*="Back to Current Affairs"], button[aria-label*="Back to Current Affairs"]').first()
    await expect(solutionsBackBtn).toBeVisible({ timeout: 10000 })
    await solutionsBackBtn.click()

    await page.waitForURL((url) => url.pathname.includes("/current-affairs-quizzes") || url.pathname.includes("/result"), { timeout: 25000 })
    expect(page.url()).not.toContain("/test-series/current-affairs-system-series")
    await expect(page.locator('h1:has-text("Looking for something?")')).not.toBeVisible()
    expect(page.url()).toContain("/current-affairs-quizzes")
  })

  test("4. Browser Back button after submit does not land on expired attempt or 404", async ({
    page,
  }) => {
    await loginAs(page, studentUser.email)

    // Open instructions and proceed to declaration
    await page.goto(`${BASE_URL}/current-affairs-quizzes/upsc-economy-ca/instructions`, {
      waitUntil: "networkidle",
    })
    const nextBtn = page.locator('a:has-text("Next")').first()
    await expect(nextBtn).toBeVisible({ timeout: 15000 })
    await nextBtn.click()

    // Accept declaration and begin
    await page.waitForURL((url) => url.pathname.includes("declaration"), { timeout: 25000 })
    await expect(page.locator('text="Loading exam details..."')).not.toBeVisible({ timeout: 25000 }).catch(() => {})
    const agreeLabel = page.locator('label:has-text("I have read and understood the instructions")')
    await expect(agreeLabel).toBeVisible({ timeout: 25000 })
    await agreeLabel.click()

    const proceedBtn = page.locator('button:has-text("I am ready to begin")').first()
    await expect(proceedBtn).toBeEnabled({ timeout: 10000 })
    await proceedBtn.click()

    // Wait for attempt screen
    await page.waitForURL((url) => url.pathname.includes("attempt"), { timeout: 35000 })
    await expect(page.locator('text="Preparing CBT Exam Arena..."')).not.toBeVisible({ timeout: 40000 }).catch(() => {})

    // Submit attempt
    const submitBtn = page.locator('button:visible:has-text("Submit"), button:visible:has-text("Submit Test")').first()
    await expect(submitBtn).toBeVisible({ timeout: 25000 })
    await submitBtn.click()

    const confirmBtn = page.locator('button:visible:has-text("Submit Now")').first()
    await expect(confirmBtn).toBeVisible({ timeout: 10000 })
    await confirmBtn.click()

    // Result page loads
    await page.waitForURL((url) => url.pathname.includes("result"), { timeout: 35000 })
    await expect(page.locator('text=/YOUR SCORE|Score Breakdown|ALL INDIA RANK/i').first()).toBeVisible({ timeout: 25000 })

    // Now press the browser Back button
    await page.goBack()
    await page.waitForURL(
      (url) => url.pathname.includes("/current-affairs-quizzes") || url.pathname.includes("/instructions"),
      { timeout: 25000 }
    )

    // Assert that we NEVER land on 404
    await expect(page.locator('h1:has-text("Looking for something?")')).not.toBeVisible()
    expect(page.url()).not.toContain("/test-series/current-affairs-system-series")
    // Should have safely traversed back to instructions or quizzes without 404
    expect(
      page.url().includes("instructions") ||
      page.url().includes("current-affairs-quizzes")
    ).toBe(true)
  })
})
