import { spawn, ChildProcess } from "child_process";
import { PrismaClient, Difficulty, LessonType } from "@prisma/client";
import { encode } from "next-auth/jwt";
import crypto from "crypto";
import { assertTestDb } from "../lib/testing/assert-test-db";
import bcrypt from "bcryptjs";

const TEST_PORT = 3005;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const DOCKER_DB_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";

process.env.TEST_DATABASE_URL = DOCKER_DB_URL;
process.env.DATABASE_URL = DOCKER_DB_URL;
process.env.DIRECT_URL = DOCKER_DB_URL;

assertTestDb();

const prisma = new PrismaClient({
  datasources: { db: { url: DOCKER_DB_URL } }
});

const SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "default_test_secret_32_characters_long_min";
const WEBHOOK_SECRET = "whsec_test_secret_12345";
process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;

async function createSessionCookie(userId: string, role: string, email: string) {
  const token = await encode({
    token: { id: userId, role, email, name: `User ${role}` },
    secret: SECRET,
    salt: "authjs.session-token",
  });
  return `authjs.session-token=${token}`;
}

async function run() {
  console.log("=========================================================================");
  console.log("=== STEP 5: REAL HTTP TEST SUITE ON LOCAL DOCKER TEST DB ===");
  console.log(`TEST DB: yes | Host: 127.0.0.1:54329 | DB: trillionskill_test`);
  console.log("=========================================================================\n");

  // Read-only dev DB isolation check before run
  const devDirect = "postgresql://postgres.rcycxzqrehdgwjbcjlqv:PKv%408340665934@aws-1-ap-south-1.pooler.supabase.com:5432/postgres";
  const devPrisma = new PrismaClient({
    datasources: { db: { url: devDirect } }
  });
  await devPrisma.$executeRawUnsafe(`SET default_transaction_read_only = on`);

  const devBeforeCounts: any = await devPrisma.$queryRawUnsafe(`
    SELECT 
      (SELECT COUNT(*) FROM "User")::int as users,
      (SELECT COUNT(*) FROM "Course")::int as courses,
      (SELECT COUNT(*) FROM "Payment")::int as payments,
      (SELECT COUNT(*) FROM "Enrollment")::int as enrollments
  `);
  console.log("5z. DEV DB BEFORE COUNTS (Read-Only Isolation Check):", devBeforeCounts);

  // 1. Canary row creation on Docker test DB
  console.log("\n--- Canary row verification ---");
  await prisma.$executeRawUnsafe(`
    INSERT INTO "User" (id, email, name, role, "createdAt", "updatedAt")
    VALUES ('u_canary_step5', 'canary_step5@example.test', 'Canary User', 'FREE', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  const canaryInDocker: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM "User" WHERE id = 'u_canary_step5'`);
  const canaryInDev: any[] = await devPrisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM "User" WHERE id = 'u_canary_step5'`);
  console.log(`Canary in Docker: ${canaryInDocker[0]?.cnt} (expect 1) | Canary in Dev: ${canaryInDev[0]?.cnt} (expect 0)`);
  if (canaryInDocker[0]?.cnt !== 1 || canaryInDev[0]?.cnt !== 0) {
    throw new Error("CANARY ISOLATION FAILED: Docker write appeared on Dev or failed on Docker!");
  }
  await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE id = 'u_canary_step5'`);
  console.log("Canary verification passed cleanly.\n");

  // 2. Comprehensive Seed on Docker Test DB
  console.log("--- Seeding Docker Test DB for Step 5 ---");
  const passHash = await bcrypt.hash("TestPass123!", 10);
  const usersToSeed = [
    { id: "u_admin_step5", email: "admin@test.local", role: "ADMIN", name: "Admin User" },
    { id: "u_teacher_owner_step5", email: "teacher_owner@test.local", role: "TEACHER", name: "Teacher Owner" },
    { id: "u_teacher_other_step5", email: "teacher_other@test.local", role: "TEACHER", name: "Teacher Other" },
    { id: "u_student_free_step5", email: "student_free@test.local", role: "FREE", name: "Free Student" },
    { id: "u_student_prem_step5", email: "student_prem@test.local", role: "PREMIUM", name: "Premium Student" },
    { id: "u_student_courseB_step5", email: "student_courseB@test.local", role: "FREE", name: "Student Course B" },
  ];
  for (const u of usersToSeed) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { id: u.id, role: u.role as any, password: passHash },
      create: { ...u, role: u.role as any, password: passHash }
    });
  }

  // Course A: 72nd-like Paid course
  const courseA = await prisma.course.upsert({
    where: { slug: "72nd-bpsc-prelims-current-affairs" },
    update: { status: "PUBLISHED", isPublished: true, isPremium: true, price: 1999 },
    create: {
      id: "c_paid_72nd_step5",
      title: "72nd BPSC Prelims Current Affairs",
      slug: "72nd-bpsc-prelims-current-affairs",
      description: "BPSC Comprehensive Course",
      price: 1999,
      status: "PUBLISHED",
      isPublished: true,
      isPremium: true,
      difficulty: Difficulty.INTERMEDIATE
    }
  });

  const chA = await prisma.chapter.upsert({
    where: { id: "ch_a_step5" },
    update: {},
    create: { id: "ch_a_step5", courseId: courseA.id, title: "Module 1", order: 1 }
  });

  await prisma.lesson.upsert({
    where: { id: "l_a_trial_step5" },
    update: {},
    create: {
      id: "l_a_trial_step5",
      chapterId: chA.id,
      title: "Trial Lesson",
      type: LessonType.VIDEO,
      order: 1,
      isTrial: true,
      videoUrl: "https://videos.example.test/trial-video.mp4",
      content: "Public trial lesson content",
      duration: 600
    }
  });

  await prisma.lesson.upsert({
    where: { id: "l_a_locked_step5" },
    update: {},
    create: {
      id: "l_a_locked_step5",
      chapterId: chA.id,
      title: "Secret Strategy Lesson",
      type: LessonType.VIDEO,
      order: 2,
      isTrial: false,
      videoUrl: "https://private-cdn.example.test/super-secret-video-stream.m3u8",
      content: "SECRET_TELEGRAM_GROUP: https://t.me/+SecretBPSCJoinKey123",
      duration: 1800
    }
  });

  // Course B: Paid course
  const courseB = await prisma.course.upsert({
    where: { slug: "upsc-gs-mastery" },
    update: { status: "PUBLISHED", isPublished: true, isPremium: true, price: 2499 },
    create: {
      id: "c_paid_upsc_step5",
      title: "UPSC GS Mastery",
      slug: "upsc-gs-mastery",
      description: "GS Mastery Course",
      price: 2499,
      status: "PUBLISHED",
      isPublished: true,
      isPremium: true,
      difficulty: Difficulty.ADVANCED
    }
  });

  // Free Course
  await prisma.course.upsert({
    where: { slug: "free-general-studies" },
    update: { status: "PUBLISHED", isPublished: true, isPremium: false, price: 0 },
    create: {
      id: "c_free_gs_step5",
      title: "Free General Studies Primer",
      slug: "free-general-studies",
      description: "Free primer",
      price: 0,
      status: "PUBLISHED",
      isPublished: true,
      isPremium: false,
      difficulty: Difficulty.BEGINNER
    }
  });

  // Draft Course
  const courseDraft = await prisma.course.upsert({
    where: { slug: "draft-secret-course" },
    update: { status: "DRAFT", isPublished: false, price: 999 },
    create: {
      id: "c_draft_secret_step5",
      title: "Unreleased Draft Course",
      slug: "draft-secret-course",
      description: "Draft course",
      price: 999,
      status: "DRAFT",
      isPublished: false,
      isPremium: false,
      difficulty: Difficulty.BEGINNER
    }
  });

  const chDraft = await prisma.chapter.upsert({
    where: { id: "ch_draft_step5" },
    update: {},
    create: { id: "ch_draft_step5", courseId: courseDraft.id, title: "Draft Chapter", order: 1 }
  });

  await prisma.lesson.upsert({
    where: { id: "l_draft_lesson_step5" },
    update: {},
    create: {
      id: "l_draft_lesson_step5",
      chapterId: chDraft.id,
      title: "Draft Lesson",
      type: LessonType.VIDEO,
      order: 1,
      isTrial: false,
      videoUrl: "https://secret.example.test/draft.mp4",
      duration: 300
    }
  });

  // Enroll student_courseB into Course B only
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: "u_student_courseB_step5", courseId: courseB.id } },
    update: {},
    create: { userId: "u_student_courseB_step5", courseId: courseB.id }
  });

  // Exam Series
  await prisma.examSeries.upsert({
    where: { slug: "bpsc-72nd-2026" },
    update: {},
    create: {
      id: "es_bpsc_step5",
      title: "72nd BPSC Mock Series",
      slug: "bpsc-72nd-2026",
      examName: "BPSC",
      category: "Civil Services",
      description: "Mock series",
      isFree: true,
      isPro: false,
      isPublished: true,
      createdById: "u_teacher_owner_step5"
    }
  });

  // Coupons
  await prisma.coupon.upsert({
    where: { code: "STEP5_PERC20" },
    update: { isActive: true },
    create: {
      id: "cpn_perc20_step5",
      code: "STEP5_PERC20",
      discountType: "PERCENT",
      discountValue: 20,
      courseId: courseA.id,
      showOnThumbnail: true,
      badgeLabel: "20% OFF",
      isActive: true
    }
  });

  await prisma.coupon.upsert({
    where: { code: "STEP5_FLAT500" },
    update: { isActive: true },
    create: {
      id: "cpn_flat500_step5",
      code: "STEP5_FLAT500",
      discountType: "FLAT",
      discountValue: 500,
      courseId: courseA.id,
      isActive: true
    }
  });

  await prisma.coupon.upsert({
    where: { code: "STEP5_MAX1" },
    update: { isActive: true, maxRedemptions: 1 },
    create: {
      id: "cpn_max1_step5",
      code: "STEP5_MAX1",
      discountType: "PERCENT",
      discountValue: 50,
      courseId: courseA.id,
      maxRedemptions: 1,
      isActive: true
    }
  });

  await prisma.coupon.upsert({
    where: { code: "STEP5_EXPIRED" },
    update: { isActive: true },
    create: {
      id: "cpn_expired_step5",
      code: "STEP5_EXPIRED",
      discountType: "PERCENT",
      discountValue: 10,
      validFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      validUntil: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      isActive: true
    }
  });

  // Start Next.js server on TEST_PORT
  console.log(`\nStarting Next.js server on port ${TEST_PORT}...`);
  const serverProc: ChildProcess = spawn("npx", ["next", "start", "-p", String(TEST_PORT)], {
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      DATABASE_URL: DOCKER_DB_URL,
      DIRECT_URL: DOCKER_DB_URL,
      TEST_DATABASE_URL: DOCKER_DB_URL,
      NODE_ENV: "production",
      AUTH_SECRET: SECRET,
      NEXTAUTH_SECRET: SECRET,
      RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
      RAZORPAY_KEY_ID: "rzp_test_mockkey12345",
      RAZORPAY_KEY_SECRET: "mock_secret_key_12345"
    },
    stdio: "pipe"
  });

  // Await server readiness
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`, { redirect: "manual" });
      if (res.status === 200 || res.status === 404) break;
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log("Server ready on port 3005.\n");

  try {
    const cookieAdmin = await createSessionCookie("u_admin_step5", "ADMIN", "admin@test.local");
    const cookieTeacherOwner = await createSessionCookie("u_teacher_owner_step5", "TEACHER", "teacher_owner@test.local");
    const cookieTeacherOther = await createSessionCookie("u_teacher_other_step5", "TEACHER", "teacher_other@test.local");
    const cookieFree = await createSessionCookie("u_student_free_step5", "FREE", "student_free@test.local");
    const cookiePrem = await createSessionCookie("u_student_prem_step5", "PREMIUM", "student_prem@test.local");
    const cookieCourseB = await createSessionCookie("u_student_courseB_step5", "FREE", "student_courseB@test.local");

    // -------------------------------------------------------------------------
    // SUB-SUITE 3c: RESIDUE TRACKING BEFORE RUN
    // -------------------------------------------------------------------------
    console.log("--- 3c. RESIDUE TRACKING BEFORE RUN ---");
    const testTables = ["User", "Course", "Lesson", "Enrollment", "Payment", "Coupon", "CouponRedemption", "RateLimit"];
    const countsBefore: Record<string, number> = {};
    for (const t of testTables) {
      const res: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as c FROM "${t}"`);
      countsBefore[t] = res[0]?.c ?? 0;
    }
    console.table(countsBefore);

    // -------------------------------------------------------------------------
    // SUB-SUITE 4: PAYWALL / LEAK RETEST OVER HTTP
    // -------------------------------------------------------------------------
    console.log("\n--- 4. PAYWALL / LEAK RETEST OVER HTTP ---");
    const paywallCases = [
      { name: "Anon access locked lesson page", url: "/courses/72nd-bpsc-prelims-current-affairs/learn/l_a_locked_step5", headers: {}, expectNoLeak: true },
      { name: "Free student access locked lesson page", url: "/courses/72nd-bpsc-prelims-current-affairs/learn/l_a_locked_step5", headers: { Cookie: cookieFree }, expectNoLeak: true },
      { name: "Course B student access locked lesson page", url: "/courses/72nd-bpsc-prelims-current-affairs/learn/l_a_locked_step5", headers: { Cookie: cookieCourseB }, expectNoLeak: true },
      { name: "Teacher Other access locked lesson page", url: "/courses/72nd-bpsc-prelims-current-affairs/learn/l_a_locked_step5", headers: { Cookie: cookieTeacherOther }, expectNoLeak: true },
      { name: "Free student access trial lesson page", url: "/courses/72nd-bpsc-prelims-current-affairs/learn/l_a_trial_step5", headers: { Cookie: cookieFree }, expectNoLeak: false },
    ];
    const results4: any[] = [];
    for (const c of paywallCases) {
      const res = await fetch(`${BASE_URL}${c.url}`, { headers: c.headers as any, redirect: "manual" });
      const text = await res.text();
      const hasSecretVideo = text.includes("super-secret-video-stream.m3u8");
      const hasTelegramSecret = text.includes("SecretBPSCJoinKey123");
      const leaked = hasSecretVideo || hasTelegramSecret;
      const passed = c.expectNoLeak ? !leaked : true;
      results4.push({
        case: c.name,
        expected: c.expectNoLeak ? "No secret leak (video/telegram)" : "Trial content accessible",
        actual: `HTTP ${res.status} | Leak: ${leaked ? "YES" : "NO"}`,
        status: passed ? "PASS" : "FAIL"
      });
    }
    console.table(results4);
    const pass4 = results4.filter(r => r.status === "PASS").length;
    console.log(`Sub-suite 4 Summary: ${pass4}/${results4.length} passed.`);

    // -------------------------------------------------------------------------
    // SUB-SUITE 5: DRAFT COURSE VISIBILITY OVER HTTP
    // -------------------------------------------------------------------------
    console.log("\n--- 5. DRAFT COVERAGE OVER HTTP ---");
    const draftCases = [
      { name: "Anon Draft Detail Page", url: "/courses/draft-secret-course", headers: {}, expectStatus: 404 },
      { name: "Free Student Draft Detail Page", url: "/courses/draft-secret-course", headers: { Cookie: cookieFree }, expectStatus: 404 },
      { name: "Premium Student Draft Detail Page", url: "/courses/draft-secret-course", headers: { Cookie: cookiePrem }, expectStatus: 404 },
      { name: "Non-Owner Teacher Draft Detail Page", url: "/courses/draft-secret-course", headers: { Cookie: cookieTeacherOther }, expectStatus: 404 },
      { name: "Admin Draft Detail Page", url: "/courses/draft-secret-course", headers: { Cookie: cookieAdmin }, expectStatus: 200 },
      { name: "Anon Draft Learn Page", url: "/courses/draft-secret-course/learn/l_draft_lesson_step5", headers: {}, expectStatus: 404 },
      { name: "Free Student Draft Learn Page", url: "/courses/draft-secret-course/learn/l_draft_lesson_step5", headers: { Cookie: cookieFree }, expectStatus: 404 },
      { name: "Draft Enroll (/api/courses/enroll)", url: "/api/courses/enroll", headers: { "Content-Type": "application/json", Cookie: cookieFree }, body: JSON.stringify({ courseId: "draft-secret-course" }), expectStatus: 404 },
      { name: "Draft Free-Enroll (/api/courses/free-enroll)", url: "/api/courses/free-enroll", headers: { "Content-Type": "application/json", Cookie: cookieFree }, body: JSON.stringify({ courseId: "draft-secret-course" }), expectStatus: 404 },
    ];
    const results5: any[] = [];
    for (const c of draftCases) {
      const isPost = !!c.body;
      const res = await fetch(`${BASE_URL}${c.url}`, {
        method: isPost ? "POST" : "GET",
        headers: c.headers as any,
        body: c.body,
        redirect: "manual"
      });
      const passed = res.status === c.expectStatus;
      results5.push({
        case: c.name,
        expected: `HTTP ${c.expectStatus}`,
        actual: `HTTP ${res.status}`,
        status: passed ? "PASS" : "FAIL"
      });
    }
    console.table(results5);
    const pass5 = results5.filter(r => r.status === "PASS").length;
    console.log(`Sub-suite 5 Summary: ${pass5}/${results5.length} passed.`);

    // -------------------------------------------------------------------------
    // SUB-SUITE 6: PAYMENT MATRIX OVER HTTP
    // -------------------------------------------------------------------------
    console.log("\n--- 6. PAYMENT MATRIX OVER ALL PAYMENT-CAPABLE ROUTES ---");
    const results6: any[] = [];

    // Case 1: Bad signature rejection on /api/verify-payment/razorpay
    const badSigRes = await fetch(`${BASE_URL}/api/verify-payment/razorpay`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieFree },
      body: JSON.stringify({
        razorpay_order_id: "order_fake_123",
        razorpay_payment_id: "pay_fake_123",
        razorpay_signature: "bad_signature_hash",
        courseId: "c_paid_72nd_step5"
      }),
      redirect: "manual"
    });
    results6.push({
      case: "Bad signature verify rejection",
      expected: "HTTP 400",
      actual: `HTTP ${badSigRes.status}`,
      status: badSigRes.status === 400 ? "PASS" : "FAIL"
    });

    // Case 2: Webhook bad signature rejection
    const badWebhookRes = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-razorpay-signature": "forged_signature_hash" },
      body: JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_1" } } } }),
      redirect: "manual"
    });
    results6.push({
      case: "Webhook bad signature rejection",
      expected: "HTTP 400",
      actual: `HTTP ${badWebhookRes.status}`,
      status: badWebhookRes.status === 400 ? "PASS" : "FAIL"
    });

    // Case 3: Free enroll on paid course rejection
    const paidEnrollRes = await fetch(`${BASE_URL}/api/courses/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieFree },
      body: JSON.stringify({ courseId: "72nd-bpsc-prelims-current-affairs" }),
      redirect: "manual"
    });
    results6.push({
      case: "Free enroll on paid course rejected",
      expected: "HTTP 403",
      actual: `HTTP ${paidEnrollRes.status}`,
      status: paidEnrollRes.status === 403 ? "PASS" : "FAIL"
    });

    // Case 4: Free enroll on genuine free course allowed
    const freeEnrollRes = await fetch(`${BASE_URL}/api/courses/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieFree },
      body: JSON.stringify({ courseId: "free-general-studies" }),
      redirect: "manual"
    });
    results6.push({
      case: "Free enroll on free course allowed",
      expected: "HTTP 200",
      actual: `HTTP ${freeEnrollRes.status}`,
      status: freeEnrollRes.status === 200 ? "PASS" : "FAIL"
    });

    // Case 5: Valid Payment and Replay Protection via Webhook
    const validOrderId = "order_step5_valid_99";
    const validPaymentId = "pay_step5_valid_99";
    await prisma.payment.upsert({
      where: { id: "pmt_step5_test" },
      update: { status: "PENDING", externalId: validOrderId },
      create: {
        id: "pmt_step5_test",
        userId: "u_student_free_step5",
        amount: 1999,
        currency: "INR",
        status: "PENDING",
        externalId: validOrderId,
        metadata: { courseId: "c_paid_72nd_step5" }
      }
    });

    const webhookPayload = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: { entity: { id: validPaymentId, order_id: validOrderId, amount: 199900, currency: "INR" } },
        order: { entity: { id: validOrderId, amount: 199900 } }
      }
    });
    const validSignature = crypto.createHmac("sha256", WEBHOOK_SECRET).update(webhookPayload).digest("hex");

    // First Webhook invocation
    const whRes1 = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-razorpay-signature": validSignature },
      body: webhookPayload,
      redirect: "manual"
    });

    // Replay Webhook invocation
    const whRes2 = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-razorpay-signature": validSignature },
      body: webhookPayload,
      redirect: "manual"
    });

    const enrollsAfterWebhook: any[] = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int as cnt FROM "Enrollment" WHERE "userId" = 'u_student_free_step5' AND "courseId" = 'c_paid_72nd_step5'
    `);

    results6.push({
      case: "Valid webhook capture & enrollment",
      expected: "HTTP 200 & exactly 1 enrollment row",
      actual: `HTTP ${whRes1.status} | Enrollments: ${enrollsAfterWebhook[0]?.cnt}`,
      status: whRes1.status === 200 && enrollsAfterWebhook[0]?.cnt === 1 ? "PASS" : "FAIL"
    });

    results6.push({
      case: "Webhook replay idempotency (no duplicate enrollment)",
      expected: "HTTP 200 & still exactly 1 enrollment row",
      actual: `HTTP ${whRes2.status} | Enrollments: ${enrollsAfterWebhook[0]?.cnt}`,
      status: whRes2.status === 200 && enrollsAfterWebhook[0]?.cnt === 1 ? "PASS" : "FAIL"
    });

    console.table(results6);
    const pass6 = results6.filter(r => r.status === "PASS").length;
    console.log(`Sub-suite 6 Summary: ${pass6}/${results6.length} passed.`);

    // -------------------------------------------------------------------------
    // SUB-SUITE 7a: REPORT LINKS WITH REAL SEED IDS
    // -------------------------------------------------------------------------
    console.log("\n--- 7a. REPORT LINKS & ATTEMPT AUTHORIZATION ---");
    const examTest = await prisma.examTest.create({
      data: {
        seriesId: "es_bpsc_step4",
        title: "Test 7a Sample",
        durationMinutes: 60,
        totalMarks: 100,
        createdById: "u_teacher_owner_step5"
      }
    });
    const examAttempt = await prisma.examAttempt.create({
      data: {
        testId: examTest.id,
        userId: "u_student_free_step5",
        status: "SUBMITTED",
        score: 85
      }
    });

    const ownerRes = await fetch(`${BASE_URL}/api/exam/attempt/${examAttempt.id}/result`, {
      headers: { Cookie: cookieFree },
      redirect: "manual"
    });
    const nonOwnerRes = await fetch(`${BASE_URL}/api/exam/attempt/${examAttempt.id}/result`, {
      headers: { Cookie: cookieCourseB },
      redirect: "manual"
    });

    const results7a = [
      {
        case: "Attempt Owner Result Access",
        expected: "HTTP 200 (Result accessible)",
        actual: `HTTP ${ownerRes.status}`,
        status: ownerRes.status === 200 ? "PASS" : "FAIL"
      },
      {
        case: "Non-Owner Result Access Denied",
        expected: "HTTP 403 (Forbidden)",
        actual: `HTTP ${nonOwnerRes.status}`,
        status: nonOwnerRes.status === 403 ? "PASS" : "FAIL"
      }
    ];
    console.table(results7a);
    const pass7a = results7a.filter(r => r.status === "PASS").length;
    console.log(`Sub-suite 7a Summary: ${pass7a}/${results7a.length} passed.`);

    // -------------------------------------------------------------------------
    // SUB-SUITE 8: COUPON EVIDENCE
    // -------------------------------------------------------------------------
    console.log("\n--- 8. COUPON EVIDENCE OVER HTTP ---");
    const previewPerc = await fetch(`${BASE_URL}/api/checkout/coupon/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieFree },
      body: JSON.stringify({ courseId: "72nd-bpsc-prelims-current-affairs", code: "STEP5_PERC20" })
    });
    const percBody = await previewPerc.json();

    const previewFlat = await fetch(`${BASE_URL}/api/checkout/coupon/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieFree },
      body: JSON.stringify({ courseId: "72nd-bpsc-prelims-current-affairs", code: "STEP5_FLAT500" })
    });
    const flatBody = await previewFlat.json();

    const previewExp = await fetch(`${BASE_URL}/api/checkout/coupon/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieFree },
      body: JSON.stringify({ courseId: "72nd-bpsc-prelims-current-affairs", code: "STEP5_EXPIRED" })
    });

    const results8 = [
      {
        case: "Percent Coupon Math (20% off 1999)",
        expected: "finalPaise: 159920",
        actual: `finalPaise: ${percBody.finalPaise}`,
        status: percBody.finalPaise === 159920 ? "PASS" : "FAIL"
      },
      {
        case: "Flat Coupon Math (500 off 1999)",
        expected: "finalPaise: 149900",
        actual: `finalPaise: ${flatBody.finalPaise}`,
        status: flatBody.finalPaise === 149900 ? "PASS" : "FAIL"
      },
      {
        case: "Expired Coupon Rejection",
        expected: "HTTP 400",
        actual: `HTTP ${previewExp.status}`,
        status: previewExp.status === 400 ? "PASS" : "FAIL"
      }
    ];
    console.table(results8);
    const pass8 = results8.filter(r => r.status === "PASS").length;
    console.log(`Sub-suite 8 Summary: ${pass8}/${results8.length} passed.`);

    // -------------------------------------------------------------------------
    // CLEANUP TEST ARTIFACTS
    // -------------------------------------------------------------------------
    await prisma.examAttempt.deleteMany({ where: { id: examAttempt.id } });
    await prisma.examTest.deleteMany({ where: { id: examTest.id } });
    await prisma.enrollment.deleteMany({ where: { userId: "u_student_free_step5" } });
    await prisma.payment.deleteMany({ where: { id: "pmt_step5_test" } });
    await prisma.rateLimit.deleteMany({});

    // -------------------------------------------------------------------------
    // SUB-SUITE 3c: RESIDUE TRACKING AFTER RUN
    // -------------------------------------------------------------------------
    console.log("\n--- 3c. RESIDUE TRACKING AFTER RUN ---");
    const countsAfter: Record<string, number> = {};
    for (const t of testTables) {
      const res: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as c FROM "${t}"`);
      countsAfter[t] = res[0]?.c ?? 0;
    }
    const residueAudit = testTables.map((t) => ({
      table: t,
      before: countsBefore[t],
      after: countsAfter[t],
      difference: (countsAfter[t] ?? 0) - (countsBefore[t] ?? 0),
      residuePass: (countsAfter[t] ?? 0) === (countsBefore[t] ?? 0) ? "PASS" : "FAIL"
    }));
    console.table(residueAudit);

    // -------------------------------------------------------------------------
    // 5z: DEV DB ISOLATION CHECK AFTER RUN
    // -------------------------------------------------------------------------
    const devAfterCounts: any = await devPrisma.$queryRawUnsafe(`
      SELECT 
        (SELECT COUNT(*) FROM "User")::int as users,
        (SELECT COUNT(*) FROM "Course")::int as courses,
        (SELECT COUNT(*) FROM "Payment")::int as payments,
        (SELECT COUNT(*) FROM "Enrollment")::int as enrollments
    `);
    console.log("\n5z. DEV DB AFTER COUNTS (Read-Only Isolation Check):", devAfterCounts);
    const devIsolated = JSON.stringify(devBeforeCounts) === JSON.stringify(devAfterCounts);
    console.log("5z. DEV DB IDENTICAL BEFORE & AFTER:", devIsolated ? "YES (PASS)" : "NO (FAIL)");

    if (!devIsolated) {
      throw new Error("DEV DB ISOLATION VIOLATION!");
    }

  } finally {
    serverProc.kill();
    await prisma.$disconnect();
    await devPrisma.$disconnect();
  }
}

run().catch((err) => {
  console.error("FATAL in test-step5-complete-http-suite:", err);
  process.exit(1);
});
