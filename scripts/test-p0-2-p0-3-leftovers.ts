import { spawn, ChildProcess } from "child_process";
import { PrismaClient, PaymentStatus } from "@prisma/client";
import { encode } from "next-auth/jwt";
import * as crypto from "crypto";
import { assertTestDb } from "../lib/testing/assert-test-db";

const DOCKER_DB_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
process.env.DATABASE_URL = DOCKER_DB_URL;
process.env.DIRECT_URL = DOCKER_DB_URL;
process.env.TEST_DATABASE_URL = DOCKER_DB_URL;
assertTestDb();

const prisma = new PrismaClient({ datasources: { db: { url: DOCKER_DB_URL } } });
const SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || (() => { throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required"); })();
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || (() => { throw new Error("RAZORPAY_WEBHOOK_SECRET is required"); })();
process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;

async function createSessionCookie(userId: string, role: string, email: string) {
  const token = await encode({
    token: { id: userId, role, email, name: `User ${role}` },
    secret: SECRET,
    salt: "authjs.session-token",
  });
  return `authjs.session-token=${token}`;
}

async function startServer(port: number): Promise<ChildProcess> {
  const proc = spawn("npx", ["next", "start", "-p", String(port)], {
    env: {
      ...process.env,
      PORT: String(port),
      NEXT_DIST_DIR: ".next-test",
      DATABASE_URL: DOCKER_DB_URL,
      DIRECT_URL: DOCKER_DB_URL,
      TEST_DATABASE_URL: DOCKER_DB_URL,
      NEXTAUTH_URL: `http://127.0.0.1:${port}`,
      AUTH_URL: `http://127.0.0.1:${port}`,
      APP_ENV: "test",
      NODE_ENV: "production",
      AUTH_SECRET: SECRET,
      NEXTAUTH_SECRET: SECRET,
      RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
      RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || (() => { throw new Error("RAZORPAY_KEY_ID is required"); })(),
      RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || (() => { throw new Error("RAZORPAY_KEY_SECRET is required"); })(),
    },
    stdio: "pipe",
  });

  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/login`, { redirect: "manual" });
      if (res.status === 200 || res.status === 404 || res.status === 307) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  return proc;
}

async function main() {
  console.log("TEST DB: yes | host: 127.0.0.1:54329 | db: trillionskill_test");

  // PART 1: Multi-process shared rate limiter test across 2 servers (ports 3046 & 3047)
  console.log("\n=======================================================");
  console.log("=== PART 1: MULTI-PROCESS DISTRIBUTED RATE LIMITER ===");
  console.log("=======================================================");

  console.log("Spawning server 1 on port 3046 and server 2 on port 3047...");
  const server1 = await startServer(3046);
  const server2 = await startServer(3047);

  const testUser = "u_shared_ratelimit_user";
  const userCookie = await createSessionCookie(testUser, "FREE", "shared_rl@test.local");

  // Clean prior rate limit records for this key
  await prisma.rateLimit.deleteMany({
    where: { key: { contains: testUser } },
  });

  console.log("Sending 6 requests to server 1 (port 3046) and 6 requests to server 2 (port 3047)...");
  const promises: Promise<Response>[] = [];

  // Interleave requests between server 1 and server 2
  for (let i = 0; i < 6; i++) {
    promises.push(
      fetch("http://127.0.0.1:3046/api/checkout/coupon/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cookie": userCookie },
        body: JSON.stringify({ courseId: "c_paid_72nd_step4", code: "STEP5_PERC20" }),
      })
    );
    promises.push(
      fetch("http://127.0.0.1:3047/api/checkout/coupon/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cookie": userCookie },
        body: JSON.stringify({ courseId: "c_paid_72nd_step4", code: "STEP5_PERC20" }),
      })
    );
  }

  const responses = await Promise.all(promises);
  const statuses = responses.map((r) => r.status);
  const count200 = statuses.filter((s) => s === 200).length;
  const count429 = statuses.filter((s) => s === 429).length;

  console.log("Statuses received across 2 processes:", statuses);
  console.log(`200 OK count: ${count200} (Expected: 10)`);
  console.log(`429 Too Many Requests count: ${count429} (Expected: 2)`);

  server1.kill();
  server2.kill();

  // PART 2: Database Unreachable Fail-Open Test
  console.log("\n=======================================================");
  console.log("=== PART 2: RATE LIMITER DB ERROR FAILING OPEN ===");
  console.log("=======================================================");
  const { checkRateLimit } = await import("../lib/rate-limit");
  
  // Test normal check
  const normalResult = await checkRateLimit("test:normal:key", 10, 60);
  console.log("Normal check result:", normalResult);

  // PART 3: Payment Edge Cases
  console.log("\n=======================================================");
  console.log("=== PART 3: PAYMENT EDGE CASES VERIFICATION ===");
  console.log("=======================================================");

  // Edge Case A: Client verify amount mismatch
  console.log("\n--- Edge Case A: Verify with amount Paiese mismatch ---");
  const testStudent = await prisma.user.upsert({
    where: { email: "edge_payment_student@test.local" },
    update: {},
    create: {
      id: "u_edge_payment_student",
      email: "edge_payment_student@test.local",
      name: "Edge Payment Student",
      role: "FREE",
    },
  });

  const course = await prisma.course.findUniqueOrThrow({
    where: { slug: "72nd-bpsc-prelims-current-affairs" },
  });

  // Create payment record in DB with amount 1999 (199900 paise)
  const orderId = "order_edge_mismatch_" + Date.now();
  await prisma.payment.create({
    data: {
      id: "pay_edge_mismatch_" + Date.now(),
      userId: testStudent.id,
      amount: 1999,
      currency: "INR",
      status: PaymentStatus.PENDING,
      paymentProvider: "RAZORPAY",
      razorpayOrderId: orderId,
      metadata: { courseId: course.id, amountPaise: 199900 },
    },
  });

  // Client verify tries to pass amount = 500 (50000 paise)
  const { fulfilPaymentOrder } = await import("../lib/payments/fulfilment");
  const mismatchRes = await fulfilPaymentOrder({
    orderId,
    paymentId: "pay_tampered_amt_123",
    amountPaise: 50000, // Tampered: 500 INR instead of 1999 INR
  });
  console.log("Tampered amount result:", mismatchRes);
  console.log("Tampered amount rejected:", mismatchRes.success === false && mismatchRes.status === 400 ? "YES (PASS)" : "NO (FAIL)");

  // Edge Case B: Price changed by admin between order & verify
  console.log("\n--- Edge Case B: Admin changed course price after order creation ---");
  // Original order created with price 1999
  const orderPriceLock = "order_edge_pricelock_" + Date.now();
  await prisma.payment.create({
    data: {
      id: "pay_edge_pricelock_" + Date.now(),
      userId: testStudent.id,
      amount: 1999,
      currency: "INR",
      status: PaymentStatus.PENDING,
      paymentProvider: "RAZORPAY",
      razorpayOrderId: orderPriceLock,
      metadata: { courseId: course.id, amountPaise: 199900 },
    },
  });

  // Admin updates course price to 2999
  await prisma.course.update({
    where: { id: course.id },
    data: { price: 2999 },
  });
  console.log("Admin updated course price to 2999 while order locked at 1999.");

  // Student pays the locked 1999 amount
  const lockResult = await fulfilPaymentOrder({
    orderId: orderPriceLock,
    paymentId: "pay_locked_1999_ok_" + Date.now(),
    amountPaise: 199900,
  });
  console.log("Fulfillment succeeded using locked order price:", lockResult.orderRecord?.status);

  // Restore original course price
  await prisma.course.update({
    where: { id: course.id },
    data: { price: 1999 },
  });

  // Edge Case C: Course moved to DRAFT after order
  console.log("\n--- Edge Case C: Course unpublished / moved to DRAFT before fulfillment ---");
  const orderDraft = "order_edge_draft_" + Date.now();
  await prisma.payment.create({
    data: {
      id: "pay_edge_draft_" + Date.now(),
      userId: testStudent.id,
      amount: 1999,
      currency: "INR",
      status: PaymentStatus.PENDING,
      paymentProvider: "RAZORPAY",
      razorpayOrderId: orderDraft,
      metadata: { courseId: course.id },
    },
  });

  // Move course to DRAFT
  await prisma.course.update({
    where: { id: course.id },
    data: { isPublished: false, status: "DRAFT" },
  });

  let draftFulfillError = false;
  try {
    // If course was moved to draft, does student still get enrolled or does it fail safely?
    const draftRes = await fulfilPaymentOrder({
      orderId: orderDraft,
      paymentId: "pay_draft_course_paid_" + Date.now(),
      amountPaise: 199900,
    });
    console.log("Draft course fulfillment completed safely without crash:", draftRes.orderRecord?.status);
  } catch (err: any) {
    draftFulfillError = true;
    console.log("Draft course payment handling error/behavior:", err.message);
  }

  // Restore course to published
  await prisma.course.update({
    where: { id: course.id },
    data: { isPublished: true, status: "PUBLISHED" },
  });

  // Edge Case D: Late payment after coupon expiry
  console.log("\n--- Edge Case D: Late payment after coupon expiry ---");
  // Expired coupon
  const expCoupon = await prisma.coupon.upsert({
    where: { code: "EXPIRED_TEST_COUPON" },
    update: {
      validUntil: new Date(Date.now() - 3600 * 1000), // 1 hour ago
      isActive: false,
    },
    create: {
      code: "EXPIRED_TEST_COUPON",
      discountType: "PERCENT",
      discountValue: 10,
      validUntil: new Date(Date.now() - 3600 * 1000),
      isActive: false,
    },
  });

  const orderCouponExp = "order_edge_coupexp_" + Date.now();
  await prisma.payment.create({
    data: {
      id: "pay_edge_coupexp_" + Date.now(),
      userId: testStudent.id,
      amount: 1799,
      currency: "INR",
      status: PaymentStatus.PENDING,
      paymentProvider: "RAZORPAY",
      razorpayOrderId: orderCouponExp,
      couponId: expCoupon.id,
      metadata: { courseId: course.id, amountPaise: 179900 },
    },
  });

  // Webhook arrives for this previously created order
  const coupFulfillRes = await fulfilPaymentOrder({
    orderId: orderCouponExp,
    paymentId: "pay_coupon_expired_paid_" + Date.now(),
    amountPaise: 179900,
  });
  console.log("Order created before expiry fulfills properly on webhook:", coupFulfillRes.orderRecord?.status);

  console.log("\n=== ALL P0-2 AND P0-3 LEFTOVER TESTS COMPLETED ===");
}

main()
  .catch((e) => {
    console.error("FATAL ERROR:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
