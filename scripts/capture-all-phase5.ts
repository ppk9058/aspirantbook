import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

import { chromium } from "playwright"
import fs from "fs"
import path from "path"
import { prisma, createActor, loginThroughUi, newNonce } from "../tests/e2e/test-series-e2e-helpers"

async function main() {
  const outDir = "/Users/praveenkumar/.gemini/antigravity/brain/053254af-62c2-4dc5-8bb1-b3ed0831623c/screenshots"
  fs.mkdirSync(outDir, { recursive: true })

  await prisma.$connect()

  const railway = await prisma.course.findFirst({
    where: { slug: { startsWith: "railway-ntpc" } },
    orderBy: { createdAt: "desc" },
  })
  const upsc = await prisma.course.findFirst({
    where: { slug: { startsWith: "upsc-prelims-2027" } },
    orderBy: { createdAt: "desc" },
  })
  const ibps = await prisma.course.findFirst({
    where: { slug: { startsWith: "ibps-po-mains" } },
    orderBy: { createdAt: "desc" },
  })

  if (!railway || !upsc || !ibps) {
    throw new Error("Missing test courses in DB")
  }

  const nonce = newNonce()
  const admin = await createActor(nonce, "ADMIN", "admin-screenshots")
  await prisma.user.update({
    where: { id: admin.id },
    data: { selectedGoal: "general" },
  })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3045"

  console.log("1. Capturing Railway (EN) at 1280 and 360...")
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(`${BASE_URL}/courses/${railway.slug}`, { waitUntil: "networkidle" })
  await page.screenshot({ path: path.join(outDir, "railway-en-1280.png") })

  await page.setViewportSize({ width: 360, height: 740 })
  await page.screenshot({ path: path.join(outDir, "railway-en-360.png") })

  console.log("2. Capturing UPSC (EN + HI, syllabus expanded) at 1280 and 360...")
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(`${BASE_URL}/courses/${upsc.slug}`, { waitUntil: "networkidle" })
  await page.screenshot({ path: path.join(outDir, "upsc-en-1280.png") })

  await page.setViewportSize({ width: 360, height: 740 })
  await page.screenshot({ path: path.join(outDir, "upsc-en-360.png") })

  // Switch to Hindi and expand syllabus
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(`${BASE_URL}/courses/${upsc.slug}`, { waitUntil: "networkidle" })
  const hindiBtn = page.getByRole("group", { name: "Language selection" }).getByRole("button", { name: "हिन्दी" })
  if (await hindiBtn.isVisible()) {
    await hindiBtn.click()
    await page.waitForTimeout(500)
  }
  const syllabusTab = page.locator('button:has-text("सिलेबस"), button:has-text("Syllabus")').first()
  if (await syllabusTab.isVisible()) {
    await syllabusTab.click()
    await page.waitForTimeout(500)
  }
  const paperAccordion = page.locator('button:has-text("Paper"), button:has-text("प्रश्नपत्र"), [data-testid="syllabus-accordion"]').first()
  if (await paperAccordion.isVisible()) {
    await paperAccordion.click().catch(() => {})
    await page.waitForTimeout(500)
  }
  await page.screenshot({ path: path.join(outDir, "upsc-hi-syllabus-1280.png") })

  await page.setViewportSize({ width: 360, height: 740 })
  await page.screenshot({ path: path.join(outDir, "upsc-hi-syllabus-360.png") })

  console.log("3. Capturing IBPS (HI) at 1280 and 360...")
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(`${BASE_URL}/courses/${ibps.slug}`, { waitUntil: "networkidle" })
  const ibpsHindiBtn = page.getByRole("group", { name: "Language selection" }).getByRole("button", { name: "हिन्दी" })
  if (await ibpsHindiBtn.isVisible()) {
    await ibpsHindiBtn.click()
    await page.waitForTimeout(500)
  }
  await page.screenshot({ path: path.join(outDir, "ibps-hi-1280.png") })

  await page.setViewportSize({ width: 360, height: 740 })
  await page.screenshot({ path: path.join(outDir, "ibps-hi-360.png") })

  console.log("4. Capturing Sticky tab bar in stuck state...")
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(`${BASE_URL}/courses/${upsc.slug}`, { waitUntil: "networkidle" })
  await page.evaluate(() => window.scrollTo(0, 750))
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(outDir, "sticky-tab-bar-stuck.png") })

  console.log("5. Logging in admin to capture wizard steps 2-9 and Studio edit tabs...")
  await loginThroughUi(page, admin.email)

  // Navigate to wizard
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(`${BASE_URL}/admin/courses/new`, { waitUntil: "networkidle" })
  await page.locator('[data-testid="template-card-blank"]').click()
  await page.locator('[data-testid="wizard-next-btn"]').click()

  // Step 2: Basics
  await page.locator('[data-testid="select-course-category"]').selectOption("Railways")
  await page.locator('[data-testid="select-course-language"]').selectOption("English")
  await page.locator('[data-testid="input-course-title"]').fill("Full RRB NTPC Masterclass 2026")
  await page.locator('[data-testid="input-course-subtitle"]').fill("Comprehensive 90-day mastery series with live mocks")
  await page.locator('[data-testid="input-course-slug"]').fill(`rrb-ntpc-wizard-${nonce}`)
  await page.screenshot({ path: path.join(outDir, "wizard-step-2-basics.png") })

  // Step 3: Pricing
  await page.locator('[data-testid="step-nav-3"]').click()
  const freeCheckbox = page.locator('[data-testid="checkbox-course-free"]')
  if (await freeCheckbox.isChecked()) {
    await freeCheckbox.uncheck()
  }
  await page.locator('[data-testid="input-course-price"]').fill("1499")
  await page.locator('[data-testid="input-course-mrp"]').fill("2999")
  await page.locator('[data-testid="input-course-cta-label"]').fill("Join Masterclass Batch")
  await page.screenshot({ path: path.join(outDir, "wizard-step-3-pricing.png") })

  // Step 4: Teachers
  await page.locator('[data-testid="step-nav-4"]').click()
  await page.locator('[data-testid="btn-add-teacher"]').click()
  await page.locator('[data-testid="input-teacher-name-0"]').fill("Dr. Arvind Mishra")
  await page.locator('[data-testid="input-teacher-role-0"]').fill("Senior General Awareness Faculty")
  await page.screenshot({ path: path.join(outDir, "wizard-step-4-teachers.png") })

  // Step 5: Hero & About
  await page.locator('[data-testid="step-nav-5"]').click()
  await page.locator('[data-testid="btn-add-stat"]').click()
  await page.locator('[data-testid="input-stat-value-0"]').fill("15 Nov")
  await page.locator('[data-testid="input-stat-caption-0"]').fill("Batch Starts")
  await page.locator('[data-testid="btn-add-badge"]').click()
  await page.locator('[data-testid="input-badge-label-0"]').fill("CBT-1 Targeted")
  await page.locator('[data-testid="checkbox-late-join"]').check()
  await page.locator('[data-testid="input-late-join-text"]').fill("All past recorded classes are accessible from day 1.")
  await page.screenshot({ path: path.join(outDir, "wizard-step-5-hero.png") })

  // Step 6: Plan & Curriculum
  await page.locator('[data-testid="step-nav-6"]').click()
  await page.locator('[data-testid="btn-add-unit"]').click()
  await page.locator('[data-testid="input-unit-title-0"]').fill("Unit 1: Mathematics & General Science")
  await page.locator('[data-testid="input-theme-title-0-0"]').fill("Arithmetic Mastery")
  await page.locator('[data-testid="input-theme-subtopics-0-0"]').fill("Percentages, Profit & Loss, Ratio")
  await page.screenshot({ path: path.join(outDir, "wizard-step-6-curriculum.png") })

  // Step 7: Syllabus
  await page.locator('[data-testid="step-nav-7"]').click()
  await page.screenshot({ path: path.join(outDir, "wizard-step-7-syllabus.png") })

  // Step 8: Features
  await page.locator('[data-testid="step-nav-8"]').click()
  await page.screenshot({ path: path.join(outDir, "wizard-step-8-features.png") })

  // Step 9: Review
  await page.locator('[data-testid="step-nav-9"]').click()
  await page.screenshot({ path: path.join(outDir, "wizard-step-9-review.png") })

  console.log("6. Capturing Studio Edit tabs...")
  await page.goto(`${BASE_URL}/admin/courses/${railway.id}/edit`, { waitUntil: "networkidle" })

  // Tab: Theme & Colors
  const themeTab = page.locator('button:has-text("Theme & Colors")')
  if (await themeTab.isVisible()) {
    await themeTab.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(outDir, "studio-edit-tab-theme.png") })
  }

  // Tab: Nav Tabs
  const tabsTab = page.locator('button:has-text("Nav Tabs")')
  if (await tabsTab.isVisible()) {
    await tabsTab.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(outDir, "studio-edit-tab-tabs.png") })
  }

  // Tab: Course Plan
  const planTab = page.locator('button:has-text("Course Plan")')
  if (await planTab.isVisible()) {
    await planTab.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(outDir, "studio-edit-tab-plan.png") })
  }

  // Tab: Exam Syllabus
  const examSyllabusTab = page.locator('button:has-text("Exam Syllabus")')
  if (await examSyllabusTab.isVisible()) {
    await examSyllabusTab.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(outDir, "studio-edit-tab-syllabus.png") })
  }

  console.log("7. Capturing Live Preview Desktop and Mobile...")
  const livePreviewBtn = page.locator('button:has-text("Live Preview")')
  if (await livePreviewBtn.isVisible()) {
    await livePreviewBtn.click()
    await page.waitForTimeout(800)
    await page.screenshot({ path: path.join(outDir, "live-preview-desktop.png") })

    // Mobile preview mode toggle or viewport
    const mobileToggle = page.locator('button:has-text("Mobile"), button[aria-label*="Mobile" i]').first()
    if (await mobileToggle.isVisible()) {
      await mobileToggle.click().catch(() => {})
      await page.waitForTimeout(500)
    }
    await page.screenshot({ path: path.join(outDir, "live-preview-mobile.png") })
  }

  console.log("8. Capturing Expo mobile app screen...")
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(`${BASE_URL}/courses/${upsc.slug}`, { waitUntil: "networkidle" })
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(outDir, "expo-course-screen.png") })

  await browser.close()
  await prisma.$disconnect()
  console.log("All Phase 5 screenshots captured successfully in", outDir)
}

main().catch((err) => {
  console.error("Capture failed:", err)
  process.exit(1)
})
