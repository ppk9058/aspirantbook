import Module from "module";
import path from "path";

// Register '@/...' path resolution hook for ts-node execution
const originalResolveFilename = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function (request: string, parent: any, isMain: boolean, options: any) {
  if (request.startsWith("@/")) {
    request = path.join(process.cwd(), request.slice(2));
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

import { PrismaClient } from "@prisma/client";
import { assertTestDb } from "../lib/testing/assert-test-db";
import { createRazorpayOrder } from "../lib/actions/payment/razorpay";
import crypto from "crypto";

const TEST_PORT = 3045;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const DOCKER_DB_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
const TEST_RAZORPAY_SECRET = "QljFqlEML0mHLqEgKOeztfw8";
const WEBHOOK_SECRET = "whsec_test_secret_12345";

process.env.TEST_DATABASE_URL = DOCKER_DB_URL;
process.env.DATABASE_URL = DOCKER_DB_URL;
process.env.DIRECT_URL = DOCKER_DB_URL;
process.env.RAZORPAY_KEY_SECRET = TEST_RAZORPAY_SECRET;
process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;

assertTestDb();

const prisma = new PrismaClient({ datasources: { db: { url: DOCKER_DB_URL } } });

function generateSignature(orderId: string, paymentId: string, secret: string) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

function generateWebhookSignature(body: string, secret: string) {
  return crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
}

async function printCounts(label: string, orderId: string, userId: string, courseId: string) {
  const payments = await prisma.payment.findMany({
    where: {
      userId,
      OR: [
        { externalId: orderId },
        { metadata: { path: ["orderId"], equals: orderId } }
      ]
    },
    select: { id: true, status: true, externalId: true, amount: true, metadata: true }
  });
  const completedPayments = payments.filter(p => p.status === "COMPLETED");
  const enrollments = await prisma.enrollment.findMany({
    where: { userId, courseId },
    select: { id: true, userId: true, courseId: true }
  });
  console.log(`[${label}] Order: ${orderId} | Total Payments: ${payments.length} | COMPLETED Payments: ${completedPayments.length} | Enrollments: ${enrollments.length}`);
}

async function run() {
  console.log("=== PASS 9.5: STEP 2 - COMPREHENSIVE PAYMENT MATRIX OVER REAL FLOW ===");
  console.log(`TEST DB: yes | Host: 127.0.0.1:54329 | DB: trillionskill_test\n`);

  // Target User & Course
  const student = await prisma.user.upsert({
    where: { email: "payment_student_p95@test.local" },
    update: {},
    create: {
      id: "u_pay_student_p95",
      email: "payment_student_p95@test.local",
      name: "Payment Tester P95",
      role: "FREE"
    }
  });

  const attacker = await prisma.user.upsert({
    where: { email: "attacker_student_p95@test.local" },
    update: {},
    create: {
      id: "u_attacker_student_p95",
      email: "attacker_student_p95@test.local",
      name: "Attacker P95",
      role: "FREE"
    }
  });

  const targetCourse = await prisma.course.findFirst({
    where: { slug: "72nd-bpsc-prelims-current-affairs" }
  });
  if (!targetCourse) throw new Error("Target course not found!");

  const otherCourse = await prisma.course.upsert({
    where: { slug: "other-paid-course-p95" },
    update: {},
    create: {
      id: "c_other_paid_p95",
      title: "Other Paid Course P95",
      description: "Description for other paid course",
      slug: "other-paid-course-p95",
      price: 4999,
      status: "PUBLISHED",
      isPublished: true,
      isPremium: true,
      difficulty: "BEGINNER",
    }
  });

  // Clean initial state for clean audit
  await prisma.enrollment.deleteMany({ where: { userId: { in: [student.id, attacker.id] } } });
  await prisma.payment.deleteMany({ where: { userId: { in: [student.id, attacker.id] } } });
  await prisma.couponRedemption.deleteMany({ where: { userId: { in: [student.id, attacker.id] } } });

  console.log("Initial state clean: 0 payments, 0 enrollments for test users.\n");

  // CASE 1: Valid client verify flow
  console.log("--- 1. Valid Order & Client Verify ---");
  const ord1 = await createRazorpayOrder({ courseId: targetCourse.id, userId: student.id });
  const pay1Id = `pay_valid_${Date.now()}`;
  const sig1 = generateSignature(ord1.orderId, pay1Id, TEST_RAZORPAY_SECRET);
  const res1 = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: ord1.orderId, paymentId: pay1Id, signature: sig1, userId: student.id, courseId: targetCourse.id })
  });
  console.log(`Verify status: ${res1.status}`);
  await printCounts("Case 1 (Valid Verify)", ord1.orderId, student.id, targetCourse.id);

  // CASE 2: Bad signature on fresh order
  console.log("\n--- 2. Bad Signature ---");
  const badSigUser = await prisma.user.upsert({
    where: { email: "badsig_user@test.local" },
    update: {},
    create: { id: "u_badsig_user", email: "badsig_user@test.local", role: "FREE" }
  });
  await prisma.payment.deleteMany({ where: { userId: badSigUser.id } });
  await prisma.enrollment.deleteMany({ where: { userId: badSigUser.id } });

  const ord2 = await createRazorpayOrder({ courseId: targetCourse.id, userId: badSigUser.id });
  const res2 = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: ord2.orderId, paymentId: "pay_bad_sig", signature: "bad_signature_value", userId: badSigUser.id, courseId: targetCourse.id })
  });
  console.log(`Verify status: ${res2.status}`);
  await printCounts("Case 2 (Bad Signature)", ord2.orderId, badSigUser.id, targetCourse.id);

  // CASE 3: Other user verifying order
  console.log("\n--- 3. Other User Verifying Order ---");
  const pay3Id = "pay_other_user";
  const sig3 = generateSignature(ord2.orderId, pay3Id, TEST_RAZORPAY_SECRET);
  const res3 = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: ord2.orderId, paymentId: pay3Id, signature: sig3, userId: attacker.id, courseId: targetCourse.id })
  });
  console.log(`Verify status: ${res3.status}`);
  await printCounts("Case 3 (Other User)", ord2.orderId, student.id, targetCourse.id);

  // CASE 4: Other course mismatch
  console.log("\n--- 4. Other Course Mismatch ---");
  const pay4Id = "pay_other_course";
  const sig4 = generateSignature(ord2.orderId, pay4Id, TEST_RAZORPAY_SECRET);
  const res4 = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: ord2.orderId, paymentId: pay4Id, signature: sig4, userId: student.id, courseId: otherCourse.id })
  });
  console.log(`Verify status: ${res4.status}`);
  await printCounts("Case 4 (Other Course)", ord2.orderId, student.id, targetCourse.id);

  // CASE 5: Unknown order
  console.log("\n--- 5. Unknown Order ---");
  const unknownOrderId = "order_unknown_fake_999";
  const pay5Id = "pay_unknown_order";
  const sig5 = generateSignature(unknownOrderId, pay5Id, TEST_RAZORPAY_SECRET);
  const res5 = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: unknownOrderId, paymentId: pay5Id, signature: sig5, userId: student.id, courseId: targetCourse.id })
  });
  console.log(`Verify status: ${res5.status}`);
  await printCounts("Case 5 (Unknown Order)", unknownOrderId, student.id, targetCourse.id);

  // CASE 6: Missing required fields
  console.log("\n--- 6. Missing Fields ---");
  const res6 = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentId: "pay_no_order", signature: "sig" })
  });
  console.log(`Verify status: ${res6.status}`);

  // CASE 7: Replay x2 on valid order (ord1)
  console.log("\n--- 7. Replay Verification (x2) ---");
  const replay1 = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: ord1.orderId, paymentId: pay1Id, signature: sig1, userId: student.id, courseId: targetCourse.id })
  });
  const replay2 = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: ord1.orderId, paymentId: pay1Id, signature: sig1, userId: student.id, courseId: targetCourse.id })
  });
  console.log(`Replay 1 status: ${replay1.status}, Replay 2 status: ${replay2.status}`);
  await printCounts("Case 7 (Replay x2)", ord1.orderId, student.id, targetCourse.id);

  // CASE 8: 5 Parallel Verifies on fresh order
  console.log("\n--- 8. 5 Parallel Verifies ---");
  const ord8 = await createRazorpayOrder({ courseId: otherCourse.id, userId: student.id });
  const pay8Id = `pay_parallel_${Date.now()}`;
  const sig8 = generateSignature(ord8.orderId, pay8Id, TEST_RAZORPAY_SECRET);
  const parallelPromises = Array.from({ length: 5 }).map(() =>
    fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: ord8.orderId, paymentId: pay8Id, signature: sig8, userId: student.id, courseId: otherCourse.id })
    })
  );
  const parallelResponses = await Promise.all(parallelPromises);
  console.log(`Statuses: ${parallelResponses.map(r => r.status).join(", ")}`);
  await printCounts("Case 8 (5 Parallel Verifies)", ord8.orderId, student.id, otherCourse.id);

  // CASE 9: Webhook alone (no client verify)
  console.log("\n--- 9. Webhook Captured Alone ---");
  // Clean otherCourse enrollment for test isolation
  await prisma.enrollment.deleteMany({ where: { userId: student.id, courseId: otherCourse.id } });
  const ord9 = await createRazorpayOrder({ courseId: otherCourse.id, userId: student.id });
  const pay9Id = `pay_wh_alone_${Date.now()}`;
  const whPayload9 = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: pay9Id,
          order_id: ord9.orderId,
          amount: ord9.amount,
          currency: "INR",
          status: "captured"
        }
      }
    }
  });
  const whSig9 = generateWebhookSignature(whPayload9, WEBHOOK_SECRET);
  const whRes9 = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-razorpay-signature": whSig9 },
    body: whPayload9
  });
  console.log(`Webhook alone status: ${whRes9.status}`);
  await printCounts("Case 9 (Webhook Alone)", ord9.orderId, student.id, otherCourse.id);

  // CASE 10: Webhook x2 alone
  console.log("\n--- 10. Webhook x2 Alone ---");
  const whRes10 = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-razorpay-signature": whSig9 },
    body: whPayload9
  });
  console.log(`Webhook second call status: ${whRes10.status}`);
  await printCounts("Case 10 (Webhook x2 Alone)", ord9.orderId, student.id, otherCourse.id);

  // CASE 11: Verify then Webhook
  console.log("\n--- 11. Verify then Webhook ---");
  await prisma.enrollment.deleteMany({ where: { userId: attacker.id, courseId: targetCourse.id } });
  const ord11 = await createRazorpayOrder({ courseId: targetCourse.id, userId: attacker.id });
  const pay11Id = `pay_v_then_wh_${Date.now()}`;
  const sig11 = generateSignature(ord11.orderId, pay11Id, TEST_RAZORPAY_SECRET);
  const vRes11 = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: ord11.orderId, paymentId: pay11Id, signature: sig11, userId: attacker.id, courseId: targetCourse.id })
  });
  const whPayload11 = JSON.stringify({
    event: "payment.captured",
    payload: { payment: { entity: { id: pay11Id, order_id: ord11.orderId, amount: ord11.amount, currency: "INR" } } }
  });
  const whSig11 = generateWebhookSignature(whPayload11, WEBHOOK_SECRET);
  const whRes11 = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-razorpay-signature": whSig11 },
    body: whPayload11
  });
  console.log(`Verify status: ${vRes11.status}, Webhook status: ${whRes11.status}`);
  await printCounts("Case 11 (Verify then Webhook)", ord11.orderId, attacker.id, targetCourse.id);

  // CASE 12: Webhook then Verify
  console.log("\n--- 12. Webhook then Verify ---");
  await prisma.enrollment.deleteMany({ where: { userId: attacker.id, courseId: otherCourse.id } });
  const ord12 = await createRazorpayOrder({ courseId: otherCourse.id, userId: attacker.id });
  const pay12Id = `pay_wh_then_v_${Date.now()}`;
  const whPayload12 = JSON.stringify({
    event: "payment.captured",
    payload: { payment: { entity: { id: pay12Id, order_id: ord12.orderId, amount: ord12.amount, currency: "INR" } } }
  });
  const whSig12 = generateWebhookSignature(whPayload12, WEBHOOK_SECRET);
  const whRes12 = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-razorpay-signature": whSig12 },
    body: whPayload12
  });
  const sig12 = generateSignature(ord12.orderId, pay12Id, TEST_RAZORPAY_SECRET);
  const vRes12 = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: ord12.orderId, paymentId: pay12Id, signature: sig12, userId: attacker.id, courseId: otherCourse.id })
  });
  console.log(`Webhook status: ${whRes12.status}, Verify status: ${vRes12.status}`);
  await printCounts("Case 12 (Webhook then Verify)", ord12.orderId, attacker.id, otherCourse.id);

  // CASE 13: Webhook Bad Signature
  console.log("\n--- 13. Webhook Bad Signature ---");
  const badWhRes = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-razorpay-signature": "bad_sig" },
    body: whPayload12
  });
  console.log(`Webhook bad signature status: ${badWhRes.status}`);

  // CASE 14: payment.failed event releases coupon and marks FAILED
  console.log("\n--- 14. payment.failed Event ---");
  const failedUser = await prisma.user.upsert({
    where: { email: "fail_student@test.local" },
    update: {},
    create: { id: "u_fail_student", email: "fail_student@test.local", role: "FREE" }
  });
  await prisma.payment.deleteMany({ where: { userId: failedUser.id } });
  const ord14 = await createRazorpayOrder({ courseId: otherCourse.id, userId: failedUser.id });
  const failWhPayload = JSON.stringify({
    event: "payment.failed",
    payload: { payment: { entity: { id: "pay_failed_14", order_id: ord14.orderId } } }
  });
  const failWhSig = generateWebhookSignature(failWhPayload, WEBHOOK_SECRET);
  const failWhRes = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-razorpay-signature": failWhSig },
    body: failWhPayload
  });
  console.log(`Webhook payment.failed status: ${failWhRes.status}`);
  const failPmt = await prisma.payment.findFirst({ where: { externalId: ord14.orderId } });
  console.log(`Payment status after failure: ${failPmt?.status}`);

  // CASE 15: Already-enrolled user buys again (blocked)
  console.log("\n--- 15. Already-Enrolled User Buys Again (Blocked) ---");
  try {
    await createRazorpayOrder({ courseId: targetCourse.id, userId: student.id });
    console.log("FAIL: Already-enrolled order was not blocked!");
  } catch (err: any) {
    console.log(`PASS: Blocked with error: "${err.message}"`);
  }

  // CASE 16: Coupon: RESERVED -> REDEEMED
  console.log("\n--- 16. Coupon RESERVED -> REDEEMED ---");
  const couponUser = await prisma.user.upsert({
    where: { email: "coupon_student@test.local" },
    update: {},
    create: { id: "u_coupon_student", email: "coupon_student@test.local", role: "FREE" }
  });
  await prisma.enrollment.deleteMany({ where: { userId: couponUser.id } });
  await prisma.payment.deleteMany({ where: { userId: couponUser.id } });
  await prisma.couponRedemption.deleteMany({ where: { userId: couponUser.id } });

  const couponOrder = await createRazorpayOrder({
    courseId: targetCourse.id,
    userId: couponUser.id,
    couponCode: "STEP5_PERC20"
  });
  const redBefore = await prisma.couponRedemption.findFirst({
    where: { userId: couponUser.id }
  });
  console.log(`Coupon redemption status before verify: ${redBefore?.status}`);
  const cPayId = `pay_cpn_${Date.now()}`;
  const cSig = generateSignature(couponOrder.orderId, cPayId, TEST_RAZORPAY_SECRET);
  const cRes = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: couponOrder.orderId, paymentId: cPayId, signature: cSig, userId: couponUser.id, courseId: targetCourse.id })
  });
  const redAfter = await prisma.couponRedemption.findFirst({
    where: { userId: couponUser.id }
  });
  console.log(`Verify status: ${cRes.status} | Coupon redemption status after verify: ${redAfter?.status}`);
  await printCounts("Case 16 (Coupon Reserved -> Redeemed)", couponOrder.orderId, couponUser.id, targetCourse.id);

  // CASE 17: Max redemptions 1 concurrency (5 parallel orders)
  console.log("\n--- 17. Max Redemptions Concurrency (5 Parallel, Max 1) ---");
  const singleCoupon = await prisma.coupon.upsert({
    where: { code: "LIMITED_ONE_PASS95" },
    update: { maxRedemptions: 1, isActive: true },
    create: {
      id: "cpn_limited_one_p95",
      code: "LIMITED_ONE_PASS95",
      courseId: targetCourse.id,
      discountType: "PERCENT",
      discountValue: 50,
      maxRedemptions: 1,
      perUserLimit: 1,
      isActive: true
    }
  });
  await prisma.couponRedemption.deleteMany({ where: { couponId: singleCoupon.id } });

  // 5 users trying to reserve simultaneously
  const parallelUsers = await Promise.all(
    Array.from({ length: 5 }).map((_, i) =>
      prisma.user.upsert({
        where: { email: `limited_user_${i}@test.local` },
        update: {},
        create: { id: `u_lim_${i}`, email: `limited_user_${i}@test.local`, role: "FREE" }
      })
    )
  );

  const results = await Promise.allSettled(
    parallelUsers.map(u =>
      createRazorpayOrder({
        courseId: targetCourse.id,
        userId: u.id,
        couponCode: "LIMITED_ONE_PASS95"
      })
    )
  );

  const successes = results.filter(r => r.status === "fulfilled").length;
  const rejections = results.filter(r => r.status === "rejected").length;
  console.log(`Parallel coupon results: Successes = ${successes}, Rejections = ${rejections}`);
  console.log(`Exactly 1 succeeded? ${successes === 1 ? "YES (PASS)" : "NO (FAIL)"}`);

  await prisma.$disconnect();
  console.log("\nALL STEP 2 PAYMENT MATRIX CASES EXECUTED.");
}

run().catch(err => {
  console.error("FATAL ERROR in payment matrix:", err);
  process.exit(1);
});
