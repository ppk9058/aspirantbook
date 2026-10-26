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
import { spawn, ChildProcess } from "child_process";

const TEST_PORT = 3047;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const DOCKER_DB_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
// A throwaway signing key generated at run time. This script provisions its own
// spawned server with it, so it must never be a committed credential (B-023).
const TEST_RAZORPAY_SECRET = crypto.randomBytes(24).toString("hex");
const WEBHOOK_SECRET = "whsec_test_secret_12345";
const SECRET = "test-secret-test-secret-test-secret-32-chars!!";

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
        { razorpayOrderId: orderId },
        { metadata: { path: ["orderId"], equals: orderId } }
      ]
    },
    select: { id: true, status: true, externalId: true, amount: true }
  });
  const completedPayments = payments.filter(p => p.status === "COMPLETED");
  const enrollments = await prisma.enrollment.findMany({
    where: { userId, courseId },
    select: { id: true, userId: true, courseId: true }
  });
  console.log(`[${label}] User: ${userId} | Order: ${orderId} | Total Payments: ${payments.length} | COMPLETED Payments: ${completedPayments.length} | Enrollments: ${enrollments.length}`);
}

async function run() {
  console.log("=== PASS 9.6: STEP 3 - COMPREHENSIVE PAYMENT MATRIX OVER REAL FLOW ===");
  console.log(`TEST DB: yes | Host: 127.0.0.1:54329 | DB: trillionskill_test\n`);

  console.log(`Starting isolated Next.js server (.next-test) on port ${TEST_PORT}...`);
  const serverProc: ChildProcess = spawn("npx", ["next", "start", "-p", String(TEST_PORT)], {
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      NEXT_DIST_DIR: ".next-test",
      DATABASE_URL: DOCKER_DB_URL,
      DIRECT_URL: DOCKER_DB_URL,
      TEST_DATABASE_URL: DOCKER_DB_URL,
      NEXTAUTH_URL: BASE_URL,
      AUTH_URL: BASE_URL,
      APP_ENV: "test",
      NODE_ENV: "production",
      AUTH_SECRET: SECRET,
      NEXTAUTH_SECRET: SECRET,
      RAZORPAY_KEY_SECRET: TEST_RAZORPAY_SECRET,
      RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
      RAZORPAY_KEY_ID: "rzp_test_mockkey12345"
    },
    stdio: "pipe"
  });

  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${BASE_URL}/login`, { redirect: "manual" });
      if (res.status === 200 || res.status === 404 || res.status === 307) break;
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log(`Server ready on port ${TEST_PORT}.\n`);

  try {
  // Target User & Course
  const student = await prisma.user.upsert({
    where: { email: "payment_student_p96@test.local" },
    update: {},
    create: {
      id: "u_pay_student_p96",
      email: "payment_student_p96@test.local",
      name: "Payment Tester P96",
      role: "FREE"
    }
  });

  const attacker = await prisma.user.upsert({
    where: { email: "attacker_student_p96@test.local" },
    update: {},
    create: {
      id: "u_attacker_student_p96",
      email: "attacker_student_p96@test.local",
      name: "Attacker P96",
      role: "FREE"
    }
  });

  const targetCourse = await prisma.course.findFirst({
    where: { slug: "72nd-bpsc-prelims-current-affairs" }
  });
  if (!targetCourse) throw new Error("Target course not found!");

  const otherCourse = await prisma.course.upsert({
    where: { slug: "other-paid-course-p96" },
    update: {},
    create: {
      id: "c_other_paid_p96",
      title: "Other Paid Course P96",
      description: "Description for other paid course",
      slug: "other-paid-course-p96",
      price: 4999,
      status: "PUBLISHED",
      isPublished: true,
      isPremium: true,
      difficulty: "BEGINNER",
    }
  });

  // Clean initial state for clean audit
  await prisma.enrollment.deleteMany({ where: { user: { email: { contains: "p96" } } } });
  await prisma.payment.deleteMany({ where: { user: { email: { contains: "p96" } } } });
  await prisma.couponRedemption.deleteMany({ where: { user: { email: { contains: "p96" } } } });

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
    where: { email: "badsig_user_p96@test.local" },
    update: {},
    create: { id: "u_badsig_p96", email: "badsig_user_p96@test.local", role: "FREE" }
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
  // For Case 3, print for the attacker (who attempted verify) AND for the order owner (badSigUser)
  await printCounts("Case 3 (Attacker)", ord2.orderId, attacker.id, targetCourse.id);
  await printCounts("Case 3 (Order Owner)", ord2.orderId, badSigUser.id, targetCourse.id);

  // CASE 4: Other course mismatch
  console.log("\n--- 4. Other Course Mismatch ---");
  const pay4Id = "pay_other_course";
  const sig4 = generateSignature(ord2.orderId, pay4Id, TEST_RAZORPAY_SECRET);
  const res4 = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: ord2.orderId, paymentId: pay4Id, signature: sig4, userId: badSigUser.id, courseId: otherCourse.id })
  });
  console.log(`Verify status: ${res4.status}`);
  await printCounts("Case 4 (Other Course Mismatch)", ord2.orderId, badSigUser.id, otherCourse.id);

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
    body: JSON.stringify({ userId: student.id, paymentId: "pay_no_order", signature: "sig" })
  });
  console.log(`Verify status: ${res6.status} (Expected 400)`);

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
  const parallelUser = await prisma.user.upsert({
    where: { email: "parallel_student_p96@test.local" },
    update: {},
    create: { id: "u_par_p96", email: "parallel_student_p96@test.local", role: "FREE" }
  });
  const ord8 = await createRazorpayOrder({ courseId: otherCourse.id, userId: parallelUser.id });
  const pay8Id = `pay_parallel_${Date.now()}`;
  const sig8 = generateSignature(ord8.orderId, pay8Id, TEST_RAZORPAY_SECRET);
  const parallelPromises = Array.from({ length: 5 }).map(() =>
    fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: ord8.orderId, paymentId: pay8Id, signature: sig8, userId: parallelUser.id, courseId: otherCourse.id })
    })
  );
  const parallelResponses = await Promise.all(parallelPromises);
  console.log(`Statuses: ${parallelResponses.map(r => r.status).join(", ")}`);
  await printCounts("Case 8 (5 Parallel Verifies)", ord8.orderId, parallelUser.id, otherCourse.id);

  // CASE 9: Webhook alone (no client verify)
  console.log("\n--- 9. Webhook Captured Alone ---");
  const whUser = await prisma.user.upsert({
    where: { email: "wh_student_p96@test.local" },
    update: {},
    create: { id: "u_wh_p96", email: "wh_student_p96@test.local", role: "FREE" }
  });
  const ord9 = await createRazorpayOrder({ courseId: otherCourse.id, userId: whUser.id });
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
  await printCounts("Case 9 (Webhook Alone)", ord9.orderId, whUser.id, otherCourse.id);

  // CASE 10: Webhook x2 alone
  console.log("\n--- 10. Webhook x2 Alone ---");
  const whRes10 = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-razorpay-signature": whSig9 },
    body: whPayload9
  });
  console.log(`Webhook second call status: ${whRes10.status}`);
  await printCounts("Case 10 (Webhook x2 Alone)", ord9.orderId, whUser.id, otherCourse.id);

  // CASE 11: Verify then Webhook
  console.log("\n--- 11. Verify then Webhook ---");
  const vWhUser = await prisma.user.upsert({
    where: { email: "v_wh_user_p96@test.local" },
    update: {},
    create: { id: "u_v_wh_p96", email: "v_wh_user_p96@test.local", role: "FREE" }
  });
  const ord11 = await createRazorpayOrder({ courseId: targetCourse.id, userId: vWhUser.id });
  const pay11Id = `pay_v_then_wh_${Date.now()}`;
  const sig11 = generateSignature(ord11.orderId, pay11Id, TEST_RAZORPAY_SECRET);
  const vRes11 = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: ord11.orderId, paymentId: pay11Id, signature: sig11, userId: vWhUser.id, courseId: targetCourse.id })
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
  await printCounts("Case 11 (Verify then Webhook)", ord11.orderId, vWhUser.id, targetCourse.id);

  // CASE 12: Webhook then Verify
  console.log("\n--- 12. Webhook then Verify ---");
  const whVUser = await prisma.user.upsert({
    where: { email: "wh_v_user_p96@test.local" },
    update: {},
    create: { id: "u_wh_v_p96", email: "wh_v_user_p96@test.local", role: "FREE" }
  });
  const ord12 = await createRazorpayOrder({ courseId: otherCourse.id, userId: whVUser.id });
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
    body: JSON.stringify({ orderId: ord12.orderId, paymentId: pay12Id, signature: sig12, userId: whVUser.id, courseId: otherCourse.id })
  });
  console.log(`Webhook status: ${whRes12.status}, Verify status: ${vRes12.status}`);
  await printCounts("Case 12 (Webhook then Verify)", ord12.orderId, whVUser.id, otherCourse.id);

  // CASE 13: Webhook Bad Signature
  console.log("\n--- 13. Webhook Bad Signature ---");
  const badWhRes = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-razorpay-signature": "bad_sig" },
    body: whPayload12
  });
  console.log(`Webhook bad signature status: ${badWhRes.status}`);

  // CASE 14: payment.failed event releases coupon and marks FAILED
  console.log("\n--- 14. payment.failed Event with Coupon RELEASED ---");
  const failedUser = await prisma.user.upsert({
    where: { email: "fail_student_p96@test.local" },
    update: {},
    create: { id: "u_fail_p96", email: "fail_student_p96@test.local", role: "FREE" }
  });
  await prisma.payment.deleteMany({ where: { userId: failedUser.id } });
  await prisma.couponRedemption.deleteMany({ where: { userId: failedUser.id } });

  const ord14 = await createRazorpayOrder({
    courseId: targetCourse.id,
    userId: failedUser.id,
    couponCode: "STEP5_PERC20"
  });
  const redBeforeFail = await prisma.couponRedemption.findFirst({ where: { userId: failedUser.id } });
  console.log(`Coupon redemption status before failure: ${redBeforeFail?.status}`);

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
  const failPmt = await prisma.payment.findFirst({ where: { razorpayOrderId: ord14.orderId } });
  const redAfterFail = await prisma.couponRedemption.findFirst({ where: { userId: failedUser.id } });
  console.log(`Payment status after failure: ${failPmt?.status} | Coupon redemption status: ${redAfterFail?.status}`);
  await printCounts("Case 14 (Payment Failed Event)", ord14.orderId, failedUser.id, targetCourse.id);

  // CASE 15: Already-enrolled user buys again (blocked)
  console.log("\n--- 15. Already-Enrolled User Buys Again (Blocked) ---");
  await printCounts("Before Buy Again Attempt", ord1.orderId, student.id, targetCourse.id);
  try {
    await createRazorpayOrder({ courseId: targetCourse.id, userId: student.id });
    console.log("FAIL: Already-enrolled order was not blocked!");
  } catch (err: any) {
    console.log(`PASS: Blocked with error: "${err.message}"`);
  }
  await printCounts("After Buy Again Blocked", ord1.orderId, student.id, targetCourse.id);

  // CASE 16: Coupon: RESERVED -> REDEEMED
  console.log("\n--- 16. Coupon RESERVED -> REDEEMED ---");
  const couponUser = await prisma.user.upsert({
    where: { email: "coupon_student_p96@test.local" },
    update: {},
    create: { id: "u_coupon_p96", email: "coupon_student_p96@test.local", role: "FREE" }
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

  // CASE 17: Verify with an amount different from order (tampered amount in webhook/verify)
  console.log("\n--- 17. Amount Different from Order ---");
  const tamperedUser = await prisma.user.upsert({
    where: { email: "tampered_user_p96@test.local" },
    update: {},
    create: { id: "u_tamp_p96", email: "tampered_user_p96@test.local", role: "FREE" }
  });
  const tampOrder = await createRazorpayOrder({ courseId: otherCourse.id, userId: tamperedUser.id });
  const tampWhPayload = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: `pay_tamp_${Date.now()}`,
          order_id: tampOrder.orderId,
          amount: 100, // 1 Rupee instead of 4999
          currency: "INR"
        }
      }
    }
  });
  const tampWhSig = generateWebhookSignature(tampWhPayload, WEBHOOK_SECRET);
  const tampWhRes = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-razorpay-signature": tampWhSig },
    body: tampWhPayload
  });
  const tampJson = await tampWhRes.json();
  console.log(`Tampered amount webhook response: status ${tampWhRes.status}, warning: "${tampJson.warning}"`);
  await printCounts("Case 17 (Tampered Amount)", tampOrder.orderId, tamperedUser.id, otherCourse.id);

  // CASE 18: Max redemptions 1 concurrency (5 parallel orders)
  console.log("\n--- 18. Max Redemptions Concurrency (5 Parallel, Max 1) ---");
  const singleCoupon = await prisma.coupon.upsert({
    where: { code: "LIMITED_ONE_PASS96" },
    update: { maxRedemptions: 1, isActive: true },
    create: {
      id: "cpn_limited_one_p96",
      code: "LIMITED_ONE_PASS96",
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
        where: { email: `limited_user_p96_${i}@test.local` },
        update: {},
        create: { id: `u_lim_p96_${i}`, email: `limited_user_p96_${i}@test.local`, role: "FREE" }
      })
    )
  );

  const results = await Promise.allSettled(
    parallelUsers.map(u =>
      createRazorpayOrder({
        courseId: targetCourse.id,
        userId: u.id,
        couponCode: "LIMITED_ONE_PASS96"
      })
    )
  );

  const successes = results.filter(r => r.status === "fulfilled").length;
  const rejections = results.filter(r => r.status === "rejected").length;
  console.log(`Parallel coupon results: Successes = ${successes}, Rejections = ${rejections}`);
  console.log(`Exactly 1 succeeded? ${successes === 1 ? "YES (PASS)" : "NO (FAIL)"}`);

  await prisma.$disconnect();
  console.log("\nALL STEP 3 PAYMENT MATRIX CASES EXECUTED.");
  } finally {
    serverProc.kill("SIGTERM");
  }
}

run().catch(err => {
  console.error("FATAL ERROR in payment matrix:", err);
  process.exit(1);
});
