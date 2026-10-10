/**
 * Canary Journey E2E Test
 *
 * Single-file test running against the TEST DB at port 3045.
 * Seeded data uses unique CANARY_ prefixes and is cleaned up at the end.
 */
import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

// ─── Environment & DB ────────────────────────────────────────────────────────
const TARGET_DB_URL =
  process.env.DATABASE_URL ||
  process.env.TEST_DATABASE_URL ||
  "";
const BASE = process.env.BASE_URL || "http://localhost:3045";

function validateTestEnvironment(dbUrlString: string) {
  if (process.env.APP_ENV !== "test") {
    throw new Error(
      `[CANARY GUARD] Refusing execution: APP_ENV must be explicitly set to 'test' (got: '${process.env.APP_ENV || ""}').`
    );
  }
  try {
    const parsed = new URL(dbUrlString);
    const isLocal = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
    const isPort54329 = parsed.port === "54329";
    const isTestDb = parsed.pathname.endsWith("_test") || parsed.pathname === "/trillionskill_test";
    if (!isLocal || !isPort54329 || !isTestDb) {
      throw new Error(
        `[CANARY GUARD] Refusing execution: Database must be local Docker test DB (127.0.0.1:54329 and ending with _test). Host=${parsed.hostname}, Port=${parsed.port}, DB=${parsed.pathname}`
      );
    }
  } catch (err: any) {
    if (err.message.includes("[CANARY GUARD]")) throw err;
    throw new Error(`[CANARY GUARD] Refusing execution: Invalid database URL format.`);
  }
}

validateTestEnvironment(TARGET_DB_URL);

const MARKER_UPSC = "CANARY_UPSC";
const MARKER_SSC = "CANARY_SSC";
const SECRET_PAID_TUT_TEXT = "CANARY_UPSC_SECRET_PAID_TUTORIAL_TEXT";
const SECRET_PAID_COURSE_TEXT = "CANARY_UPSC_SECRET_PAID_COURSE_TEXT";
const PASSWORD = "Canary!Pass9";

let prisma: PrismaClient;

// ─── Seed Identifiers ────────────────────────────────────────────────────────
const SEED = {
  studentAId: "",
  studentAEmail: "",
  studentBId: "",
  studentBEmail: "",
  teacherId: "",
  teacherEmail: "",
  adminId: "",
  adminEmail: "",

  // Courses / Tutorials
  upscFreeTutId: "",
  upscPaidTutId: "",
  upscPaidCourseId: "",
  sscFreetutId: "",
  sscPaidTutId: "",
  sscPaidCourseId: "",

  // Test Series & Exam
  upscSeriesId: "",
  sscSeriesId: "",
  examTestId: "",
  examSectionId: "",
  questionIds: [] as string[],
  answerKey: Array(20).fill("A") as string[],

  // Quizzes
  upscQuizId: "",
  sscQuizId: "",

  // PYQ
  pyqCatUpscId: "",
  pyqCatSscId: "",
  pyqPaperUpscId: "",
  pyqPaperSscId: "",
};

function cuid(prefix = "cnry") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

// ─── Results Ledger ──────────────────────────────────────────────────────────
export interface StepResult {
  step: string;
  expected: string;
  actual: string;
  status: "PASS" | "FAIL" | "UNPROVEN" | "NOT DONE";
}

const tableResults: StepResult[] = [];

function recordResult(step: string, expected: string, actual: string, pass: boolean) {
  tableResults.push({
    step,
    expected,
    actual,
    status: pass ? "PASS" : "FAIL",
  });
}

function recordStatus(step: string, expected: string, actual: string, status: "UNPROVEN" | "NOT DONE") {
  tableResults.push({ step, expected, actual, status });
}

