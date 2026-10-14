import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import { prisma, createActor, loginAs, newNonce } from "./test-series-e2e-helpers"

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3045"

test.describe("Current Affairs Quiz URL Hardening & Fix Verification", () => {
  let studentUser: any
  let testQuiz: any

  test.beforeAll(async () => {
    const nonce = newNonce()
    studentUser = await createActor(nonce, "FREE", "ca-verify-student")
    await prisma.user.update({
      where: { id: studentUser.id },
      data: { selectedGoal: "upsc" },
    })

    // Find the seeded test quiz
    testQuiz = await prisma.examTest.findFirst({
      where: { title: "UPSC Economy CA" },
      include: { series: true },
    })
  })

  test.afterAll(async () => {
    if (studentUser?.id) {
      // Clean up any attempts
      await prisma.examAttempt.deleteMany({
        where: { userId: studentUser.id },
      }).catch(() => {})
      await prisma.user.delete({ where: { id: studentUser.id } }).catch(() => {})
    }
  })

  test("CA-01: Authenticated student clicks quiz card, lands on clean /instructions page (not 404)", async ({
    page,
  }) => {
    // 1. Log in as student
    await loginAs(page, studentUser.email)

    // 2. Open /current-affairs-quizzes
    await page.goto(`${BASE_URL}/current-affairs-quizzes`, { waitUntil: "networkidle" })
    await page.waitForTimeout(1000)

    // 3. Find quiz card for UPSC Economy CA
    const card = page.locator('[data-testid="current-affairs-quiz-card"]').filter({
      hasText: "UPSC Economy CA",
    }).first()
    await expect(card).toBeVisible({ timeout: 15000 })

    // 4. Click the action button
    const actionBtn = card.locator('a, button').filter({ hasText: /Start|Resume|Take Test|Attempt/i }).first()
    await expect(actionBtn).toBeVisible({ timeout: 5000 })
    await actionBtn.click()

    // 5. Assert clean instructions URL without query params
    await page.waitForURL((url) => url.pathname.includes("/instructions"), { timeout: 15000 })
    expect(page.url()).toContain("/current-affairs-quizzes/upsc-economy-ca/instructions")

    // 6. Assert instructions rendered with no 404
    const notFoundHeading = page.locator('text="404"').or(page.locator('text="Page Not Found"'))
    await expect(notFoundHeading).not.toBeVisible()

    const instructionsHeading = page.locator('h1:has-text("General Test Instructions")')
    await expect(instructionsHeading).toBeVisible({ timeout: 10000 })
  })

  test("CA-02: Public slug page renders valid title, guidelines, and JSON-LD schema", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/current-affairs-quizzes/upsc-economy-ca`, { waitUntil: "networkidle" })

    // Assert title and hero
    await expect(page.locator('h1:has-text("UPSC Economy CA")')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text="Current Affairs"').first()).toBeVisible()
    await expect(page.locator('text="Important Quiz Guidelines"')).toBeVisible()

    // Check JSON-LD
    const jsonLdContent = await page.locator('script[type="application/ld+json"]').textContent()
    expect(jsonLdContent).toBeTruthy()
    const parsed = JSON.parse(jsonLdContent || "{}")
    expect(parsed["@type"]).toBe("Quiz")
    expect(parsed.name).toBe("UPSC Economy CA")
  })

  test("CA-03: Old test-series URL redirects (307/308) to new clean instructions URL", async ({
    page,
  }) => {
    expect(testQuiz).toBeTruthy()
    const oldUrl = `${BASE_URL}/test-series/current-affairs-system-series/instructions?testId=${testQuiz.id}&title=UPSC+Economy+CA&returnPath=%2Fcurrent-affairs-quizzes`

    await page.goto(oldUrl)
    await page.waitForURL((url) => url.pathname.includes("/current-affairs-quizzes/"), { timeout: 15000 })
    expect(page.url()).toContain("/current-affairs-quizzes/upsc-economy-ca/instructions")

    // Assert instructions are displayed
    const heading = page.locator('h1:has-text("General Test Instructions")')
    await expect(heading).toBeVisible({ timeout: 10000 })
  })

  test("CA-04: Non-existent quiz slug or ID returns custom 404", async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/current-affairs-quizzes/non-existent-quiz-xyz`)
    expect(res?.status()).toBe(404)
    await expect(page.locator('h1:has-text("Looking for something?")')).toBeVisible({ timeout: 10000 })
  })

  test("CA-05: Guest clicking Start Now on /current-affairs-quizzes gets login popup modal", async ({
    page,
  }) => {
    // Navigate without authentication
    await page.goto(`${BASE_URL}/current-affairs-quizzes`, { waitUntil: "networkidle" })
    await page.waitForTimeout(1000)

    const card = page.locator('[data-testid="current-affairs-quiz-card"]').filter({
      hasText: "UPSC Economy CA",
    }).first()
    await expect(card).toBeVisible({ timeout: 15000 })

    const startBtn = card.locator('a, button').filter({ hasText: /Start|Resume|Take Test|Attempt/i }).first()
    await expect(startBtn).toBeVisible({ timeout: 5000 })
    await startBtn.click()

    // Login modal opens
    const modal = page.locator('[data-testid="mobile-auth-modal"]').or(page.locator('text="Enter your mobile number to get started"'))
    await expect(modal.first()).toBeVisible({ timeout: 8000 })
  })

  test("CA-06: Hidden system series is NOT listed in /test-series catalogue or sitemap.xml", async ({
    request,
  }) => {
    // 1. Catalogue check
    const catalogueRes = await request.get(`${BASE_URL}/test-series`)
    expect(catalogueRes.status()).toBe(200)
    const catalogueText = await catalogueRes.text()
    expect(catalogueText).not.toContain("current-affairs-system-series")

    // 2. Sitemap check
    const sitemapRes = await request.get(`${BASE_URL}/sitemap.xml`)
    expect(sitemapRes.status()).toBe(200)
    const sitemapText = await sitemapRes.text()
    expect(sitemapText).not.toContain("current-affairs-system-series")
    expect(sitemapText).toContain("/current-affairs-quizzes/upsc-economy-ca")
  })

  test("CA-07: Quiz can be started, questions answered, and submitted to view score", async ({
    page,
  }) => {
    if (studentUser?.id) {
      await prisma.examAttempt.deleteMany({
        where: { userId: studentUser.id },
      }).catch(() => {})
    }

    await loginAs(page, studentUser.email)

    // 1. Open instructions
    await page.goto(`${BASE_URL}/current-affairs-quizzes/upsc-economy-ca/instructions`, { waitUntil: "networkidle" })
    const nextBtn = page.locator('a:has-text("Next")').first()
    await expect(nextBtn).toBeVisible({ timeout: 10000 })
    await nextBtn.click()

    // 2. Declaration page
    await page.waitForURL((url) => url.pathname.includes("declaration"), { timeout: 20000 })
    const agreeLabel = page.locator('label:has-text("I have read and understood the instructions")')
    await expect(agreeLabel).toBeVisible({ timeout: 10000 })
    await agreeLabel.click()

    const proceedBtn = page.locator('button:has-text("I am ready to begin")').first()
    await expect(proceedBtn).toBeEnabled({ timeout: 5000 })
    await proceedBtn.click()

    // 3. Attempt screen
    await page.waitForURL((url) => url.pathname.includes("attempt"), { timeout: 30000 })
    expect(page.url()).toContain("/attempt")

    await page.waitForTimeout(1500)

    // Select an option if visible
    const option = page.locator('label:has-text("2% to 6%"), label:has-text("A"), label:has-text("B")').first()
    if (await option.isVisible({ timeout: 5000 }).catch(() => false)) {
      await option.click()
    }

    // Submit test - open modal
    const submitBtn = page.locator('button:visible:has-text("Submit")').first()
    await expect(submitBtn).toBeVisible({ timeout: 10000 })
    await submitBtn.click()

    // Confirm dialog / modal
    const confirmBtn = page.locator('button:visible:has-text("Submit Now")').first()
    await expect(confirmBtn).toBeVisible({ timeout: 5000 })
    await confirmBtn.click()

    // 4. Result / Report page loads
    await page.waitForURL((url) => url.pathname.includes("result"), { timeout: 30000 })
    expect(page.url()).toContain("/result")
    await expect(page.locator('text=/YOUR SCORE|Score Breakdown|ALL INDIA RANK/i').first()).toBeVisible({ timeout: 20000 })
  })
})
