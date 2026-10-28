import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

import { test, expect } from "@playwright/test"
import { createActor, loginAs, newNonce, prisma, slugFor } from "./test-series-e2e-helpers"
import { fulfilPaymentOrder } from "@/lib/payments/fulfilment"

/**
 * B-004 regression:
 * - /api/verify-payment/razorpay must reject requests without an authenticated session,
 *   even when the body carries a userId.
 * - The signature must be verified before any database write.
 * - Fulfilment must be idempotent (replay does not duplicate payments or enrollments).
 */

const BASE = process.env.BASE_URL || "http://127.0.0.1:3045"

test.describe.configure({ mode: "serial" })

test.describe("B-004: razorpay verification auth and idempotency", () => {
  let nonce = ""
  let email = ""
  let userId = ""
  let courseId = ""
  let courseSlug = ""
  let orderId = ""

  test.beforeAll(async () => {
    nonce = newNonce()
    const student = await createActor(nonce, "FREE", "verify-payment")
    email = student.email
    userId = student.id

    courseSlug = `${slugFor(nonce)}-payment-course`
    const course = await prisma.course.create({
      data: {
        title: `${nonce} Payment Course`,
        slug: courseSlug,
        description: "Fixture course for payment verification regression",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        isPremium: true,
        price: 100,
      },
    })
    courseId = course.id

    orderId = `order_test_${slugFor(nonce)}`
    await prisma.payment.create({
      data: {
        userId,
        amount: 100,
        currency: "INR",
        status: "PENDING",
        paymentProvider: "RAZORPAY",
        externalId: orderId,
        metadata: { orderId, courseId, amountPaise: 10000 },
      },
    })
  })

  test.afterAll(async () => {
    try {
      await prisma.enrollment.deleteMany({ where: { courseId } })
      await prisma.payment.deleteMany({ where: { userId } })
      await prisma.course.deleteMany({ where: { id: courseId } })
      await prisma.user.deleteMany({ where: { email } })
    } catch (error) {
      console.error("[verify-payment] cleanup failed", error)
    }
  })

  test("rejects a guest request that supplies userId in the body", async ({ request }) => {
    const res = await request.post(`${BASE}/api/verify-payment/razorpay`, {
      data: {
        orderId,
        paymentId: `pay_test_${nonce}`,
        signature: "forged",
        userId,
      },
    })

    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.error).toContain("Unauthorized")

    const payment = await prisma.payment.findFirst({ where: { externalId: orderId } })
    expect(payment?.status).toBe("PENDING")
  })

  test("verifies the signature before writing to the database", async ({ page }) => {
    await loginAs(page, email)
    await page.goto(`${BASE}/`)

    const result = await page.evaluate(
      async ({ base, order, user }) => {
        const res = await fetch(`${base}/api/verify-payment/razorpay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order,
            paymentId: `pay_test_${Date.now()}`,
            signature: "forged",
            userId: user,
          }),
        })
        return { status: res.status, body: await res.json().catch(() => null) }
      },
      { base: BASE, order: orderId, user: userId }
    )

    expect(result.status).toBe(400)
    expect(result.body?.error).toBe("Invalid signature")

    const payment = await prisma.payment.findFirst({ where: { externalId: orderId } })
    expect(payment?.status).toBe("PENDING")
  })

  test("fulfilment is idempotent when the same order is replayed", async () => {
    const paymentId = `pay_test_${slugFor(nonce)}_idem`

    const first = await fulfilPaymentOrder({
      orderId,
      paymentId,
      courseId,
      currentUserId: userId,
      amountPaise: 10000,
    })
    expect(first.success).toBe(true)
    expect(first.alreadyFulfilled).toBeUndefined()

    const second = await fulfilPaymentOrder({
      orderId,
      paymentId,
      courseId,
      currentUserId: userId,
      amountPaise: 10000,
    })
    expect(second.success).toBe(true)
    expect(second.alreadyFulfilled).toBe(true)

    const enrollments = await prisma.enrollment.count({ where: { userId, courseId } })
    expect(enrollments).toBe(1)

    const completed = await prisma.payment.count({
      where: { userId, status: "COMPLETED" },
    })
    expect(completed).toBe(1)
  })
})