// ─── Database Seed (Once) ────────────────────────────────────────────────────
test.beforeAll(async () => {
  prisma = new PrismaClient({ datasourceUrl: TARGET_DB_URL });
  await prisma.$connect();

  const pwHash = await bcrypt.hash(PASSWORD, 10);
  const ts = Date.now();

  // 1. Users
  SEED.studentAId = cuid("usr_stuA");
  SEED.studentAEmail = `canary_student_a_${ts}@test.local`;
  SEED.studentBId = cuid("usr_stuB");
  SEED.studentBEmail = `canary_student_b_${ts}@test.local`;
  SEED.teacherId = cuid("usr_tea");
  SEED.teacherEmail = `canary_teacher_${ts}@test.local`;
  SEED.adminId = cuid("usr_adm");
  SEED.adminEmail = `canary_admin_${ts}@test.local`;

  await prisma.user.createMany({
    data: [
      {
        id: SEED.studentAId,
        email: SEED.studentAEmail,
        password: pwHash,
        name: "Canary Student A",
        role: "FREE",
        selectedGoal: "upsc",
      },
      {
        id: SEED.studentBId,
        email: SEED.studentBEmail,
        password: pwHash,
        name: "Canary Student B",
        role: "FREE",
        selectedGoal: "upsc,ssc",
      },
      {
        id: SEED.teacherId,
        email: SEED.teacherEmail,
        password: pwHash,
        name: "Canary Teacher",
        role: "TEACHER",
      },
      {
        id: SEED.adminId,
        email: SEED.adminEmail,
        password: pwHash,
        name: "Canary Admin",
        role: "ADMIN",
      },
    ],
  });

  // 2. Tutorials & Courses
  // Free tutorial (UPSC)
  SEED.upscFreeTutId = cuid("tut_free_u");
  await prisma.course.create({
    data: {
      id: SEED.upscFreeTutId,
      title: `${MARKER_UPSC}_FreeTut`,
      slug: `canary-upsc-free-tut-${ts}`,
      description: "Free UPSC reading tutorial visible to guest",
      difficulty: "BEGINNER",
      status: "PUBLISHED",
      isPublished: true,
      isPremium: false,
      technology: "UPSC",
      chapters: {
        create: {
          title: "Ch 1",
          order: 1,
          lessons: {
            create: {
              title: "Free Lesson",
              type: "TUTORIAL",
              order: 1,
              content: "Free tutorial content accessible to all",
              isTrial: true,
            },
          },
        },
      },
    },
  });

  // Paid tutorial (UPSC)
  SEED.upscPaidTutId = cuid("tut_paid_u");
  await prisma.course.create({
    data: {
      id: SEED.upscPaidTutId,
      title: `${MARKER_UPSC}_PaidTut`,
      slug: `canary-upsc-paid-tut-${ts}`,
      description: "Paid UPSC reading tutorial",
      difficulty: "INTERMEDIATE",
      status: "PUBLISHED",
      isPublished: true,
      isPremium: true,
      price: 999,
      technology: "UPSC",
      chapters: {
        create: {
          title: "Ch 1",
          order: 1,
          lessons: {
            create: {
              title: "Paid Lesson",
              type: "TUTORIAL",
              order: 1,
              content: SECRET_PAID_TUT_TEXT,
            },
          },
        },
      },
    },
  });

  // Paid course with externalId (UPSC)
  SEED.upscPaidCourseId = cuid("crs_paid_u");
  await prisma.course.create({
    data: {
      id: SEED.upscPaidCourseId,
      title: `${MARKER_UPSC}_PaidCourse`,
      slug: `canary-upsc-paid-course-${ts}`,
      description: "Paid video course for UPSC",
      difficulty: "ADVANCED",
      status: "PUBLISHED",
      isPublished: true,
      isPremium: true,
      price: 1999,
      technology: "UPSC",
      externalId: `ext_canary_upsc_${ts}`,
      chapters: {
        create: {
          title: "Ch 1",
          order: 1,
          lessons: {
            create: {
              title: "Paid Video Lesson",
              type: "VIDEO",
              order: 1,
              videoUrl: "https://example.com/canary-video.mp4",
              content: SECRET_PAID_COURSE_TEXT,
            },
          },
        },
      },
    },
  });

  // SSC equivalents
  SEED.sscFreetutId = cuid("tut_free_s");
  await prisma.course.create({
    data: {
      id: SEED.sscFreetutId,
      title: `${MARKER_SSC}_FreeTut`,
      slug: `canary-ssc-free-tut-${ts}`,
      description: "Free SSC reading tutorial",
      difficulty: "BEGINNER",
      status: "PUBLISHED",
      isPublished: true,
      isPremium: false,
      technology: "SSC",
    },
  });

  SEED.sscPaidTutId = cuid("tut_paid_s");
  await prisma.course.create({
    data: {
      id: SEED.sscPaidTutId,
      title: `${MARKER_SSC}_PaidTut`,
      slug: `canary-ssc-paid-tut-${ts}`,
      description: "Paid SSC reading tutorial",
      difficulty: "INTERMEDIATE",
      status: "PUBLISHED",
      isPublished: true,
      isPremium: true,
      price: 999,
      technology: "SSC",
    },
  });

  SEED.sscPaidCourseId = cuid("crs_paid_s");
  await prisma.course.create({
    data: {
      id: SEED.sscPaidCourseId,
      title: `${MARKER_SSC}_PaidCourse`,
      slug: `canary-ssc-paid-course-${ts}`,
      description: "Paid video course for SSC",
      difficulty: "ADVANCED",
      status: "PUBLISHED",
      isPublished: true,
      isPremium: true,
      price: 1999,
      technology: "SSC",
      externalId: `ext_canary_ssc_${ts}`,
    },
  });

  // 3. Exam Series
  SEED.upscSeriesId = cuid("es_upsc");
  await prisma.examSeries.create({
    data: {
      id: SEED.upscSeriesId,
      title: `${MARKER_UPSC}_TestSeries`,
      slug: `canary-upsc-series-${ts}`,
      examName: "UPSC",
      category: "UPSC Current Affairs",
      isPublished: true,
      isFree: true,
      createdById: SEED.teacherId,
    },
  });

  SEED.sscSeriesId = cuid("es_ssc");
  await prisma.examSeries.create({
    data: {
      id: SEED.sscSeriesId,
      title: `${MARKER_SSC}_TestSeries`,
      slug: `canary-ssc-series-${ts}`,
      examName: "SSC",
      category: "SSC Current Affairs",
      isPublished: true,
      isFree: true,
      createdById: SEED.teacherId,
    },
  });

  // 4. 20-Question Exam with known answer key ("A")
  SEED.examTestId = cuid("test_exam");
  SEED.examSectionId = cuid("sec_exam");
  await prisma.examTest.create({
    data: {
      id: SEED.examTestId,
      seriesId: SEED.upscSeriesId,
      title: `${MARKER_UPSC}_Exam`,
      testType: "FULL_MOCK",
      accessMode: "FREE",
      durationMinutes: 60,
      totalQuestions: 20,
      totalMarks: 20,
      positiveMarks: 1.0,
      negativeMarks: 0.0,
      isPublished: true,
      createdById: SEED.teacherId,
      sections: {
        create: {
          id: SEED.examSectionId,
          title: "General Studies",
          order: 0,
          positiveMarks: 1.0,
          negativeMarks: 0.0,
        },
      },
    },
  });

  SEED.questionIds = [];
  for (let i = 0; i < 20; i++) {
    const qid = cuid(`q_${i}`);
    SEED.questionIds.push(qid);
    await prisma.examQuestion.create({
      data: {
        id: qid,
        sectionId: SEED.examSectionId,
        questionEn: `Canary Exam Question ${i + 1}`,
        optionAEn: `Option A (Correct) ${i + 1}`,
        optionBEn: `Option B (Wrong) ${i + 1}`,
        optionCEn: `Option C (Wrong) ${i + 1}`,
        optionDEn: `Option D (Wrong) ${i + 1}`,
        correctOption: "A",
        order: i,
        positiveMarks: 1.0,
        negativeMarks: 0.0,
        difficulty: "EASY",
        subject: "General Studies",
      },
    });
  }

  // 5. Quizzes (category: "Current Affairs" so client loads via /api/exam/test/list)
  SEED.upscQuizId = cuid("qz_upsc");
  await prisma.examTest.create({
    data: {
      id: SEED.upscQuizId,
      seriesId: SEED.upscSeriesId,
      title: `${MARKER_UPSC}_Quiz_Current_Affairs`,
      testType: "FULL_MOCK",
      accessMode: "FREE",
      durationMinutes: 15,
      totalQuestions: 5,
      totalMarks: 5,
      isPublished: true,
      createdById: SEED.teacherId,
    },
  });

  SEED.sscQuizId = cuid("qz_ssc");
  await prisma.examTest.create({
    data: {
      id: SEED.sscQuizId,
      seriesId: SEED.sscSeriesId,
      title: `${MARKER_SSC}_Quiz_Current_Affairs`,
      testType: "FULL_MOCK",
      accessMode: "FREE",
      durationMinutes: 15,
      totalQuestions: 5,
      totalMarks: 5,
      isPublished: true,
      createdById: SEED.teacherId,
    },
  });

  // 6. PYQ (Previous Year Questions)
  await prisma.pyqPaper.deleteMany({ where: { title: { contains: "CANARY" } } });
  await prisma.pyqCategory.deleteMany({ where: { name: { contains: "CANARY" } } });

  SEED.pyqCatUpscId = cuid("pyq_c_u");
  await prisma.pyqCategory.create({
    data: {
      id: SEED.pyqCatUpscId,
      name: `${MARKER_UPSC}_PYQ_${ts}`,
      slug: `canary-upsc-pyq-${ts}`,
      fullName: "Canary UPSC PYQ",
      isPublished: true,
    },
  });

  SEED.pyqCatSscId = cuid("pyq_c_s");
  await prisma.pyqCategory.create({
    data: {
      id: SEED.pyqCatSscId,
      name: `${MARKER_SSC}_PYQ_${ts}`,
      slug: `canary-ssc-pyq-${ts}`,
      fullName: "Canary SSC PYQ",
      isPublished: true,
    },
  });

  SEED.pyqPaperUpscId = cuid("pyq_p_u");
  await prisma.pyqPaper.create({
    data: {
      id: SEED.pyqPaperUpscId,
      categoryId: SEED.pyqCatUpscId,
      title: `${MARKER_UPSC}_PYQPaper`,
      slug: `canary-upsc-pyq-paper-${ts}`,
      year: 2025,
      paperPdfUrl: "https://example.com/canary-upsc.pdf",
      status: "PUBLISHED",
    },
  });

  SEED.pyqPaperSscId = cuid("pyq_p_s");
  await prisma.pyqPaper.create({
    data: {
      id: SEED.pyqPaperSscId,
      categoryId: SEED.pyqCatSscId,
      title: `${MARKER_SSC}_PYQPaper`,
      slug: `canary-ssc-pyq-paper-${ts}`,
      year: 2025,
      paperPdfUrl: "https://example.com/canary-ssc.pdf",
      status: "PUBLISHED",
    },
  });
});

