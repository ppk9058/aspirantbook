import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"

import { assertTestDatabase } from "@/lib/test-db-guard"
import { prisma } from "@/lib/prisma"
import {
  createBook,
  createCoupon,
  createOrder,
  deleteBook,
  deleteCoupon,
  getBookById,
  markBookOrderCompleted,
  redeemCoupon,
} from "@/lib/books/bookService"
import type { BookOrder } from "@/lib/books/types"

/**
 * B-005 regression: books, orders and coupons live in Postgres.
 *
 * - a coupon with usageLimit N accepts exactly N parallel redemptions
 * - fulfilling the same payment twice has one order effect
 * - the backfill is idempotent
 * - no function writes data/*.json any more
 */

const DATA_FILES = ["books.json", "book-orders.json", "book-coupons.json"].map((file) =>
  path.join(process.cwd(), "data", file)
)

function snapshotDataFiles() {
  const snapshot: Record<string, string> = {}
  for (const file of DATA_FILES) {
    snapshot[path.basename(file)] = fs.existsSync(file)
      ? crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")
      : "(missing)"
  }
  return snapshot
}

function runBackfill(only: string) {
  const env = { ...process.env }
  delete (env as any).NODE_TEST_CONTEXT
  delete (env as any).NODE_TEST_REPORTER
  return execFileSync("npx", ["tsx", "scripts/backfill-phase3.ts", `--only=${only}`], {
    cwd: process.cwd(),
    encoding: "utf8",
    env,
    timeout: 120_000,
  })
}

const runId = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`
const createdBookIds: string[] = []
const createdOrderIds: string[] = []
const createdCouponCodes: string[] = []

describe("B-005: books/orders/coupons persist in Postgres", () => {
  before(() => {
    assertTestDatabase({ context: "tests/unit/books-db-persistence.test.ts" })
  })

  after(async () => {
    if (createdOrderIds.length > 0) {
      await prisma.bookOrder.deleteMany({ where: { id: { in: createdOrderIds } } }).catch(() => {})
    }
    for (const id of createdBookIds) await deleteBook(id).catch(() => {})
    for (const code of createdCouponCodes) await deleteCoupon(code).catch(() => {})
  })

  it("a coupon with usageLimit 3 accepts exactly 3 of 10 parallel redemptions", async () => {
    const code = `RACE${runId}`.toUpperCase()
    createdCouponCodes.push(code)
    await createCoupon({
      code,
      title: "Race coupon",
      description: "limit test",
      discountType: "PERCENT",
      value: 10,
      minCartValue: 0,
      usageLimit: 3,
    })

    const results = await Promise.all(Array.from({ length: 10 }, () => redeemCoupon(code)))
    const successes = results.filter((result) => result.success).length
    assert.equal(successes, 3, "exactly usageLimit redemptions may succeed")

    const row = await prisma.bookCoupon.findUnique({ where: { code } })
    assert.equal(row?.redemptions, 3)

    const extra = await redeemCoupon(code)
    assert.equal(extra.success, false)
    assert.equal(extra.reason, "USAGE_LIMIT_REACHED")
  })

  it("fulfilling the same payment twice has exactly one order effect", async () => {
    const bookId = `b005-book-${runId}`
    const book = await createBook({ id: bookId, title: `B-005 book ${runId}`, price: 100, status: "published" })
    createdBookIds.push(bookId)
    assert.equal(book.salesCount, 0)

    const orderId = `b005-order-${runId}`
    const paymentId = `pay_b005_${runId}`
    const order: BookOrder = {
      id: orderId,
      orderNumber: `AB-B005-${runId}`.toUpperCase(),
      date: new Date().toISOString(),
      items: [{ bookId, book, quantity: 2, addedAt: new Date().toISOString() }],
      originalTotal: 200,
      discountTotal: 0,
      couponDiscount: 0,
      finalTotal: 200,
      status: "pending_payment",
      paymentMethod: "UPI",
    }
    await createOrder(order)
    createdOrderIds.push(orderId)

    const first = await markBookOrderCompleted({ orderId, razorpayPaymentId: paymentId })
    assert.equal(first.success, true)
    assert.equal(first.alreadyCompleted, false)

    const second = await markBookOrderCompleted({ orderId, razorpayPaymentId: paymentId })
    assert.equal(second.success, true)
    assert.equal(second.alreadyCompleted, true)

    // A different order may not reuse the same payment id.
    const otherOrderId = `b005-order2-${runId}`
    await createOrder({ ...order, id: otherOrderId, orderNumber: `AB-B005B-${runId}`.toUpperCase() })
    createdOrderIds.push(otherOrderId)
    const reused = await markBookOrderCompleted({ orderId: otherOrderId, razorpayPaymentId: paymentId })
    assert.equal(reused.success, false)
    assert.equal(reused.error, "PAYMENT_ALREADY_USED")

    // Exactly one sale of 2 units was recorded.
    const fresh = await getBookById(bookId)
    assert.equal(fresh?.salesCount, 2)
    const otherRow = await prisma.bookOrder.findUnique({ where: { id: otherOrderId } })
    assert.equal(otherRow?.status, "pending_payment")
  })

  it("running the backfill twice creates no duplicates", async () => {
    runBackfill("books,coupons")
    const booksAfterFirst = await prisma.book.count()
    const couponsAfterFirst = await prisma.bookCoupon.count()

    runBackfill("books,coupons")
    assert.equal(await prisma.book.count(), booksAfterFirst)
    assert.equal(await prisma.bookCoupon.count(), couponsAfterFirst)
  })

  it("does not write any data/*.json file", async () => {
    const before = snapshotDataFiles()

    const bookId = `b005-fs-${runId}`
    const book = await createBook({ id: bookId, title: `B-005 fs ${runId}`, price: 50, status: "published" })
    createdBookIds.push(bookId)
    const orderId = `b005-fs-order-${runId}`
    await createOrder({
      id: orderId,
      orderNumber: `AB-B005FS-${runId}`.toUpperCase(),
      date: new Date().toISOString(),
      items: [{ bookId, book, quantity: 1, addedAt: new Date().toISOString() }],
      originalTotal: 50,
      discountTotal: 0,
      couponDiscount: 0,
      finalTotal: 50,
      status: "pending_payment",
      paymentMethod: "UPI",
    })
    createdOrderIds.push(orderId)
    const code = `FS${runId}`.toUpperCase()
    createdCouponCodes.push(code)
    await createCoupon({
      code,
      title: "FS coupon",
      description: "fs test",
      discountType: "FLAT",
      value: 5,
      minCartValue: 0,
    })
    await redeemCoupon(code)

    assert.deepEqual(snapshotDataFiles(), before, "data/*.json must not change")
  })
})
