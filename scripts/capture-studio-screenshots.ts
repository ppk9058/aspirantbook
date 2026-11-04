import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}
import { chromium } from "playwright"
import { prisma, createActor, newNonce, loginThroughUi } from "../tests/e2e/test-series-e2e-helpers"
import path from "path"

async function main() {
  const nonce = newNonce()
  const admin = await createActor(nonce, "ADMIN", "admin-screenshots")
  const outDir = path.resolve(process.cwd(), "docs/evidence/screenshots")

  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()

  await loginThroughUi(page, admin.email)

  // 1. Wizard Step 1: Templates Picker
  await page.goto("http://127.0.0.1:3045/admin/courses/new")
  await page.waitForSelector('[data-testid="template-card-blank"]')
  await page.screenshot({ path: `${outDir}/studio-01-template-picker.png`, fullPage: true })

  // Fill Step 2: Basics
  await page.locator('[data-testid="template-card-blank"]').click()
  await page.locator('[data-testid="wizard-next-btn"]').click()
  await page.locator('[data-testid="select-course-category"]').selectOption("Railways")
  await page.locator('[data-testid="select-course-language"]').selectOption("English")
  await page.locator('[data-testid="select-course-status"]').selectOption("PUBLISHED")
  await page.locator('[data-testid="input-course-title"]').fill("Railway NTPC CBT-1 Crash Course")
  await page.locator('[data-testid="input-course-subtitle"]').fill("Targeted 60-day intensive crash course with live speed drills and formulas")
  await page.locator('[data-testid="input-course-slug"]').fill(`railway-ntpc-snap-${Date.now()}`)
  await page.locator('[data-testid="input-course-description"]').fill("Comprehensive 60-day syllabus covering Arithmetic, Reasoning, and General Awareness.")
  await page.locator('[data-testid="btn-generate-cover"]').click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${outDir}/studio-02-basics.png`, fullPage: true })

  // Step 3: Pricing
  await page.locator('[data-testid="step-nav-3"]').click()
  const freeCb = page.locator('[data-testid="checkbox-course-free"]')
  if (await freeCb.isChecked()) await freeCb.uncheck()
  await page.locator('[data-testid="input-course-price"]').fill("999")
  await page.locator('[data-testid="input-course-mrp"]').fill("1999")
  await page.locator('[data-testid="input-course-cta-label"]').fill("Join Railway NTPC Batch")
  await page.locator('[data-testid="input-course-cta-helper"]').fill("One-time payment for 60 days complete access.")
  await page.screenshot({ path: `${outDir}/studio-03-pricing.png`, fullPage: true })

  // Step 4: Teacher Library
  await page.locator('[data-testid="step-nav-4"]').click()
  await page.locator('[data-testid="btn-add-teacher"]').click()
  await page.locator('[data-testid="input-teacher-name-0"]').fill("Vikramaditya Sharma")
  await page.locator('[data-testid="input-teacher-role-0"]').fill("Lead Railway Mathematics Faculty")
  await page.screenshot({ path: `${outDir}/studio-04-teacher-library.png`, fullPage: true })

  // Step 5: Hero & About
  await page.locator('[data-testid="step-nav-5"]').click()
  await page.locator('[data-testid="btn-add-stat"]').click()
  await page.locator('[data-testid="input-stat-value-0"]').fill("15 Nov")
  await page.locator('[data-testid="input-stat-caption-0"]').fill("Batch Starts")
  await page.screenshot({ path: `${outDir}/studio-05-hero-about.png`, fullPage: true })

  // Step 6: Course Plan
  await page.locator('[data-testid="step-nav-6"]').click()
  await page.locator('[data-testid="btn-add-unit"]').click()
  await page.locator('[data-testid="input-unit-title-0"]').fill("Mathematics & Numerical Ability")
  await page.locator('[data-testid="input-unit-tag-0"]').fill("CBT-1 Section A")
  await page.locator('[data-testid="input-theme-title-0-0"]').fill("Arithmetic Foundations")
  await page.locator('[data-testid="input-theme-subtopics-0-0"]').fill("Number Systems, Percentages, Ratio & Proportion")
  await page.locator('[data-testid="btn-add-lecture-0-0"]').click()
  await page.locator('[data-testid="input-lecture-title-0-0-0"]').fill("Number Systems & Divisibility Rules")
  await page.screenshot({ path: `${outDir}/studio-06-plan-editor.png`, fullPage: true })

  // Step 7: Syllabus with PYQ Taxonomy
  await page.locator('[data-testid="step-nav-7"]').click()
  await page.locator('[data-testid="checkbox-syllabus-enable"]').check()
  await page.locator('[data-testid="btn-add-paper"]').click()
  await page.locator('[data-testid="input-paper-title-0"]').fill("General Studies Paper I")
  await page.locator('[data-testid="btn-add-section-0"]').click()
  await page.locator('[data-testid="input-section-title-0-0"]').fill("Indian Polity & Governance")
  await page.screenshot({ path: `${outDir}/studio-07-syllabus-pyq.png`, fullPage: true })

  // Step 8: Theme & Tabs
  await page.locator('[data-testid="step-nav-8"]').click()
  await page.screenshot({ path: `${outDir}/studio-08-theme-tabs.png`, fullPage: true })

  // Step 9: Completeness Checklist & Review
  await page.locator('[data-testid="step-nav-9"]').click()
  await page.screenshot({ path: `${outDir}/studio-09-completeness-panel.png`, fullPage: true })

  // Live Preview Modal
  await page.locator('[data-testid="btn-live-preview"]').click()
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${outDir}/studio-10-live-preview.png` })
  await page.locator('button:has-text("✕")').first().click()

  // Find created courses for public page screenshots
  const courses = await prisma.course.findMany({
    where: {
      status: "PUBLISHED",
      isPublished: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, slug: true, title: true }
  })

  const railwayCourse = courses.find(c => c.title.includes("Railway"))
  const upscCourse = courses.find(c => c.title.includes("UPSC"))
  const ibpsCourse = courses.find(c => c.title.includes("IBPS"))

  console.log("Found courses:", { railwayCourse: railwayCourse?.slug, upscCourse: upscCourse?.slug, ibpsCourse: ibpsCourse?.slug })

  // Public Desktop (1280px)
  if (railwayCourse) {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`http://127.0.0.1:3045/courses/${railwayCourse.slug}`)
    await page.waitForSelector('[data-testid="course-detail-v2"]')
    await page.screenshot({ path: `${outDir}/public-railway-desktop-1280.png`, fullPage: true })

    // Public Mobile (360px)
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto(`http://127.0.0.1:3045/courses/${railwayCourse.slug}`)
    await page.waitForSelector('[data-testid="course-detail-v2"]')
    await page.screenshot({ path: `${outDir}/public-railway-mobile-360.png`, fullPage: true })
  }

  if (upscCourse) {
    // UPSC Desktop English (1280px)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`http://127.0.0.1:3045/courses/${upscCourse.slug}`)
    await page.waitForSelector('[data-testid="course-detail-v2"]')
    await page.screenshot({ path: `${outDir}/public-upsc-desktop-1280-en.png`, fullPage: true })

    // UPSC Desktop Hindi (1280px)
    const hiBtn = page.getByRole("group", { name: "Language selection" }).getByRole("button", { name: "हिन्दी" })
    if (await hiBtn.isVisible()) {
      await hiBtn.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${outDir}/public-upsc-desktop-1280-hi.png`, fullPage: true })
    }

    // UPSC Mobile English & Hindi (360px)
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto(`http://127.0.0.1:3045/courses/${upscCourse.slug}`)
    await page.waitForSelector('[data-testid="course-detail-v2"]')
    await page.screenshot({ path: `${outDir}/public-upsc-mobile-360-en.png`, fullPage: true })

    const hiBtnMob = page.getByRole("group", { name: "Language selection" }).getByRole("button", { name: "हिन्दी" })
    if (await hiBtnMob.isVisible()) {
      await hiBtnMob.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${outDir}/public-upsc-mobile-360-hi.png`, fullPage: true })
    }
  }

  if (ibpsCourse) {
    // IBPS Desktop Hindi (1280px)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`http://127.0.0.1:3045/courses/${ibpsCourse.slug}`)
    await page.waitForSelector('[data-testid="course-detail-v2"]')
    await page.screenshot({ path: `${outDir}/public-ibps-desktop-1280-hi.png`, fullPage: true })

    // IBPS Mobile Hindi (360px)
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto(`http://127.0.0.1:3045/courses/${ibpsCourse.slug}`)
    await page.waitForSelector('[data-testid="course-detail-v2"]')
    await page.screenshot({ path: `${outDir}/public-ibps-mobile-360-hi.png`, fullPage: true })
  }

  console.log("All screenshots captured successfully into docs/evidence/screenshots/")
  await browser.close()
  await prisma.user.delete({ where: { id: admin.id } }).catch(() => {})
}

main().catch(err => {
  console.error("Screenshot capture error:", err)
  process.exit(1)
})
