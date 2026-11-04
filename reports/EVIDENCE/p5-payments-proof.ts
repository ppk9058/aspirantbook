/**
 * Phase 5 runtime proof: payments, signatures, webhook and entitlement fulfilment.
 *
 * Runs in-process against 127.0.0.1:54329/launch_verify only (asserted below).
 * No network call to Razorpay/Stripe: APP_ENV=test forces the explicit mock-order
 * path, and every webhook request is fed to the real handler with a locally
 * computed HMAC.
 */
import crypto from "node:crypto"
import assert from "node:assert/strict"
import { NextRequest } from "next/server"

const dbUrl = new URL(process.env.DATABASE_URL || "")
assert.equal(dbUrl.hostname, "127.0.0.1", `refusing non-local DB host ${dbUrl.hostname}`)
assert.equal(dbUrl.port, "54329", `refusing non-54329 DB port ${dbUrl.port}`)
assert.equal(dbUrl.pathname, "/launch_verify", `refusing DB ${dbUrl.pathname}`)

process.env.APP_ENV = "test"
process.env.RAZORPAY_KEY_SECRET = "p5_key_secret_value"
process.env.RAZORPAY_WEBHOOK_SECRET = "p5_webhook_secret_value"

/* eslint-disable @typescript-eslint/no-var-requires */
const { verifyRazorpaySignature, verifyRazorpayWebhookSignature } = require("../../lib/payments/razorpay")
const { handleRazorpayWebhook } = require("../../lib/payments/razorpay-webhook")
const { createRazorpayOrder } = require("../../lib/actions/payment/razorpay")
const { prisma } = require("../../lib/prisma")

const FREE_USER = "cmw2dsm6i0000xpvtthwwt7sj" // fv.free@example.test
const PAID_COURSE = "fv-paid-b-id"
const FREE_COURSE = "fv-free-b-id"

let pass = 0
let fail = 0
const createdOrderIds: string[] = []
function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      pass++
      console.log(`PASS | ${name}`)
    })
    .catch((e: any) => {
      fail++
      console.log(`FAIL | ${name} | ${e?.message || e}`)
    })
}

function hmac(secret: string, text: string) {
  return crypto.createHmac("sha256", secret).update(text).digest("hex")
}

function webhookRequest(body: string, headers: Record<string, string> = {}) {
  return new NextRequest("http://127.0.0.1:3048/api/webhooks/razorpay", {
    method: "POST",
    body,
    headers,
  })
}

async function postWebhook(body: string, signature: string | null, eventId?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" }
  if (signature) headers["x-razorpay-signature"] = signature
  if (eventId) headers["x-razorpay-event-id"] = eventId
  const res = await handleRazorpayWebhook(webhookRequest(body, headers))
  let json: any = null
  try {
    json = await res.clone().json()
  } catch {
    json = null
  }
  return { status: res.status, json }
}

async function cleanup() {
  await prisma.razorpayWebhookEvent.deleteMany({ where: { eventId: { startsWith: "p5_evt_" } } })
  const leftovers = await prisma.payment.findMany({
    where: {
      OR: [
        { externalId: { startsWith: "order_p5_" } },
        { externalId: { startsWith: "pay_p5" } },
        { razorpayPaymentId: { startsWith: "pay_p5" } },
        ...(createdOrderIds.length ? [{ externalId: { in: createdOrderIds } }] : []),
      ],
    },
    select: { id: true },
  })
  const ids = leftovers.map((p: any) => p.id)
  if (ids.length) {
    await prisma.couponRedemption.deleteMany({ where: { paymentId: { in: ids } } })
    await prisma.payment.deleteMany({ where: { id: { in: ids } } })
  }
  await prisma.subscription.deleteMany({ where: { userId: FREE_USER, providerId: { startsWith: "order_p5_" } } })
  await prisma.enrollment.deleteMany({ where: { userId: FREE_USER, courseId: { in: [PAID_COURSE, FREE_COURSE] } } })
  const coupon = await prisma.coupon.findUnique({ where: { code: "FVP5" } })
  if (coupon) {
    await prisma.couponRedemption.deleteMany({ where: { couponId: coupon.id } })
    await prisma.coupon.delete({ where: { id: coupon.id } })
  }
}

