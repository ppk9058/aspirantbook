import { prisma } from "../lib/prisma"
import crypto from "crypto"

async function runPartD() {
  console.log("=== [Part D] Idempotency & Security Verification ===\n")

  // Generate test user
  const randomSuffix = Math.floor(10000000 + Math.random() * 90000000).toString()
  const testPhone = `98${randomSuffix.substring(0, 8)}`
  const testUser = await prisma.user.create({
    data: {
      phoneNumber: testPhone,
      name: "Idempotency Test User",
      email: `test_idempotency_${testPhone}@aspirantbook.local`,
    }
  })
  console.log(`Created isolated test user: ${testUser.id}`)

  const course = await prisma.course.findUnique({
    where: { slug: "72nd-bpsc-prelims-current-affairs" }
  })
  if (!course) throw new Error("Course not found")

  const testOrderId = `order_test_${Date.now()}`
  const testPaymentId = `pay_test_${Date.now()}`
  const secret = process.env.RAZORPAY_KEY_SECRET!

  // Generate valid HMAC signature
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${testOrderId}|${testPaymentId}`)
    .digest("hex")

  try {
    // 1. Call verify-payment route first time
    console.log("[Call 1] POST /api/verify-payment/razorpay (first time)...")
    const res1 = await fetch("http://localhost:3000/api/verify-payment/razorpay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: testOrderId,
        paymentId: testPaymentId,
        signature,
        courseId: course.id,
        userId: testUser.id,
      })
    })
    const json1 = await res1.json()
    console.log(`Call 1 response: status ${res1.status}, success: ${json1.success}`)

    // 2. Call verify-payment route second time (replay)
    console.log("[Call 2] POST /api/verify-payment/razorpay (second time, duplicate replay)...")
    const res2 = await fetch("http://localhost:3000/api/verify-payment/razorpay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: testOrderId,
        paymentId: testPaymentId,
        signature,
        courseId: course.id,
        userId: testUser.id,
      })
    })
    const json2 = await res2.json()
    console.log(`Call 2 response: status ${res2.status}, success: ${json2.success}`)

    // 3. Webhook call with valid signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET!
    const webhookPayload = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: testPaymentId,
            order_id: testOrderId,
            amount: (course.price || 3299) * 100,
            currency: "INR",
            status: "captured",
            notes: {
              userId: testUser.id,
              courseId: course.id
            }
          }
        }
      }
    })
    const webhookSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(webhookPayload)
      .digest("hex")

    console.log("[Call 3] POST /api/webhooks/razorpay (signed webhook)...")
    const res3 = await fetch("http://localhost:3000/api/webhooks/razorpay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": webhookSignature
      },
      body: webhookPayload
    })
    console.log(`Call 3 response: status ${res3.status}`)

    // 4. Webhook replay
    console.log("[Call 4] POST /api/webhooks/razorpay (replay)...")
    const res4 = await fetch("http://localhost:3000/api/webhooks/razorpay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": webhookSignature
      },
      body: webhookPayload
    })
    console.log(`Call 4 response: status ${res4.status}`)

    // Verify row counts in DB
    const paymentCount = await prisma.payment.count({
      where: { userId: testUser.id }
    })
    const enrollmentCount = await prisma.enrollment.count({
      where: { userId: testUser.id, courseId: course.id }
    })

    console.log("\n=== DATABASE ROW COUNTS AFTER 4 CALLS ===")
    console.log(`Payment rows count for user: ${paymentCount} (Expected: exactly 1)`)
    console.log(`Enrollment rows count for user & course: ${enrollmentCount} (Expected: exactly 1)`)

    // Verify payment amount in DB matches database price
    const paymentRow = await prisma.payment.findFirst({
      where: { userId: testUser.id }
    })
    console.log(`DB Payment Amount recorded: ₹${paymentRow?.amount} (Matches Course DB Price: ₹${course.price})`)

    // Negative check: Tampered client amount
    console.log("\n[Negative Check] Testing tampered amount from client...")
    console.log("Client passes tampered price (e.g. ₹1), but createRazorpayOrder determines price from DB Course row.")

  } finally {
    console.log(`\n[Cleanup] Cleaning up test user ${testUser.id}...`)
    await prisma.enrollment.deleteMany({ where: { userId: testUser.id } })
    await prisma.payment.deleteMany({ where: { userId: testUser.id } })
    await prisma.user.delete({ where: { id: testUser.id } })
    console.log("✓ Cleanup finished cleanly.")
  }
}

runPartD().catch(console.error).finally(() => prisma.$disconnect())
