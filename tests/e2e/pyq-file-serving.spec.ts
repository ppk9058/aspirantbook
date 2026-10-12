import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
}

import { test, expect } from "@playwright/test"
import { prisma, PASSWORD, newNonce, loginThroughUi, createActor, slugFor } from "./test-series-e2e-helpers"
import { UserRole } from "@prisma/client"
import fs from "fs/promises"
import path from "path"

test.describe("PYQ Secure File Serving E2E (Gate 2)", () => {
  test.setTimeout(120_000)

  let nonce: string
  let adminUser: any
  let teacherA: any
  let teacherB: any
  let studentUser: any
  let category: any

  let freePublishedPaper: any
  let draftPaper: any
  let paidPublishedPaper: any

  let localTestFilePath: string
  const validPdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF")

  test.beforeAll(async () => {
    nonce = newNonce()
    adminUser = await createActor(nonce, UserRole.ADMIN, "file-admin")
    teacherA = await createActor(nonce, UserRole.TEACHER, "file-teacher-a")
    teacherB = await createActor(nonce, UserRole.TEACHER, "file-teacher-b")
    studentUser = await createActor(nonce, UserRole.FREE, "file-student")

    // Create physical PDF file in uploads/pyq-private
    const uploadsDir = path.join(process.cwd(), "uploads", "pyq-private")
    await fs.mkdir(uploadsDir, { recursive: true })
    const fileName = `test-file-${nonce}.pdf`
    localTestFilePath = path.join(uploadsDir, fileName)
    await fs.writeFile(localTestFilePath, validPdfBuffer)

    category = await prisma.pyqCategory.upsert({
      where: { slug: `bpsc-${slugFor(nonce)}` },
      update: {},
      create: {
        name: `BPSC Exam ${nonce}`,
        slug: `bpsc-${slugFor(nonce)}`,
        order: 1,
      },
    })

    // 1. Free Published paper
    freePublishedPaper = await prisma.pyqPaper.create({
      data: {
        title: `Free Paper ${nonce}`,
        slug: `free-paper-${slugFor(nonce)}`,
        categoryId: category.id,
        year: 2024,
        stage: "PRELIMS",
        paperPdfUrl: `/uploads/pyq-private/${fileName}`,
        accessType: "FREE",
        status: "PUBLISHED",
        creatorId: adminUser.id,
        downloadCount: 5,
      },
    })

    // 2. Draft paper owned by teacherA
    draftPaper = await prisma.pyqPaper.create({
      data: {
        title: `Draft Paper ${nonce}`,
        slug: `draft-paper-${slugFor(nonce)}`,
        categoryId: category.id,
        year: 2024,
        stage: "PRELIMS",
        paperPdfUrl: `/uploads/pyq-private/${fileName}`,
        accessType: "FREE",
        status: "DRAFT",
        creatorId: teacherA.id,
      },
    })

    // 3. Paid Published paper
    paidPublishedPaper = await prisma.pyqPaper.create({
      data: {
        title: `Paid Paper ${nonce}`,
        slug: `paid-paper-${slugFor(nonce)}`,
        categoryId: category.id,
        year: 2024,
        stage: "MAINS",
        paperPdfUrl: `/uploads/pyq-private/${fileName}`,
        accessType: "PAID",
        unlockPrice: 49,
        status: "PUBLISHED",
        creatorId: adminUser.id,
      },
    })
  })

  test.afterAll(async () => {
    const paperIds = [freePublishedPaper?.id, draftPaper?.id, paidPublishedPaper?.id].filter(Boolean)
    if (paperIds.length > 0) {
      await prisma.pyqUnlock.deleteMany({ where: { paperId: { in: paperIds } } }).catch(() => {})
      await prisma.pyqLeadCapture.deleteMany({ where: { paperId: { in: paperIds } } }).catch(() => {})
      await prisma.pyqPaper.deleteMany({ where: { id: { in: paperIds } } }).catch(() => {})
    }
    if (category?.id) {
      await prisma.pyqCategory.delete({ where: { id: category.id } }).catch(() => {})
    }
    if (localTestFilePath) {
      await fs.unlink(localTestFilePath).catch(() => {})
    }
    const userIds = [adminUser?.id, teacherA?.id, teacherB?.id, studentUser?.id].filter(Boolean)
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {})
    }
  })

  test("FILE-01: Guest can view published free paper inline (200, application/pdf, inline)", async ({ request }) => {
    const res = await request.get(`/api/pyqs/file/${freePublishedPaper.id}`)
    expect(res.status()).toBe(200)
    expect(res.headers()["content-type"]).toContain("application/pdf")
    expect(res.headers()["content-disposition"]).toContain("inline")
  })

  test("FILE-02: Guest download increments downloadCount in DB and sets attachment disposition", async ({ request }) => {
    const initialPaper = await prisma.pyqPaper.findUnique({ where: { id: freePublishedPaper.id } })
    const initialDownloads = initialPaper?.downloadCount || 0

    const res = await request.get(`/api/pyqs/file/${freePublishedPaper.id}?download=1`)
    expect(res.status()).toBe(200)
    expect(res.headers()["content-disposition"]).toContain("attachment")
    expect(res.headers()["content-disposition"]).toContain(".pdf")

    const updatedPaper = await prisma.pyqPaper.findUnique({ where: { id: freePublishedPaper.id } })
    expect(updatedPaper?.downloadCount).toBe(initialDownloads + 1)
  })

  test("FILE-03: Draft paper returns 404 for guest and non-owning teacher", async ({ page, request }) => {
    // 1. Guest -> 404
    const guestRes = await request.get(`/api/pyqs/file/${draftPaper.id}`)
    expect(guestRes.status()).toBe(404)

    // 2. Non-owning Teacher B -> 404
    await loginThroughUi(page, teacherB.email)
    const teacherBRes = await page.request.get(`/api/pyqs/file/${draftPaper.id}`)
    expect(teacherBRes.status()).toBe(404)
  })

  test("FILE-04: Draft paper returns 200 for owning teacher and admin", async ({ page }) => {
    // 1. Owning Teacher A -> 200
    await loginThroughUi(page, teacherA.email)
    const teacherARes = await page.request.get(`/api/pyqs/file/${draftPaper.id}`)
    expect(teacherARes.status()).toBe(200)
    expect(teacherARes.headers()["content-type"]).toContain("application/pdf")

    // 2. Admin -> 200
    await page.context().clearCookies()
    await loginThroughUi(page, adminUser.email)
    const adminRes = await page.request.get(`/api/pyqs/file/${draftPaper.id}`)
    expect(adminRes.status()).toBe(200)
    expect(adminRes.headers()["content-type"]).toContain("application/pdf")
  })

  test("FILE-05: Paid paper gates guest and non-unlocked student, allows unlocked student", async ({ page, request }) => {
    // 1. Guest -> 403
    const guestRes = await request.get(`/api/pyqs/file/${paidPublishedPaper.id}`)
    expect(guestRes.status()).toBe(403)

    // 2. Student without unlock -> 403
    await loginThroughUi(page, studentUser.email)
    const lockedRes = await page.request.get(`/api/pyqs/file/${paidPublishedPaper.id}`)
    expect(lockedRes.status()).toBe(403)

    // 3. Unlock paper in DB for studentUser
    await prisma.pyqUnlock.create({
      data: {
        userId: studentUser.id,
        paperId: paidPublishedPaper.id,
        amountPaid: 49,
      },
    })

    // 4. Student with unlock -> 200
    const unlockedRes = await page.request.get(`/api/pyqs/file/${paidPublishedPaper.id}`)
    expect(unlockedRes.status()).toBe(200)
    expect(unlockedRes.headers()["content-type"]).toContain("application/pdf")
  })

  test("FILE-06: Non-existent paperId returns 404 JSON", async ({ request }) => {
    const res = await request.get("/api/pyqs/file/cmvnonexistentpaperid999999")
    expect(res.status()).toBe(404)
    const data = await res.json()
    expect(data.error).toBe("Paper not found")
  })
})
