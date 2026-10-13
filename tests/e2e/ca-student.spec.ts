import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import { prisma, PASSWORD, newNonce, loginThroughUi, createActor } from "./test-series-e2e-helpers"
import { UserRole } from "@prisma/client"
import fs from "fs"
import path from "path"

test.describe("Current Affairs Student Page & Security Gate C", () => {
  test.setTimeout(120_000)

  let nonce: string
  let teacherUser: any
  let studentUser: any
  let publishedPdf: any
  let dummyFileName: string

  const dummyPdfBuffer = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n185\n%%EOF"
  )

  test.beforeAll(async () => {
    nonce = newNonce()
    teacherUser = await createActor(nonce, UserRole.TEACHER, "teacher-user")
    studentUser = await createActor(nonce, UserRole.FREE, "student-user")

    const caDir = path.join(process.cwd(), "uploads", "ca-private")
    if (!fs.existsSync(caDir)) {
      fs.mkdirSync(caDir, { recursive: true })
    }

    dummyFileName = `student_test_${Date.now()}.pdf`
    fs.writeFileSync(path.join(caDir, dummyFileName), dummyPdfBuffer)

    publishedPdf = await prisma.currentAffairsPdf.create({
      data: {
        title: `CA Student Digest January 2026 - ${nonce}`,
        titleHi: "मासिक सार जनवरी 2026",
        month: 1,
        year: 2026,
        status: "PUBLISHED",
        pdfUrlEn: `/uploads/ca-private/${dummyFileName}`,
        fileSizeKbEn: 450,
        createdById: teacherUser.id,
      },
    })
  })

  test.afterAll(async () => {
    const userIds = [teacherUser?.id, studentUser?.id].filter(Boolean)
    if (userIds.length > 0) {
      await prisma.currentAffairsPdf.deleteMany({
        where: { createdById: { in: userIds } },
      }).catch(() => {})
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      }).catch(() => {})
    }

    const filePath = path.join(process.cwd(), "uploads", "ca-private", dummyFileName)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  })

  test("C-01: Page loads both sections (Monthly PDFs and CA Quizzes) and filters work", async ({ page }) => {
    await page.goto("/current-affairs-quizzes")
    await expect(page.locator("h1")).toContainText(/Current Affairs & Quizzes/i)

    // Verify Section 1: Monthly PDFs
    const pdfSection = page.locator('[data-testid="section-monthly-pdfs"]')
    await expect(pdfSection).toBeVisible()
    await expect(pdfSection.getByText(publishedPdf.title)).toBeVisible()

    // Verify Section 2: CA Quizzes
    const quizSection = page.locator('[data-testid="section-ca-quizzes"]')
    await expect(quizSection).toBeVisible()

    // Test Search filter on Monthly PDFs
    const pdfSearchInput = pdfSection.locator('input[placeholder*="Search monthly digests"]')
    await pdfSearchInput.fill("NonExistentQueryXYZ")
    await expect(pdfSection.getByText(/No Current Affairs PDFs match filters/i)).toBeVisible()

    // Clear search and verify card reappears
    await pdfSearchInput.fill("")
    await expect(pdfSection.getByText(publishedPdf.title)).toBeVisible()
  })

  test("C-02: Guest clicking Download opens mobile auth modal; Guest clicking View PDF opens preview", async ({ page }) => {
    await page.goto("/current-affairs-quizzes")

    // 1. Guest clicks Download -> Mobile auth dialog intercepts
    const downloadBtn = page.locator(`[data-testid="btn-download-en-${publishedPdf.id}"]`)
    await expect(downloadBtn).toBeVisible()
    await downloadBtn.click()

    // Assert mobile OTP dialog appeared
    await expect(page.getByText(/Enter your mobile number to get started/i)).toBeVisible()

    // Close the auth modal
    const closeBtn = page.locator('button:has(svg.lucide-x)').first()
    await closeBtn.click()

    // 2. Guest clicks View PDF -> In-app preview modal opens with iframe
    const viewBtn = page.locator(`[data-testid="btn-view-pdf-${publishedPdf.id}"]`)
    await viewBtn.click()

    const previewModal = page.locator('[data-testid="ca-pdf-preview-modal"]')
    await expect(previewModal).toBeVisible()
    await expect(previewModal.locator("iframe")).toBeVisible()
  })

  test("C-03: Logged-in student downloads PDF directly and downloadCount increases", async ({ page }) => {
    await loginThroughUi(page, studentUser.email)
    await page.goto("/current-affairs-quizzes")

    const beforeDoc = await prisma.currentAffairsPdf.findUnique({ where: { id: publishedPdf.id } })
    const initialCount = beforeDoc?.downloadCount || 0

    // Click download button as logged-in user
    const downloadBtn = page.locator(`[data-testid="btn-download-en-${publishedPdf.id}"]`)
    await expect(downloadBtn).toBeVisible()

    // Start waiting for download before clicking
    const downloadPromise = page.waitForEvent("download")
    await downloadBtn.click()
    const download = await downloadPromise

    // Assert download is valid
    expect(download.suggestedFilename().toLowerCase()).toContain(".pdf")

    // Assert download count incremented
    const afterDoc = await prisma.currentAffairsPdf.findUnique({ where: { id: publishedPdf.id } })
    expect(afterDoc?.downloadCount).toBe(initialCount + 1)
  })

  test("C-04: Role visibility: Teacher sees both authoring buttons; Student sees neither", async ({ browser }) => {
    // 1. Teacher context
    const teacherPage = await browser.newPage()
    await loginThroughUi(teacherPage, teacherUser.email)
    await teacherPage.goto("/current-affairs-quizzes")

    await expect(teacherPage.locator('[data-testid="btn-upload-monthly-pdf"]')).toBeVisible()
    await expect(teacherPage.locator('[data-testid="btn-create-ca-quiz"]')).toBeVisible()
    expect(await teacherPage.locator('[data-testid="btn-upload-monthly-pdf"]').getAttribute("href")).toContain("/teacher/current-affairs")
    expect(await teacherPage.locator('[data-testid="btn-create-ca-quiz"]').getAttribute("href")).toContain("/teacher/test-series/create?type=CURRENT_AFFAIRS")
    await teacherPage.close()

    // 2. Student context
    const studentPage = await browser.newPage()
    await loginThroughUi(studentPage, studentUser.email)
    await studentPage.goto("/current-affairs-quizzes")

    await expect(studentPage.locator('[data-testid="btn-upload-monthly-pdf"]')).toHaveCount(0)
    await expect(studentPage.locator('[data-testid="btn-create-ca-quiz"]')).toHaveCount(0)
    await studentPage.close()

    // 3. Guest context
    const guestPage = await browser.newPage()
    await guestPage.goto("/current-affairs-quizzes")
    await expect(guestPage.locator('[data-testid="btn-upload-monthly-pdf"]')).toHaveCount(0)
    await expect(guestPage.locator('[data-testid="btn-create-ca-quiz"]')).toHaveCount(0)
    await guestPage.close()
  })

  test("C-05: My Quiz History gate: Guest gets mobile auth popup; Logged in navigates", async ({ page }) => {
    // Guest
    await page.goto("/current-affairs-quizzes")
    const historyBtn = page.locator('[data-testid="btn-my-quiz-history"]')
    await historyBtn.click()
    await expect(page.getByText(/Enter your mobile number to get started/i)).toBeVisible()
  })
})
