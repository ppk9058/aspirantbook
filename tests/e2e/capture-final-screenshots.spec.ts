import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import path from "path"
import fs from "fs"
import {
  createActor,
  loginThroughUi,
  newNonce,
  prisma,
  slugFor,
} from "./test-series-e2e-helpers"

const ARTIFACTS_DIR = path.resolve(process.cwd(), "e2e-artifacts")

test.describe("Final Artifact Screenshot Capture", () => {
  test.setTimeout(120_000)

  let nonce: string
  let adminUser: any
  let ibpsCourse: any
  let upscCourse: any

  test.beforeAll(async () => {
    if (!fs.existsSync(ARTIFACTS_DIR)) {
      fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })
    }
    await prisma.$connect()
    nonce = newNonce()
    adminUser = await createActor(nonce, "ADMIN", "admin-ss")
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { emailVerified: new Date() },
    })

    // Find IBPS course or create one
    ibpsCourse = await prisma.course.findFirst({
      where: { title: { contains: "IBPS" } },
      orderBy: { createdAt: "desc" },
    })
    if (!ibpsCourse) {
      ibpsCourse = await prisma.course.create({
        data: {
          title: "IBPS PO Mains Banking Awareness",
          slug: `ibps-po-mains-final-capture-${slugFor(nonce)}`,
          description: "Comprehensive Banking, Financial Awareness & Current Affairs for IBPS PO Mains",
          price: 1299,
          originalPrice: 2499,
          technology: "Banking",
          difficulty: "INTERMEDIATE",
          status: "PUBLISHED",
          isPublished: true,
          schemaVersion: 2,
          metadataJson: JSON.stringify({
            schemaVersion: 2,
            heroMetrics: [
              { label: "Hours", value: "80+ Hours" },
              { label: "Modules", value: "6 Modules" },
              { label: "Medium", value: "Hindi First" },
            ],
            lateJoinerTemplate: "Full recorded archive included from Day 1",
            badges: [{ label: "Hindi First", labelHi: "हिंदी माध्यम" }],
          }),
          units: {
            create: [{ title: "Unit 1: Banking Awareness", order: 1 }],
          },
          chapters: {
            create: [
              {
                title: "Theme 1: Reserve Bank of India & Monetary Policy",
                order: 1,
                lessons: {
                  create: [{ title: "RBI Functions & Tools", duration: 60, order: 1, type: "VIDEO" }],
                },
              },
            ],
          },
        },
      })
    }

    // Find UPSC course or create one
    upscCourse = await prisma.course.findFirst({
      where: { title: { contains: "UPSC" } },
      orderBy: { createdAt: "desc" },
    })
    if (!upscCourse) {
      upscCourse = await prisma.course.create({
        data: {
          title: "UPSC Prelims 2027 GS Foundation",
          titleHi: "यूपीएससी प्रारंभिक परीक्षा 2027 जीएस फाउंडेशन",
          slug: `upsc-prelims-2027-final-capture-${slugFor(nonce)}`,
          description: "Bilingual GS Foundation batch for civil services aspirants",
          descriptionHi: "सिविल सेवा अभ्यर्थियों के लिए द्विभाषी जीएस फाउंडेशन बैच",
          price: 19999,
          originalPrice: 39999,
          technology: "UPSC",
          difficulty: "BEGINNER",
          status: "PUBLISHED",
          isPublished: true,
          schemaVersion: 2,
          metadataJson: JSON.stringify({
            schemaVersion: 2,
            heroMetrics: [
              { label: "Hours", labelHi: "घंटे", value: "500+ Hours", valueHi: "500+ घंटे" },
              { label: "Tests", labelHi: "टेस्ट", value: "50+ Tests", valueHi: "50+ टेस्ट" },
              { label: "Mentors", labelHi: "मार्गदर्शक", value: "AIR 14 & Ph.Ds", valueHi: "एआईआर 14 एवं पीएच.डी." },
            ],
            badges: [
              { label: "Bilingual (Hinglish)", labelHi: "द्विभाषी (हिंग्लिश)" },
              { label: "GS Paper 1 & 2", labelHi: "जीएस पेपर 1 और 2" },
            ],
          }),
          units: {
            create: [{ title: "Unit 1: Indian Polity", titleHi: "इकाई 1: भारतीय राजव्यवस्था", order: 1 }],
          },
          chapters: {
            create: [
              {
                title: "Theme 1: Preamble",
                titleHi: "थीम 1: प्रस्तावना",
                order: 1,
                lessons: {
                  create: [{ title: "Historical Evolution", titleHi: "ऐतिहासिक विकास", duration: 60, order: 1, type: "VIDEO" }],
                },
              },
            ],
          },
        },
      })
    }
  })

  test.afterAll(async () => {
    if (ibpsCourse?.id && ibpsCourse.slug?.includes("final-capture")) {
      await prisma.lesson.deleteMany({ where: { chapter: { courseId: ibpsCourse.id } } }).catch(() => {})
      await prisma.chapter.deleteMany({ where: { courseId: ibpsCourse.id } }).catch(() => {})
      await prisma.courseUnit.deleteMany({ where: { courseId: ibpsCourse.id } }).catch(() => {})
      await prisma.course.delete({ where: { id: ibpsCourse.id } }).catch(() => {})
    }
    if (upscCourse?.id && upscCourse.slug?.includes("final-capture")) {
      await prisma.lesson.deleteMany({ where: { chapter: { courseId: upscCourse.id } } }).catch(() => {})
      await prisma.chapter.deleteMany({ where: { courseId: upscCourse.id } }).catch(() => {})
      await prisma.courseUnit.deleteMany({ where: { courseId: upscCourse.id } }).catch(() => {})
      await prisma.course.delete({ where: { id: upscCourse.id } }).catch(() => {})
    }
    if (adminUser?.id) {
      await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {})
    }
    await prisma.$disconnect()
  })

  test("Capture Live Preview Blank Draft (Desktop & Mobile)", async ({ page }) => {
    await loginThroughUi(page, adminUser.email)
    const baseOrigin = process.env.BASE_URL || "http://127.0.0.1:3045"
    await page.context().addCookies([
      { name: "ts_demo_role", value: "ADMIN", url: baseOrigin },
    ])
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto("/admin/courses/new")
    await page.waitForLoadState("domcontentloaded")

    // Open Live Preview on the blank draft
    const previewBtn = page.locator('[data-testid="btn-live-preview"]')
    await expect(previewBtn).toBeVisible()
    await previewBtn.click()

    const modal = page.locator('[data-testid="studio-live-preview-modal"]')
    await expect(modal).toBeVisible()

    // Wait for iframe
    const previewFrame = page.frameLocator('iframe[title="Studio Live Course Preview"]')
    const frameBody = previewFrame.locator("body")
    await expect(frameBody).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(600)

    // Assert blank draft has Untitled title and Price not set
    await expect(frameBody).toContainText("Untitled")
    await expect(frameBody).toContainText("Price not set")

    // Capture Blank Desktop
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "live-preview-blank-desktop.png"),
    })

    // Toggle to Mobile (360px)
    const mobile360Btn = page.locator('[data-testid="btn-preview-mobile"]')
    await mobile360Btn.click()
    await page.waitForTimeout(500)

    // Capture Blank Mobile
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "live-preview-blank-mobile.png"),
    })
  })

  test("Capture Live Preview Filled Course (Desktop & Mobile)", async ({ page }) => {
    await loginThroughUi(page, adminUser.email)
    const baseOrigin = process.env.BASE_URL || "http://127.0.0.1:3045"
    await page.context().addCookies([
      { name: "ts_demo_role", value: "ADMIN", url: baseOrigin },
    ])
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto("/admin/courses/new")
    await page.waitForLoadState("domcontentloaded")

    // Select the BPSC Demolish Sample Template to get a richly filled draft
    const bpscCard = page.locator('[data-testid="template-card-bpsc-mains"]')
    await expect(bpscCard).toBeVisible({ timeout: 10000 })
    await bpscCard.click()
    await page.waitForTimeout(600)

    // Open Live Preview
    const previewBtn = page.locator('[data-testid="btn-live-preview"]')
    await expect(previewBtn).toBeVisible()
    await previewBtn.click()

    const modal = page.locator('[data-testid="studio-live-preview-modal"]')
    await expect(modal).toBeVisible()

    const previewFrame = page.frameLocator('iframe[title="Studio Live Course Preview"]')
    const frameBody = previewFrame.locator("body")
    await expect(frameBody).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(600)

    // Assert filled draft has BPSC Mains template content
    await expect(frameBody).toContainText("BPSC Mains")

    // Capture Filled Desktop
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "live-preview-filled-desktop.png"),
    })

    // Toggle Mobile (360px)
    const mobile360Btn = page.locator('[data-testid="btn-preview-mobile"]')
    await mobile360Btn.click()
    await page.waitForTimeout(500)

    // Capture Filled Mobile
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "live-preview-filled-mobile.png"),
    })
  })

  test("Capture IBPS PO Mains Public Page (Desktop & Mobile)", async ({ page }) => {
    if (!ibpsCourse) {
      console.warn("IBPS course not found, skipping IBPS screenshot")
      return
    }

    // Desktop 1280
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(`/courses/${ibpsCourse.slug}`)
    await page.waitForLoadState("domcontentloaded")
    await expect(page.locator("h1")).toContainText("IBPS", { timeout: 10000 })
    await page.waitForTimeout(600)

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "ibps-desktop.png"),
    })

    // Mobile 360
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto(`/courses/${ibpsCourse.slug}`)
    await page.waitForLoadState("domcontentloaded")
    await expect(page.locator("h1")).toContainText("IBPS", { timeout: 10000 })
    await page.waitForTimeout(600)

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "ibps-mobile.png"),
    })
  })

  test("Capture UPSC Hindi Page with Stats Row", async ({ page }) => {
    if (!upscCourse) {
      console.warn("UPSC course not found, skipping UPSC screenshot")
      return
    }

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(`/courses/${upscCourse.slug}`)
    await page.waitForLoadState("domcontentloaded")
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(400)

    // Switch to Hindi
    const hiBtn = page.getByRole("group", { name: "Language selection" }).getByRole("button", { name: "हिन्दी" })
    if (await hiBtn.isVisible()) {
      await hiBtn.click()
      await page.waitForTimeout(500)
    }

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "upsc-hindi.png"),
    })
  })

  test("Capture Desktop Scrolled Sticky Enrollment Card", async ({ page }) => {
    if (!upscCourse) return

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(`/courses/${upscCourse.slug}`)
    await page.waitForLoadState("domcontentloaded")
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(500)

    // Scroll down to activate sticky enrollment card
    await page.evaluate(() => window.scrollBy(0, 300))
    await page.waitForTimeout(800)

    const run3EvidenceDir = path.resolve(process.cwd(), "docs/release/evidence/run3")
    if (!fs.existsSync(run3EvidenceDir)) {
      fs.mkdirSync(run3EvidenceDir, { recursive: true })
    }

    await page.screenshot({
      path: path.join(run3EvidenceDir, "sticky-card-desktop.png"),
    })
  })
})
