import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import { prisma, newNonce, createActor, slugFor } from "./test-series-e2e-helpers"
import { UserRole } from "@prisma/client"
import fs from "fs/promises"
import path from "path"

test.describe("PYQ Student-Facing Experience E2E (Gate 3)", () => {
  test.setTimeout(120_000)

  let nonce: string
  let adminUser: any
  let category: any
  let publishedPaper: any
  let draftPaper: any
  let localTestFilePath: string

  const validPdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF")

  test.beforeAll(async () => {
    nonce = newNonce()
    adminUser = await createActor(nonce, UserRole.ADMIN, "student-e2e-admin")

    const uploadsDir = path.join(process.cwd(), "uploads", "pyq-private")
    await fs.mkdir(uploadsDir, { recursive: true })
    const fileName = `student-test-${nonce}.pdf`
    localTestFilePath = path.join(uploadsDir, fileName)
    await fs.writeFile(localTestFilePath, validPdfBuffer)

    category = await prisma.pyqCategory.upsert({
      where: { slug: `bpsc-${slugFor(nonce)}` },
      update: {},
      create: {
        name: `BPSC Exam ${nonce}`,
        slug: `bpsc-${slugFor(nonce)}`,
        order: 1,
        isPublished: true,
      },
    })

    publishedPaper = await prisma.pyqPaper.create({
      data: {
        title: `Official GS Paper ${nonce}`,
        slug: `official-gs-paper-${slugFor(nonce)}`,
        categoryId: category.id,
        year: 2024,
        stage: "PRELIMS",
        subject: "Ancient History",
        paperPdfUrl: `/uploads/pyq-private/${fileName}`,
        accessType: "FREE",
        status: "PUBLISHED",
        creatorId: adminUser.id,
        downloadCount: 0,
      },
    })

    draftPaper = await prisma.pyqPaper.create({
      data: {
        title: `Secret Unpublished Draft ${nonce}`,
        slug: `secret-draft-${slugFor(nonce)}`,
        categoryId: category.id,
        year: 2024,
        stage: "PRELIMS",
        subject: "Classified Topics",
        paperPdfUrl: `/uploads/pyq-private/${fileName}`,
        accessType: "FREE",
        status: "DRAFT",
        creatorId: adminUser.id,
      },
    })
  })

  test.afterAll(async () => {
    const paperIds = [publishedPaper?.id, draftPaper?.id].filter(Boolean)
    if (paperIds.length > 0) {
      await prisma.pyqPaper.deleteMany({ where: { id: { in: paperIds } } }).catch(() => {})
    }
    if (category?.id) {
      await prisma.pyqCategory.delete({ where: { id: category.id } }).catch(() => {})
    }
    if (localTestFilePath) {
      await fs.unlink(localTestFilePath).catch(() => {})
    }
    if (adminUser?.id) {
      await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {})
    }
  })

  test("STUDENT-01: Guest navigates to /pyqs, sees real published paper, zero mock data, draft hidden", async ({ page }) => {
    await page.goto("/pyqs", { waitUntil: "domcontentloaded" })

    // 1. Published fixture paper is visible
    await expect(page.getByText(`Official GS Paper ${nonce}`)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("Ancient History")).toBeVisible()

    // 2. Draft paper is NOT visible
    await expect(page.getByText(`Secret Unpublished Draft ${nonce}`)).toHaveCount(0)

    // 3. Removed hardcoded mock strings do NOT appear
    await expect(page.getByText("aspirantbook Official Archives 2026")).toHaveCount(0)
    await expect(page.getByText("71st BPSC Mains Exam (Essay) Official Paper")).toHaveCount(0)
  })

  test("STUDENT-02: Search and filtering by stage/subject works reactively", async ({ page }) => {
    await page.goto("/pyqs", { waitUntil: "domcontentloaded" })
    await expect(page.getByText(`Official GS Paper ${nonce}`)).toBeVisible({ timeout: 15_000 })

    const searchInput = page.locator('input[placeholder*="Search by exam"]')
    await searchInput.click()

    // 1. Search by subject
    await searchInput.fill("Ancient History")
    await expect(page.getByText(`Official GS Paper ${nonce}`)).toBeVisible({ timeout: 15_000 })

    // 2. Search for non-existent text -> shows empty state
    await searchInput.fill(`NoSuchSubjectExists${nonce}`)
    await expect(page.getByText(/No matching papers found/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(`Official GS Paper ${nonce}`)).toHaveCount(0)

    // 3. Reset filters
    await page.getByRole("button", { name: /Show All Papers/i }).click()
    await expect(page.getByText(`Official GS Paper ${nonce}`)).toBeVisible({ timeout: 15_000 })
  })

  test("STUDENT-03: Download on free paper triggers download and increments DB counter", async ({ page, request }) => {
    const initialPaper = await prisma.pyqPaper.findUnique({ where: { id: publishedPaper.id } })
    const initialCount = initialPaper?.downloadCount || 0

    // Trigger download through secure file streaming endpoint
    const res = await request.get(`/api/pyqs/file/${publishedPaper.id}?download=1`)
    expect(res.status()).toBe(200)
    expect(res.headers()["content-disposition"]).toContain("attachment")

    const updated = await prisma.pyqPaper.findUnique({ where: { id: publishedPaper.id } })
    expect(updated?.downloadCount).toBe(initialCount + 1)
  })

  test("STUDENT-04: PDF Viewer loads valid paper with iframe pointing to secure streaming route", async ({ page }) => {
    await page.goto(`/pyqs/pdf-view?paperId=${publishedPaper.id}`, { waitUntil: "domcontentloaded" })

    // Header displays title
    await expect(page.getByText(`Official GS Paper ${nonce}`)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("Ancient History")).toBeVisible()

    // Iframe contains secure streaming route
    const iframe = page.locator("iframe")
    await expect(iframe).toBeVisible()
    const iframeSrc = await iframe.getAttribute("src")
    expect(iframeSrc).toBe(`/api/pyqs/file/${publishedPaper.id}`)
  })

  test("STUDENT-05: PDF Viewer on non-existent paper shows visible error state with back link", async ({ page }) => {
    await page.goto("/pyqs/pdf-view?paperId=cmvnonexistent9999", { waitUntil: "domcontentloaded" })

    await expect(page.getByText(/This paper is unavailable or restricted/i)).toBeVisible({ timeout: 15_000 })
    const backLink = page.getByRole("link", { name: /Back to All Previous Year Papers/i })
    await expect(backLink).toBeVisible()
  })

  test("STUDENT-06: PDF Viewer on DRAFT paper shows error state for guests", async ({ page }) => {
    await page.goto(`/pyqs/pdf-view?paperId=${draftPaper.id}`, { waitUntil: "domcontentloaded" })

    await expect(page.getByText(/This paper is unavailable or restricted/i)).toBeVisible({ timeout: 15_000 })
  })

  test("STUDENT-07: Category detail page /pyqs/[examId] displays category papers and hides drafts", async ({ page }) => {
    await page.goto(`/pyqs/${category.slug}`, { waitUntil: "domcontentloaded" })

    await expect(page.getByText(`Official GS Paper ${nonce}`)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(`Secret Unpublished Draft ${nonce}`)).toHaveCount(0)
  })
})
