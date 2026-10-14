import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import { prisma, createActor, loginAs, newNonce } from "./test-series-e2e-helpers"

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3045"

test.describe("Reproduction Suite: CA Quiz 404 on instructions page", () => {
  let studentUser: any

  test.beforeAll(async () => {
    const nonce = newNonce()
    studentUser = await createActor(nonce, "FREE", "ca-student-repro")
  })

  test.afterAll(async () => {
    if (studentUser?.id) {
      await prisma.user.delete({ where: { id: studentUser.id } }).catch(() => {})
    }
  })

  test("REPRO-01: Student on /current-affairs-quizzes clicks quiz card, instructions must NOT be 404", async ({
    page,
  }) => {
    // 1. Log in as student
    await loginAs(page, studentUser.email)

    // 2. Visit /current-affairs-quizzes
    await page.goto(`${BASE_URL}/current-affairs-quizzes`, { waitUntil: "networkidle" })
    await page.waitForTimeout(1500)

    // 3. Find the quiz card for "UPSC Economy CA"
    const card = page.locator('[data-testid="current-affairs-quiz-card"]').filter({
      hasText: "UPSC Economy CA",
    }).first()
    await expect(card).toBeVisible({ timeout: 15000 })

    // 4. Click the action button on the quiz card
    const actionBtn = card.locator('a').filter({ hasText: /Start|Resume|Take Test|Attempt/i }).first()
    await expect(actionBtn).toBeVisible({ timeout: 5000 })
    const href = await actionBtn.getAttribute("href")
    console.log("Action button href:", href)

    await Promise.all([
      page.waitForURL((url) => url.pathname.includes("instructions"), { timeout: 10000 }).catch((e) => console.log("Navigation timeout:", e.message)),
      actionBtn.click(),
    ])

    console.log("Current page URL after click:", page.url())

    // 5. Expect to land on instructions page and verify it is NOT 404
    await page.waitForLoadState("networkidle")
    expect(page.url()).toContain("instructions")

    // The page must NOT show 404 or "Page Not Found"
    const notFoundHeading = page.locator('text="404"').or(page.locator('text="Page Not Found"'))
    await expect(notFoundHeading).not.toBeVisible()

    // It should show instructions content or instructions client
    const instructionsHeading = page.locator('text="Test Instructions"').or(page.locator('text="General Instructions"')).or(page.locator('text="Read Instructions Carefully"'))
    await expect(instructionsHeading.first()).toBeVisible({ timeout: 10000 })
  })
})
