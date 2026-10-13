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

test.describe("Current Affairs PDF Module & Security Gate B", () => {
  test.setTimeout(120_000)

  let nonce: string
  let teacherA: any
  let teacherB: any
  let adminUser: any
  let studentUser: any

  const dummyPdfBuffer = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n185\n%%EOF"
  )

  test.beforeAll(async () => {
    nonce = newNonce()
    teacherA = await createActor(nonce, UserRole.TEACHER, "teacher-a")
    teacherB = await createActor(nonce, UserRole.TEACHER, "teacher-b")
    adminUser = await createActor(nonce, UserRole.ADMIN, "admin-user")
    studentUser = await createActor(nonce, UserRole.FREE, "student-user")

    // Ensure upload dir exists
    const caDir = path.join(process.cwd(), "uploads", "ca-private")
    if (!fs.existsSync(caDir)) {
      fs.mkdirSync(caDir, { recursive: true })
    }
  })

  test.afterAll(async () => {
    const userIds = [teacherA?.id, teacherB?.id, adminUser?.id, studentUser?.id].filter(Boolean)
    if (userIds.length > 0) {
      await prisma.currentAffairsPdf.deleteMany({
        where: { createdById: { in: userIds } },
      }).catch(() => {})
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      }).catch(() => {})
    }
  })

  test("B-01: Non-PDF upload rejection and valid PDF upload acceptance", async ({ browser }) => {
    const page = await browser.newPage()
    await loginThroughUi(page, teacherA.email)

    // 1. Attempt non-PDF file upload
    const invalidUpload = await page.request.post("/api/admin/current-affairs/upload", {
      multipart: {
        file: {
          name: "notes.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("This is not a PDF file"),
        },
      },
    })
    expect(invalidUpload.status()).toBe(400)
    const invalidJson = await invalidUpload.json()
    expect(invalidJson.error).toContain("Only PDF files are permitted")

    // 2. Attempt fake PDF with invalid magic bytes
    const fakePdfUpload = await page.request.post("/api/admin/current-affairs/upload", {
      multipart: {
        file: {
          name: "fake.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from("Not really a PDF"),
        },
      },
    })
    expect(fakePdfUpload.status()).toBe(400)
    const fakeJson = await fakePdfUpload.json()
    expect(fakeJson.error).toContain("valid PDF signature")

    // 3. Valid PDF upload
    const validUpload = await page.request.post("/api/admin/current-affairs/upload", {
      multipart: {
        file: {
          name: "monthly_jan.pdf",
          mimeType: "application/pdf",
          buffer: dummyPdfBuffer,
        },
      },
    })
    expect(validUpload.status()).toBe(200)
    const validJson = await validUpload.json()
    expect(validJson.success).toBe(true)
    expect(validJson.filePath).toContain("uploads/ca-private")
    expect(validJson.fileSize).toBeGreaterThan(0)

    await page.close()
  })

  test("B-02: Teacher A creates, updates, toggles status, and replaces file", async ({ browser }) => {
    const pageA = await browser.newPage()
    await loginThroughUi(pageA, teacherA.email)

    // Upload English PDF
    const uploadRes = await pageA.request.post("/api/admin/current-affairs/upload", {
      multipart: {
        file: {
          name: "ca_jan_2026_en.pdf",
          mimeType: "application/pdf",
          buffer: dummyPdfBuffer,
        },
      },
    })
    expect(uploadRes.status()).toBe(200)
    const { filePath: enFilePath, fileSize: enFileSize } = await uploadRes.json()

    // Create Current Affairs PDF
    const createRes = await pageA.request.post("/api/admin/current-affairs", {
      data: {
        title: `Current Affairs January 2026 - ${nonce}`,
        titleHi: "मासिक समसामयिकी जनवरी 2026",
        month: 1,
        year: 2026,
        status: "PUBLISHED",
        pdfUrlEn: enFilePath,
        fileSizeKbEn: Math.round(enFileSize / 1024),
      },
    })
    expect(createRes.status()).toBe(201)
    const createdItem = (await createRes.json()).data
    expect(createdItem.id).toBeDefined()
    expect(createdItem.createdById).toBe(teacherA.id)
    expect(createdItem.status).toBe("PUBLISHED")
    expect(createdItem.pdfUrlEn).toBe(enFilePath)

    // Edit title
    const updateRes = await pageA.request.put(`/api/admin/current-affairs/${createdItem.id}`, {
      data: {
        title: `Updated CA January 2026 - ${nonce}`,
      },
    })
    expect(updateRes.status()).toBe(200)
    const updatedItem = (await updateRes.json()).data
    expect(updatedItem.title).toContain("Updated CA")

    // Upload Hindi PDF and attach
    const uploadHiRes = await pageA.request.post("/api/admin/current-affairs/upload", {
      multipart: {
        file: {
          name: "ca_jan_2026_hi.pdf",
          mimeType: "application/pdf",
          buffer: dummyPdfBuffer,
        },
      },
    })
    const { filePath: hiFilePath, fileSize: hiFileSize } = await uploadHiRes.json()

    const attachHiRes = await pageA.request.put(`/api/admin/current-affairs/${createdItem.id}`, {
      data: {
        pdfUrlHi: hiFilePath,
        fileSizeKbHi: Math.round(hiFileSize / 1024),
      },
    })
    expect(attachHiRes.status()).toBe(200)
    const withHiItem = (await attachHiRes.json()).data
    expect(withHiItem.pdfUrlHi).toBe(hiFilePath)

    // Toggle status to DRAFT
    const draftRes = await pageA.request.put(`/api/admin/current-affairs/${createdItem.id}`, {
      data: {
        status: "DRAFT",
      },
    })
    expect(draftRes.status()).toBe(200)
    expect((await draftRes.json()).data.status).toBe("DRAFT")

    await pageA.close()
  })

  test("B-03: Security & Ownership: Teacher B gets 403 on Teacher A's item, Admin gets 200", async ({ browser }) => {
    // 1. Create item owned by Teacher A directly
    const itemA = await prisma.currentAffairsPdf.create({
      data: {
        title: `Teacher A Document ${nonce}`,
        month: 2,
        year: 2026,
        status: "PUBLISHED",
        createdById: teacherA.id,
        pdfUrlEn: "/uploads/ca-private/mock.pdf",
      },
    })

    // 2. Teacher B attempts to view, edit, and archive Teacher A's item
    const pageB = await browser.newPage()
    await loginThroughUi(pageB, teacherB.email)

    const getResB = await pageB.request.get(`/api/admin/current-affairs/${itemA.id}`)
    expect(getResB.status()).toBe(403)

    const putResB = await pageB.request.put(`/api/admin/current-affairs/${itemA.id}`, {
      data: { title: "Hacked by Teacher B" },
    })
    expect(putResB.status()).toBe(403)

    const deleteResB = await pageB.request.delete(`/api/admin/current-affairs/${itemA.id}`)
    expect(deleteResB.status()).toBe(403)

    // Teacher B list should NOT contain Teacher A's item
    const listResB = await pageB.request.get("/api/admin/current-affairs")
    expect(listResB.status()).toBe(200)
    const listB = (await listResB.json()).data
    const foundInB = listB.some((doc: any) => doc.id === itemA.id)
    expect(foundInB).toBe(false)
    await pageB.close()

    // 3. Admin user can view and edit Teacher A's item
    const pageAdmin = await browser.newPage()
    await loginThroughUi(pageAdmin, adminUser.email)

    const getResAdmin = await pageAdmin.request.get(`/api/admin/current-affairs/${itemA.id}`)
    expect(getResAdmin.status()).toBe(200)

    const putResAdmin = await pageAdmin.request.put(`/api/admin/current-affairs/${itemA.id}`, {
      data: { titleHi: "Verified by Admin" },
    })
    expect(putResAdmin.status()).toBe(200)

    const listResAdmin = await pageAdmin.request.get("/api/admin/current-affairs")
    expect(listResAdmin.status()).toBe(200)
    const listAdmin = (await listResAdmin.json()).data
    const foundInAdmin = listAdmin.some((doc: any) => doc.id === itemA.id)
    expect(foundInAdmin).toBe(true)

    await pageAdmin.close()
  })

  test("B-04: Secure file route access: Draft 404 for guests, Guest view 200, Guest download 401, Student download 200 with counter increment", async ({ browser }) => {
    // Write actual file to ca-private
    const fileName = `test_file_${Date.now()}.pdf`
    const filePath = path.join(process.cwd(), "uploads", "ca-private", fileName)
    fs.writeFileSync(filePath, dummyPdfBuffer)

    // 1. Create a DRAFT item
    const draftDoc = await prisma.currentAffairsPdf.create({
      data: {
        title: `Draft CA Document ${nonce}`,
        month: 3,
        year: 2026,
        status: "DRAFT",
        createdById: teacherA.id,
        pdfUrlEn: `/uploads/ca-private/${fileName}`,
      },
    })

    // Unauthenticated context (Guest)
    const guestContext = await browser.newContext()
    const guestPage = await guestContext.newPage()

    // Guest views DRAFT -> 404
    const guestDraftView = await guestPage.request.get(`/api/current-affairs/file/${draftDoc.id}?lang=en`)
    expect(guestDraftView.status()).toBe(404)

    // 2. Publish the document
    await prisma.currentAffairsPdf.update({
      where: { id: draftDoc.id },
      data: { status: "PUBLISHED" },
    })

    // Guest views PUBLISHED (no download=1) -> 200 inline
    const guestPubView = await guestPage.request.get(`/api/current-affairs/file/${draftDoc.id}?lang=en`)
    expect(guestPubView.status()).toBe(200)
    expect(guestPubView.headers()["content-type"]).toBe("application/pdf")
    expect(guestPubView.headers()["content-disposition"]).toContain("inline")

    // Guest attempts download (download=1) -> 401 Unauthorized
    const guestPubDownload = await guestPage.request.get(`/api/current-affairs/file/${draftDoc.id}?lang=en&download=1`)
    expect(guestPubDownload.status()).toBe(401)
    const guestErr = await guestPubDownload.json()
    expect(guestErr.error).toContain("Authentication required to download")

    // 3. Authenticated Student downloads -> 200 with downloadCount +1
    const studentContext = await browser.newContext()
    const studentPage = await studentContext.newPage()
    await loginThroughUi(studentPage, studentUser.email)

    const beforeDoc = await prisma.currentAffairsPdf.findUnique({ where: { id: draftDoc.id } })
    const initialDownloads = beforeDoc?.downloadCount || 0

    const studentDownload = await studentPage.request.get(`/api/current-affairs/file/${draftDoc.id}?lang=en&download=1`)
    expect(studentDownload.status()).toBe(200)
    expect(studentDownload.headers()["content-type"]).toBe("application/pdf")
    expect(studentDownload.headers()["content-disposition"]).toContain("attachment")

    const afterDoc = await prisma.currentAffairsPdf.findUnique({ where: { id: draftDoc.id } })
    expect(afterDoc?.downloadCount).toBe(initialDownloads + 1)

    // Cleanup file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }

    await guestContext.close()
    await studentContext.close()
  })

  test("B-05: Soft delete (Archive) leaves file intact and returns 404 on secure file route", async ({ browser }) => {
    const fileName = `test_archive_${Date.now()}.pdf`
    const filePath = path.join(process.cwd(), "uploads", "ca-private", fileName)
    fs.writeFileSync(filePath, dummyPdfBuffer)

    const doc = await prisma.currentAffairsPdf.create({
      data: {
        title: `Archive Test Document ${nonce}`,
        month: 4,
        year: 2026,
        status: "PUBLISHED",
        createdById: teacherA.id,
        pdfUrlEn: `/uploads/ca-private/${fileName}`,
      },
    })

    const pageA = await browser.newPage()
    await loginThroughUi(pageA, teacherA.email)

    // Archive via DELETE
    const delRes = await pageA.request.delete(`/api/admin/current-affairs/${doc.id}`)
    expect(delRes.status()).toBe(200)

    // Verify DB status is ARCHIVED, row still exists
    const dbDoc = await prisma.currentAffairsPdf.findUnique({ where: { id: doc.id } })
    expect(dbDoc?.status).toBe("ARCHIVED")

    // Verify file is still intact on disk
    expect(fs.existsSync(filePath)).toBe(true)

    // Secure file route returns 404 for archived doc
    const fileRes = await pageA.request.get(`/api/current-affairs/file/${doc.id}?lang=en`)
    expect(fileRes.status()).toBe(404)

    // Cleanup
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    await pageA.close()
  })
})
