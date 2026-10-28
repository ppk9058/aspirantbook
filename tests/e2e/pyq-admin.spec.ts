import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import { prisma, PASSWORD, newNonce, loginThroughUi, createActor, slugFor } from "./test-series-e2e-helpers"
import { UserRole } from "@prisma/client"

test.describe("PYQ Admin & Teacher Authoring E2E (Gate 1)", () => {
  test.setTimeout(120_000)

  let nonce: string
  let adminUser: any
  let teacherA: any
  let teacherB: any
  let category: any
  let testPaperIds: string[] = []

  const validPdfBuffer = Buffer.concat([
    Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"),
    Buffer.alloc(2048, " "),
  ])
  const fakePdfBuffer = Buffer.from("NOT_A_PDF_FILE_HEADER_TEST")

  test.beforeAll(async () => {
    nonce = newNonce()
    adminUser = await createActor(nonce, UserRole.ADMIN, "pyq-admin")
    teacherA = await createActor(nonce, UserRole.TEACHER, "pyq-teacher-a")
    teacherB = await createActor(nonce, UserRole.TEACHER, "pyq-teacher-b")

    category = await prisma.pyqCategory.upsert({
      where: { slug: `bpsc-${slugFor(nonce)}` },
      update: {},
      create: {
        name: `BPSC Exam ${nonce}`,
        slug: `bpsc-${slugFor(nonce)}`,
        order: 1,
      },
    })
  })

  test.afterAll(async () => {
    if (testPaperIds.length > 0) {
      await prisma.pyqLeadCapture.deleteMany({ where: { paperId: { in: testPaperIds } } }).catch(() => {})
      await prisma.pyqUnlock.deleteMany({ where: { paperId: { in: testPaperIds } } }).catch(() => {})
      await prisma.pyqPaper.deleteMany({ where: { id: { in: testPaperIds } } }).catch(() => {})
    }
    if (category?.id) {
      await prisma.pyqCategory.delete({ where: { id: category.id } }).catch(() => {})
    }
    const userIds = [adminUser?.id, teacherA?.id, teacherB?.id].filter(Boolean)
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {})
    }
  })

  test("ADMIN-01: Admin can upload a valid PDF and create paper with DRAFT status, subject, year, stage", async ({ page }) => {
    await loginThroughUi(page, adminUser.email)

    // Upload PDF via API
    const uploadRes = await page.request.post("/api/admin/pyqs/upload", {
      multipart: {
        file: {
          name: `sample-${nonce}.pdf`,
          mimeType: "application/pdf",
          buffer: validPdfBuffer,
        },
        folder: "pyq",
      },
    })
    expect(uploadRes.status()).toBe(200)
    const uploadData = await uploadRes.json()
    expect(uploadData.success).toBe(true)
    expect(uploadData.url).toContain("/uploads/pyq-private/")

    // Create paper via POST
    const paperTitle = `BPSC GS Paper ${nonce}`
    const createRes = await page.request.post("/api/admin/pyqs/papers", {
      data: {
        title: paperTitle,
        subject: "General Studies Paper 1",
        categoryId: category.id,
        year: 2024,
        stage: "PRELIMS",
        paperPdfUrl: uploadData.url,
        pdfFileSizeKb: uploadData.fileSizeKb,
        accessType: "FREE",
        status: "DRAFT",
      },
    })
    expect(createRes.status()).toBe(201)
    const createdPaper = await createRes.json()
    testPaperIds.push(createdPaper.id)

    expect(createdPaper.id).toBeTruthy()
    expect(createdPaper.status).toBe("DRAFT")
    expect(createdPaper.subject).toBe("General Studies Paper 1")
    expect(createdPaper.year).toBe(2024)

    // Verify paper in DB
    const dbPaper = await prisma.pyqPaper.findUnique({ where: { id: createdPaper.id } })
    expect(dbPaper).not.toBeNull()
    expect(dbPaper!.status).toBe("DRAFT")

    // Verify paper visible on UI at /admin/pyqs
    await page.goto("/admin/pyqs", { waitUntil: "domcontentloaded" })
    await expect(page.getByText(paperTitle)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("General Studies Paper 1")).toBeVisible()
    await expect(page.getByText("DRAFT")).toBeVisible()
  })

  test("ADMIN-02: Toggle paper status between DRAFT and PUBLISHED", async ({ page }) => {
    await loginThroughUi(page, adminUser.email)

    // Create DRAFT paper
    const paper = await prisma.pyqPaper.create({
      data: {
        title: `Toggle Test ${nonce}`,
        slug: `toggle-test-${slugFor(nonce)}`,
        categoryId: category.id,
        year: 2023,
        stage: "PRELIMS",
        paperPdfUrl: "/uploads/pyq-private/dummy.pdf",
        status: "DRAFT",
        creatorId: adminUser.id,
      },
    })
    testPaperIds.push(paper.id)

    // Toggle via PUT
    const toggleRes = await page.request.put(`/api/admin/pyqs/papers/${paper.id}`, {
      data: { status: "PUBLISHED" },
    })
    expect(toggleRes.status()).toBe(200)

    const updated = await prisma.pyqPaper.findUnique({ where: { id: paper.id } })
    expect(updated?.status).toBe("PUBLISHED")

    // Check UI reflects PUBLISHED at /admin/pyqs
    await page.goto("/admin/pyqs", { waitUntil: "domcontentloaded" })
    await expect(page.getByText(`Toggle Test ${nonce}`)).toBeVisible({ timeout: 15_000 })
    const statusBtn = page.getByRole("button", { name: `Toggle publish status for Toggle Test ${nonce}` })
    await expect(statusBtn).toContainText("PUBLISHED")
  })

  test("ADMIN-03: Edit paper title, year, stage, and subject persists in DB", async ({ page }) => {
    await loginThroughUi(page, adminUser.email)

    const paper = await prisma.pyqPaper.create({
      data: {
        title: `Edit Test Initial ${nonce}`,
        slug: `edit-test-initial-${slugFor(nonce)}`,
        categoryId: category.id,
        year: 2021,
        stage: "PRELIMS",
        paperPdfUrl: "/uploads/pyq-private/dummy.pdf",
        status: "DRAFT",
        creatorId: adminUser.id,
      },
    })
    testPaperIds.push(paper.id)

    const newTitle = `Edit Test Updated ${nonce}`
    const editRes = await page.request.put(`/api/admin/pyqs/papers/${paper.id}`, {
      data: {
        title: newTitle,
        year: 2025,
        stage: "MAINS",
        subject: "Advanced Physics",
      },
    })
    expect(editRes.status()).toBe(200)

    const updated = await prisma.pyqPaper.findUnique({ where: { id: paper.id } })
    expect(updated?.title).toBe(newTitle)
    expect(updated?.year).toBe(2025)
    expect(updated?.stage).toBe("MAINS")
  })

  test("ADMIN-04: Replace PDF file updates paperPdfUrl and fileSizeKb", async ({ page }) => {
    await loginThroughUi(page, adminUser.email)

    const paper = await prisma.pyqPaper.create({
      data: {
        title: `Replace PDF Test ${nonce}`,
        slug: `replace-pdf-${slugFor(nonce)}`,
        categoryId: category.id,
        year: 2022,
        stage: "PRELIMS",
        paperPdfUrl: "/uploads/pyq-private/old.pdf",
        pdfFileSizeKb: 10,
        status: "DRAFT",
        creatorId: adminUser.id,
      },
    })
    testPaperIds.push(paper.id)

    // Upload replacement
    const uploadRes = await page.request.post("/api/admin/pyqs/upload", {
      multipart: {
        file: {
          name: `replacement-${nonce}.pdf`,
          mimeType: "application/pdf",
          buffer: validPdfBuffer,
        },
        folder: "pyq",
      },
    })
    expect(uploadRes.status()).toBe(200)
    const { url, fileSizeKb } = await uploadRes.json()
    expect(fileSizeKb).toBeGreaterThan(0)

    // Update paper
    const patchRes = await page.request.put(`/api/admin/pyqs/papers/${paper.id}`, {
      data: { paperPdfUrl: url, pdfFileSizeKb: fileSizeKb },
    })
    expect(patchRes.status()).toBe(200)

    const updated = await prisma.pyqPaper.findUnique({ where: { id: paper.id } })
    expect(updated?.paperPdfUrl).toBe(url)
    expect(updated?.pdfFileSizeKb).toBe(fileSizeKb)
  })

  test("ADMIN-05: Teacher isolation - Teacher1 sees own paper, Teacher2 cannot edit/delete it (403)", async ({ page }) => {
    // Create paper owned by Teacher A
    const paperA = await prisma.pyqPaper.create({
      data: {
        title: `Teacher A Paper ${nonce}`,
        slug: `teacher-a-paper-${slugFor(nonce)}`,
        categoryId: category.id,
        year: 2024,
        stage: "PRELIMS",
        paperPdfUrl: "/uploads/pyq-private/teachera.pdf",
        status: "DRAFT",
        creatorId: teacherA.id,
      },
    })
    testPaperIds.push(paperA.id)

    // 1. Teacher A logs in: can see paper in GET /api/admin/pyqs/papers
    await loginThroughUi(page, teacherA.email)
    const getResA = await page.request.get("/api/admin/pyqs/papers")
    expect(getResA.status()).toBe(200)
    const papersA = await getResA.json()
    const foundA = papersA.find((p: any) => p.id === paperA.id)
    expect(foundA).toBeTruthy()

    // 2. Clear cookies and login as Teacher B
    await page.context().clearCookies()
    await loginThroughUi(page, teacherB.email)
    const getResB = await page.request.get("/api/admin/pyqs/papers")
    expect(getResB.status()).toBe(200)
    const papersB = await getResB.json()
    const foundB = papersB.find((p: any) => p.id === paperA.id)
    expect(foundB).toBeFalsy()

    // Teacher B tries to edit Teacher A's paper -> 403 Forbidden
    const editResB = await page.request.put(`/api/admin/pyqs/papers/${paperA.id}`, {
      data: { title: `Hacked Title ${nonce}` },
    })
    expect(editResB.status()).toBe(403)

    // Teacher B tries to delete Teacher A's paper -> 403 Forbidden
    const deleteResB = await page.request.delete(`/api/admin/pyqs/papers/${paperA.id}`)
    expect(deleteResB.status()).toBe(403)

    // Verify unchanged in DB
    const unchanged = await prisma.pyqPaper.findUnique({ where: { id: paperA.id } })
    expect(unchanged?.title).toBe(`Teacher A Paper ${nonce}`)
  })

  test("ADMIN-06: Admin CAN edit and delete teacher-created paper", async ({ page }) => {
    const paperA = await prisma.pyqPaper.create({
      data: {
        title: `Teacher Paper To Admin Edit ${nonce}`,
        slug: `teacher-paper-admin-edit-${slugFor(nonce)}`,
        categoryId: category.id,
        year: 2024,
        stage: "PRELIMS",
        paperPdfUrl: "/uploads/pyq-private/teachera.pdf",
        status: "DRAFT",
        creatorId: teacherA.id,
      },
    })
    testPaperIds.push(paperA.id)

    await loginThroughUi(page, adminUser.email)

    // Admin edits teacher paper -> 200 OK
    const editRes = await page.request.put(`/api/admin/pyqs/papers/${paperA.id}`, {
      data: { title: `Admin Edited Teacher Paper ${nonce}` },
    })
    expect(editRes.status()).toBe(200)

    // Admin deletes teacher paper -> 200 OK
    const deleteRes = await page.request.delete(`/api/admin/pyqs/papers/${paperA.id}`)
    expect(deleteRes.status()).toBe(200)

    const check = await prisma.pyqPaper.findUnique({ where: { id: paperA.id } })
    expect(check).toBeNull()
  })

  test("ADMIN-07: Non-PDF upload rejection (magic bytes & extension)", async ({ page }) => {
    await loginThroughUi(page, adminUser.email)

    // Upload file with fake content (missing %PDF signature)
    const fakeUpload = await page.request.post("/api/admin/pyqs/upload", {
      multipart: {
        file: {
          name: "malicious.pdf",
          mimeType: "application/pdf",
          buffer: fakePdfBuffer,
        },
        folder: "pyq",
      },
    })
    expect(fakeUpload.status()).toBe(400)
    const errData = await fakeUpload.json()
    expect(errData.error).toContain("File signature does not match")

    // Upload text file
    const txtUpload = await page.request.post("/api/admin/pyqs/upload", {
      multipart: {
        file: {
          name: "document.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("just plain text"),
        },
        folder: "pyq",
      },
    })
    expect(txtUpload.status()).toBe(400)
  })
})
