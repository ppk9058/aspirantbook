import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import { prisma, PASSWORD, newNonce, slugFor, loginAs } from "./test-series-e2e-helpers"
import bcrypt from "bcryptjs"

test.describe("Studio Lesson Gating & Isolation (Desktop + Mobile)", () => {
  test.setTimeout(180_000)

  let nonce: string
  let adminUser: any
  let course: any
  let phase1: any
  let lessonA: any
  let lessonB: any
  let lessonC: any
  let lessonD: any

  const makeBlocks = (prefix: string, count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      bid: `${prefix}-block-${i + 1}`,
      t: "p",
      x: `Paragraph content for ${prefix} item ${i + 1} with unique marker ${prefix}_BLOCK_${i + 1}`,
    }))
  }

  test.beforeAll(async () => {
    nonce = newNonce()
    const passwordHash = await bcrypt.hash(PASSWORD, 10)

    adminUser = await prisma.user.create({
      data: {
        email: `${slugFor(nonce)}-admin-lessongate@test.local`,
        name: `Admin LessonGate ${nonce}`,
        password: passwordHash,
        role: "ADMIN",
        selectedGoal: "bpsc",
      },
    })

    // Throwaway tutorial course with course default preview 100%
    course = await prisma.course.create({
      data: {
        title: `Studio Lesson Gate Course ${nonce}`,
        slug: `${slugFor(nonce)}-lesson-gate-course`,
        description: "Testing per-lesson gate controls, DB isolation, and guest slicing",
        difficulty: "BEGINNER",
        isPublished: true,
        status: "PUBLISHED",
        isGated: true,
        previewPercentage: 100,
        seoMode: "preview",
      },
    })

    // Phase 1 (Chapter) set to inherit
    phase1 = await prisma.chapter.create({
      data: {
        courseId: course.id,
        title: `Phase 1: Agent Foundations ${nonce}`,
        order: 1,
        gateMode: "inherit",
        previewPercentage: null,
      },
    })

    // 4 Lessons with 10 blocks each, initial gateMode "inherit"
    lessonA = await prisma.lesson.create({
      data: {
        chapterId: phase1.id,
        title: `Lesson A: Architecture Fundamentals ${nonce}`,
        order: 1,
        type: "READING",
        gateMode: "inherit",
        content: JSON.stringify({ blocks: makeBlocks("A", 10) }),
      },
    })

    lessonB = await prisma.lesson.create({
      data: {
        chapterId: phase1.id,
        title: `Lesson B: Tool Integration ${nonce}`,
        order: 2,
        type: "READING",
        gateMode: "inherit",
        content: JSON.stringify({ blocks: makeBlocks("B", 10) }),
      },
    })

    lessonC = await prisma.lesson.create({
      data: {
        chapterId: phase1.id,
        title: `Lesson C: Multi-Agent Workflows ${nonce}`,
        order: 3,
        type: "READING",
        gateMode: "inherit",
        content: JSON.stringify({ blocks: makeBlocks("C", 10) }),
      },
    })

    lessonD = await prisma.lesson.create({
      data: {
        chapterId: phase1.id,
        title: `Lesson D: Production Deployment ${nonce}`,
        order: 4,
        type: "READING",
        gateMode: "inherit",
        content: JSON.stringify({ blocks: makeBlocks("D", 10) }),
      },
    })
  })

  test.afterAll(async () => {
    try {
      await prisma.lesson.deleteMany({ where: { chapterId: phase1.id } })
      await prisma.chapter.deleteMany({ where: { courseId: course.id } })
      await prisma.course.delete({ where: { id: course.id } })
      await prisma.user.delete({ where: { id: adminUser.id } })
    } catch (e) {
      console.warn("Cleanup warning:", e)
    }
  })

  test("STUDIO-FLOW-01: Configure per-lesson gates via Studio UI, verify DB isolation, UI persistence, and guest slicing", async ({ page, context, browser }) => {
    const consoleErrors: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("favicon")) {
        consoleErrors.push(msg.text())
      }
    })

    // 1. Login as admin and navigate to the Tutorial Studio
    await loginAs(page, adminUser.email)
    await page.goto(`/admin/tutorials/${course.id}/edit`)
    await page.waitForLoadState("networkidle")

    // Assert Course Gate panel is loaded and shows enabled
    const gateToggle = page.locator('[data-testid="authwall-enable-toggle"]')
    await expect(gateToggle).toBeVisible()
    await expect(gateToggle).toHaveAttribute("aria-checked", "true")

    const toolbar = page.locator('[data-testid="selected-gate-toolbar"]')

    // Lesson A: Set to Preview 20%
    const lessonARow = page.locator(`[data-testid="lesson-row-${lessonA.id}"]`)
    await expect(lessonARow).toBeVisible()
    await lessonARow.click()
    await expect(toolbar).toBeVisible()
    const selectA = toolbar.locator('[data-testid="item-gate-mode-select"]')
    await selectA.click()
    await page.getByRole("option", { name: "Preview %" }).click()
    const inputA = toolbar.locator('[data-testid="item-gate-preview-input"]')
    await expect(inputA).toBeVisible()
    await inputA.fill("20")
    await toolbar.locator('[data-testid="save-item-gate-btn"]').click()
    await expect(page.locator("text=Lesson gate updated").first()).toBeVisible({ timeout: 10000 })

    // Lesson B: Set to Fully locked (0%)
    const lessonBRow = page.locator(`[data-testid="lesson-row-${lessonB.id}"]`)
    await expect(lessonBRow).toBeVisible()
    await lessonBRow.click()
    const selectB = toolbar.locator('[data-testid="item-gate-mode-select"]')
    await selectB.click()
    await page.getByRole("option", { name: "Fully locked (0%)" }).click()
    await toolbar.locator('[data-testid="save-item-gate-btn"]').click()
    await expect(page.locator("text=Lesson gate updated").first()).toBeVisible({ timeout: 10000 })

    // Lesson C: Set to Preview 50%
    const lessonCRow = page.locator(`[data-testid="lesson-row-${lessonC.id}"]`)
    await expect(lessonCRow).toBeVisible()
    await lessonCRow.click()
    const selectC = toolbar.locator('[data-testid="item-gate-mode-select"]')
    await selectC.click()
    await page.getByRole("option", { name: "Preview %" }).click()
    const inputC = toolbar.locator('[data-testid="item-gate-preview-input"]')
    await expect(inputC).toBeVisible()
    await inputC.fill("50")
    await toolbar.locator('[data-testid="save-item-gate-btn"]').click()
    await expect(page.locator("text=Lesson gate updated").first()).toBeVisible({ timeout: 10000 })

    // Lesson D: Set to Free (100%)
    const lessonDRow = page.locator(`[data-testid="lesson-row-${lessonD.id}"]`)
    await expect(lessonDRow).toBeVisible()
    await lessonDRow.click()
    const selectD = toolbar.locator('[data-testid="item-gate-mode-select"]')
    await selectD.click()
    await page.getByRole("option", { name: "Free (100%)" }).click()
    await toolbar.locator('[data-testid="save-item-gate-btn"]').click()
    await expect(page.locator("text=Lesson gate updated").first()).toBeVisible({ timeout: 10000 })

    // Explicitly Save Gate Settings
    const saveGateBtn = page.locator('[data-testid="save-gate-settings-button"]')
    await saveGateBtn.click()
    await expect(page.locator("text=Gate settings saved successfully").first()).toBeVisible({ timeout: 15000 })

    // 2. RELOAD the Studio and Assert UI Persistence
    await page.reload()
    await page.waitForLoadState("networkidle")

    // Verify Lesson A row UI state (chip in row + badge in toolbar)
    const reloadedARow = page.locator(`[data-testid="lesson-row-${lessonA.id}"]`)
    await expect(reloadedARow).toContainText("20%")
    await reloadedARow.click()
    await expect(toolbar.locator('[data-testid="item-gate-mode-badge"]')).toContainText("Effective for guests: 20%")

    // Verify Lesson B row UI state
    const reloadedBRow = page.locator(`[data-testid="lesson-row-${lessonB.id}"]`)
    await expect(reloadedBRow).toContainText("Locked")
    await reloadedBRow.click()
    await expect(toolbar.locator('[data-testid="item-gate-mode-badge"]')).toContainText("Effective for guests: 0%")

    // Verify Lesson C row UI state
    const reloadedCRow = page.locator(`[data-testid="lesson-row-${lessonC.id}"]`)
    await expect(reloadedCRow).toContainText("50%")
    await reloadedCRow.click()
    await expect(toolbar.locator('[data-testid="item-gate-mode-badge"]')).toContainText("Effective for guests: 50%")

    // Verify Lesson D row UI state
    const reloadedDRow = page.locator(`[data-testid="lesson-row-${lessonD.id}"]`)
    await expect(reloadedDRow).toContainText("Free")
    await reloadedDRow.click()
    await expect(toolbar.locator('[data-testid="item-gate-mode-badge"]')).toContainText("Effective for guests: 100%")

    // Verify Phase 1 row UI state remains Inherit (100%) from Course
    const phase1Row = page.locator(`[data-testid="chapter-row-${phase1.id}"]`)
    await phase1Row.locator("div.cursor-pointer").first().click()
    await expect(toolbar.locator('[data-testid="item-gate-mode-badge"]')).toContainText("Effective for guests: 100%")

    // 3. Assert Database Isolation (Phase and Course UNTOUCHED, lessons individually updated)
    const dbPhase = await prisma.chapter.findUnique({ where: { id: phase1.id } })
    expect(dbPhase?.gateMode).toBe("inherit")
    expect(dbPhase?.previewPercentage).toBeNull()

    const dbCourse = await prisma.course.findUnique({ where: { id: course.id } })
    expect(dbCourse?.isGated).toBe(true)
    expect(dbCourse?.previewPercentage).toBe(100)

    const dbLessonA = await prisma.lesson.findUnique({ where: { id: lessonA.id } })
    expect(dbLessonA?.gateMode).toBe("preview")
    expect(dbLessonA?.previewPercentage).toBe(20)

    const dbLessonB = await prisma.lesson.findUnique({ where: { id: lessonB.id } })
    expect(dbLessonB?.gateMode).toBe("locked")
    expect(dbLessonB?.previewPercentage).toBe(0)

    const dbLessonC = await prisma.lesson.findUnique({ where: { id: lessonC.id } })
    expect(dbLessonC?.gateMode).toBe("preview")
    expect(dbLessonC?.previewPercentage).toBe(50)

    const dbLessonD = await prisma.lesson.findUnique({ where: { id: lessonD.id } })
    expect(dbLessonD?.gateMode).toBe("free")
    expect(dbLessonD?.previewPercentage).toBe(100)

    // 4. Assert Guest View & Server Slicing (Incognito)
    const guestContext = await browser.newContext({
      viewport: page.viewportSize() || undefined,
    })
    const guestPage = await guestContext.newPage()
    await guestPage.goto(`/tutorials/${course.slug}`)
    await guestPage.waitForLoadState("networkidle")

    const authwallGateSelector = 'section[role="region"][aria-label="Content Gate"]'

    const selectLesson = async (p: typeof guestPage, pattern: RegExp) => {
      const indexBtn = p.locator('header button[aria-label="Index"]')
      if (await indexBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await indexBtn.click()
        await p.waitForTimeout(300)
      }
      const btn = p.locator("button.asp-nv").filter({ hasText: pattern, visible: true }).first()
      await btn.waitFor({ state: "visible", timeout: 8000 })
      await btn.click()
      await p.waitForTimeout(400)
    }

    // --- Check Lesson A (20% = 2 blocks visible) ---
    await selectLesson(guestPage, /Lesson A/i)
    let contentA = await guestPage.content()
    expect(contentA).toContain("A_BLOCK_1")
    expect(contentA).toContain("A_BLOCK_2")
    expect(contentA).not.toContain("A_BLOCK_3")
    expect(contentA).not.toContain("A_BLOCK_10")
    await expect(guestPage.locator(authwallGateSelector)).toBeVisible()

    // --- Check Lesson B (0% Locked = no blocks visible, title + Authwall only) ---
    await selectLesson(guestPage, /Lesson B/i)
    let contentB = await guestPage.content()
    expect(contentB).not.toContain("B_BLOCK_1")
    expect(contentB).not.toContain("B_BLOCK_10")
    await expect(guestPage.locator(authwallGateSelector)).toBeVisible()

    // --- Check Lesson C (50% = 5 blocks visible) ---
    await selectLesson(guestPage, /Lesson C/i)
    let contentC = await guestPage.content()
    expect(contentC).toContain("C_BLOCK_1")
    expect(contentC).toContain("C_BLOCK_5")
    expect(contentC).not.toContain("C_BLOCK_6")
    expect(contentC).not.toContain("C_BLOCK_10")
    await expect(guestPage.locator(authwallGateSelector)).toBeVisible()

    // --- Check Lesson D (100% Free = all blocks visible, NO Authwall) ---
    await selectLesson(guestPage, /Lesson D/i)
    let contentD = await guestPage.content()
    expect(contentD).toContain("D_BLOCK_1")
    expect(contentD).toContain("D_BLOCK_10")
    await expect(guestPage.locator(authwallGateSelector)).not.toBeVisible()

    await guestContext.close()

    // 5. Revert Lesson B back to Inherit and assert clean isolation
    await page.goto(`/admin/tutorials/${course.id}/edit`)
    await page.waitForLoadState("networkidle")

    const resetBRow = page.locator(`[data-testid="lesson-row-${lessonB.id}"]`)
    await resetBRow.click()
    const resetBSelect = page.locator('[data-testid="selected-gate-toolbar"] [data-testid="item-gate-mode-select"]')
    await resetBSelect.click()
    await page.getByRole("option", { name: "Inherit" }).click()
    await page.locator('[data-testid="selected-gate-toolbar"] [data-testid="save-item-gate-btn"]').click()
    await expect(page.locator("text=Lesson gate updated").first()).toBeVisible({ timeout: 10000 })

    // Verify UI shows Inherit badge
    await expect(page.locator('[data-testid="selected-gate-toolbar"] [data-testid="item-gate-mode-badge"]')).toContainText("Effective for guests: 100%")

    // DB verify: Lesson B is inherit, others untouched
    const updatedLessonB = await prisma.lesson.findUnique({ where: { id: lessonB.id } })
    expect(updatedLessonB?.gateMode).toBe("inherit")
    expect(updatedLessonB?.previewPercentage).toBeNull()

    const dbPhaseAfter = await prisma.chapter.findUnique({ where: { id: phase1.id } })
    expect(dbPhaseAfter?.gateMode).toBe("inherit")

    const dbLessonAAfter = await prisma.lesson.findUnique({ where: { id: lessonA.id } })
    expect(dbLessonAAfter?.gateMode).toBe("preview")
    expect(dbLessonAAfter?.previewPercentage).toBe(20)

    // Guest verify: Lesson B now inherits 100% (from Course) and shows full content
    const guestContext2 = await browser.newContext({
      viewport: page.viewportSize() || undefined,
    })
    const guestPage2 = await guestContext2.newPage()
    await guestPage2.goto(`/tutorials/${course.slug}`)
    await guestPage2.waitForLoadState("networkidle")

    await selectLesson(guestPage2, /Lesson B/i)
    const contentBAfter = await guestPage2.content()
    expect(contentBAfter).toContain("B_BLOCK_1")
    expect(contentBAfter).toContain("B_BLOCK_10")
    await expect(guestPage2.locator(authwallGateSelector)).not.toBeVisible()
    await guestContext2.close()

    // 6. Assert Zero activeBlocks TypeError console errors
    const activeBlocksErrors = consoleErrors.filter(
      (e) => e.includes("Cannot read properties of undefined") || e.includes("activeBlocks")
    )
    expect(activeBlocksErrors).toHaveLength(0)
  })

  test("STUDIO-LAYOUT-02: Verify responsive layout on desktop (1440px) and mobile (375px) without overflow or clipping", async ({ page }) => {
    await loginAs(page, adminUser.email)

    // Test on Desktop (1440px)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`/admin/tutorials/${course.id}/edit`)
    await page.waitForLoadState("networkidle")

    const hasHorizontalOverflowDesktop = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalOverflowDesktop).toBe(false)

    // Select first lesson to open gate toolbar
    await page.locator(`[data-testid="lesson-row-${lessonA.id}"]`).click()
    const desktopToolbar = page.locator('[data-testid="selected-gate-toolbar"]')
    await expect(desktopToolbar).toBeVisible()
    const firstLessonBadge = desktopToolbar.locator('[data-testid="item-gate-mode-badge"]')
    await expect(firstLessonBadge).toBeVisible()

    // Test on Mobile (375px)
    await page.setViewportSize({ width: 375, height: 667 })
    await page.reload()
    await page.waitForLoadState("networkidle")

    // Select first lesson on mobile
    await page.locator(`[data-testid="lesson-row-${lessonA.id}"]`).click()
    const mobileToolbar = page.locator('[data-testid="selected-gate-toolbar"]')
    await expect(mobileToolbar).toBeVisible()

    const hasHorizontalOverflowMobile = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalOverflowMobile).toBe(false)

    const mobileSelector = mobileToolbar.locator('[data-testid="item-gate-mode-select"]')
    await expect(mobileSelector).toBeVisible()
  })

  test("STUDIO-GUARD-03: LessonEditor safely handles undefined or error server action response and renders Retry button", async ({ page }) => {
    await loginAs(page, adminUser.email)
    await page.goto(`/admin/tutorials/${course.id}/edit`)
    await page.waitForLoadState("networkidle")

    // 1. Intercept next-action server call to simulate server error/undefined
    let simulateError = true
    await page.route("**/admin/tutorials/**", async (route) => {
      const headers = route.request().headers()
      if (simulateError && route.request().method() === "POST" && headers["next-action"]) {
        await route.abort("failed")
        return
      }
      await route.continue()
    })

    // Click on Lesson A to select and trigger fetchBlocks
    const lessonTitle = page.locator(`[data-testid="lesson-row-${lessonA.id}"]`).locator("span", { hasText: "Lesson A" }).first()
    await lessonTitle.click()

    // Assert: Error container appears gracefully with Retry button instead of unhandled crash
    const errorContainer = page.locator('[data-testid="lesson-blocks-error-container"]')
    await expect(errorContainer).toBeVisible({ timeout: 10000 })
    await expect(errorContainer).toContainText("Could Not Load Lesson Blocks")

    const retryBtn = page.locator('[data-testid="retry-loading-blocks-btn"]')
    await expect(retryBtn).toBeVisible()

    // 2. Disarm simulated failure and click Retry
    simulateError = false
    await retryBtn.click()

    // Assert: Editor recovers cleanly and loads Rosera Editor
    const roseraEditor = page.locator("text=Rosera Editor")
    await expect(roseraEditor.first()).toBeVisible({ timeout: 10000 })
  })
})
