import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import { prisma, PASSWORD, newNonce, slugFor, loginAs } from "./test-series-e2e-helpers"
import bcrypt from "bcryptjs"
import { chunkContent } from "@/lib/authwall/chunker"
import { resolveAccess } from "@/lib/authwall/resolveAccess"

test.describe("Authwall Bugfix: Studio Persistence, Revalidation & LessonEditor Safety", () => {
  test.setTimeout(120_000)

  let nonce: string
  let adminUser: any
  let course: any
  let chapter1: any
  let chapter2: any
  let lesson1: any
  let lesson2: any

  const SECRET_CONTENT = "CONFIDENTIAL_TUTORIAL_SECRET_BLOCK_XYZ"
  const PREVIEW_CONTENT = "PUBLIC_INTRODUCTION_TUTORIAL_PREVIEW_ABC"

  test.beforeAll(async () => {
    nonce = newNonce()
    const passwordHash = await bcrypt.hash(PASSWORD, 10)

    adminUser = await prisma.user.create({
      data: {
        email: `${slugFor(nonce)}-admin-bugfix@test.local`,
        name: `Admin Bugfix ${nonce}`,
        password: passwordHash,
        role: "ADMIN",
        selectedGoal: "bpsc",
      },
    })

    // Create course with 2 chapters and JSON blocks
    course = await prisma.course.create({
      data: {
        title: `Bugfix Course Studio ${nonce}`,
        slug: `${slugFor(nonce)}-course-studio`,
        description: "Testing studio persistence and lesson editor guards",
        difficulty: "BEGINNER",
        isPublished: true,
        status: "PUBLISHED",
        isGated: false,
        previewPercentage: 100,
        seoMode: "preview",
      },
    })

    chapter1 = await prisma.chapter.create({
      data: {
        courseId: course.id,
        title: `Chapter 1 - Agent Fundamentals ${nonce}`,
        order: 1,
        gateMode: "inherit",
      },
    })

    chapter2 = await prisma.chapter.create({
      data: {
        courseId: course.id,
        title: `Chapter 2 - Advanced Agents ${nonce}`,
        order: 2,
        gateMode: "inherit",
      },
    })

    // Lesson 1 with 5 blocks stored as JSON { blocks: [...] }
    const blocksL1 = [
      { bid: "b1", t: "p", x: PREVIEW_CONTENT },
      { bid: "b2", t: "p", x: "Second paragraph of introduction" },
      { bid: "b3", t: "p", x: "Third paragraph in the middle" },
      { bid: "b4", t: "p", x: SECRET_CONTENT },
      { bid: "b5", t: "quiz", x: "End of chapter question", a: 1, why: "Secret explanation" },
    ]

    lesson1 = await prisma.lesson.create({
      data: {
        chapterId: chapter1.id,
        title: "Lesson 1: What is an AI Agent",
        order: 1,
        type: "READING",
        content: JSON.stringify({ blocks: blocksL1 }),
      },
    })

    lesson2 = await prisma.lesson.create({
      data: {
        chapterId: chapter2.id,
        title: "Lesson 2: Multi-Agent Systems",
        order: 1,
        type: "READING",
        content: JSON.stringify({ blocks: blocksL1 }),
      },
    })
  })

  test("UNIT-01: chunkContent correctly handles JSON objects with blocks and resolves 20% slice", () => {
    // 1. JSON string with { blocks: [...] }
    const rawJson = JSON.stringify({
      blocks: [
        { bid: "1", t: "p", x: "Block 1" },
        { bid: "2", t: "p", x: "Block 2" },
        { bid: "3", t: "p", x: "Block 3" },
        { bid: "4", t: "p", x: "Block 4" },
        { bid: "5", t: "p", x: "Block 5" },
      ],
    })

    const chunks = chunkContent(rawJson)
    expect(chunks.length).toBe(5)
    expect(chunks[0].bid).toBe("1")
    expect(chunks[4].bid).toBe("5")

    // 2. resolveAccess with 20% preview on 5 items
    const result20 = resolveAccess({
      viewer: { userId: null },
      content: rawJson,
      containerGate: { isGated: true, previewPercentage: 20 },
      itemGate: { gateMode: "inherit" },
    })

    expect(result20.isLockedForGuest).toBe(true)
    expect(result20.effectivePercentage).toBe(20)
    expect(result20.totalItemsCount).toBe(5)
    expect(result20.previewCount).toBe(1)
    expect(result20.previewBlocks.length).toBe(1)
    expect(result20.previewBlocks[0].x).toBe("Block 1")

    // 3. resolveAccess with 0% (locked)
    const result0 = resolveAccess({
      viewer: { userId: null },
      content: rawJson,
      containerGate: { isGated: true, previewPercentage: 20 },
      itemGate: { gateMode: "locked" },
    })

    expect(result0.isLockedForGuest).toBe(true)
    expect(result0.effectivePercentage).toBe(0)
    expect(result0.previewCount).toBe(0)
    expect(result0.previewBlocks.length).toBe(0)

    // 4. resolveAccess with 100% preview
    const result100 = resolveAccess({
      viewer: { userId: null },
      content: rawJson,
      containerGate: { isGated: true, previewPercentage: 100 },
      itemGate: { gateMode: "inherit" },
    })

    expect(result100.isLockedForGuest).toBe(false)
    expect(result100.effectivePercentage).toBe(100)
    expect(result100.previewCount).toBe(5)
    expect(result100.previewBlocks.length).toBe(5)
  })

  test("STUDIO-BUGFIX: Gate settings persist after save, reload, and guest view slices properly", async ({ page, context }) => {
    const consoleErrors: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("favicon")) {
        consoleErrors.push(msg.text())
      }
    })

    // 1. Log in as admin and visit Tutorial Studio
    await loginAs(page, adminUser.email)
    await page.goto(`/admin/tutorials/${course.id}/edit`)
    await page.waitForLoadState("networkidle")

    // 2. Toggle Authwall Gate ON
    const gateToggle = page.locator('[data-testid="authwall-enable-toggle"]')
    await gateToggle.waitFor({ state: "visible", timeout: 15000 })
    
    // Check initial state
    const isChecked = await gateToggle.getAttribute("aria-checked")
    if (isChecked !== "true") {
      await gateToggle.click()
    }

    // 3. Change default preview to 20% via the input box
    const previewInput = page.locator('[data-testid="authwall-preview-input"]')
    await previewInput.waitFor({ state: "visible" })
    await previewInput.fill("20")
    await previewInput.blur()

    // 4. Select Bot-Full SEO Mode
    const seoSelect = page.locator('[data-testid="authwall-seo-mode-select"]')
    await seoSelect.click()
    const botFullOption = page.getByRole("option", { name: /Bot-Full/i })
    await botFullOption.click()

    // 5. Fill custom Title & Subtitle
    const titleInput = page.locator("#gate-title-input")
    await titleInput.fill("Persisted Master Authwall Title")
    const subtitleInput = page.locator("#gate-subtitle-input")
    await subtitleInput.fill("Persisted Master Authwall Subtitle")

    // 6. Click explicit "Save Gate Settings" button
    const saveGateBtn = page.locator('[data-testid="save-gate-settings-button"]')
    await saveGateBtn.click()

    // Wait for success toast
    await expect(page.locator("text=Gate settings saved successfully")).toBeVisible({ timeout: 10000 })

    // 7. Change Chapter 1 to "Locked (0%)"
    const chapter1Select = page.locator(`[data-testid="select-chapter-${chapter1.id}"]`).locator("..").locator("..").locator('[data-testid="item-gate-mode-select"]')
    await chapter1Select.click()
    const lockedOption = page.getByRole("option", { name: /Locked/i })
    await lockedOption.click()

    // Wait for chapter gate update toast
    await expect(page.locator("text=Chapter gate updated")).toBeVisible({ timeout: 10000 })

    // 8. RELOAD the Studio page to verify DB persistence and state synchronization
    await page.reload()
    await page.waitForLoadState("networkidle")

    // Assert: Authwall toggle remains ON
    await expect(page.locator('[data-testid="authwall-enable-toggle"]')).toHaveAttribute("aria-checked", "true")

    // Assert: Preview is 20%
    await expect(page.locator('[data-testid="authwall-preview-input"]')).toHaveValue("20")

    // Assert: SEO mode is Bot-Full
    await expect(page.locator('[data-testid="authwall-seo-mode-select"]')).toContainText("Bot-Full")

    // Assert: Custom Title & Subtitle persisted
    await expect(page.locator("#gate-title-input")).toHaveValue("Persisted Master Authwall Title")
    await expect(page.locator("#gate-subtitle-input")).toHaveValue("Persisted Master Authwall Subtitle")

    // Assert: Chapter 1 shows Locked badge
    const ch1Row = page.locator(`[data-testid="select-chapter-${chapter1.id}"]`).locator("..").locator("..")
    await expect(ch1Row.locator("text=Locked (0%)").first()).toBeVisible()

    // 9. Assert ZERO console errors in the Studio (Bug B)
    const activeBlocksErrors = consoleErrors.filter((e) => e.includes("Cannot read properties of undefined") || e.includes("activeBlocks"))
    expect(activeBlocksErrors).toHaveLength(0)

    // 10. Visit tutorial as Guest to verify real server slicing
    await context.clearCookies()
    await page.goto(`/tutorials/${course.slug}`)
    await page.waitForLoadState("networkidle")

    // Click Start Tutorial or Chapter 1
    const startTutorialBtn = page.getByRole("button", { name: /Start Reading Tutorial/i })
    if (await startTutorialBtn.isVisible().catch(() => false)) {
      await startTutorialBtn.click()
    } else {
      const ch1GuestBtn = page.locator("button.asp-nv", { hasText: /Chapter 1|What is an AI Agent/i }).first()
      await ch1GuestBtn.waitFor({ state: "visible", timeout: 10000 })
      await ch1GuestBtn.click()
    }

    // Assert: Chapter 1 is 0% locked -> secret content is NOT in DOM
    const guestHtml = await page.content()
    expect(guestHtml).not.toContain(SECRET_CONTENT)
    expect(guestHtml).not.toContain("End of chapter question")
    expect(guestHtml).not.toContain("Secret explanation")

    // Assert: AuthwallGate is visible with the persisted custom title & subtitle
    const authwallSection = page.locator('section[role="region"][aria-label="Content Gate"]')
    await expect(authwallSection).toBeVisible()
    await expect(authwallSection).toContainText("Persisted Master Authwall Title")
    await expect(authwallSection).toContainText("Persisted Master Authwall Subtitle")
  })
})