async function main() {
  await cleanup()

  console.log("### 1. payment signature verification (order|payment HMAC-SHA256)")
  const orderId = "order_p5_sig"
  const paymentId = "pay_p5_sig"
  const goodSig = hmac(process.env.RAZORPAY_KEY_SECRET!, `${orderId}|${paymentId}`)
  await check("valid signature accepted", () => {
    assert.equal(verifyRazorpaySignature({ orderId, paymentId, signature: goodSig }), true)
  })
  await check("tampered paymentId rejected", () => {
    assert.equal(verifyRazorpaySignature({ orderId, paymentId: "pay_p5_other", signature: goodSig }), false)
  })
  await check("tampered orderId rejected", () => {
    assert.equal(verifyRazorpaySignature({ orderId: "order_p5_other", paymentId, signature: goodSig }), false)
  })
  await check("signature from a different secret rejected", () => {
    const other = hmac("some_other_secret", `${orderId}|${paymentId}`)
    assert.equal(verifyRazorpaySignature({ orderId, paymentId, signature: other }), false)
  })
  await check("short/non-hex signature rejected without throwing", () => {
    assert.equal(verifyRazorpaySignature({ orderId, paymentId, signature: "abc" }), false)
    assert.equal(verifyRazorpaySignature({ orderId, paymentId, signature: "" }), false)
  })
  await check("missing RAZORPAY_KEY_SECRET fails closed", () => {
    const saved = process.env.RAZORPAY_KEY_SECRET
    delete process.env.RAZORPAY_KEY_SECRET
    try {
      assert.equal(verifyRazorpaySignature({ orderId, paymentId, signature: goodSig }), false)
    } finally {
      process.env.RAZORPAY_KEY_SECRET = saved
    }
  })

  console.log("\n### 2. webhook signature verification (raw body HMAC, separate secret)")
  const bodyText = JSON.stringify({ event: "payment.captured", payload: {} })
  const whSig = hmac(process.env.RAZORPAY_WEBHOOK_SECRET!, bodyText)
  await check("valid webhook signature accepted", () => {
    assert.equal(verifyRazorpayWebhookSignature(bodyText, whSig), true)
  })
  await check("body tampered after signing rejected", () => {
    assert.equal(verifyRazorpayWebhookSignature(bodyText + " ", whSig), false)
  })
  await check("key secret is not accepted as webhook secret", () => {
    const keySig = hmac(process.env.RAZORPAY_KEY_SECRET!, bodyText)
    assert.equal(verifyRazorpayWebhookSignature(bodyText, keySig), false)
  })
  await check("missing webhook secret fails closed", () => {
    const saved = process.env.RAZORPAY_WEBHOOK_SECRET
    delete process.env.RAZORPAY_WEBHOOK_SECRET
    try {
      assert.equal(verifyRazorpayWebhookSignature(bodyText, whSig), false)
    } finally {
      process.env.RAZORPAY_WEBHOOK_SECRET = saved
    }
  })

  console.log("\n### 3. webhook endpoint guards")
  {
    const body = JSON.stringify({ event: "payment.captured", payload: {} })
    const r = await postWebhook(body, null)
    await check("no signature header -> 400", () => {
      assert.equal(r.status, 400)
      assert.match(String(r.json?.error), /No signature/)
    })
  }
  {
    const saved = process.env.RAZORPAY_WEBHOOK_SECRET
    delete process.env.RAZORPAY_WEBHOOK_SECRET
    const body = JSON.stringify({ event: "payment.captured", payload: {} })
    const r = await postWebhook(body, "any")
    process.env.RAZORPAY_WEBHOOK_SECRET = saved
    await check("webhook secret not configured -> 500 fail closed", () => {
      assert.equal(r.status, 500)
      assert.match(String(r.json?.error), /not configured/)
    })
  }
  {
    const body = JSON.stringify({ event: "payment.captured", payload: {} })
    const r = await postWebhook(body, hmac("wrong_secret", body))
    await check("invalid signature -> 400", () => {
      assert.equal(r.status, 400)
      assert.match(String(r.json?.error), /Invalid signature/)
    })
  }
  {
    const body = JSON.stringify({ created_at: Math.floor(Date.now() / 1000) - 3600, event: "payment.captured", payload: {} })
    const r = await postWebhook(body, hmac(process.env.RAZORPAY_WEBHOOK_SECRET!, body))
    await check("event older than 5 minutes -> 400 replay window", () => {
      assert.equal(r.status, 400)
      assert.match(String(r.json?.error), /replay window/)
    })
  }
  {
    const body = JSON.stringify({
      created_at: Math.floor(Date.now() / 1000),
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_p5_unknown", order_id: "order_p5_unknown", amount: 100, currency: "INR" } } },
    })
    const r = await postWebhook(body, hmac(process.env.RAZORPAY_WEBHOOK_SECRET!, body), "p5_evt_unknown")
    await check("unknown order -> 200 acknowledged, enrollment skipped", () => {
      assert.equal(r.status, 200)
      assert.equal(r.json?.received, true)
      assert.match(String(r.json?.warning), /Unknown order record/)
    })
    const again = await postWebhook(body, hmac(process.env.RAZORPAY_WEBHOOK_SECRET!, body), "p5_evt_unknown")
    await check("replayed event id -> duplicate acknowledged, no second write", () => {
      assert.equal(again.status, 200)
      assert.equal(again.json?.duplicate, true)
    })
  }

  console.log("\n### 4. server-authoritative price (client amount ignored)")
  await check("client amount 1 for a ₹1999 course -> tampering rejected", async () => {
    await assert.rejects(
      () => createRazorpayOrder({ courseId: PAID_COURSE, amount: 1, userId: FREE_USER }),
      /Tampered amount detected/
    )
  })
  await check("client amount 1999 -> order amount is the DB price 199900 paise", async () => {
    const order = await createRazorpayOrder({ courseId: PAID_COURSE, amount: 1999, userId: FREE_USER })
    createdOrderIds.push(String(order.orderId))
    assert.equal(order.amount, 199900)
    const row = await prisma.payment.findFirst({ where: { externalId: order.orderId } })
    assert.equal(row?.amount, 1999)
    assert.equal((row?.metadata as any)?.amountPaise, 199900)
  })
  await check("no client amount at all -> order still priced from DB", async () => {
    const order = await createRazorpayOrder({ courseId: PAID_COURSE, userId: FREE_USER })
    createdOrderIds.push(String(order.orderId))
    assert.equal(order.amount, 199900)
  })
  await check("free course cannot create a payment order", async () => {
    await assert.rejects(
      () => createRazorpayOrder({ courseId: FREE_COURSE, userId: FREE_USER }),
      /Cannot create payment order for free course/
    )
  })
  await check("unpublished/draft course cannot create a payment order", async () => {
    await assert.rejects(
      () => createRazorpayOrder({ courseId: "fv-draft-a", userId: FREE_USER }),
      /Course not found for payment order/
    )
  })

  console.log("\n### 4b. coupon: server-side validation and reservation lock")
  await prisma.coupon.create({
    data: {
      id: "fv-coupon-p5",
      code: "FVP5",
      discountType: "PERCENT",
      discountValue: 10,
      maxDiscountAmount: 500,
      maxRedemptions: 10,
      perUserLimit: 1,
      isActive: true,
      offerAfterDemo: false,
      showOnThumbnail: false,
      updatedAt: new Date(),
    },
  })
  let couponOrderId = ""
  await check("10% coupon reduces a ₹1999 order to ₹1799.10 (179910 paise)", async () => {
    const order = await createRazorpayOrder({ courseId: PAID_COURSE, userId: FREE_USER, couponCode: "fvp5" })
    couponOrderId = String(order.orderId)
    createdOrderIds.push(couponOrderId)
    assert.equal(order.amount, 179910)
    const row = await prisma.payment.findFirst({ where: { externalId: couponOrderId } })
    assert.equal(Math.round(Number(row?.amount) * 100), 179910)
    assert.equal(Math.round(Number(row?.originalAmount) * 100), 199900)
    assert.equal(Math.round(Number(row?.discountAmount) * 100), 19990)
    const redemption = await prisma.couponRedemption.findFirst({ where: { paymentId: row!.id } })
    assert.equal(redemption?.status, "RESERVED")
    assert.ok(redemption?.expiresAt && new Date(redemption.expiresAt).getTime() > Date.now())
  })
  await check("same user reusing a perUserLimit=1 coupon is rejected", async () => {
    await assert.rejects(
      () => createRazorpayOrder({ courseId: PAID_COURSE, userId: FREE_USER, couponCode: "FVP5" }),
      /Invalid or expired coupon/
    )
  })
  await check("unknown coupon code is rejected", async () => {
    await assert.rejects(
      () => createRazorpayOrder({ courseId: PAID_COURSE, userId: FREE_USER, couponCode: "NOPE" }),
      /Invalid or expired coupon/
    )
  })

  console.log("\n### 5. webhook fulfilment: amount mismatch, entitlement, idempotency")
  const orderRow = await prisma.payment.findFirst({ where: { externalId: couponOrderId } })
  assert.ok(orderRow, "expected an order row from section 4")
  const dbOrderId = String(orderRow!.externalId)

  {
    const body = JSON.stringify({
      created_at: Math.floor(Date.now() / 1000),
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_p5_mismatch",
            order_id: dbOrderId,
            amount: 100,
            currency: "INR",
            notes: { courseId: FREE_COURSE },
          },
        },
      },
    })
    const r = await postWebhook(body, hmac(process.env.RAZORPAY_WEBHOOK_SECRET!, body), "p5_evt_mismatch")
    await check("webhook with wrong amount -> enrolment skipped", () => {
      assert.equal(r.status, 200)
      assert.match(String(r.json?.warning), /Amount mismatch/)
    })
  }
  {
    const body = JSON.stringify({
      created_at: Math.floor(Date.now() / 1000),
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_p5_ok",
            order_id: dbOrderId,
            amount: 179910,
            currency: "INR",
            method: "card",
            notes: { courseId: FREE_COURSE, userId: "attacker" },
          },
        },
      },
    })
    const sig = hmac(process.env.RAZORPAY_WEBHOOK_SECRET!, body)
    const r = await postWebhook(body, sig, "p5_evt_ok_1")
    await check("valid captured webhook -> 200 received", () => {
      assert.equal(r.status, 200)
      assert.equal(r.json?.received, true)
    })
    const paid = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: FREE_USER, courseId: PAID_COURSE } },
    })
    const freeEnrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: FREE_USER, courseId: FREE_COURSE } },
    })
    await check("enrolment created for the DB order course (payload notes ignored)", () => {
      assert.ok(paid, "expected enrollment in fv-paid-b")
      assert.equal(freeEnrollment, null, "payload-supplied courseId must not be used")
    })
    const completed = await prisma.payment.findUnique({ where: { id: orderRow!.id } })
    const redemptionAfter = await prisma.couponRedemption.findFirst({ where: { paymentId: orderRow!.id } })
    await check("coupon reservation is marked REDEEMED after capture", () => {
      assert.equal(redemptionAfter?.status, "REDEEMED")
    })
    await check("payment marked COMPLETED with captured amount in minor units", () => {
      assert.equal(completed?.status, "COMPLETED")
      assert.equal(completed?.razorpayPaymentId, "pay_p5_ok")
      assert.equal(completed?.amountMinor, 179910)
    })
    const replay = await postWebhook(body, sig, "p5_evt_ok_2")
    const enrollmentCount = await prisma.enrollment.count({
      where: { userId: FREE_USER, courseId: PAID_COURSE },
    })
    await check("second delivery of the same payment is idempotent", async () => {
      assert.equal(replay.status, 200)
      assert.equal(enrollmentCount, 1)
      const payments = await prisma.payment.count({ where: { userId: FREE_USER, razorpayOrderId: dbOrderId } })
      assert.equal(payments, 1)
    })
  }
  await check("already-enrolled user cannot create a second paid order", async () => {
    await assert.rejects(
      () => createRazorpayOrder({ courseId: PAID_COURSE, userId: FREE_USER }),
      /already enrolled/
    )
  })

  console.log("\n### 6. subscription plan fulfilment (MONTHLY)")
  const subOrderId = `order_p5_sub_${Date.now()}`
  await prisma.payment.create({
    data: {
      userId: FREE_USER,
      amount: 499,
      amountMinor: 49900,
      currency: "INR",
      status: "PENDING",
      paymentProvider: "RAZORPAY",
      externalId: subOrderId,
      razorpayOrderId: subOrderId,
      metadata: { orderId: subOrderId, courseId: null, plan: "MONTHLY", amountPaise: 49900 },
    },
  })
  {
    const body = JSON.stringify({
      created_at: Math.floor(Date.now() / 1000),
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_p5_sub", order_id: subOrderId, amount: 49900, currency: "INR" } } },
    })
    const r = await postWebhook(body, hmac(process.env.RAZORPAY_WEBHOOK_SECRET!, body), "p5_evt_sub_1")
    await check("valid subscription webhook -> 200", () => {
      assert.equal(r.status, 200)
    })
    const sub = await prisma.subscription.findFirst({ where: { providerId: subOrderId, userId: FREE_USER } })
    await check("ACTIVE subscription created for the order", () => {
      assert.ok(sub, "expected subscription")
      assert.equal(sub?.status, "ACTIVE")
      assert.equal(sub?.plan, "MONTHLY")
      assert.ok(sub?.endDate && new Date(sub.endDate).getTime() > Date.now(), "end date must be in the future")
    })
    const user = await prisma.user.findUnique({ where: { id: FREE_USER } })
    await check("user role upgraded to PREMIUM", () => {
      assert.equal(user?.role, "PREMIUM")
    })
    const again = await postWebhook(body, hmac(process.env.RAZORPAY_WEBHOOK_SECRET!, body), "p5_evt_sub_2")
    const subs = await prisma.subscription.count({ where: { providerId: subOrderId, userId: FREE_USER } })
    await check("replayed subscription webhook does not duplicate the subscription", () => {
      assert.equal(again.status, 200)
      assert.equal(subs, 1)
    })
  }

  console.log("\n### 7. payment.failed releases the pending order")
  {
    const failOrderId = `order_p5_fail_${Date.now()}`
    const failPayment = await prisma.payment.create({
      data: {
        userId: FREE_USER,
        amount: 1999,
        amountMinor: 199900,
        currency: "INR",
        status: "PENDING",
        paymentProvider: "RAZORPAY",
        externalId: failOrderId,
        razorpayOrderId: failOrderId,
        metadata: { orderId: failOrderId, courseId: PAID_COURSE, plan: "COURSE", amountPaise: 199900 },
      },
    })
    const couponRow = await prisma.coupon.findUnique({ where: { code: "FVP5" } })
    await prisma.couponRedemption.create({
      data: {
        couponId: couponRow!.id,
        userId: FREE_USER,
        courseId: PAID_COURSE,
        paymentId: failPayment.id,
        status: "RESERVED",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    })
    const body = JSON.stringify({
      created_at: Math.floor(Date.now() / 1000),
      event: "payment.failed",
      payload: { payment: { entity: { id: "pay_p5_fail", order_id: failOrderId, amount: 199900, currency: "INR" } } },
    })
    const r = await postWebhook(body, hmac(process.env.RAZORPAY_WEBHOOK_SECRET!, body), "p5_evt_fail_1")
    const row = await prisma.payment.findFirst({ where: { externalId: failOrderId } })
    const released = await prisma.couponRedemption.findFirst({ where: { paymentId: failPayment.id } })
    await check("payment.failed marks the pending record FAILED and releases the reserved coupon", () => {
      assert.equal(r.status, 200)
      assert.equal(row?.status, "FAILED")
      assert.equal(released?.status, "RELEASED")
    })
    // restore fixture user role/state used by later phases
    await prisma.user.update({ where: { id: FREE_USER }, data: { role: "FREE" } })
    await prisma.subscription.deleteMany({ where: { providerId: subOrderId, userId: FREE_USER } })
  }

  console.log("\n### 8. fulfilment ownership and course assertions")
  const ownerOrderId = `order_p5_owner_${Date.now()}`
  await prisma.payment.create({
    data: {
      userId: FREE_USER,
      amount: 1999,
      amountMinor: 199900,
      currency: "INR",
      status: "PENDING",
      paymentProvider: "RAZORPAY",
      externalId: ownerOrderId,
      razorpayOrderId: ownerOrderId,
      metadata: { orderId: ownerOrderId, courseId: PAID_COURSE, plan: "COURSE", amountPaise: 199900 },
    },
  })
  createdOrderIds.push(ownerOrderId)
  {
    const { fulfilPaymentOrder } = require("../../lib/payments/fulfilment")
    const otherUser = await fulfilPaymentOrder({
      orderId: ownerOrderId,
      paymentId: "pay_p5_owner",
      courseId: PAID_COURSE,
      currentUserId: "cmw2dsm7i0003xpvtrp1c4s76", // fv.teacher.b
    })
    await check("another user cannot fulfil someone else's order -> 403", () => {
      assert.equal(otherUser.success, false)
      assert.equal(otherUser.status, 403)
      assert.match(String(otherUser.error), /ownership mismatch/)
    })
    const wrongCourse = await fulfilPaymentOrder({
      orderId: ownerOrderId,
      paymentId: "pay_p5_owner",
      courseId: FREE_COURSE,
      currentUserId: FREE_USER,
    })
    await check("course swap against the stored order -> 400", () => {
      assert.equal(wrongCourse.success, false)
      assert.equal(wrongCourse.status, 400)
      assert.match(String(wrongCourse.error), /course mismatch/)
    })
    const wrongAmount = await fulfilPaymentOrder({
      orderId: ownerOrderId,
      paymentId: "pay_p5_owner",
      courseId: PAID_COURSE,
      currentUserId: FREE_USER,
      amountPaise: 100,
    })
    await check("client-supplied lower amount at verify time -> 400", () => {
      assert.equal(wrongAmount.success, false)
      assert.equal(wrongAmount.status, 400)
      assert.match(String(wrongAmount.error), /Amount mismatch/)
    })
    const unknown = await fulfilPaymentOrder({
      orderId: "order_p5_does_not_exist",
      paymentId: "pay_x",
      currentUserId: FREE_USER,
    })
    await check("unknown order at verify time -> 404", () => {
      assert.equal(unknown.success, false)
      assert.equal(unknown.status, 404)
    })
  }

  await cleanup()
  console.log(`\nRESULT pass=${pass} fail=${fail}`)
  await prisma.$disconnect()
  process.exit(fail === 0 ? 0 : 1)
}

main().catch(async (e) => {
  console.error("HARNESS ERROR", e)
  try {
    await prisma.$disconnect()
  } catch {}
  process.exit(2)
})
