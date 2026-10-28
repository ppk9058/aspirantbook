import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

import { test, expect } from "@playwright/test"
import crypto from "node:crypto"
import { NextRequest } from "next/server"
import { createActor, newNonce, prisma, slugFor } from "./test-series-e2e-helpers"
import { handleRazorpayWebhook } from "@/lib/payments/razorpay-webhook"
import { verifyRazorpayWebhookSignature } from "@/lib/payments/razorpay"
import { POST as legacyWebhookPOST } from "@/app/api/razorpay/webhook/route"

/**
 * B-008 / B-009 regression:
 * - one canonical handler, legacy URL delegates to it (course payments included)
 * - RAZORPAY_WEBHOOK_SECRET is mandatory (no RAZORPAY_KEY_SECRET fallback)
 * - signature verified against the raw body
 * - replaying a signed event does not double-fulfil
 */

const WEBHOOK_SECRET = "regression_webhook_secret_not_a_real_credential"
const API_KEY_SECRET = "regression_api_key_secret_must_not_verify_webhooks"

test.describe.configure({ mode: "serial" })

test.describe("B-008/B-009: razorpay webhook", () => {
  let nonce = ""
  let email = ""
  let userId = ""
  let courseId = ""
  let replayOrderId = ""
  let legacyOrderId = ""
  let replayPaymentRowId = ""
  let legacyPaymentRowId = ""

  function sign(body: string, secret = WEBHOOK_SECRET) {
    return crypto.createHmac("sha256", secret).update(body).digest("hex")
  }

  function signedRequest(payload: unknown, signature?: string, secret?: string) {
    const body = JSON.stringify(payload)
    const sig = signature ?? sign(body, secret)
    return new NextRequest("http://127.0.0.1:3045/api/webhooks/razorpay", {
      method: "POST",
      headers: { "content-type": "application/json", "x-razorpay-signature": sig },
      body,
    })
  }

  function capturedEvent(orderId: string, paymentId: string) {
    return {
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: orderId,
            amount: 10000,
            currency: "INR",
            method: "card",
          },
        },
      },
    }
  }

  async function createPendingOrder(label: string) {
    const orderId = `order_test_${slugFor(nonce)}_${label}`
    const payment = await prisma.payment.create({
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
    return { orderId, paymentRowId: payment.id }
  }

  test.beforeAll(async () => {
    nonce = newNonce()
    const student = await createActor(nonce, "FREE", "webhook")
    email = student.email
    userId = student.id

    const course = await prisma.course.create({
      data: {
        title: `${nonce} Webhook Course`,
        slug: `${slugFor(nonce)}-webhook-course`,
        description: "Fixture course for the webhook regression",
        difficulty: "BEGINNER",
        status: "PUBLISHED",
        isPublished: true,
        isPremium: true,
        price: 100,
      },
    })
    courseId = course.id

    const replayOrder = await createPendingOrder("replay")
    replayOrderId = replayOrder.orderId
    replayPaymentRowId = replayOrder.paymentRowId

    const legacyOrder = await createPendingOrder("legacy")
    legacyOrderId = legacyOrder.orderId
    legacyPaymentRowId = legacyOrder.paymentRowId
  })

  test.afterAll(async () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET
    try {
      await prisma.enrollment.deleteMany({ where: { courseId } })
      await prisma.payment.deleteMany({ where: { userId } })
      await prisma.course.deleteMany({ where: { id: courseId } })
      await prisma.user.deleteMany({ where: { email } })
    } catch (error) {
      console.error("[razorpay-webhook] cleanup failed", error)
    }
  })

  test("fails closed when RAZORPAY_WEBHOOK_SECRET is missing", async () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET

    const res = await handleRazorpayWebhook(
      signedRequest(capturedEvent(replayOrderId, "pay_missing_secret"))
    )
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe("Webhook secret not configured")

    const payment = await prisma.payment.findUnique({ where: { id: replayPaymentRowId } })
    expect(payment?.status).toBe("PENDING")
  })

  test("never verifies a webhook with RAZORPAY_KEY_SECRET", async () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET
    process.env.RAZORPAY_KEY_SECRET = API_KEY_SECRET

    const body = JSON.stringify({ event: "payment.captured" })
    expect(verifyRazorpayWebhookSignature(body, sign(body, API_KEY_SECRET))).toBe(false)

    process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET
    expect(verifyRazorpayWebhookSignature(body, sign(body, API_KEY_SECRET))).toBe(false)
    expect(verifyRazorpayWebhookSignature(body, sign(body, WEBHOOK_SECRET))).toBe(true)

    delete process.env.RAZORPAY_KEY_SECRET
  })

  test("rejects a bad signature with 400 and does not fulfil", async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET

    const res = await handleRazorpayWebhook(
      signedRequest(capturedEvent(replayOrderId, "pay_bad_signature"), "0".repeat(64))
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe("Invalid signature")

    const payment = await prisma.payment.findUnique({ where: { id: replayPaymentRowId } })
    expect(payment?.status).toBe("PENDING")
  })

  test("legacy /api/razorpay/webhook fulfils course payments via the canonical handler", async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET

    const res = await legacyWebhookPOST(
      signedRequest(capturedEvent(legacyOrderId, `pay_test_${slugFor(nonce)}_legacy`))
    )
    expect(res.status).toBe(200)
    expect((await res.json()).received).toBe(true)

    const payment = await prisma.payment.findUnique({ where: { id: legacyPaymentRowId } })
    expect(payment?.status).toBe("COMPLETED")

    const enrollments = await prisma.enrollment.count({ where: { userId, courseId } })
    expect(enrollments).toBe(1)
  })

  test("replaying the same signed event fulfils exactly once", async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET
    const paymentId = `pay_test_${slugFor(nonce)}_replay`

    const first = await handleRazorpayWebhook(
      signedRequest(capturedEvent(replayOrderId, paymentId))
    )
    expect(first.status).toBe(200)
    expect((await first.json()).received).toBe(true)

    const replay = await handleRazorpayWebhook(
      signedRequest(capturedEvent(replayOrderId, paymentId))
    )
    expect(replay.status).toBe(200)

    // Legacy order + replay order are the same course/user, so the enrollment stays at 1.
    const enrollments = await prisma.enrollment.count({ where: { userId, courseId } })
    expect(enrollments).toBe(1)

    const completed = await prisma.payment.count({ where: { userId, status: "COMPLETED" } })
    expect(completed).toBe(2)
  })
})
