import { test, expect } from "@playwright/test"

test.describe("Authwall Owner Findings Reproduction (Bug A, B, C)", () => {
  test.setTimeout(60_000)

  test("REPRO-B: Guest navigates back from /login without logging in triggers false 'Welcome back!' toast", async ({ page, context }) => {
    await context.clearCookies()

    // 1. Visit the tutorial as a guest
    await page.goto("/tutorials/agentic-engineering-zero-to-hero")
    
    // Click chapter 1
    const chapterBtn = page.getByRole("button", { name: /CHAPTER 1|What Is an AI Agent/i }).first()
    if (await chapterBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await chapterBtn.click()
    } else {
      const roadmapCard = page.locator("div", { hasText: /Phase 1/i }).first()
      await roadmapCard.click()
    }

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

    // 6. BUG B: Toast "Welcome back! Full content unlocked." currently appears even though user is still a guest!
    const toast = page.locator("[role='status']")
    await expect(toast).toBeVisible({ timeout: 5000 })
    await expect(toast).toContainText("Welcome back! Full content unlocked.")
    console.log("--> REPRODUCED BUG B: False unlock toast appeared for guest user on back navigation!")
  })

  test("REPRO-A: Chapter shows full chapter and Authwall says '100% preview' with MCQ included", async ({ page, context }) => {
    await context.clearCookies()

    // 1. Visit as guest
    await page.goto("/tutorials/agentic-engineering-zero-to-hero")

    const chapterBtn = page.getByRole("button", { name: /CHAPTER 1|What Is an AI Agent/i }).first()
    if (await chapterBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await chapterBtn.click()
    } else {
      const roadmapCard = page.locator("div", { hasText: /Phase 1/i }).first()
      await roadmapCard.click()
    }

    // 2. Authwall card says "You are viewing a 100% preview"
    const authwallSection = page.locator('section[role="region"][aria-label="Content Gate"]')
    await expect(authwallSection).toBeVisible({ timeout: 10000 })
    
    const cardText = await authwallSection.textContent()
    expect(cardText).toContain("100% preview")
    console.log("--> REPRODUCED BUG A: Authwall card displays '100% preview' and full chapter content is rendered!")
  })
})
