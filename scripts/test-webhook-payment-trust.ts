import crypto from "crypto"
import { prisma } from "../lib/prisma"
import { createTestUser, teardownTestUsers } from "../lib/testing/test-user-helper"

const BASE_URL = "http://localhost:3000"
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || (() => { throw new Error("RAZORPAY_WEBHOOK_SECRET is required"); })()


function generateWebhookSignature(body: string, secret: string = WEBHOOK_SECRET): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex")
}

function generateRazorpayPaymentSignature(orderId: string, paymentId: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex")
}

async function run() {
  console.log("=== SECTION G: WEBHOOK AND PAYMENT TRUST AUDIT & MATRIX TESTS ===")

  // 1. Audit route list
  console.log("\n--- G.1 Route Audit ---")
  const routes = [
    { route: "POST /api/webhooks/razorpay", file: "app/api/webhooks/razorpay/route.ts:5", role: "Razorpay Webhook Handler (Authoritative Fulfillment)", usedByCheckout: "NO (Server-to-Server Webhook)" },
    { route: "POST /api/verify-payment/razorpay", file: "app/api/verify-payment/razorpay/route.ts:29", role: "Browser Payment Verification & Enrollment", usedByCheckout: "YES (Called by app/checkout/page.tsx:261)" },
    { route: "POST /api/checkout/razorpay", file: "app/api/checkout/razorpay/route.ts:6", role: "Subscription Checkout Order Creation", usedByCheckout: "Legacy/Subscriptions" },
    { route: "createRazorpayOrder", file: "lib/actions/payment/razorpay.ts:21", role: "Server Action for Course & Subscription Orders", usedByCheckout: "YES (Primary Server Action)" },
  ]
  console.table(routes)

  // 2. Setup isolated test users and course
  const userA = await createTestUser({ role: "FREE", prefix: "userA" })
  const userB = await createTestUser({ role: "FREE", prefix: "userB" })

  // Find course A and course B
  const courseA = await prisma.course.findFirst({ where: { isPremium: true, status: "PUBLISHED" } })
  const courseB = await prisma.course.findFirst({ where: { id: { not: courseA!.id }, status: "PUBLISHED" } })
  if (!courseA || !courseB) throw new Error("Could not find 2 published courses for payment testing")

  console.log(`Test User A: ${userA.id.slice(0, 8)}`)
  console.log(`Test User B: ${userB.id.slice(0, 8)}`)
  console.log(`Course A: ${courseA.slug} (Price: ${courseA.price})`)
  console.log(`Course B: ${courseB.slug} (Price: ${courseB.price})`)

  const testOrderRecordsToDelete: string[] = []
  const testEnrollmentsToDelete: string[] = []
  const testPaymentsToDelete: string[] = []

  try {
    // -------------------------------------------------------------------------
    // TEST G.2.1: Payment-entity-only payload (no order entity in payload)
    // -------------------------------------------------------------------------
    console.log("\n[Test 1] Payment-entity-only webhook payload (orderEntity omitted)")
    const orderId1 = `order_test_${Date.now()}_1`
    const paymentId1 = `pay_test_${Date.now()}_1`
    const orderPricePaise = 329900

    // Create server-side order record in DB for orderId1
    const p1 = await prisma.payment.create({
      data: {
        userId: userA.id,
        amount: orderPricePaise / 100,
        currency: "INR",
        status: "PENDING",
        paymentProvider: "RAZORPAY",
        externalId: orderId1,
        metadata: {
          orderId: orderId1,
          courseId: courseA.id,
          amountPaise: orderPricePaise,
        },
      },
    })
    testOrderRecordsToDelete.push(p1.id)

    const payloadOnlyPayment = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: paymentId1,
            order_id: orderId1,
            amount: orderPricePaise,
            currency: "INR",
            status: "captured",
            method: "upi",
          },
        },
      },
    })

    const sig1 = generateWebhookSignature(payloadOnlyPayment)
    const res1 = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": sig1,
      },
      body: payloadOnlyPayment,
    })

    console.log(`Webhook HTTP status: ${res1.status}`)
    const json1 = await res1.json()
    console.log("Response body:", json1)

    // Verify enrollment created for userA and courseA
    const enroll1 = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: userA.id, courseId: courseA.id } },
    })
    console.log(`Enrollment created: ${Boolean(enroll1)}`)
    if (enroll1) testEnrollmentsToDelete.push(enroll1.id)

    const paymentRow1 = await prisma.payment.findFirst({
      where: { externalId: paymentId1 },
    })
    console.log(`Payment updated to COMPLETED: ${paymentRow1?.status === "COMPLETED"}`)
    if (paymentRow1) testPaymentsToDelete.push(paymentRow1.id)

    if (res1.status !== 200 || !enroll1 || paymentRow1?.status !== "COMPLETED") {
      throw new Error("Test 1 failed: Payment-entity-only webhook did not fulfill correctly")
    }

    // -------------------------------------------------------------------------
    // TEST G.2.2: Notes spoofing (valid signature, order for Course A, notes naming Course B & User B)
    // -------------------------------------------------------------------------
    console.log("\n[Test 2] Notes spoofing: Payload notes name Course B & User B, DB order is for Course A & User A")
    const orderId2 = `order_test_${Date.now()}_2`
    const paymentId2 = `pay_test_${Date.now()}_2`

    const p2 = await prisma.payment.create({
      data: {
        userId: userA.id,
        amount: orderPricePaise / 100,
        currency: "INR",
        status: "PENDING",
        paymentProvider: "RAZORPAY",
        externalId: orderId2,
        metadata: {
          orderId: orderId2,
          courseId: courseA.id,
          amountPaise: orderPricePaise,
        },
      },
    })
    testOrderRecordsToDelete.push(p2.id)

    const payloadNotesSpoofed = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: paymentId2,
            order_id: orderId2,
            amount: orderPricePaise,
            currency: "INR",
            status: "captured",
            method: "card",
            notes: {
              userId: userB.id, // Spoofed user!
              courseId: courseB.id, // Spoofed course!
            },
          },
        },
      },
    })

    const sig2 = generateWebhookSignature(payloadNotesSpoofed)
    const res2 = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": sig2,
      },
      body: payloadNotesSpoofed,
    })

    console.log(`Webhook HTTP status: ${res2.status}`)
    const json2 = await res2.json()
    console.log("Response body:", json2)

    // Assert: User B must NOT have been enrolled in anything!
    const enrollB = await prisma.enrollment.findFirst({
      where: { userId: userB.id },
    })
    console.log(`User B enrolled (MUST BE FALSE): ${Boolean(enrollB)}`)

    // Assert: User A must NOT have been enrolled in Course B!
    const enrollA_B = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: userA.id, courseId: courseB.id } },
    })
    console.log(`User A enrolled in Course B (MUST BE FALSE): ${Boolean(enrollA_B)}`)

    if (enrollB || enrollA_B) {
      throw new Error("Test 2 failed: Notes spoofing was trusted over server DB order record!")
    }

    // -------------------------------------------------------------------------
    // TEST G.2.3: Unknown order_id
    // -------------------------------------------------------------------------
    console.log("\n[Test 3] Unknown order_id")
    const unknownPayload = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: `pay_unknown_${Date.now()}`,
            order_id: `order_unknown_${Date.now()}`,
            amount: 10000,
            currency: "INR",
          },
        },
      },
    })
    const sig3 = generateWebhookSignature(unknownPayload)
    const res3 = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-razorpay-signature": sig3 },
      body: unknownPayload,
    })
    const json3 = await res3.json()
    console.log(`Status: ${res3.status}, body:`, json3)
    if (res3.status !== 200 || !json3.warning?.includes("Unknown order record")) {
      throw new Error("Test 3 failed: Unknown order did not return 200 with skipped log warning")
    }

    // -------------------------------------------------------------------------
    // TEST G.2.4: Amount mismatch
    // -------------------------------------------------------------------------
    console.log("\n[Test 4] Amount mismatch (paid 1 paise vs expected 329900 paise)")
    const orderId4 = `order_test_${Date.now()}_4`
    const p4 = await prisma.payment.create({
      data: {
        userId: userB.id,
        amount: 3299,
        currency: "INR",
        status: "PENDING",
        paymentProvider: "RAZORPAY",
        externalId: orderId4,
        metadata: {
          orderId: orderId4,
          courseId: courseB.id,
          amountPaise: 329900,
        },
      },
    })
    testOrderRecordsToDelete.push(p4.id)

    const mismatchPayload = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: `pay_tampered_${Date.now()}`,
            order_id: orderId4,
            amount: 100, // 1 Rupee instead of 3299 Rupees!
            currency: "INR",
          },
        },
      },
    })
    const sig4 = generateWebhookSignature(mismatchPayload)
    const res4 = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-razorpay-signature": sig4 },
      body: mismatchPayload,
    })
    const json4 = await res4.json()
    console.log(`Status: ${res4.status}, body:`, json4)

    const enroll4 = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: userB.id, courseId: courseB.id } },
    })
    console.log(`Enrollment created for tampered amount (MUST BE FALSE): ${Boolean(enroll4)}`)
    if (enroll4 || !json4.warning?.includes("Amount mismatch")) {
      throw new Error("Test 4 failed: Amount mismatch was enrolled!")
    }

    // -------------------------------------------------------------------------
    // TEST G.2.5: Bad signature
    // -------------------------------------------------------------------------
    console.log("\n[Test 5] Bad webhook signature")
    const res5 = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-razorpay-signature": "bad_signature_xyz" },
      body: payloadOnlyPayment,
    })
    console.log(`Status: ${res5.status} (Expected: 400)`)
    if (res5.status !== 400) throw new Error("Test 5 failed: Bad signature was not rejected with 400")

    // -------------------------------------------------------------------------
    // TEST G.2.6: Webhook Idempotency x2 & Concurrency (5 parallel)
    // -------------------------------------------------------------------------
    console.log("\n[Test 6] Webhook Concurrency (5 parallel webhook calls for same order)")
    const orderId6 = `order_test_${Date.now()}_6`
    const paymentId6 = `pay_test_${Date.now()}_6`

    const p6 = await prisma.payment.create({
      data: {
        userId: userB.id,
        amount: 3299,
        currency: "INR",
        status: "PENDING",
        paymentProvider: "RAZORPAY",
        externalId: orderId6,
        metadata: {
          orderId: orderId6,
          courseId: courseB.id,
          amountPaise: 329900,
        },
      },
    })
    testOrderRecordsToDelete.push(p6.id)

    const parallelPayload = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: paymentId6,
            order_id: orderId6,
            amount: 329900,
            currency: "INR",
            method: "netbanking",
          },
        },
      },
    })
    const sig6 = generateWebhookSignature(parallelPayload)

    const parallelResponses = await Promise.all(
      Array.from({ length: 5 }).map(() =>
        fetch(`${BASE_URL}/api/webhooks/razorpay`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-razorpay-signature": sig6 },
          body: parallelPayload,
        })
      )
    )

    console.log("Parallel response statuses:", parallelResponses.map((r) => r.status))
    const totalEnrollmentsForOrder6 = await prisma.enrollment.count({
      where: { userId: userB.id, courseId: courseB.id },
    })
    const totalPaymentsForOrder6 = await prisma.payment.count({
      where: { externalId: paymentId6 },
    })
    console.log(`Total Enrollments for User B: ${totalEnrollmentsForOrder6} (Expected: 1)`)
    console.log(`Total Payments for Payment ID: ${totalPaymentsForOrder6} (Expected: 1)`)

    const enroll6 = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: userB.id, courseId: courseB.id } },
    })
    if (enroll6) testEnrollmentsToDelete.push(enroll6.id)

    if (totalEnrollmentsForOrder6 !== 1 || totalPaymentsForOrder6 !== 1) {
      throw new Error(`Test 6 concurrency failed: enrollments=${totalEnrollmentsForOrder6}, payments=${totalPaymentsForOrder6}`)
    }

    // -------------------------------------------------------------------------
    // TEST G.3: Browser verify route (POST /api/verify-payment/razorpay)
    // -------------------------------------------------------------------------
    console.log("\n[Test 7] Verify-payment route checks (idempotency, ownership mismatch, bad signature)")
    const rzpSecret = process.env.RAZORPAY_KEY_SECRET || (() => { throw new Error("RAZORPAY_KEY_SECRET is required"); })()

    const orderId7 = `order_test_${Date.now()}_7`
    const paymentId7 = `pay_test_${Date.now()}_7`

    const p7 = await prisma.payment.create({
      data: {
        userId: userA.id,
        amount: 3299,
        currency: "INR",
        status: "PENDING",
        paymentProvider: "RAZORPAY",
        externalId: orderId7,
        metadata: {
          orderId: orderId7,
          courseId: courseA.id,
        },
      },
    })
    testOrderRecordsToDelete.push(p7.id)

    const validSignature7 = generateRazorpayPaymentSignature(orderId7, paymentId7, rzpSecret)

    // A. Bad signature
    const badSigRes = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: orderId7,
        paymentId: paymentId7,
        signature: "invalid_sig",
        courseId: courseA.id,
        userId: userA.id,
      }),
    })
    console.log(`Verify bad signature status: ${badSigRes.status} (Expected: 400)`)
    if (badSigRes.status !== 400) throw new Error("Verify bad signature failed")

    // B. Ownership mismatch (User B tries to verify User A's order)
    const mismatchUserRes = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: orderId7,
        paymentId: paymentId7,
        signature: validSignature7,
        courseId: courseA.id,
        userId: userB.id, // User B claiming User A's order!
      }),
    })
    console.log(`Verify ownership mismatch status: ${mismatchUserRes.status} (Expected: 403)`)
    if (mismatchUserRes.status !== 403) throw new Error("Verify ownership mismatch failed")

    // C. Valid verification
    const validVerifyRes = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: orderId7,
        paymentId: paymentId7,
        signature: validSignature7,
        courseId: courseA.id,
        userId: userA.id,
      }),
    })
    console.log(`Verify valid status: ${validVerifyRes.status} (Expected: 200)`)
    const validVerifyJson = await validVerifyRes.json()
    console.log("Verify response:", validVerifyJson)
    if (validVerifyRes.status !== 200 || !validVerifyJson.success) throw new Error("Valid verify failed")

    // D. Idempotent replay of verify
    const replayVerifyRes = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: orderId7,
        paymentId: paymentId7,
        signature: validSignature7,
        courseId: courseA.id,
        userId: userA.id,
      }),
    })
    console.log(`Verify replay status: ${replayVerifyRes.status} (Expected: 200)`)
    if (replayVerifyRes.status !== 200) throw new Error("Verify replay failed")

    const finalPaymentsFor7 = await prisma.payment.count({ where: { externalId: paymentId7 } })
    console.log(`Final payments count for payment 7: ${finalPaymentsFor7} (Expected: 1)`)

    const p7Row = await prisma.payment.findFirst({ where: { externalId: paymentId7 } })
    if (p7Row) testPaymentsToDelete.push(p7Row.id)

  } finally {
    console.log("\nCleaning up Section G test records...")
    for (const eid of testEnrollmentsToDelete) {
      await prisma.enrollment.delete({ where: { id: eid } }).catch(() => {})
    }
    for (const pid of testPaymentsToDelete) {
      await prisma.payment.delete({ where: { id: pid } }).catch(() => {})
    }
    for (const orid of testOrderRecordsToDelete) {
      await prisma.payment.delete({ where: { id: orid } }).catch(() => {})
    }
    await teardownTestUsers([userA.id, userB.id])
    await prisma.$disconnect()
  }

  console.log("\nG. Overall Status: ALL PASS")
}

run().catch((err) => {
  console.error("FATAL in test-webhook-payment-trust:", err)
  process.exit(1)
})
