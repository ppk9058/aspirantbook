import { test, expect } from "@playwright/test"
import {
  prisma,
  newNonce,
  createActor,
  loginAs,
} from "./test-series-e2e-helpers"

/**
 * B4: deleting a PYQ paper destroyed paid entitlements.
 *
 * `deletePaper` called prisma.pyqPaper.delete, and both PyqUnlock and
 * PyqLeadCapture cascade from PyqPaper, so the row plus every purchase and
 * every captured lead disappeared with it. It also wrote `subject` with a raw
 * UPDATE inside a bare `catch {}` and returned the new value regardless.
 *
 * A paper that has unlocks or leads is now archived (status ARCHIVED) and the
 * public API stops serving it; a paper nobody touched is still deleted.
 */

const nonce = newNonce()

let adminUser: any
let buyer: any
let categoryId = ""

async function makePaper(title: string, subject: string | null = "Polity") {
  return prisma.pyqPaper.create({
    data: {
      categoryId,
      creatorId: adminUser.id,
      title,
      slug: `${nonce}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      year: 2026,
      paperPdfUrl: "/sample.pdf",
      subject,
      status: "PUBLISHED",
    },
  })
}

test.describe("B4 paper delete archives entitlements instead of destroying them", () => {
  test.beforeAll(async () => {
    adminUser = await createActor(nonce, "ADMIN", "admin")
    buyer = await createActor(nonce, "FREE", "buyer")
    const category = await prisma.pyqCategory.create({
      data: { name: `${nonce} Category`, slug: `${nonce}-category` },
    })
    categoryId = category.id
  })

  test.afterAll(async () => {
    await prisma.pyqUnlock.deleteMany({ where: { userId: buyer?.id } })
    await prisma.pyqLeadCapture.deleteMany({ where: { paper: { categoryId } } })
    await prisma.pyqPaper.deleteMany({ where: { categoryId } })
    await prisma.pyqCategory.deleteMany({ where: { id: categoryId } })
    await prisma.user.deleteMany({ where: { id: { in: [adminUser?.id, buyer?.id].filter(Boolean) } } })
    await prisma.$disconnect()
  })

  test("a paper with a paid unlock is archived, never deleted", async ({ page, request }) => {
    const paper = await makePaper("Purchased Paper")
    const unlock = await prisma.pyqUnlock.create({
      data: { userId: buyer.id, paperId: paper.id, amountPaid: 49 },
    })

    await loginAs(page, adminUser.email)
    const res = await page.request.delete(`/api/admin/pyqs/papers/${paper.id}`)
    expect(res.status(), await res.text()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    // The purchase the learner paid for survives (this is what used to vanish).
    const unlockAfter = await prisma.pyqUnlock.findUnique({ where: { id: unlock.id } })
    expect(unlockAfter?.id).toBe(unlock.id)

    // The row survives, flagged as withdrawn instead of deleted.
    const after = await prisma.pyqPaper.findUnique({ where: { id: paper.id } })
    expect(after?.status).toBe("ARCHIVED")
    expect(body.archived).toBe(true)

    // And it is no longer served to the public. `request` is a separate,
    // cookie-less context, so this is what a guest sees (an admin still can).
    const publicRes = await request.get(`/api/pyqs/${paper.id}`)
    expect(publicRes.status()).toBe(404)
  })

  test("a paper with captured leads is archived too", async ({ page }) => {
    const paper = await makePaper("Lead Capture Paper")
    const lead = await prisma.pyqLeadCapture.create({
      data: { paperId: paper.id, phoneNumber: "9876543210", source: "PDF_DOWNLOAD" },
    })

    await loginAs(page, adminUser.email)
    const res = await page.request.delete(`/api/admin/pyqs/papers/${paper.id}`)
    expect(res.status(), await res.text()).toBe(200)
    expect((await res.json()).archived).toBe(true)

    const after = await prisma.pyqPaper.findUnique({ where: { id: paper.id } })
    expect(after?.status).toBe("ARCHIVED")
    expect(
      await prisma.pyqLeadCapture.findUnique({ where: { id: lead.id } })
    ).not.toBeNull()
  })

  test("a paper with no dependents is deleted for real", async ({ page }) => {
    const paper = await makePaper("Mistake Paper")

    await loginAs(page, adminUser.email)
    const res = await page.request.delete(`/api/admin/pyqs/papers/${paper.id}`)
    expect(res.status(), await res.text()).toBe(200)
    expect((await res.json()).archived).toBe(false)
    expect(await prisma.pyqPaper.findUnique({ where: { id: paper.id } })).toBeNull()
  })

  test("subject is written as a real column and returned", async ({ page }) => {
    const paper = await makePaper("Subject Paper", "History")

    await loginAs(page, adminUser.email)
    const put = await page.request.put(`/api/admin/pyqs/papers/${paper.id}`, {
      data: { subject: "Geography" },
    })
    expect(put.status(), await put.text()).toBe(200)
    expect((await put.json()).subject).toBe("Geography")

    const stored = await prisma.pyqPaper.findUnique({ where: { id: paper.id } })
    expect(stored?.subject).toBe("Geography")

    // The read path agrees (no raw-SQL fallback needed).
    const get = await page.request.get(`/api/admin/pyqs/papers/${paper.id}`)
    expect(get.status()).toBe(200)
    expect((await get.json()).subject).toBe("Geography")
  })
})