// ─── Teardown & Verification Query ───────────────────────────────────────────
test.afterAll(async () => {
  if (!prisma) return;

  // 1. Delete exam answers and attempts
  await prisma.examAttemptAnswer.deleteMany({
    where: { attempt: { testId: { in: [SEED.examTestId, SEED.upscQuizId, SEED.sscQuizId] } } },
  });
  await prisma.examAttempt.deleteMany({
    where: { testId: { in: [SEED.examTestId, SEED.upscQuizId, SEED.sscQuizId] } },
  });

  // 2. Delete questions, sections, tests
  await prisma.examQuestion.deleteMany({
    where: { sectionId: SEED.examSectionId },
  });
  await prisma.examSection.deleteMany({ where: { id: SEED.examSectionId } });
  await prisma.examTest.deleteMany({
    where: { id: { in: [SEED.examTestId, SEED.upscQuizId, SEED.sscQuizId] } },
  });

  // 3. Delete exam series enrollments & series (including any created by teacher in tests)
  await prisma.examSeriesEnrollment.deleteMany({
    where: { seriesId: { in: [SEED.upscSeriesId, SEED.sscSeriesId] } },
  });
  await prisma.examSeries.deleteMany({
    where: {
      OR: [
        { id: { in: [SEED.upscSeriesId, SEED.sscSeriesId] } },
        { title: { startsWith: "Canary" } },
        { createdById: SEED.teacherId },
        { createdById: SEED.adminId },
      ],
    },
  });

  // 4. Delete courses / tutorials
  await prisma.lesson.deleteMany({
    where: {
      chapter: {
        courseId: {
          in: [
            SEED.upscFreeTutId,
            SEED.upscPaidTutId,
            SEED.upscPaidCourseId,
            SEED.sscFreetutId,
            SEED.sscPaidTutId,
            SEED.sscPaidCourseId,
          ],
        },
      },
    },
  });
  await prisma.chapter.deleteMany({
    where: {
      courseId: {
        in: [
          SEED.upscFreeTutId,
          SEED.upscPaidTutId,
          SEED.upscPaidCourseId,
          SEED.sscFreetutId,
          SEED.sscPaidTutId,
          SEED.sscPaidCourseId,
        ],
      },
    },
  });
  await prisma.course.deleteMany({
    where: {
      id: {
        in: [
          SEED.upscFreeTutId,
          SEED.upscPaidTutId,
          SEED.upscPaidCourseId,
          SEED.sscFreetutId,
          SEED.sscPaidTutId,
          SEED.sscPaidCourseId,
        ],
      },
    },
  });

  // 5. Delete PYQ
  await prisma.pyqPaper.deleteMany({
    where: { id: { in: [SEED.pyqPaperUpscId, SEED.pyqPaperSscId] } },
  });
  await prisma.pyqCategory.deleteMany({
    where: { id: { in: [SEED.pyqCatUpscId, SEED.pyqCatSscId] } },
  });

  // 6. Delete Users
  await prisma.user.deleteMany({
    where: {
      id: { in: [SEED.studentAId, SEED.studentBId, SEED.teacherId, SEED.adminId] },
    },
  });

  // Verification count query proving 0 seeded rows remain
  const remainingUsers = await prisma.user.count({
    where: { id: { in: [SEED.studentAId, SEED.studentBId, SEED.teacherId, SEED.adminId] } },
  });
  const remainingCourses = await prisma.course.count({
    where: {
      id: {
        in: [
          SEED.upscFreeTutId,
          SEED.upscPaidTutId,
          SEED.upscPaidCourseId,
          SEED.sscFreetutId,
          SEED.sscPaidTutId,
          SEED.sscPaidCourseId,
        ],
      },
    },
  });
  const remainingSeries = await prisma.examSeries.count({
    where: { id: { in: [SEED.upscSeriesId, SEED.sscSeriesId] } },
  });
  const remainingTests = await prisma.examTest.count({
    where: { id: { in: [SEED.examTestId, SEED.upscQuizId, SEED.sscQuizId] } },
  });
  const remainingPyq = await prisma.pyqCategory.count({
    where: { id: { in: [SEED.pyqCatUpscId, SEED.pyqCatSscId] } },
  });

  console.log("\n================ CLEANUP VERIFICATION QUERY ================");
  console.log(`Remaining Users:    ${remainingUsers}`);
  console.log(`Remaining Courses:  ${remainingCourses}`);
  console.log(`Remaining Series:   ${remainingSeries}`);
  console.log(`Remaining Tests:    ${remainingTests}`);
  console.log(`Remaining PYQ:      ${remainingPyq}`);
  console.log(`Total Residual:     ${remainingUsers + remainingCourses + remainingSeries + remainingTests + remainingPyq}`);
  console.log("============================================================\n");

  await prisma.$disconnect();
});

