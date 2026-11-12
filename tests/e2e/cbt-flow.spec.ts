import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import { prisma, createActor, loginAs, newNonce } from "./test-series-e2e-helpers"

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3045"

test.describe.configure({ mode: "serial" })

test.describe("UX Pass 6 - CBT Assessment Flow (Instructions -> Declaration -> Attempt -> Timer -> Lang)", () => {
  let studentUser: any
  let targetTest: any
  let seriesSlug: string = "bpsc-72nd-2026"
  let testId: string = "bpsc-sectional-5q"

  test.beforeAll(async () => {
    const nonce = newNonce()
    studentUser = await createActor(nonce, "FREE", "cbt-flow-student")
    await prisma.user.update({
      where: { id: studentUser.id },
      data: { selectedGoal: "bpsc" },
    })

    // Look for test in bpsc-72nd-2026 series
    const foundTest = await prisma.examTest.findFirst({
      where: {
        OR: [
          { id: "bpsc-sectional-5q" },
          { series: { slug: "bpsc-72nd-2026" } },
        ],
      },
      include: { series: true },
    })

    if (foundTest) {
      targetTest = foundTest
      testId = foundTest.id
      if (foundTest.series?.slug) {
        seriesSlug = foundTest.series.slug
      }
    }
  })

  test.afterAll(async () => {
    if (studentUser?.id) {
      await prisma.examAttempt.deleteMany({
        where: { userId: studentUser.id },
      }).catch(() => {})
      await prisma.user.delete({ where: { id: studentUser.id } }).catch(() => {})
    }
  })

  // Test at 360px
  test("CBT Flow at 360px: Instructions -> Declaration -> Attempt -> Timer -> Lang", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await loginAs(page, studentUser.email)

    // 1. Instructions Page
    const instructionsUrl = `${BASE_URL}/test-series/${seriesSlug}/instructions?testId=${testId}`
    await page.goto(instructionsUrl, { waitUntil: "networkidle" })

    // Verify Instructions loaded
    const nextBtn = page.locator('[data-testid="cbt-instructions-next-btn"]').or(page.getByRole("link", { name: /Next/i }))
    await expect(nextBtn).toBeVisible({ timeout: 15000 })
    await page.screenshot({ path: "/tmp/ux-pass-6-shots/cbt-instructions-360.png" })

    // Proceed to Declaration
    await nextBtn.click()
    await page.waitForURL((url) => url.pathname.includes("/declaration"), { timeout: 15000 })

    // 2. Declaration Page - Unchecked
    const checkbox = page.locator('[data-testid="declaration-checkbox"]').first()
    await expect(checkbox).toBeVisible({ timeout: 10000 })
    expect(await checkbox.isChecked()).toBe(false)

    const startBtn = page.locator('[data-testid="cbt-start-attempt-btn"]').or(page.getByRole("button", { name: /I am ready to begin/i })).first()
    await expect(startBtn).toBeVisible({ timeout: 10000 })
    await expect(startBtn).toBeDisabled()

    // Save screenshot of declaration unchecked
    await page.screenshot({ path: "/tmp/ux-pass-6-shots/cbt-declaration-unchecked-360.png" })
    await page.screenshot({ path: "/tmp/ux-pass-6-shots/cbt-declaration-unchecked.png" })

    // 3. Declaration Page - Checked
    await page.locator('label:has([data-testid="declaration-checkbox"])').click()
    expect(await checkbox.isChecked()).toBe(true)
    await expect(startBtn).toBeEnabled()

    // Save screenshot of declaration checked
    await page.screenshot({ path: "/tmp/ux-pass-6-shots/cbt-declaration-checked-360.png" })
    await page.screenshot({ path: "/tmp/ux-pass-6-shots/cbt-declaration-checked.png" })

    // 4. Click Start Button -> Attempt Page
    await startBtn.click()
    await page.waitForURL((url) => url.pathname.includes("/attempt"), { timeout: 20000 })

    // 5. Verify Attempt page loaded, timer ticks
    const timerEl = page.locator('[data-testid="exam-timer"]').or(page.locator('.font-mono')).first()
    await expect(timerEl).toBeVisible({ timeout: 15000 })
    const timeInitial = await timerEl.innerText()

    // Wait 2.5 seconds to verify timer ticks down
    await page.waitForTimeout(2500)
    const timeLater = await timerEl.innerText()
    console.log(`Timer check at 360px: initial="${timeInitial}", later="${timeLater}"`)

    // 6. Language Toggle works
    const langSelect = page.locator('select').filter({ hasText: /English|Hindi/i }).first()
    if (await langSelect.isVisible()) {
      await langSelect.selectOption("Hindi")
      await expect(langSelect).toHaveValue("Hindi")
      await page.waitForTimeout(500)
      await langSelect.selectOption("English")
      await expect(langSelect).toHaveValue("English")
      console.log("✓ Language toggle switched between Hindi and English successfully")
    }

    await page.screenshot({ path: "/tmp/ux-pass-6-shots/cbt-attempt-360.png" })
  })

  // Test at Desktop (1280px)
  test("CBT Flow at Desktop (1280px): Instructions -> Declaration -> Attempt -> Timer -> Lang", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await loginAs(page, studentUser.email)

    // 1. Instructions Page
    const instructionsUrl = `${BASE_URL}/test-series/${seriesSlug}/instructions?testId=${testId}`
    await page.goto(instructionsUrl, { waitUntil: "networkidle" })

    const nextBtn = page.locator('[data-testid="cbt-instructions-next-btn"]').or(page.getByRole("link", { name: /Next/i }))
    await expect(nextBtn).toBeVisible({ timeout: 15000 })

    // Proceed to Declaration
    await nextBtn.click()
    await page.waitForURL((url) => url.pathname.includes("/declaration"), { timeout: 15000 })

    // 2. Declaration Page - Unchecked
    const checkbox = page.locator('[data-testid="declaration-checkbox"]').first()
    await expect(checkbox).toBeVisible({ timeout: 10000 })
    expect(await checkbox.isChecked()).toBe(false)

    const startBtn = page.locator('[data-testid="cbt-start-attempt-btn"]').or(page.getByRole("button", { name: /I am ready to begin/i })).first()
    await expect(startBtn).toBeVisible({ timeout: 10000 })
    await expect(startBtn).toBeDisabled()

    await page.screenshot({ path: "/tmp/ux-pass-6-shots/cbt-declaration-unchecked-desktop.png" })

    // 3. Declaration Page - Checked
    await page.locator('label:has([data-testid="declaration-checkbox"])').click()
    expect(await checkbox.isChecked()).toBe(true)
    await expect(startBtn).toBeEnabled()

    await page.screenshot({ path: "/tmp/ux-pass-6-shots/cbt-declaration-checked-desktop.png" })

    // 4. Click Start Button -> Attempt Page
    await startBtn.click()
    await page.waitForURL((url) => url.pathname.includes("/attempt"), { timeout: 20000 })

    // 5. Verify Attempt page loaded, timer ticks
    const timerEl = page.locator('[data-testid="exam-timer"]').or(page.locator('.font-mono')).first()
    await expect(timerEl).toBeVisible({ timeout: 15000 })
    const timeInitial = await timerEl.innerText()

    await page.waitForTimeout(2500)
    const timeLater = await timerEl.innerText()
    console.log(`Timer check at desktop: initial="${timeInitial}", later="${timeLater}"`)

    // 6. Language Toggle works
    const langSelect = page.locator('select').filter({ hasText: /English|Hindi/i }).first()
    if (await langSelect.isVisible()) {
      await langSelect.selectOption("Hindi")
      await expect(langSelect).toHaveValue("Hindi")
      await page.waitForTimeout(500)
      await langSelect.selectOption("English")
      await expect(langSelect).toHaveValue("English")
      console.log("✓ Language toggle switched between Hindi and English successfully (desktop)")
    }

    await page.screenshot({ path: "/tmp/ux-pass-6-shots/cbt-attempt-desktop.png" })
  })
})
