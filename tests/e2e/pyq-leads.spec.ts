import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import {
  prisma,
  newNonce,
  createActor,
  loginThroughUi,
  slugFor,
} from "./test-series-e2e-helpers"
import { UserRole } from "@prisma/client"

test.describe("PYQ Leads & Admin Polish E2E (Gate 5)", () => {
  test.setTimeout(120_000)

  let nonce: string
  let admin: any
  let teacher1: any
  let teacher2: any
  let student: any
  let category: any
  let paper1: any
  let paper2: any
  let lead1: any
  let lead2: any

  test.beforeAll(async () => {
    nonce = newNonce()
    admin = await createActor(nonce, UserRole.ADMIN, "leads-admin")
    teacher1 = await createActor(nonce, UserRole.TEACHER, "leads-t1")
    teacher2 = await createActor(nonce, UserRole.TEACHER, "leads-t2")
    student = await createActor(nonce, UserRole.FREE, "leads-student")

    category = await prisma.pyqCategory.upsert({
      where: { slug: `cat-${slugFor(nonce)}` },
      update: {},
      create: {
        name: `Exam Cat ${nonce}`,
        slug: `cat-${slugFor(nonce)}`,
        order: 1,
        isPublished: true,
      },
    })

    paper1 = await prisma.pyqPaper.create({
      data: {
        title: `Paper One 2023 ${nonce}`,
        slug: `paper-1-${slugFor(nonce)}`,
        categoryId: category.id,
        year: 2023,
        stage: "PRELIMS",
        paperPdfUrl: "/uploads/pyq-private/paper1.pdf",
        accessType: "FREE",
        status: "PUBLISHED",
        creatorId: teacher1.id,
      },
    })

    paper2 = await prisma.pyqPaper.create({
      data: {
        title: `Paper Two 2024 ${nonce}`,
        slug: `paper-2-${slugFor(nonce)}`,
        categoryId: category.id,
        year: 2024,
        stage: "MAINS",
        paperPdfUrl: "/uploads/pyq-private/paper2.pdf",
        accessType: "FREE",
        status: "PUBLISHED",
        creatorId: teacher2.id,
      },
    })

    lead1 = await prisma.pyqLeadCapture.create({
      data: {
        paperId: paper1.id,
        phoneNumber: "9876543210",
        userId: student.id,
        source: "PDF_DOWNLOAD",
      },
    })

    lead2 = await prisma.pyqLeadCapture.create({
      data: {
        paperId: paper2.id,
        phoneNumber: "9123456780",
        userId: student.id,
        source: "PDF_DOWNLOAD",
      },
    })
  })

  test.afterAll(async () => {
    if (lead1?.id) await prisma.pyqLeadCapture.delete({ where: { id: lead1.id } }).catch(() => {})
    if (lead2?.id) await prisma.pyqLeadCapture.delete({ where: { id: lead2.id } }).catch(() => {})
    if (paper1?.id) await prisma.pyqPaper.delete({ where: { id: paper1.id } }).catch(() => {})
    if (paper2?.id) await prisma.pyqPaper.delete({ where: { id: paper2.id } }).catch(() => {})
    if (category?.id) await prisma.pyqCategory.delete({ where: { id: category.id } }).catch(() => {})

    const userIds = [admin?.id, teacher1?.id, teacher2?.id, student?.id].filter(Boolean)
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {})
    }
    await prisma.$disconnect().catch(() => {})
  })

  test("LEAD-01: Admin sees all leads; Teacher sees only leads for their own papers", async ({ page }) => {
    // 1. Admin login and verify seeing both leads
    await loginThroughUi(page, admin.email)
    await page.goto("/admin/pyqs/leads", { waitUntil: "domcontentloaded" })
    await expect(page.locator("h1", { hasText: /Student PDF Download Leads/i })).toBeVisible({ timeout: 15_000 })

    await expect(page.getByText("9876543210")).toBeVisible()
    await expect(page.getByText("9123456780")).toBeVisible()
    await expect(page.getByText(`Paper One 2023 ${nonce}`)).toBeVisible()
    await expect(page.getByText(`Paper Two 2024 ${nonce}`)).toBeVisible()

    // 2. Clear session and login as Teacher 1
    await page.context().clearCookies()
    await loginThroughUi(page, teacher1.email)
    await page.goto("/admin/pyqs/leads", { waitUntil: "domcontentloaded" })
    await expect(page.locator("h1", { hasText: /Student PDF Download Leads/i })).toBeVisible({ timeout: 15_000 })

    // Teacher 1 should see Lead 1 for Paper 1
    await expect(page.getByText("9876543210")).toBeVisible()
    await expect(page.getByText(`Paper One 2023 ${nonce}`)).toBeVisible()

    // Teacher 1 should NOT see Lead 2 for Paper 2 (owned by Teacher 2)
    await expect(page.getByText("9123456780")).not.toBeVisible()
    await expect(page.getByText(`Paper Two 2024 ${nonce}`)).not.toBeVisible()

    // 3. API endpoint verification for Teacher 1
    const apiRes = await page.request.get("/api/admin/pyqs/leads")
    expect(apiRes.status()).toBe(200)
    const apiLeads = await apiRes.json()
    const foundLead1 = apiLeads.find((l: any) => l.id === lead1.id)
    const foundLead2 = apiLeads.find((l: any) => l.id === lead2.id)
    expect(foundLead1).toBeTruthy()
    expect(foundLead2).toBeFalsy()
  })

  test("LEAD-02: Admin paper directory filters and search properly filter table rows", async ({ page }) => {
    await page.context().clearCookies()
    await loginThroughUi(page, admin.email)

    await page.goto("/admin/pyqs", { waitUntil: "domcontentloaded" })
    await expect(page.locator('[data-hydrated="true"]')).toBeAttached({ timeout: 15_000 })
    await expect(page.getByText(`Paper One 2023 ${nonce}`)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(`Paper Two 2024 ${nonce}`)).toBeVisible()

    // 1. Filter by Year: 2023
    const yearSelect = page.getByRole("combobox", { name: /Filter by Exam Year/i })
    await yearSelect.selectOption("2023")

    await expect(page.getByText(`Paper One 2023 ${nonce}`)).toBeVisible()
    await expect(page.getByText(`Paper Two 2024 ${nonce}`)).not.toBeVisible()

    // 2. Filter by Year: 2024
    await yearSelect.selectOption("2024")
    await expect(page.getByText(`Paper One 2023 ${nonce}`)).not.toBeVisible()
    await expect(page.getByText(`Paper Two 2024 ${nonce}`)).toBeVisible()

    // 3. Reset Year and Filter by Search
    await yearSelect.selectOption("ALL")
    const searchInput = page.getByPlaceholder(/Search papers by title/i)
    await searchInput.fill(`Paper One 2023 ${nonce}`)

    await expect(page.getByText(`Paper One 2023 ${nonce}`)).toBeVisible()
    await expect(page.getByText(`Paper Two 2024 ${nonce}`)).not.toBeVisible()

    // 4. Clear search
    await searchInput.fill("")
    await expect(page.getByText(`Paper One 2023 ${nonce}`)).toBeVisible()
    await expect(page.getByText(`Paper Two 2024 ${nonce}`)).toBeVisible()
  })
})
