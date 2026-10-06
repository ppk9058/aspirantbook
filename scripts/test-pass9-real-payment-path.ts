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

async function run() {
  console.log("=== PASS 9.4: STEP 3 - REAL PAYMENT PATH OVER HTTP ===");
  console.log(`TEST DB: yes | Host: 127.0.0.1:54329 | DB: trillionskill_test\n`);

  // Target User & Course
  const student = await prisma.user.upsert({
    where: { email: "payment_student_p94@test.local" },
    update: {},
    create: {
      id: "u_pay_student_p94",
      email: "payment_student_p94@test.local",
      name: "Payment Tester P94",
      role: "FREE"
    }
  });

  const attacker = await prisma.user.upsert({
    where: { email: "attacker_student_p94@test.local" },
    update: {},
    create: {
      id: "u_attacker_student_p94",
      email: "attacker_student_p94@test.local",
      name: "Attacker P94",
      role: "FREE"
    }
  });

  const targetCourse = await prisma.course.findFirst({
    where: { slug: "72nd-bpsc-prelims-current-affairs" }
  });
  if (!targetCourse) throw new Error("Target course not found!");

  const otherCourse = await prisma.course.upsert({
    where: { slug: "other-paid-course-p94" },
    update: {},
    create: {
      id: "c_other_paid_p94",
      title: "Other Paid Course",
      description: "Description for other paid course",
      slug: "other-paid-course-p94",
      price: 4999,
      status: "PUBLISHED",
      isPublished: true,
      isPremium: true,
      difficulty: "BEGINNER",
    }
  });

  // Clean previous test runs for this user & course
  await prisma.enrollment.deleteMany({ where: { userId: student.id, courseId: targetCourse.id } });
  await prisma.payment.deleteMany({ where: { userId: student.id } });

  console.log("Initial state clean: 0 payments, 0 enrollments for test student.\n");

  // 1. Create Order via Server Action
  console.log("--- 1. Order Creation via Server Action createRazorpayOrder ---");
  const orderResult = await createRazorpayOrder({
    courseId: targetCourse.id,
    userId: student.id
  });
  console.log("Created Razorpay Order:", {
    orderId: orderResult.orderId,
    amount: orderResult.amount,
    currency: orderResult.currency
  });

  const pendingPayment = await prisma.payment.findFirst({
    where: { externalId: orderResult.orderId }
  });
  console.log(`DB Payment Record: id=${pendingPayment?.id}, status=${pendingPayment?.status}, amount=${pendingPayment?.amount}`);

  // Test Matrix Cases
  // Case A: Bad signature
  console.log("\n--- Case A: Bad signature ---");
  const badSigRes = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: orderResult.orderId,
      paymentId: "pay_test_bad_sig",
      signature: "0000000000000000000000000000000000000000000000000000000000000000",
      userId: student.id,
      courseId: targetCourse.id
    })
  });
  console.log(`Bad signature status: ${badSigRes.status}`);

  // Case B: Other user's order
  console.log("\n--- Case B: Other user attempting to verify order ---");
  const otherUserSig = generateSignature(orderResult.orderId, "pay_test_other_user", TEST_RAZORPAY_SECRET);
  const otherUserRes = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: orderResult.orderId,
      paymentId: "pay_test_other_user",
      signature: otherUserSig,
      userId: attacker.id,
      courseId: targetCourse.id
    })
  });
  console.log(`Other user status: ${otherUserRes.status}`);

  // Case C: Other course
  console.log("\n--- Case C: Other course mismatch ---");
  const otherCourseSig = generateSignature(orderResult.orderId, "pay_test_other_course", TEST_RAZORPAY_SECRET);
  const otherCourseRes = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: orderResult.orderId,
      paymentId: "pay_test_other_course",
      signature: otherCourseSig,
      userId: student.id,
      courseId: otherCourse.id
    })
  });
  console.log(`Other course status: ${otherCourseRes.status}`);

  // Case D: Unknown order
  console.log("\n--- Case D: Unknown order ---");
  const unknownOrderSig = generateSignature("order_unknown_9999", "pay_test_unknown", TEST_RAZORPAY_SECRET);
  const unknownOrderRes = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: "order_unknown_9999",
      paymentId: "pay_test_unknown",
      signature: unknownOrderSig,
      userId: student.id,
      courseId: targetCourse.id
    })
  });
  console.log(`Unknown order status: ${unknownOrderRes.status}`);

  // Case E: Valid Verification
  console.log("\n--- Case E: Valid Verification ---");
  const validPaymentId = "pay_valid_p94_001";
  const validSig = generateSignature(orderResult.orderId, validPaymentId, TEST_RAZORPAY_SECRET);
  const validRes = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: orderResult.orderId,
      paymentId: validPaymentId,
      signature: validSig,
      userId: student.id,
      courseId: targetCourse.id
    })
  });
  console.log(`Valid verify status: ${validRes.status}`);

  // Print exact Payment and Enrollment counts
  let payCount = await prisma.payment.count({ where: { userId: student.id, status: "COMPLETED" } });
  let enrollCount = await prisma.enrollment.count({ where: { userId: student.id, courseId: targetCourse.id } });
  console.log(`After valid verify -> COMPLETED Payments: ${payCount}, Enrollments: ${enrollCount}`);

  // Case F: Replay verification (x2)
  console.log("\n--- Case F: Replay verification (x2) ---");
  const replayRes1 = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: orderResult.orderId,
      paymentId: validPaymentId,
      signature: validSig,
      userId: student.id,
      courseId: targetCourse.id
    })
  });
  const replayRes2 = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: orderResult.orderId,
      paymentId: validPaymentId,
      signature: validSig,
      userId: student.id,
      courseId: targetCourse.id
    })
  });
  console.log(`Replay 1 status: ${replayRes1.status}, Replay 2 status: ${replayRes2.status}`);

  payCount = await prisma.payment.count({ where: { userId: student.id, status: "COMPLETED" } });
  enrollCount = await prisma.enrollment.count({ where: { userId: student.id, courseId: targetCourse.id } });
  console.log(`After replays -> COMPLETED Payments: ${payCount}, Enrollments: ${enrollCount}`);

  // Case G: 5 Parallel verifies
  console.log("\n--- Case G: 5 Parallel Verifies ---");
  const parallelPromises = Array.from({ length: 5 }, (_, i) =>
    fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: orderResult.orderId,
        paymentId: validPaymentId,
        signature: validSig,
        userId: student.id,
        courseId: targetCourse.id
      })
    })
  );
  const parallelResults = await Promise.all(parallelPromises);
  console.log(`Parallel statuses: ${parallelResults.map(r => r.status).join(", ")}`);

  payCount = await prisma.payment.count({ where: { userId: student.id, status: "COMPLETED" } });
  enrollCount = await prisma.enrollment.count({ where: { userId: student.id, courseId: targetCourse.id } });
  console.log(`After parallel verifies -> COMPLETED Payments: ${payCount}, Enrollments: ${enrollCount}`);

  // Case H: Webhook captured x2 & bad signature
  console.log("\n--- Case H: Webhook captured x2 & bad signature ---");
  const webhookPayload = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: validPaymentId,
          order_id: orderResult.orderId,
          amount: Number(orderResult.amount) * 100,
          status: "captured"
        }
      }
    }
  });

  // Bad webhook signature
  const badWhRes = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": "invalid_webhook_signature"
    },
    body: webhookPayload
  });
  console.log(`Bad webhook signature status: ${badWhRes.status}`);

  // Valid webhook captured x2
  const validWhSig = generateWebhookSignature(webhookPayload, WEBHOOK_SECRET);
  const whRes1 = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": validWhSig
    },
    body: webhookPayload
  });
  const whRes2 = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": validWhSig
    },
    body: webhookPayload
  });
  console.log(`Webhook 1 status: ${whRes1.status}, Webhook 2 status: ${whRes2.status}`);

  payCount = await prisma.payment.count({ where: { userId: student.id, status: "COMPLETED" } });
  enrollCount = await prisma.enrollment.count({ where: { userId: student.id, courseId: targetCourse.id } });
  console.log(`After webhooks -> COMPLETED Payments: ${payCount}, Enrollments: ${enrollCount}`);

  // Case I: Coupon Order & Verification (RESERVED -> REDEEMED)
  console.log("\n--- Case I: Coupon Flow (create -> RESERVED -> verify -> REDEEMED) ---");
  const couponOrderResult = await createRazorpayOrder({
    courseId: targetCourse.id,
    userId: student.id,
    couponCode: "STEP5_PERC20"
  });
  console.log("Coupon Order:", {
    orderId: couponOrderResult.orderId,
    amount: couponOrderResult.amount,
    currency: couponOrderResult.currency
  });

  const couponPayment = await prisma.payment.findFirst({
    where: { externalId: couponOrderResult.orderId }
  });
  console.log(`Coupon DB Payment: amount=${couponPayment?.amount}, couponCode=${couponPayment?.couponCode}`);

  const couponRedemptionBefore = await prisma.couponRedemption.findFirst({
    where: { paymentId: couponPayment?.id }
  });
  console.log(`Redemption before verify: status=${couponRedemptionBefore?.status}`);

  const couponPayId = "pay_coupon_valid_001";
  const couponSig = generateSignature(couponOrderResult.orderId, couponPayId, TEST_RAZORPAY_SECRET);
  const couponVerifyRes = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: couponOrderResult.orderId,
      paymentId: couponPayId,
      signature: couponSig,
      userId: student.id,
      courseId: targetCourse.id
    })
  });
  console.log(`Coupon verify status: ${couponVerifyRes.status}`);

  const couponRedemptionAfter = await prisma.couponRedemption.findFirst({
    where: { paymentId: couponPayment?.id }
  });
  console.log(`Redemption after verify: status=${couponRedemptionAfter?.status}`);

  console.log("\nPAYMENT PATH TEST COMPLETE.");
}

run().finally(() => prisma.$disconnect());
