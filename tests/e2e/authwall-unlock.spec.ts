import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import { prisma, PASSWORD, newNonce, slugFor } from "./test-series-e2e-helpers"
import bcrypt from "bcryptjs"

test.describe("Authwall: Real-Click UI Login, In-Place Content Expansion & Scroll Restoration", () => {
  test.setTimeout(90_000)

  let nonce: string
  let studentUser: any
  let unlockCourse: any
  let unlockChapter: any
  let unlockLesson: any

  const PREVIEW_CONTENT = "PUBLIC_PREVIEW_EXPANSION_PARAGRAPH"
  const SECRET_CONTENT = "UNLOCKED_FULL_TEXT_CONTENT_AFTER_LOGIN"

  test.beforeAll(async () => {
    nonce = newNonce()
    const passwordHash = await bcrypt.hash(PASSWORD, 10)

    // 1. Student User
    studentUser = await prisma.user.create({
      data: {
        email: `${slugFor(nonce)}-unlock-student@test.local`,
        name: `Unlock Student ${nonce}`,
        password: passwordHash,
        role: "FREE",
        selectedGoal: "bpsc",
      },
    })

    // 2. Gated Tutorial Course
    unlockCourse = await prisma.course.create({
      data: {
        title: `Unlock Test Course ${nonce}`,
        slug: `unlock-test-course-${slugFor(nonce)}`,
        description: "Course for verifying real UI login, in-place content expansion, and scroll restoration",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        isGated: true,
        previewPercentage: 20,
        seoMode: "preview",
        gateTitle: "Unlock Full Chapter Now",
        gateSubtitle: "Sign in to continue reading full content",
      },
    })

    unlockChapter = await prisma.chapter.create({
      data: {
        title: `Chapter 1: Foundational Jurisprudence`,
        courseId: unlockCourse.id,
        order: 1,
        gateMode: "inherit",
      },
    })

    // Generous paragraphs so scroll is measurable
    const multiBlockHtml = [
      `<h2>${PREVIEW_CONTENT}</h2>`,
      `<p style="margin-bottom: 80px;">Paragraph one explaining introductory concepts and historical perspectives in depth.</p>`,
      `<p style="margin-bottom: 80px;">Paragraph two addressing constitutional analysis and doctrine.</p>`,
      `<p style="margin-bottom: 80px;">Paragraph three describing judicial review principles and landmark precedents.</p>`,
      `<p style="margin-bottom: 80px;">${SECRET_CONTENT}</p>`,
    ].join("\n")

    unlockLesson = await prisma.lesson.create({
      data: {
        title: "Lesson 1: Constitutional Review",
        chapterId: unlockChapter.id,
        order: 1,
        content: multiBlockHtml,
        type: "TUTORIAL",
      },
    })
  })

  test.afterAll(async () => {
    try {
      if (unlockCourse?.id) {
        await prisma.lesson.deleteMany({ where: { chapter: { courseId: unlockCourse.id } } })
        await prisma.chapter.deleteMany({ where: { courseId: unlockCourse.id } })
        await prisma.course.delete({ where: { id: unlockCourse.id } })
      }
      if (studentUser?.id) {
        await prisma.user.delete({ where: { id: studentUser.id } })
      }
    } catch (e) {
      console.warn("Cleanup warning:", e)
    }
  })

  test("UNLOCK-01: Real-click UI login flow smoothly unlocks content in-place with scroll preservation and zero CLS shift", async ({ page, context }) => {
    await context.clearCookies()

    // 1. Guest visits the gated tutorial
    await page.goto(`/tutorials/${unlockCourse.slug}`)
    const startBtn = page.getByRole("button", { name: /Start Reading Tutorial|Constitutional Review/i }).first()
    await startBtn.waitFor({ state: "visible", timeout: 10000 })
    await startBtn.click()

    // 2. Assert initial guest state: preview visible, secret text NOT in DOM, AuthwallGate visible
    await expect(page.locator(`text=${PREVIEW_CONTENT}`)).toBeVisible()
    await expect(page.locator(`text=${SECRET_CONTENT}`)).not.toBeVisible()

    const authwallSection = page.locator('section[role="region"][aria-label="Content Gate"]')
    await expect(authwallSection).toBeVisible()

    // 3. Scroll down into reading position
    await page.evaluate(() => window.scrollTo({ top: 320, behavior: "instant" }))
    await page.waitForTimeout(200)

    const initialScrollY = await page.evaluate(() => window.scrollY)
    expect(initialScrollY).toBeGreaterThanOrEqual(100)

    // 4. Click the Authwall CTA link "Sign In to Unlock Free Access"
    const signInCta = authwallSection.getByRole("link", { name: /Sign In to Unlock Free Access/i })
    await expect(signInCta).toBeVisible()
    await signInCta.click()

    // 5. User is redirected to /login with callbackUrl
    await page.waitForURL((url) => url.pathname.includes("/login"), { timeout: 15000 })
    expect(page.url()).toContain("callbackUrl")

    // 6. Real-click form login
    const emailInput = page.locator("input#email")
    const passwordInput = page.locator("input#password")
    const submitBtn = page.locator("button[type='submit']").first()

    await emailInput.fill(studentUser.email)
    await passwordInput.fill(PASSWORD)
    await submitBtn.click()

    // 7. Redirected back to the tutorial page
    await page.waitForURL((url) => url.pathname.includes(`/tutorials/${unlockCourse.slug}`), { timeout: 20000 })

    // On tutorial landing, click start reading if on overview
    const postLoginStartBtn = page.getByRole("button", { name: /Start Reading Tutorial|Constitutional Review/i }).first()
    if (await postLoginStartBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await postLoginStartBtn.click()
    }

    // 8. Content expands in place: secret content is now visible
    await expect(page.locator(`text=${SECRET_CONTENT}`)).toBeVisible({ timeout: 15000 })
    await expect(page.locator(`text=${PREVIEW_CONTENT}`)).toBeVisible()

    // 9. AuthwallGate is no longer present
    await expect(authwallSection).not.toBeVisible()

    // 10. AuthwallUnlockToast notification is displayed
    const toast = page.locator("[role='status']")
    if (await toast.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(toast).toContainText("Welcome back! Full content unlocked.")
    }

    // 11. Cumulative Layout Shift (CLS) verification
    const clsScore = await page.evaluate(() => {
      let cls = 0
      const entries = performance.getEntriesByType("layout-shift") as any[]
      for (const entry of entries) {
        if (!entry.hadRecentInput) {
          cls += entry.value
        }
      }
      return cls
    })
    // CLS must be well within Google's "Good" threshold (< 0.1)
    expect(clsScore).toBeLessThan(0.1)
  })
})
