import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"

import { prisma } from "@/lib/prisma"
import {
  getAllBooks,
  getAllCoupons,
  getAllOrders,
  getBookstoreStats,
  isPaidOrderStatus,
} from "@/lib/books/bookService"

/**
 * B3: bookstore revenue counted orders of every status and fell back to the
 * built-in INITIAL_ORDERS seed whenever the table was empty, so production
 * could display invented revenue. Seed data is now test/demo only and revenue
 * counts settled orders only.
 */

const savedEnv: Record<string, string | undefined> = {}

type Backup = {
  orders: any[]
  books: any[]
  coupons: any[]
}

let backup: Backup

async function snapshot(): Promise<Backup> {
  return {
    orders: await prisma.bookOrder.findMany(),
    books: await prisma.book.findMany(),
    coupons: await prisma.bookCoupon.findMany(),
  }
}

async function restore(data: Backup) {
  await prisma.book.createMany({ data: data.books, skipDuplicates: true })
  await prisma.bookCoupon.createMany({ data: data.coupons, skipDuplicates: true })
  await prisma.bookOrder.createMany({ data: data.orders, skipDuplicates: true })
}

function orderRow(id: string, status: string, finalTotal: number) {
  return {
    id,
    orderNumber: id,
    status,
    finalTotal,
    data: {
      id,
      orderNumber: id,
      date: new Date().toISOString(),
      items: [],
      originalTotal: finalTotal,
      discountTotal: 0,
      couponDiscount: 0,
      finalTotal,
      status,
      paymentMethod: "UPI",
    },
  }
}

describe("B3 bookstore revenue counts settled orders only", () => {
  before(async () => {
    await prisma.$connect()
    for (const key of ["NODE_ENV", "APP_ENV", "ENABLE_DEMO_DATA"]) savedEnv[key] = process.env[key]
    backup = await snapshot()
  })

  after(async () => {
    await prisma.bookOrder.deleteMany({})
    await prisma.book.deleteMany({})
    await prisma.bookCoupon.deleteMany({})
    await restore(backup)
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    await prisma.$disconnect()
  })

  it("counts only completed orders and exposes a paid count", async () => {
    process.env.APP_ENV = "test"
    await prisma.bookOrder.deleteMany({})
    await prisma.bookOrder.createMany({
      data: [
        orderRow("b3-paid", "completed", 500),
        orderRow("b3-pending", "pending_payment", 700),
        orderRow("b3-failed", "failed", 900),
        orderRow("b3-refunded", "refunded", 1100),
        orderRow("b3-processing", "PROCESSING", 1300),
      ],
    })

    const stats = await getBookstoreStats()
    assert.equal(stats.totalRevenue, 500, "only the completed order is revenue")
    assert.equal(stats.totalOrders, 5)
    assert.equal(stats.completedOrders, 1)
    assert.equal(stats.paidOrders, 1)
    assert.equal(stats.avgOrderValue, 500)

    assert.equal(isPaidOrderStatus("COMPLETED"), true)
    assert.equal(isPaidOrderStatus("completed"), true)
    assert.equal(isPaidOrderStatus("refunded"), false)
    assert.equal(isPaidOrderStatus("pending_payment"), false)

    // The public order list still shows every order (history is not hidden).
    assert.equal((await getAllOrders()).length, 5)
  })

  it("returns no fabricated books, orders or coupons in production", async () => {
    await prisma.bookOrder.deleteMany({})
    await prisma.book.deleteMany({})
    await prisma.bookCoupon.deleteMany({})
    ;(process.env as Record<string, string | undefined>).NODE_ENV = "production"
    try {
      assert.deepEqual(await getAllOrders(), [])
      assert.deepEqual(await getAllBooks(), [])
      assert.deepEqual(await getAllCoupons(), [])

      const stats = await getBookstoreStats()
      assert.equal(stats.totalRevenue, 0)
      assert.equal(stats.totalOrders, 0)
      assert.equal(stats.totalBooks, 0)
      assert.deepEqual(stats.topSellingBooks, [])
    } finally {
      delete (process.env as Record<string, string | undefined>).NODE_ENV
      process.env.APP_ENV = "test"
    }
  })
})