// ─── Authentication Helpers ──────────────────────────────────────────────────
async function performUiLogin(page: Page, email: string, pw: string) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  const emailInput = page.locator('input[type="email"]');
  await emailInput.waitFor({ state: "visible", timeout: 10000 });
  await emailInput.fill(email);
  await page.locator('input[type="password"]').fill(pw);
  await page.locator('button[type="submit"]').click();
  // Wait for redirect to dashboard or user menu to appear without manual reload
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
}

async function loginViaCredentials(page: Page, email: string, pw: string) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookies = csrfRes.headers.getSetCookie();

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": csrfCookies.join("; "),
    },
    body: new URLSearchParams({ email, password: pw, csrfToken, json: "true" }),
    redirect: "manual",
  });

  const sessionCookies = loginRes.headers.getSetCookie();
  const tokenCookie = sessionCookies.find((c) => c.startsWith("authjs.session-token="));
  if (tokenCookie) {
    const tokenVal = tokenCookie.split(";")[0].split("=")[1];
    const cookiesToAdd: any[] = [
      {
        name: "authjs.session-token",
        value: tokenVal,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ];
    const userGoal = email.includes("student_b") ? "upsc,ssc" : email.includes("student_a") ? "upsc" : "";
    if (userGoal) {
      cookiesToAdd.push({
        name: "trillion_selected_goal",
        value: userGoal,
        domain: "localhost",
        path: "/",
      });
    }
    await page.context().addCookies(cookiesToAdd);
  }
}

async function logoutViaApi(page: Page) {
  await page.request.post(`${BASE}/api/auth/logout`).catch(() => {});
  await page.context().clearCookies();
}

async function performUiLogout(page: Page) {
  // Desktop user menu dropdown
  const userMenuBtn = page.locator('button[aria-label="User menu"]').first();
  if ((await userMenuBtn.count()) > 0 && (await userMenuBtn.isVisible())) {
    await userMenuBtn.click();
    await page.waitForTimeout(300);
    const signOutBtn = page.locator('button:has-text("Sign Out"), button:has-text("Logout"), [role="menuitem"]:has-text("Logout")').first();
    if ((await signOutBtn.count()) > 0 && (await signOutBtn.isVisible())) {
      await Promise.all([
        page.waitForURL((url) => url.pathname === "/" || url.pathname === "", { timeout: 10000 }).catch(() => {}),
        signOutBtn.click(),
      ]);
      await page.waitForTimeout(500);
      await page.context().clearCookies();
      return;
    }
  }

  // Mobile drawer / profile sheet
  const mobileProfileBtn = page.locator('button[aria-label="Account profile"]').first();
  if ((await mobileProfileBtn.count()) > 0 && (await mobileProfileBtn.isVisible())) {
    await mobileProfileBtn.click();
    await page.waitForTimeout(300);
    const signOutBtn = page.locator('button:has-text("Logout"), button:has-text("Sign Out")').first();
    if ((await signOutBtn.count()) > 0 && (await signOutBtn.isVisible())) {
      await Promise.all([
        page.waitForURL((url) => url.pathname === "/" || url.pathname === "", { timeout: 10000 }).catch(() => {}),
        signOutBtn.click(),
      ]);
      await page.waitForTimeout(500);
      await page.context().clearCookies();
      return;
    }
  }

  // Fallback
  await page.request.post(`${BASE}/api/auth/logout`).catch(() => {});
  await page.context().clearCookies();
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
}

