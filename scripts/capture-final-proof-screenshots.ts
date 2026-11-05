import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { chromium } from "playwright"
import path from "path"
import fs from "fs"
import { prisma, createActor, newNonce, loginThroughUi } from "../tests/e2e/test-series-e2e-helpers"

const OUTPUT_DIR = path.resolve("/Users/praveenkumar/.gemini/antigravity/brain/053254af-62c2-4dc5-8bb1-b3ed0831623c/screenshots")
fs.mkdirSync(OUTPUT_DIR, { recursive: true })

async function main() {
  await prisma.$connect()
  const nonce = newNonce()
  const adminUser = await createActor(nonce, "ADMIN", "admin-shots")
  await prisma.user.update({
    where: { id: adminUser.id },
    data: { emailVerified: new Date() },
  })

  // Find existing courses
  const upscCourse = await prisma.course.findFirst({
    where: { slug: { startsWith: "upsc-prelims" } },
  })
  const ibpsCourse = await prisma.course.findFirst({
    where: { slug: { startsWith: "ibps-po-mains" } },
  })
  const anyFilledCourse = upscCourse || (await prisma.course.findFirst({ where: { isPublished: true } }))

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  await loginThroughUi(page, adminUser.email)
  const baseOrigin = process.env.BASE_URL || "http://127.0.0.1:3045"
  await page.context().addCookies([
    { name: "ts_demo_role", value: "ADMIN", url: baseOrigin },
  ])

  console.log("1. Capturing Live Preview Blank Draft (Desktop & Mobile)...")
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("http://127.0.0.1:3045/admin/courses/new")
  await page.waitForLoadState("domcontentloaded")
  await page.waitForTimeout(600)

  // Open Live Preview on blank draft
  const previewBtn = page.locator('[data-testid="btn-live-preview"]')
  if (await previewBtn.isVisible()) {
    await previewBtn.click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(OUTPUT_DIR, "live-preview-blank-desktop.png"), fullPage: false })

    // Mobile toggle
    await page.getByRole("button", { name: /Mobile/i }).click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(OUTPUT_DIR, "live-preview-blank-mobile.png"), fullPage: false })

    // Close preview modal
    await page.keyboard.press("Escape")
    await page.waitForTimeout(300)
  }

  if (anyFilledCourse) {
    console.log("2. Capturing Live Preview Filled Course (Desktop & Mobile)...")
    await page.goto(`http://127.0.0.1:3045/admin/courses/${anyFilledCourse.id}/edit`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    })
    await page.waitForTimeout(1000)

    const studioPreviewBtn = page.locator('[data-testid="btn-studio-live-preview"]')
    if (await studioPreviewBtn.isVisible()) {
      await studioPreviewBtn.click()
      await page.waitForTimeout(600)
      await page.screenshot({ path: path.join(OUTPUT_DIR, "live-preview-filled-desktop.png"), fullPage: false })

      // Mobile toggle
      const mobileToggle = page.getByRole("button", { name: /Mobile \(360px\)/i }).first()
      if (await mobileToggle.isVisible()) {
        await mobileToggle.click()
        await page.waitForTimeout(500)
        await page.screenshot({ path: path.join(OUTPUT_DIR, "live-preview-filled-mobile.png"), fullPage: false })
      }
      await page.keyboard.press("Escape")
      await page.waitForTimeout(300)
    }
  }

  if (ibpsCourse) {
    console.log("3. Capturing IBPS Desktop & Mobile after thumbnail fix...")
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(`http://127.0.0.1:3045/courses/${ibpsCourse.slug}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: path.join(OUTPUT_DIR, "ibps-thumbnail-fix-desktop.png"), fullPage: false })

    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto(`http://127.0.0.1:3045/courses/${ibpsCourse.slug}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    })
    await page.waitForTimeout(800)
    await page.screenshot({ path: path.join(OUTPUT_DIR, "ibps-thumbnail-fix-mobile.png"), fullPage: false })
  }

  if (upscCourse) {
    console.log("4. Capturing UPSC Hindi Stats Row...")
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(`http://127.0.0.1:3045/courses/${upscCourse.slug}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    })
    await page.waitForTimeout(600)

    // Switch to Hindi if not active
    const hiBtn = page.getByRole("button", { name: "हिन्दी" }).first()
    if (await hiBtn.isVisible()) {
      await hiBtn.click()
      await page.waitForTimeout(500)
    }

    const statsRow = page.locator('[data-testid="hero-stats-row"]').first()
    if (await statsRow.isVisible()) {
      await statsRow.screenshot({ path: path.join(OUTPUT_DIR, "upsc-hindi-stats-row.png") })
    } else {
      await page.screenshot({ path: path.join(OUTPUT_DIR, "upsc-hindi-stats-row.png"), fullPage: false })
    }
  }

  await browser.close()
  if (adminUser?.id) {
    await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {})
  }
  await prisma.$disconnect()
  console.log("All screenshots successfully captured into:", OUTPUT_DIR)
}

main().catch((err) => {
  console.error("Screenshot error:", err)
  process.exit(1)
})
