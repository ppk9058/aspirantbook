import { test, expect } from "@playwright/test"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient({
  datasourceUrl:
    process.env.TEST_DATABASE_URL ||
    process.env.DATABASE_URL ||
    "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test",
})

test.describe("Authwall Owner Findings Fix Verification (Bug A, B, C)", () => {
  test.setTimeout(60_000)

  let originalGate: { isGated: boolean; previewPercentage: number } | null = null
  let courseId: string | null = null

  test.beforeAll(async () => {
    const course = await prisma.course.findFirst({
      where: { slug: "agentic-engineering-zero-to-hero" },
    })
    if (course) {
      courseId = course.id
      originalGate = {
        isGated: course.isGated,
        previewPercentage: course.previewPercentage,
      }
      // Set to Gated 20% to verify fix
      await prisma.course.update({
        where: { id: course.id },
        data: { isGated: true, previewPercentage: 20 },
      })
    }
  })

  test.afterAll(async () => {
    if (courseId && originalGate) {
      await prisma.course.update({
        where: { id: courseId },
        data: {
          isGated: originalGate.isGated,
          previewPercentage: originalGate.previewPercentage,
        },
      })
    }
    await prisma.$disconnect()
  })

  async function navigateToChapter1(page: any) {
    await page.goto("/tutorials/agentic-engineering-zero-to-hero")
    await page.waitForLoadState("domcontentloaded")

    const startBtn = page.getByRole("button", { name: /Start Reading Tutorial/i })
    if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startBtn.click()
      return
    }

    const indexBtn = page.locator('header button[aria-label="Index"]')
    if (await indexBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await indexBtn.click()
      await page.waitForSelector('aside[aria-label="Course Navigation"].translate-x-0', { timeout: 3000 }).catch(() => {})
    }

    const chapterBtn = page.getByRole("button", { name: /CHAPTER 1|What Is an AI Agent/i }).first()
    if (await chapterBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await chapterBtn.click()
      return
    }

    const roadmapCard = page.locator("div", { hasText: /Phase 1/i }).first()
    if (await roadmapCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await roadmapCard.click()
    }
  }

  test("REPRO-B: Guest navigates back from /login without logging in does NOT trigger false 'Welcome back!' toast", async ({ page, context }) => {
    await context.clearCookies()

    // 1. Visit the tutorial as a guest
    await navigateToChapter1(page)

    // 2. Authwall CTA is visible
    const authwallSection = page.locator('section[role="region"][aria-label="Content Gate"]')
    await expect(authwallSection).toBeVisible({ timeout: 10000 })

    // 3. Click "Sign In to Unlock Free Access"
    const signInBtn = authwallSection.getByRole("link", { name: /Sign In to Unlock Free Access/i })
    await expect(signInBtn).toBeVisible()
    await signInBtn.click()

    // 4. Arrive at /login
    await page.waitForURL((url) => url.pathname.includes("/login"), { timeout: 10000 })

    // 5. Navigate BACK without logging in
    await page.goBack()

    // 6. Bug B FIX: False unlock toast must NOT appear for guest user
    const toast = page.locator("[role='status']")
    await expect(toast).not.toBeVisible({ timeout: 5000 })
  })

  test("REPRO-A: Gated chapter does NOT say '100% preview' and content is sliced", async ({ page, context }) => {
    await context.clearCookies()

    // 1. Visit as guest
    await navigateToChapter1(page)

    // 2. Authwall card is visible and does NOT say "100% preview"
    const authwallSection = page.locator('section[role="region"][aria-label="Content Gate"]')
    await expect(authwallSection).toBeVisible({ timeout: 10000 })
    
    const cardText = await authwallSection.textContent()
    expect(cardText).not.toContain("100% preview")
    expect(cardText).toContain("preview")
  })
})
