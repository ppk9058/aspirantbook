import { spawn, ChildProcess } from "child_process";
import { PrismaClient, Difficulty, LessonType } from "@prisma/client";
import { encode } from "next-auth/jwt";
import * as crypto from "crypto";
import { assertTestDb } from "../lib/testing/assert-test-db";
import bcrypt from "bcryptjs";
import { chromium, Browser } from "playwright";
import * as fs from "fs";
import { buildAllTestCases, TestCaseDef } from "../lib/testing/qa-matrix-definitions";

const TEST_PORT = 3045;
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

interface MatrixResult {
  id: string;
  persona: string;
  methodUrl: string;
  expected: string;
  actualStatus: string;
  bodyCheck: string;
  status: "PASS" | "FAIL" | "NOT IMPLEMENTED";
}

async function run() {
  console.log("=========================================================================");
  console.log("=== PASS 9.6: COMPLETE QA TEST MATRIX RUNNER (ALL 310 REAL CASES) ===");
  console.log(`TEST DB: yes | Host: 127.0.0.1:54329 | DB: trillionskill_test`);
  console.log("=========================================================================\n");

  const allDefinedCases = buildAllTestCases();

  // Timestamp-based dev DB isolation check before run
  const devDirect = "postgresql://postgres.rcycxzqrehdgwjbcjlqv:PKv%408340665934@aws-1-ap-south-1.pooler.supabase.com:5432/postgres";
  const devPrisma = new PrismaClient({ datasources: { db: { url: devDirect } } });
  await devPrisma.$executeRawUnsafe(`SET default_transaction_read_only = on`);

  const runStartTime = new Date();
  console.log("RUN START TIMESTAMP (UTC):", runStartTime.toISOString());

  // Seed Docker Test DB
  console.log("\n--- Seeding Docker Test DB for Pass 9.3 QA ---");
  const passHash = await bcrypt.hash("TestPass123!", 10);
  const usersToSeed = [
    { id: "u_admin_p9", email: "admin@p9.local", role: "ADMIN", name: "Admin P9" },
    { id: "u_teacher_owner_p9", email: "teacher_owner@p9.local", role: "TEACHER", name: "Teacher Owner P9" },
    { id: "u_teacher_other_p9", email: "teacher_other@p9.local", role: "TEACHER", name: "Teacher Other P9" },
    { id: "u_student_free_p9", email: "student_free@p9.local", role: "FREE", name: "Free Student P9" },
    { id: "u_student_prem_p9", email: "student_prem@p9.local", role: "PREMIUM", name: "Premium Student P9" },
    { id: "u_student_courseB_p9", email: "student_courseB@p9.local", role: "FREE", name: "Student Course B P9" },
  ];
  for (const u of usersToSeed) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { id: u.id, role: u.role as any, password: passHash },
      create: { ...u, role: u.role as any, password: passHash }
    });
  }

  // Seed Courses
  const courseA = await prisma.course.upsert({
    where: { slug: "72nd-bpsc-prelims-current-affairs" },
    update: { status: "PUBLISHED", isPublished: true, isPremium: true, price: 1999 },
    create: {
      id: "c_paid_72nd_p9",
      title: "72nd BPSC Prelims Current Affairs",
      slug: "72nd-bpsc-prelims-current-affairs",
      description: "Comprehensive BPSC prelims current affairs course",
      price: 1999,
      status: "PUBLISHED",
      isPublished: true,
      isPremium: true,
      difficulty: Difficulty.INTERMEDIATE,
    }
  });

  const chA = await prisma.chapter.upsert({
    where: { id: "ch_a_p9" },
    update: { courseId: courseA.id },
    create: {
      id: "ch_a_p9",
      title: "Chapter 1: Bihar History & Polity",
      courseId: courseA.id,
      order: 1
    }
  });

  await prisma.lesson.upsert({
    where: { id: "l_a_trial_p9" },
    update: { isTrial: true },
    create: {
      id: "l_a_trial_p9",
      title: "Lesson 1: Introduction (Trial)",
      chapterId: chA.id,
      order: 1,
      isTrial: true,
      videoUrl: "https://stream.example.com/trial-video-sample.m3u8",
      type: LessonType.VIDEO
    }
  });

  await prisma.lesson.upsert({
    where: { id: "l_a_locked_p9" },
    update: { isTrial: false },
    create: {
      id: "l_a_locked_p9",
      title: "Lesson 2: Secret Deep Dive (Locked)",
      chapterId: chA.id,
      order: 2,
      isTrial: false,
      videoUrl: "https://stream.example.com/super-secret-video-stream.m3u8",
      type: LessonType.VIDEO
    }
  });

  // Free Course
  await prisma.course.upsert({
    where: { slug: "free-general-studies" },
    update: { status: "PUBLISHED", isPublished: true, isPremium: false, price: 0 },
    create: {
      id: "c_free_gs_p9",
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
  await prisma.course.upsert({
    where: { slug: "draft-secret-course" },
    update: { status: "DRAFT", isPublished: false, price: 999, isPremium: true },
    create: {
      id: "c_draft_secret_p9",
      title: "Unreleased Draft Course",
      slug: "draft-secret-course",
      description: "Draft course",
      price: 999,
      status: "DRAFT",
      isPublished: false,
      isPremium: true,
      difficulty: Difficulty.BEGINNER
    }
  });

  // Coupons
  await prisma.coupon.upsert({
    where: { code: "STEP5_PERC20" },
    update: { isActive: true, courseId: null },
    create: {
      id: "cpn_perc20_p9",
      code: "STEP5_PERC20",
      courseId: null,
      discountType: "PERCENT",
      discountValue: 20,
      validFrom: new Date(Date.now() - 24 * 60 * 60 * 1000),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true
    }
  });

  await prisma.coupon.upsert({
    where: { code: "STEP5_EXPIRED" },
    update: { isActive: true },
    create: {
      id: "cpn_expired_p9",
      code: "STEP5_EXPIRED",
      discountType: "PERCENT",
      discountValue: 10,
      validFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      validUntil: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      isActive: true
    }
  });

  await prisma.coupon.upsert({
    where: { code: "STEP5_FLAT500" },
    update: { isActive: true },
    create: {
      code: "STEP5_FLAT500",
      discountType: "FLAT",
      discountValue: 500,
      isActive: true
    }
  });

  await prisma.coupon.upsert({
    where: { code: "STEP5_MAX1" },
    update: { isActive: true },
    create: {
      code: "STEP5_MAX1",
      discountType: "PERCENT",
      discountValue: 50,
      isActive: true
    }
  });

  await prisma.coupon.upsert({
    where: { code: "CFKTEST" },
    update: { isActive: true },
    create: {
      code: "CFKTEST",
      discountType: "PERCENT",
      discountValue: 10,
      isActive: true
    }
  });

  // Start isolated Next.js test server with NEXT_DIST_DIR=.next-test on TEST_PORT
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
      ALLOW_DEV_MOBILE_LOGIN: "false",
      RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
      RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "rzp_test_RkX507LjMqteDr",
      RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || "QljFqlEML0mHLqEgKOeztfw8",
      NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_RkX507LjMqteDr"
    },
    stdio: "pipe"
  });

  serverProc.stderr?.on("data", (d) => {
    const s = d.toString();
    if (!s.includes("Fast Refresh") && !s.includes("Compiling")) {
      console.error("[Next Server stderr]:", s.trim());
    }
  });

  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${BASE_URL}/login`, { redirect: "manual" });
      if (res.status === 200 || res.status === 404 || res.status === 307) break;
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log(`Server ready on port ${TEST_PORT}.\n`);

  const matrixResults: MatrixResult[] = [];

  try {
    const cookieAdmin = await createSessionCookie("u_admin_p9", "ADMIN", "admin@p9.local");
    const cookieTeacher = await createSessionCookie("u_teacher_owner_p9", "TEACHER", "teacher_owner@p9.local");
    const cookieFree = await createSessionCookie("u_student_free_p9", "FREE", "student_free@p9.local");
    const cookiePrem = await createSessionCookie("u_student_prem_p9", "PREMIUM", "student_prem@p9.local");

    for (const c of allDefinedCases) {
      if (!c.url || !c.expectedStatus) {
        matrixResults.push({
          id: c.id,
          persona: c.persona,
          methodUrl: `${c.method} ${c.url}`,
          expected: `HTTP ${c.expectedStatus}`,
          actualStatus: "N/A",
          bodyCheck: "NOT IMPLEMENTED",
          status: "NOT IMPLEMENTED"
        });
        continue;
      }

      let cookie = "";
      if (c.url.includes("/api/checkout/coupon/preview") && c.persona === "FREE") {
        // Fresh user per coupon preview test so rate limiter limit (10/min) is tested cleanly per case
        cookie = await createSessionCookie(`u_coupon_free_${c.id}`, "FREE", `coupon_${c.id}@p9.local`);
      } else if (c.id === "J3-16") {
        // Fresh premium user for J3-16 order with coupon
        const j316UserId = `u_student_prem_j316_${Date.now()}`;
        await prisma.user.upsert({
          where: { id: j316UserId },
          update: { role: "PREMIUM" },
          create: { id: j316UserId, email: `prem_${Date.now()}@p9.local`, role: "PREMIUM", name: "Prem J316" }
        });
        cookie = await createSessionCookie(j316UserId, "PREMIUM", `prem_${Date.now()}@p9.local`);
      } else if (c.persona === "ADMIN") cookie = cookieAdmin;
      else if (c.persona === "TEACHER") cookie = cookieTeacher;
      else if (c.persona === "PREMIUM") cookie = cookiePrem;
      else if (c.persona === "FREE") cookie = cookieFree;

      const headers: Record<string, string> = {
        "Host": `127.0.0.1:${TEST_PORT}`,
        ...(cookie ? { Cookie: cookie } : {}),
        ...(c.customHeaders || {})
      };

      // Dynamically resolve Next-Action hash if manifest exists
      if (headers["Next-Action"]) {
        try {
          const manifestPath = ".next-test/server/server-reference-manifest.json";
          if (fs.existsSync(manifestPath)) {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
            // Look for checkout action hash
            for (const [hash, val] of Object.entries<any>(manifest.node)) {
              if (val.workers && val.workers["app/checkout/page"]) {
                // The checkout server action is createOrderAction (second export or checking id)
                // Let's check page.js or use the known hash for createOrderAction
                // In .next-test build: 4064d20105af421290a8129b6959d6e62902951b20 is createOrderAction
                if (hash.startsWith("4064d2") || hash.startsWith("400bb2")) {
                  headers["Next-Action"] = hash;
                  break;
                }
              }
            }
            // If hash is still hardcoded old hash and not in manifest, map to current createOrderAction hash
            if (headers["Next-Action"] === "400bb25523ed3fd00de26424b1fd586bf53fbbfd13" && manifest.node["4064d20105af421290a8129b6959d6e62902951b20"]) {
              headers["Next-Action"] = "4064d20105af421290a8129b6959d6e62902951b20";
            }
          }
        } catch {}
      }

      let body: any = undefined;
      if (c.method !== "GET" && c.method !== "HEAD") {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(c.bodyPayload || {});
      }

      let actualStatus = 0;
      let bodyText = "";
      try {
        const res = await fetch(`${BASE_URL}${c.url}`, {
          method: c.method,
          headers,
          body,
          redirect: "manual"
        });
        actualStatus = res.status;
        bodyText = await res.text().catch(() => "");
      } catch (err: any) {
        actualStatus = 0;
        bodyText = err.message;
      }

      let bodyOk = true;
      let bodyCheckMsg = "OK";
      if (c.expectedBodySnippet) {
        if (!bodyText.includes(c.expectedBodySnippet)) {
          bodyOk = false;
          bodyCheckMsg = `Missing: "${c.expectedBodySnippet}"`;
        }
      }
      if (c.forbiddenBodySnippet) {
        if (bodyText.includes(c.forbiddenBodySnippet)) {
          bodyOk = false;
          bodyCheckMsg = `Leaked: "${c.forbiddenBodySnippet}"`;
        }
      }

      const statusOk = actualStatus === c.expectedStatus;
      const isPass = statusOk && bodyOk;

      matrixResults.push({
        id: c.id,
        persona: c.persona,
        methodUrl: `${c.method} ${c.url}`,
        expected: `HTTP ${c.expectedStatus}`,
        actualStatus: `HTTP ${actualStatus}`,
        bodyCheck: bodyCheckMsg,
        status: isPass ? "PASS" : "FAIL"
      });
    }

    console.log("\n=========================================================================");
    console.log("=== ALL QA MATRIX FAILURES ===");
    console.log("=========================================================================");
    const failedList = matrixResults.filter(r => r.status !== "PASS");
    console.table(failedList);

    console.log("\n=========================================================================");
    console.log("=== FULL QA MATRIX RESULTS TABLE (ALL 310 CASES) ===");
    console.log("=========================================================================");
    console.log("id       | method url                                  | expected | actual   | PASS/FAIL");
    console.log("---------+---------------------------------------------+----------+----------+----------");
    for (const r of matrixResults) {
      console.log(`${r.id.padEnd(8)} | ${r.methodUrl.padEnd(43)} | ${r.expected.padEnd(8)} | ${r.actualStatus.padEnd(8)} | ${r.status}`);
    }

    const totalCases = matrixResults.length;
    const passedCases = matrixResults.filter(r => r.status === "PASS").length;
    const failedCases = matrixResults.filter(r => r.status === "FAIL").length;
    const notImplementedCases = matrixResults.filter(r => r.status === "NOT IMPLEMENTED").length;

    console.log("\n=========================================================================");
    console.log(`QA Matrix Summary: ${passedCases} PASSED, ${failedCases} FAILED, ${notImplementedCases} NOT IMPLEMENTED, ${totalCases} TOTAL.`);
    console.log("=========================================================================\n");

  } finally {
    serverProc.kill("SIGTERM");
  }

  // Timestamp-based dev DB isolation check after run
  console.log("--- DEV DB TIMESTAMP ISOLATION CHECK ---");
  const postRunTables = await devPrisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  `) as any[];

  let newRowsCount = 0;
  const newRowDetails: any[] = [];

  for (const t of postRunTables) {
    const table = t.table_name;
    const cols = await devPrisma.$queryRawUnsafe(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = $1 AND column_name IN ('createdAt', 'enrolledAt')
    `, table) as any[];

    for (const c of cols) {
      const colName = c.column_name;
      const rows = await devPrisma.$queryRawUnsafe(`
        SELECT count(*)::int as cnt FROM "${table}" 
        WHERE "${colName}" > $1
      `, runStartTime) as any[];
      if (rows[0].cnt > 0) {
        newRowsCount += rows[0].cnt;
        newRowDetails.push({ table, col: colName, count: rows[0].cnt });
      }
    }
  }

  console.log(`New dev DB rows created since test start (${runStartTime.toISOString()}): ${newRowsCount}`);
  if (newRowsCount > 0) {
    console.error("DEV DB POLLUTION DETECTED:", newRowDetails);
  } else {
    console.log("DEV DB ISOLATION PRESERVED: YES (0 rows created during test run)");
  }

  await devPrisma.$disconnect();
  await prisma.$disconnect();
}

run().catch((err) => {
  console.error("Runner FATAL:", err);
  process.exit(1);
});