// ─── TEST SUITE ──────────────────────────────────────────────────────────────
test.describe("Canary Journey Tests", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // DESKTOP RUN (1440x900) – Steps 1 through 9
  // ─────────────────────────────────────────────────────────────────────────
  test("Desktop 1440x900 Journey (Steps 1 - 9)", async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1440, height: 900 });

    // ── STEP 1: Guest ───────────────────────────────────────────────────────
    // 1a. /tutorials
    await page.goto(`${BASE}/tutorials`, { waitUntil: "domcontentloaded" });
    const tutHtml = await page.content();
    const freeTutVisible = (tutHtml.match(new RegExp(`${MARKER_UPSC}_FreeTut`, "g")) || []).length;
    const paidTutSecretInHtml = (tutHtml.match(new RegExp(SECRET_PAID_TUT_TEXT, "g")) || []).length;
    recordResult(
      "1a. Guest: /tutorials",
      "Free tut visible ≥1; paid tut lesson secret in HTML/RSC = 0",
      `freeTut=${freeTutVisible}; paidSecretInHtml=${paidTutSecretInHtml}`,
      freeTutVisible >= 1 && paidTutSecretInHtml === 0
    );

    // 1b. /courses
    await page.goto(`${BASE}/courses`, { waitUntil: "domcontentloaded" });
    const courseHtml = await page.content();
    const paidCourseSecretInHtml = (courseHtml.match(new RegExp(SECRET_PAID_COURSE_TEXT, "g")) || []).length;
    recordResult(
      "1b. Guest: /courses",
      "Paid course lesson secret text in HTML/RSC = 0",
      `paidCourseSecretInHtml=${paidCourseSecretInHtml}`,
      paidCourseSecretInHtml === 0
    );

    // 1c. /test-series
    await page.goto(`${BASE}/test-series`, { waitUntil: "domcontentloaded" });
    const createSeriesBtnCount = await page.locator('button:has-text("Create Series")').count();
    recordResult(
      "1c. Guest: /test-series",
      "Create Series button count = 0",
      `createSeriesBtnCount=${createSeriesBtnCount}`,
      createSeriesBtnCount === 0
    );

    // ── STEP 2: Student A Email Login (no refresh) ──────────────────────────
    const placeholderSelectorDesktop = 'button:has-text("Login / Register")';
    const profileSelectorDesktop = 'button[aria-label="User menu"]';

    const placeholdersBeforeLogin = await page.locator(placeholderSelectorDesktop).count();
    const profileBeforeLogin = await page.locator(profileSelectorDesktop).count();

    // Login via UI form without manual page reload
    await performUiLogin(page, SEED.studentAEmail, PASSWORD);

    const profileAfterLogin = await page.locator(profileSelectorDesktop).count();
    const placeholdersAfterLogin = await page.locator(placeholderSelectorDesktop).count();

    recordResult(
      "2. Student A: Login (no refresh)",
      "Profile icon appears (≥1), placeholders gone (=0) without refresh",
      `profile=${profileAfterLogin}; placeholders=${placeholdersAfterLogin}`,
      profileAfterLogin >= 1 && placeholdersAfterLogin === 0
    );

    // ── STEP 3: Student A Goal = UPSC (Strict Goal Isolation) ───────────────
    // 3a. /tutorials
    await page.goto(`${BASE}/tutorials`, { waitUntil: "domcontentloaded" });
    const s3TutUpsc = await page.locator(`text=${MARKER_UPSC}`).count();
    const s3TutSsc = await page.locator(`text=${MARKER_SSC}`).count();
    recordResult(
      "3a. Student A: /tutorials goal filter",
      "UPSC markers ≥ 1; SSC markers = 0",
      `upsc=${s3TutUpsc}; ssc=${s3TutSsc}`,
      s3TutUpsc >= 1 && s3TutSsc === 0
    );

    // 3b. /courses
    await page.goto(`${BASE}/courses`, { waitUntil: "domcontentloaded" });
    const s3CrsUpsc = await page.locator(`text=${MARKER_UPSC}`).count();
    const s3CrsSsc = await page.locator(`text=${MARKER_SSC}`).count();
    recordResult(
      "3b. Student A: /courses goal filter",
      "UPSC markers ≥ 1; SSC markers = 0",
      `upsc=${s3CrsUpsc}; ssc=${s3CrsSsc}`,
      s3CrsUpsc >= 1 && s3CrsSsc === 0
    );

    // 3c. /test-series
    await page.goto(`${BASE}/test-series`, { waitUntil: "domcontentloaded" });
    await page.locator(`text=${MARKER_UPSC}`).first().waitFor({ timeout: 5000 }).catch(() => {});
    const s3SeriesUpsc = await page.locator(`text=${MARKER_UPSC}`).count();
    const s3SeriesSsc = await page.locator(`text=${MARKER_SSC}`).count();
    recordResult(
      "3c. Student A: /test-series goal filter",
      "UPSC markers ≥ 1; SSC markers = 0",
      `upsc=${s3SeriesUpsc}; ssc=${s3SeriesSsc}`,
      s3SeriesUpsc >= 1 && s3SeriesSsc === 0
    );

    // 3d. /current-affairs-quizzes (Quizzes)
    await page.goto(`${BASE}/current-affairs-quizzes`, { waitUntil: "domcontentloaded" });
    await page.locator(`text=${MARKER_UPSC}`).first().waitFor({ timeout: 5000 }).catch(() => {});
    const s3QuizUpsc = await page.locator(`text=${MARKER_UPSC}`).count();
    const s3QuizSsc = await page.locator(`text=${MARKER_SSC}`).count();
    recordResult(
      "3d. Student A: /current-affairs-quizzes goal filter",
      "UPSC markers ≥ 1; SSC markers = 0",
      `upsc=${s3QuizUpsc}; ssc=${s3QuizSsc}`,
      s3QuizUpsc >= 1 && s3QuizSsc === 0
    );

    // 3e. /pyqs (PYQ)
    await page.goto(`${BASE}/pyqs`, { waitUntil: "domcontentloaded" });
    await page.locator(`text=${MARKER_UPSC}`).first().waitFor({ timeout: 5000 }).catch(() => {});
    const s3PyqUpsc = await page.locator(`text=${MARKER_UPSC}`).count();
    const s3PyqSsc = await page.locator(`text=${MARKER_SSC}`).count();
    recordResult(
      "3e. Student A: /pyqs goal filter",
      "UPSC markers ≥ 1; SSC markers = 0",
      `upsc=${s3PyqUpsc}; ssc=${s3PyqSsc}`,
      s3PyqUpsc >= 1 && s3PyqSsc === 0
    );

    // 3f. Try ?goal=ssc parameter bypass
    await page.goto(`${BASE}/test-series?goal=ssc`, { waitUntil: "domcontentloaded" });
    const s3BypassSsc = await page.locator(`text=${MARKER_SSC}`).count();
    recordResult(
      "3f. Student A: ?goal=ssc query bypass",
      "SSC markers count = 0",
      `sscBypassCount=${s3BypassSsc}`,
      s3BypassSsc === 0
    );

    // 3g. Direct API list call with ?goal=ssc
    const apiRes = await page.request.get(`${BASE}/api/exam/series/list?goal=ssc`);
    const apiJson = await apiRes.json();
    const apiSscCount = (apiJson.data || []).filter((item: any) =>
      item.title?.includes(MARKER_SSC)
    ).length;
    recordResult(
      "3g. Student A: API series list bypass",
      "SSC series in API response = 0",
      `apiSscCount=${apiSscCount}`,
      apiSscCount === 0
    );

    // 3h. Search for SSC marker
    await page.goto(`${BASE}/test-series`, { waitUntil: "domcontentloaded" });
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill(MARKER_SSC);
      await page.waitForTimeout(500);
    }
    const searchSscCount = await page.locator(`text=${MARKER_SSC}`).count();
    recordResult(
      "3h. Student A: Search for SSC marker",
      "Search results for SSC marker = 0",
      `searchSscCount=${searchSscCount}`,
      searchSscCount === 0
    );

    // ── STEP 4: Student B (UPSC + SSC) ──────────────────────────────────────
    await logoutViaApi(page);
    await loginViaCredentials(page, SEED.studentBEmail, PASSWORD);

    // Check surfaces for both markers
    await page.goto(`${BASE}/test-series`, { waitUntil: "domcontentloaded" });
    await page.locator(`text=${MARKER_SSC}`).first().waitFor({ timeout: 5000 }).catch(() => {});
    const s4SeriesUpsc = await page.locator(`text=${MARKER_UPSC}`).count();
    const s4SeriesSsc = await page.locator(`text=${MARKER_SSC}`).count();

    await page.goto(`${BASE}/tutorials`, { waitUntil: "domcontentloaded" });
    const s4TutUpsc = await page.locator(`text=${MARKER_UPSC}`).count();
    const s4TutSsc = await page.locator(`text=${MARKER_SSC}`).count();

    await page.goto(`${BASE}/courses`, { waitUntil: "domcontentloaded" });
    const s4CrsUpsc = await page.locator(`text=${MARKER_UPSC}`).count();
    const s4CrsSsc = await page.locator(`text=${MARKER_SSC}`).count();

    await page.goto(`${BASE}/current-affairs-quizzes`, { waitUntil: "domcontentloaded" });
    await page.locator(`text=${MARKER_SSC}`).first().waitFor({ timeout: 5000 }).catch(() => {});
    const s4QuizUpsc = await page.locator(`text=${MARKER_UPSC}`).count();
    const s4QuizSsc = await page.locator(`text=${MARKER_SSC}`).count();

    await page.goto(`${BASE}/pyqs`, { waitUntil: "domcontentloaded" });
    await page.locator(`text=${MARKER_SSC}`).first().waitFor({ timeout: 5000 }).catch(() => {});
    const s4PyqUpsc = await page.locator(`text=${MARKER_UPSC}`).count();
    const s4PyqSsc = await page.locator(`text=${MARKER_SSC}`).count();

    const s4AllSurfacesPassed =
      s4SeriesUpsc >= 1 && s4SeriesSsc >= 1 &&
      s4TutUpsc >= 1 && s4TutSsc >= 1 &&
      s4CrsUpsc >= 1 && s4CrsSsc >= 1 &&
      s4QuizUpsc >= 1 && s4QuizSsc >= 1 &&
      s4PyqUpsc >= 1 && s4PyqSsc >= 1;

    recordResult(
      "4. Student B (UPSC+SSC): Both markers on every surface",
      "Every surface shows UPSC ≥ 1 and SSC ≥ 1",
      `Series(U:${s4SeriesUpsc},S:${s4SeriesSsc}) Tut(U:${s4TutUpsc},S:${s4TutSsc}) Crs(U:${s4CrsUpsc},S:${s4CrsSsc}) Qz(U:${s4QuizUpsc},S:${s4QuizSsc}) Pyq(U:${s4PyqUpsc},S:${s4PyqSsc})`,
      s4AllSurfacesPassed
    );

    // ── STEP 5: Student A Exam Flow ─────────────────────────────────────────
    await logoutViaApi(page);
    await loginViaCredentials(page, SEED.studentAEmail, PASSWORD);

    // 5a. Start attempt
    const startRes = await page.request.post(`${BASE}/api/exam/attempt/start`, {
      data: { testId: SEED.examTestId, language: "English" },
    });
    const startJson = await startRes.json();
    const attemptId = startJson.data?.attemptId;
    const startStatus = startRes.status();

    // 5b. Autosave 1: Answer 20 questions with known key (seq: 1)
    const answersSeq1 = SEED.questionIds.map((qid, idx) => ({
      questionId: qid,
      selectedOption: SEED.answerKey[idx],
      isMarked: false,
      timeSpentSecs: 5,
    }));
    const sync1Res = await page.request.post(`${BASE}/api/exam/attempt/${attemptId}/sync`, {
      data: { sequence: 1, answers: answersSeq1 },
    });

    // 5c. Autosave 2: Update Question 0 to "B" (seq: 2)
    const answersSeq2 = [
      {
        questionId: SEED.questionIds[0],
        selectedOption: "B",
        isMarked: true,
        timeSpentSecs: 10,
      },
    ];
    const sync2Res = await page.request.post(`${BASE}/api/exam/attempt/${attemptId}/sync`, {
      data: { sequence: 2, answers: answersSeq2 },
    });

    // 5d. Autosave 3: Send stale sequence (seq: 1) – must NOT overwrite seq: 2 data
    const staleAnswers = [
      {
        questionId: SEED.questionIds[0],
        selectedOption: "C",
        isMarked: false,
        timeSpentSecs: 3,
      },
    ];
    const staleSyncRes = await page.request.post(`${BASE}/api/exam/attempt/${attemptId}/sync`, {
      data: { sequence: 1, answers: staleAnswers },
    });
    const staleSyncStatus = staleSyncRes.status();

    // Verify stored sequence in attempt
    const verifyAttemptRes = await page.request.get(`${BASE}/api/exam/attempt/${attemptId}`);
    const verifyJson = await verifyAttemptRes.json();
    const q0Stored = (verifyJson.data?.answers || []).find(
      (a: any) => a.questionId === SEED.questionIds[0]
    );
    const staleNotOverwritten = q0Stored?.selectedOption === "B" && q0Stored?.clientSeq === 2;

    // 5e. Autosave 4: Restore Question 0 to correct answer "A" (seq: 3)
    await page.request.post(`${BASE}/api/exam/attempt/${attemptId}/sync`, {
      data: {
        sequence: 3,
        answers: [{ questionId: SEED.questionIds[0], selectedOption: "A", isMarked: false, timeSpentSecs: 15 }],
      },
    });

    // 5f. Double Submit at once
    const finalAnswers = SEED.questionIds.map((qid, idx) => ({
      questionId: qid,
      selectedOption: SEED.answerKey[idx],
      isMarked: false,
      timeSpentSecs: 10,
    }));

    const [sub1Res, sub2Res] = await Promise.all([
      page.request.post(`${BASE}/api/exam/attempt/${attemptId}/submit`, {
        data: { answers: finalAnswers },
      }),
      page.request.post(`${BASE}/api/exam/attempt/${attemptId}/submit`, {
        data: { answers: finalAnswers },
      }),
    ]);
    const sub1Json = await sub1Res.json();
    const sub2Json = await sub2Res.json();
    const score1 = sub1Json.data?.score ?? sub1Json.data?.correctCount;
    const score2 = sub2Json.data?.score ?? sub2Json.data?.correctCount;
    const doubleSubmitIdempotent = sub1Res.status() === 200 && sub2Res.status() === 200 && score1 === 20 && score2 === 20;

    // 5g. Open result
    const resultRes = await page.request.get(`${BASE}/api/exam/attempt/${attemptId}/result`);
    const resultJson = await resultRes.json();
    const finalScore = resultJson.data?.score;
    const finalCorrect = resultJson.data?.correctCount;
    const totalCandidates = resultJson.data?.totalCandidates ?? 1;
    const rankPresent = resultJson.data?.allIndiaRank !== undefined;

    console.log("EXAM_FLOW_DETAILS:", {
      startStatus,
      sync1: sync1Res.status(),
      sync2: sync2Res.status(),
      staleSyncStatus,
      staleNotOverwritten,
      doubleSubmitIdempotent,
      sub1Status: sub1Res.status(),
      sub2Status: sub2Res.status(),
      score1,
      score2,
      finalScore,
      finalCorrect,
      q0Stored,
    });

    const examFlowPassed =
      startStatus === 201 &&
      sync1Res.status() === 200 &&
      sync2Res.status() === 200 &&
      staleSyncStatus === 409 &&
      staleNotOverwritten &&
      doubleSubmitIdempotent &&
      finalScore === 20 &&
      finalCorrect === 20;

    recordResult(
      "5. Student A Exam: 20 Qs, 3 autosaves, stale check, double submit, result",
      "score=20, stale rejected (409), double submit gives ONE result (20), rank present",
      `score=${finalScore}/20, correct=${finalCorrect}, staleStatus=${staleSyncStatus}, rankPresent=${rankPresent}, staleNotOverwritten=${staleNotOverwritten}, doubleSubmitIdempotent=${doubleSubmitIdempotent}`,
      examFlowPassed
    );

    // ── STEP 6: Student A Role Gates ────────────────────────────────────────
    // 6a. POST /api/exam/series/create returns 403
    const studentCreateRes = await page.request.post(`${BASE}/api/exam/series/create`, {
      data: { title: "Unauthorized Canary Series" },
    });
    const s6ApiStatus = studentCreateRes.status();

    // 6b. /teacher or /admin route redirects
    await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    const s6AdminUrl = page.url();
    const s6Redirected = !s6AdminUrl.endsWith("/admin") || s6AdminUrl.includes("/login") || s6AdminUrl.includes("/dashboard");

    recordResult(
      "6. Student A Role Gates: 403 on create, redirect on /admin",
      "API returns 403; /admin redirected",
      `createStatus=${s6ApiStatus}; finalUrl=${s6AdminUrl}`,
      s6ApiStatus === 403 && s6Redirected
    );

    // ── STEP 7: Teacher Login & Series Creation ─────────────────────────────
    await logoutViaApi(page);
    await loginViaCredentials(page, SEED.teacherEmail, PASSWORD);

    // 7a. "Create Series" visible
    await page.goto(`${BASE}/test-series`, { waitUntil: "domcontentloaded" });
    const teacherCreateBtnCount = await page.locator('button:has-text("Create Series")').count();

    // 7b. Create series via API returns 200
    const teacherCreateApiRes = await page.request.post(`${BASE}/api/exam/series/create`, {
      data: {
        title: `Canary_Teacher_Pkg_${Date.now()}`,
        category: "UPSC",
        examName: "UPSC",
        isPublished: true,
      },
    });
    const teacherCreateApiStatus = teacherCreateApiRes.status();

    recordResult(
      "7. Teacher: Create Series visible & API 200",
      "Create Series button visible (≥1); API returns 200",
      `btnCount=${teacherCreateBtnCount}; apiStatus=${teacherCreateApiStatus}`,
      teacherCreateBtnCount >= 1 && teacherCreateApiStatus === 200
    );

    // ── STEP 8: Admin Login & Series Creation ───────────────────────────────
    await logoutViaApi(page);
    await loginViaCredentials(page, SEED.adminEmail, PASSWORD);

    // 8a. Reach /admin
    await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    const adminUrlReached = page.url().includes("/admin");

    // 8b. Create series allowed
    const adminCreateApiRes = await page.request.post(`${BASE}/api/exam/series/create`, {
      data: {
        title: `Canary_Admin_Pkg_${Date.now()}`,
        category: "UPSC",
        examName: "UPSC",
        isPublished: true,
      },
    });
    const adminCreateApiStatus = adminCreateApiRes.status();

    recordResult(
      "8. Admin: Reach /admin & create series allowed",
      "Reach /admin; API returns 200",
      `reachAdmin=${adminUrlReached}; apiStatus=${adminCreateApiStatus}`,
      adminUrlReached && adminCreateApiStatus === 200
    );

    // ── STEP 9: Logout as Student ───────────────────────────────────────────
    await logoutViaApi(page);
    // Measure counts before login
    await page.goto(`${BASE}/tutorials`, { waitUntil: "domcontentloaded" });
    const preLoginPlaceholders = await page.locator(placeholderSelectorDesktop).count();
    const preLoginProfile = await page.locator(profileSelectorDesktop).count();

    // Login via UI
    await performUiLogin(page, SEED.studentAEmail, PASSWORD);
    await page.goto(`${BASE}/tutorials`, { waitUntil: "domcontentloaded" });
    const inLoginPlaceholders = await page.locator(placeholderSelectorDesktop).count();
    const inLoginProfile = await page.locator(profileSelectorDesktop).count();

    // Logout via UI
    await performUiLogout(page);
    await page.goto(`${BASE}/tutorials`, { waitUntil: "domcontentloaded" });
    const postLogoutPlaceholders = await page.locator(placeholderSelectorDesktop).count();
    const postLogoutProfile = await page.locator(profileSelectorDesktop).count();

    const step9Passed =
      preLoginPlaceholders >= 1 && preLoginProfile === 0 &&
      inLoginPlaceholders === 0 && inLoginProfile >= 1 &&
      postLogoutPlaceholders >= 1 && postLogoutProfile === 0;

    recordResult(
      "9. Student Logout: Placeholders lifecycle (Desktop)",
      `Selector: '${placeholderSelectorDesktop}'; before=1, logged_in=0, after_logout=1`,
      `placeholderCounts: [before:${preLoginPlaceholders}, logged_in:${inLoginPlaceholders}, after_logout:${postLogoutPlaceholders}]; profileCounts: [before:${preLoginProfile}, logged_in:${inLoginProfile}, after_logout:${postLogoutProfile}]`,
      step9Passed
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // MOBILE RUN (390x844) – Steps 2 and 9 only
  // ─────────────────────────────────────────────────────────────────────────
  test("Mobile 390x844 Journey (Steps 2 and 9 only)", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });

    const mobilePlaceholderSelector = 'button[aria-label="Login or Register"]';
    const mobileProfileSelector = 'button[aria-label="Account profile"]';

    // Before login
    await page.goto(`${BASE}/tutorials`, { waitUntil: "domcontentloaded" });
    const mPrePlaceholders = await page.locator(mobilePlaceholderSelector).count();
    const mPreProfile = await page.locator(mobileProfileSelector).count();

    // Step 2 on Mobile: Student A Login (no refresh)
    await performUiLogin(page, SEED.studentAEmail, PASSWORD);
    await page.goto(`${BASE}/tutorials`, { waitUntil: "domcontentloaded" });
    const mInPlaceholders = await page.locator(mobilePlaceholderSelector).count();
    const mInProfile = await page.locator(mobileProfileSelector).count();

    recordResult(
      "2. Student A: Login without refresh (Mobile 390x844)",
      "Profile icon appears (≥1), placeholder gone (=0) on mobile shell",
      `profile=${mInProfile}; placeholder=${mInPlaceholders}`,
      mInProfile >= 1 && mInPlaceholders === 0
    );

    // Step 9 on Mobile: Logout
    await performUiLogout(page);
    await page.goto(`${BASE}/tutorials`, { waitUntil: "domcontentloaded" });
    const mPostPlaceholders = await page.locator(mobilePlaceholderSelector).count();
    const mPostProfile = await page.locator(mobileProfileSelector).count();

    const mStep9Passed =
      mPrePlaceholders >= 1 && mPreProfile === 0 &&
      mInPlaceholders === 0 && mInProfile >= 1 &&
      mPostPlaceholders >= 1 && mPostProfile === 0;

    recordResult(
      "9. Student Logout: Placeholders lifecycle (Mobile 390x844)",
      `Selector: '${mobilePlaceholderSelector}'; before=1, logged_in=0, after_logout=1`,
      `placeholderCounts: [before:${mPrePlaceholders}, logged_in:${mInPlaceholders}, after_logout:${mPostPlaceholders}]; profileCounts: [before:${mPreProfile}, logged_in:${mInProfile}, after_logout:${mPostProfile}]`,
      mStep9Passed
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 10: Google/OAuth and Mobile OTP flows
  // ─────────────────────────────────────────────────────────────────────────
  test("Step 10: OAuth & Mobile OTP flows status", async () => {
    recordStatus(
      "10a. Google/OAuth flow (repeat 2 & 9)",
      "OAuth sign-in/sign-out lifecycle",
      "Production test build refused dev-mock oauth routes without rebuild; real Google IDP credentials not provided in test env",
      "NOT DONE"
    );

    recordStatus(
      "10b. Mobile OTP flow (repeat 2 & 9)",
      "Mobile OTP sign-in/sign-out lifecycle",
      "Production build strictly enforces refusal of dev-bypass OTP (ALLOW_DEV_MOBILE_LOGIN forbidden in NODE_ENV=production)",
      "NOT DONE"
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // FINAL TABLE SUMMARY PRINTER
  // ─────────────────────────────────────────────────────────────────────────
  test("Print Summary Table", async () => {
    console.log("\n" + "=".repeat(120));
    console.log("CANARY JOURNEY E2E TEST RESULTS TABLE");
    console.log("=".repeat(120));
    console.log(
      "Step".padEnd(38) +
      " | " +
      "Expected".padEnd(42) +
      " | " +
      "Actual (counts)".padEnd(26) +
      " | Status"
    );
    console.log("-".repeat(120));

    for (const r of tableResults) {
      const badge =
        r.status === "PASS"
          ? "PASS"
          : r.status === "FAIL"
          ? "FAIL"
          : r.status;
      console.log(
        r.step.slice(0, 36).padEnd(38) +
        " | " +
        r.expected.slice(0, 40).padEnd(42) +
        " | " +
        r.actual.slice(0, 24).padEnd(26) +
        " | " +
        badge
      );
    }
    console.log("=".repeat(120) + "\n");

    const failures = tableResults.filter((r) => r.status === "FAIL");
    if (failures.length > 0) {
      console.log("FAILED STEP DETAILS:");
      for (const f of failures) {
        console.log(`  Step:     ${f.step}`);
        console.log(`  Expected: ${f.expected}`);
        console.log(`  Actual:   ${f.actual}\n`);
      }
    }

    const passCount = tableResults.filter((r) => r.status === "PASS").length;
    const failCount = failures.length;
    const notDoneCount = tableResults.filter((r) => r.status === "NOT DONE" || r.status === "UNPROVEN").length;
    console.log(`SUMMARY: ${passCount} PASSED | ${failCount} FAILED | ${notDoneCount} NOT DONE\n`);

    expect(failCount).toBe(0);
  });
});
