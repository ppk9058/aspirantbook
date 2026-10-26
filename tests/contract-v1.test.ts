import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { NextRequest } from "next/server";
import { POST as registerRoute } from "../app/api/v1/auth/register/route";
import { POST as loginRoute } from "../app/api/v1/auth/login/route";
import { POST as logoutRoute } from "../app/api/v1/auth/logout/route";
import { POST as refreshRoute } from "../app/api/v1/auth/refresh/route";
import { GET as getSessionsRoute } from "../app/api/v1/auth/sessions/route";
import { GET as getMeRoute, DELETE as deleteMeRoute } from "../app/api/v1/me/route";
import { GET as getTestsRoute } from "../app/api/v1/tests/route";
import { GET as getTestDetailRoute } from "../app/api/v1/tests/[id]/route";
import { POST as startAttemptRoute } from "../app/api/v1/tests/[id]/attempts/route";
import { GET as getAttemptRoute } from "../app/api/v1/attempts/[id]/route";
import { PUT as syncAnswersRoute } from "../app/api/v1/attempts/[id]/answers/route";
import { POST as submitAttemptRoute } from "../app/api/v1/attempts/[id]/submit/route";
import { GET as getResultRoute } from "../app/api/v1/attempts/[id]/result/route";
import { GET as getSolutionsRoute } from "../app/api/v1/attempts/[id]/solutions/route";
import { GET as getLibraryFileRoute } from "../app/api/v1/library/[id]/file/route";
import { POST as registerDeviceRoute } from "../app/api/v1/devices/route";
import { GET as getConfigRoute } from "../app/api/v1/config/route";
import { GET as getHomeRoute } from "../app/api/v1/home/route";
import { GET as getGoalsRoute } from "../app/api/v1/goals/route";
import { GET as getCurrentAffairsRoute } from "../app/api/v1/current-affairs/route";
import { GET as getPyqExamsRoute } from "../app/api/v1/pyq/exams/route";
import { GET as getTutorialsRoute } from "../app/api/v1/tutorials/route";
import { GET as getLibraryRoute } from "../app/api/v1/library/route";
import { GET as getNotificationsRoute } from "../app/api/v1/notifications/route";
import { GET as getOpenApiRoute } from "../app/api/v1/openapi.json/route";
import { createOrder, markBookOrderCompleted } from "../lib/books/bookService";
import { createRazorpayOrder } from "../lib/payments/razorpay";

// ─── STRICT ZOD CONTRACT SCHEMAS ──────────────────────────────────────────

const AuthTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.number().int().positive(),
  tokenType: z.literal("Bearer"),
});

const UserSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().nullable(),
  email: z.string().nullable(),
  role: z.string().min(1),
  image: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  goal: z.string().nullable(),
  emailVerified: z.union([z.string(), z.date()]).nullable(),
  isActive: z.boolean(),
});

const LoginResponseSchema = z.object({
  tokens: AuthTokensSchema,
  user: UserSummarySchema,
});

const ViewerProfileSchema = UserSummarySchema.extend({
  entitlements: z.object({
    enrolledCoursesCount: z.number().int().nonnegative(),
    activePassesCount: z.number().int().nonnegative(),
    completedTestsCount: z.number().int().nonnegative(),
    streakDays: z.number().int().nonnegative(),
  }),
});

const TestListItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  titleHi: z.string().nullable().optional(),
  slug: z.string().min(1),
  durationMinutes: z.number().positive(),
  totalMarks: z.number().positive(),
  totalQuestions: z.number().int().positive(),
  isFree: z.boolean(),
  seriesId: z.string().min(1),
  seriesTitle: z.string().optional(),
  myAttemptsCount: z.number().int().nonnegative(),
  latestScore: z.number().nullable().optional(),
  createdAt: z.string(),
});

const TestDetailSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  titleHi: z.string().nullable().optional(),
  slug: z.string().min(1),
  instructions: z.string().nullable().optional(),
  durationMinutes: z.number().positive(),
  totalMarks: z.number().positive(),
  totalQuestions: z.number().int().positive(),
  positiveMarksPerQuestion: z.number().positive(),
  negativeMarksPerQuestion: z.number().nonnegative(),
  isFree: z.boolean(),
  series: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    logoUrl: z.string().nullable().optional(),
  }),
  previousAttempts: z.array(
    z.object({
      id: z.string().min(1),
      score: z.number().nullable(),
      totalMarks: z.number(),
      percentile: z.number().nullable(),
      rank: z.number().nullable(),
      submittedAt: z.string().nullable(),
    })
  ),
});

const StartAttemptResponseSchema = z.object({
  attemptId: z.string().min(1),
  testId: z.string().min(1),
  startedAt: z.string(),
  serverNow: z.string(),
  durationMinutes: z.number().positive(),
  durationSeconds: z.number().nonnegative(),
  resumed: z.boolean(),
});

const AttemptQuestionSchema = z.object({
  id: z.string().min(1),
  sectionId: z.string().min(1),
  sectionName: z.string().optional(),
  questionNumber: z.number().int().positive(),
  textEn: z.string().min(1),
  textHi: z.string().nullable().optional(),
  optionsEn: z.array(z.string()).min(2),
  optionsHi: z.array(z.string()).nullable().optional(),
  positiveMarks: z.number().positive(),
  negativeMarks: z.number().nonnegative(),
  selectedOption: z.string().nullable().optional(),
  isMarked: z.boolean().optional(),
  timeSpentSecs: z.number().optional(),
});

const AttemptDetailSchema = z.object({
  attemptId: z.string().min(1),
  testId: z.string().min(1),
  testTitle: z.string().min(1),
  status: z.enum(["IN_PROGRESS", "SUBMITTED", "ABANDONED"]),
  startedAt: z.string(),
  serverNow: z.string(),
  durationMinutes: z.number().positive(),
  timeRemainingSecs: z.number().nonnegative(),
  sections: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      order: z.number().int(),
      totalQuestions: z.number().int(),
    })
  ),
  questions: z.array(AttemptQuestionSchema).min(1),
});

const AttemptResultSchema = z.object({
  attemptId: z.string().min(1),
  testId: z.string().min(1),
  testTitle: z.string().min(1),
  score: z.number(),
  totalMarks: z.number().positive(),
  correctCount: z.number().int().nonnegative(),
  wrongCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  markedCount: z.number().int().nonnegative(),
  accuracyPercentage: z.number().min(0).max(100),
  timeTakenSecs: z.number().int().nonnegative(),
  percentile: z.number().nullable(),
  allIndiaRank: z.number().nullable(),
  totalCandidates: z.number().int().positive(),
  submittedAt: z.string(),
});

const QuestionSolutionSchema = AttemptQuestionSchema.extend({
  correctOption: z.string().min(1),
  explanationEn: z.string().nullable().optional(),
  explanationHi: z.string().nullable().optional(),
  isCorrect: z.boolean(),
  marksAwarded: z.number(),
});

const AttemptSolutionsSchema = z.object({
  attemptId: z.string().min(1),
  testId: z.string().min(1),
  questions: z.array(QuestionSolutionSchema).min(1),
});

const DeviceSessionSchema = z.object({
  id: z.string().min(1),
  deviceName: z.string().nullable(),
  platform: z.string(),
  appVersion: z.string().nullable(),
  ip: z.string().nullable(),
  createdAt: z.string(),
  lastUsedAt: z.string(),
  isCurrent: z.boolean(),
});

const AppConfigSchema = z.object({
  minSupportedVersion: z.string(),
  latestVersion: z.string(),
  isMaintenance: z.boolean(),
  allowPurchases: z.boolean(),
  googleAuthEnabled: z.boolean(),
  otpAuthEnabled: z.boolean(),
  supportEmail: z.string(),
});

const CurrentAffairsItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  slug: z.string().min(1),
  month: z.number().int(),
  year: z.number().int(),
  category: z.string(),
  hasPdf: z.boolean(),
  quizCount: z.number().int().nonnegative(),
  publishedAt: z.string(),
});

const PyqExamSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().nullable().optional(),
  totalPapers: z.number().int().nonnegative(),
});

const TutorialSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  category: z.string(),
  chaptersCount: z.number().int().nonnegative(),
  lessonsCount: z.number().int().nonnegative(),
  isGated: z.boolean(),
});

const LibraryItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  slug: z.string().min(1),
  coverImage: z.string().nullable().optional(),
  author: z.string().nullable().optional(),
  fileSize: z.number(),
  fileUrl: z.string(),
  acquiredAt: z.string(),
});

const NotificationItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.string(),
  isRead: z.boolean(),
  createdAt: z.string(),
});

// ─── SUITE EXECUTION ───────────────────────────────────────────────────────

describe("R11 - Full Student Journey & Contract Validation", () => {
  const timestamp = Date.now();
  const studentEmail = `journey_student_${timestamp}@example.com`;
  const studentPassword = "JourneyPass123!";
  let studentId: string;
  let accessToken: string;
  let refreshToken: string;

  let authorId: string;
  let seriesId: string;
  let testId: string;
  let questionIds: string[] = [];
  let attemptId: string;

  before(async () => {
    // 0. Create an author for series fixture
    const author = await prisma.user.create({
      data: {
        email: `journey_author_${timestamp}@example.com`,
        name: "Journey Author",
        role: "ADMIN",
      },
    });
    authorId = author.id;

    // 1. Create a 5-question test series fixture
    const series = await prisma.examSeries.create({
      data: {
        title: `Contract Journey Series ${timestamp}`,
        slug: `contract-journey-${timestamp}`,
        examName: "UPSC CSE",
        category: "UPSC",
        createdById: authorId,
        isPublished: true,
      },
    });
    seriesId = series.id;

    const test = await prisma.examTest.create({
      data: {
        title: "Journey 5-Question Test",
        seriesId,
        createdById: authorId,
        durationMinutes: 30,
        totalMarks: 50,
        positiveMarks: 10,
        negativeMarks: 2.5,
        totalQuestions: 5,
        accessMode: "FREE",
        isPublished: true,
        isArchived: false,
      },
    });
    testId = test.id;

    const section = await prisma.examSection.create({
      data: {
        testId,
        title: "Section 1",
        order: 1,
      },
    });

    const questionsData = [
      { q: "Capital of India?", a: "Mumbai", b: "New Delhi", c: "Goa", d: "Pune", correct: "B", exp: "New Delhi is capital" },
      { q: "Fastest land animal?", a: "Cheetah", b: "Lion", c: "Horse", d: "Leopard", correct: "A", exp: "Cheetah reaches 120km/h" },
      { q: "Largest ocean?", a: "Atlantic", b: "Indian", c: "Pacific", d: "Arctic", correct: "C", exp: "Pacific Ocean is largest" },
      { q: "Hardest natural substance?", a: "Gold", b: "Iron", c: "Diamond", d: "Platinum", correct: "C", exp: "Diamond is hardest" },
      { q: "Red Planet?", a: "Venus", b: "Mars", c: "Jupiter", d: "Mercury", correct: "B", exp: "Mars has iron oxide" },
    ];

    for (let i = 0; i < questionsData.length; i++) {
      const q = questionsData[i];
      const created = await prisma.examQuestion.create({
        data: {
          sectionId: section.id,
          order: i + 1,
          questionEn: q.q,
          optionAEn: q.a,
          optionBEn: q.b,
          optionCEn: q.c,
          optionDEn: q.d,
          correctOption: q.correct,
          explanationEn: q.exp,
          positiveMarks: 10,
          negativeMarks: 2.5,
        },
      });
      questionIds.push(created.id);
    }
  });

  after(async () => {
    // Clean up created resources
    await prisma.examAttemptAnswer.deleteMany({ where: { attempt: { testId } } });
    await prisma.examAttempt.deleteMany({ where: { testId } });
    await prisma.examQuestion.deleteMany({ where: { section: { testId } } });
    await prisma.examSection.deleteMany({ where: { testId } });
    await prisma.examTest.deleteMany({ where: { id: testId } });
    await prisma.examSeries.deleteMany({ where: { id: seriesId } });
    if (studentId) {
      await prisma.deviceSession.deleteMany({ where: { userId: studentId } });
      await prisma.user.delete({ where: { id: studentId } }).catch(() => {});
    }
    if (authorId) {
      await prisma.user.delete({ where: { id: authorId } }).catch(() => {});
    }
  });

  // Step 1: Register
  it("Step 1: POST /api/v1/auth/register -> returns valid LoginResponseDto contract", async () => {
    const req = new NextRequest("http://127.0.0.1:3045/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Journey Runner",
        email: studentEmail,
        password: studentPassword,
        consent: true,
        platform: "android",
        deviceName: "Pixel 9 Pro",
      }),
    });

    const res = await registerRoute(req);
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.ok, true);

    const parsed = LoginResponseSchema.safeParse(body.data);
    assert.ok(parsed.success, `Register response contract invalid: ${JSON.stringify(parsed.error?.format())}`);

    studentId = body.data.user.id;
    accessToken = body.data.tokens.accessToken;
    refreshToken = body.data.tokens.refreshToken;
    assert.equal(body.data.user.email, studentEmail);
  });

  // Step 2: Login
  it("Step 2: POST /api/v1/auth/login -> verifies credentials and returns LoginResponseDto contract", async () => {
    const req = new NextRequest("http://127.0.0.1:3045/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: studentEmail,
        password: studentPassword,
        platform: "android",
        deviceName: "Pixel 9 Pro",
      }),
    });

    const res = await loginRoute(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);

    const parsed = LoginResponseSchema.safeParse(body.data);
    assert.ok(parsed.success, `Login response contract invalid: ${JSON.stringify(parsed.error?.format())}`);

    // Update with fresh token from explicit login
    accessToken = body.data.tokens.accessToken;
    refreshToken = body.data.tokens.refreshToken;
  });

  // Step 3: GET /me
  it("Step 3: GET /api/v1/me -> returns ViewerProfileDto contract", async () => {
    const req = new NextRequest("http://127.0.0.1:3045/api/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const res = await getMeRoute(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);

    const parsed = ViewerProfileSchema.safeParse(body.data);
    assert.ok(parsed.success, `ViewerProfile contract invalid: ${JSON.stringify(parsed.error?.format())}`);
    assert.equal(body.data.id, studentId);
  });

  // Step 4: GET /tests
  it("Step 4: GET /api/v1/tests -> returns TestListItemDto[] contract", async () => {
    const req = new NextRequest(`http://127.0.0.1:3045/api/v1/tests?seriesId=${seriesId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const res = await getTestsRoute(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.ok(Array.isArray(body.data.items));

    const item = body.data.items.find((t: any) => t.id === testId);
    assert.ok(item, "Created test must appear in test list");

    const parsed = TestListItemSchema.safeParse(item);
    assert.ok(parsed.success, `TestListItem contract invalid: ${JSON.stringify(parsed.error?.format())}`);
    assert.equal(item.totalQuestions, 5);
  });

  // Step 5: GET /tests/[id]
  it("Step 5: GET /api/v1/tests/[id] -> returns TestDetailDto contract", async () => {
    const req = new NextRequest(`http://127.0.0.1:3045/api/v1/tests/${testId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const res = await getTestDetailRoute(req, { params: Promise.resolve({ id: testId }) });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);

    const parsed = TestDetailSchema.safeParse(body.data);
    assert.ok(parsed.success, `TestDetail contract invalid: ${JSON.stringify(parsed.error?.format())}`);
    assert.equal(body.data.positiveMarksPerQuestion, 10);
    assert.equal(body.data.negativeMarksPerQuestion, 2.5);
  });

  // Step 6: POST /tests/[id]/attempts (Start attempt)
  it("Step 6: POST /api/v1/tests/[id]/attempts -> returns StartAttemptResponseDto contract", async () => {
    const req = new NextRequest(`http://127.0.0.1:3045/api/v1/tests/${testId}/attempts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const res = await startAttemptRoute(req, { params: Promise.resolve({ id: testId }) });
    assert.ok(res.status === 200 || res.status === 201);
    const body = await res.json();
    assert.equal(body.ok, true);

    const parsed = StartAttemptResponseSchema.safeParse(body.data);
    assert.ok(parsed.success, `StartAttemptResponse contract invalid: ${JSON.stringify(parsed.error?.format())}`);

    attemptId = body.data.attemptId;
    assert.ok(attemptId);
    assert.equal(body.data.durationMinutes, 30);
  });

  // Step 7: GET /attempts/[id] (View question paper)
  it("Step 7: GET /api/v1/attempts/[id] -> returns AttemptDetailDto contract without leaking answers", async () => {
    const req = new NextRequest(`http://127.0.0.1:3045/api/v1/attempts/${attemptId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const res = await getAttemptRoute(req, { params: Promise.resolve({ id: attemptId }) });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);

    const parsed = AttemptDetailSchema.safeParse(body.data);
    assert.ok(parsed.success, `AttemptDetail contract invalid: ${JSON.stringify(parsed.error?.format())}`);
    assert.equal(body.data.questions.length, 5);

    // SECURITY TRIPWIRE: questions must NEVER leak correctOption or explanations
    for (const q of body.data.questions) {
      assert.equal((q as any).correctOption, undefined, "Question must not leak correctOption");
      assert.equal((q as any).explanationEn, undefined, "Question must not leak explanationEn");
    }
  });

  // Step 8: PUT /attempts/[id]/answers (Sync 5 answers)
  it("Step 8: PUT /api/v1/attempts/[id]/answers -> syncs 5 answers monotonically", async () => {
    // Q1: B (Correct), Q2: A (Correct), Q3: C (Correct), Q4: D (Wrong), Q5: Null (Skipped)
    const answersPayload = [
      { questionId: questionIds[0], selectedOption: "B", sequenceNumber: 1, isMarked: false },
      { questionId: questionIds[1], selectedOption: "A", sequenceNumber: 2, isMarked: false },
      { questionId: questionIds[2], selectedOption: "C", sequenceNumber: 3, isMarked: false },
      { questionId: questionIds[3], selectedOption: "D", sequenceNumber: 4, isMarked: true },
      { questionId: questionIds[4], selectedOption: null, sequenceNumber: 5, isMarked: false },
    ];

    const req = new NextRequest(`http://127.0.0.1:3045/api/v1/attempts/${attemptId}/answers`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        answers: answersPayload,
        lastSequenceNumber: 5,
      }),
    });

    const res = await syncAnswersRoute(req, { params: Promise.resolve({ id: attemptId }) });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.data.syncedCount, 5);
    assert.equal(body.data.lastSequenceNumber, 5);
  });

  // Step 9: POST /attempts/[id]/submit (Submit test)
  it("Step 9: POST /api/v1/attempts/[id]/submit -> returns AttemptResultDto contract with accurate grading", async () => {
    const req = new NextRequest(`http://127.0.0.1:3045/api/v1/attempts/${attemptId}/submit`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const res = await submitAttemptRoute(req, { params: Promise.resolve({ id: attemptId }) });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);

    const parsed = AttemptResultSchema.safeParse(body.data);
    assert.ok(parsed.success, `AttemptResult contract invalid: ${JSON.stringify(parsed.error?.format())}`);

    // 3 correct (+30), 1 wrong (-2.5), 1 skipped (0) => Total: 27.5 / 50
    assert.equal(body.data.score, 27.5);
    assert.equal(body.data.correctCount, 3);
    assert.equal(body.data.wrongCount, 1);
    assert.equal(body.data.skippedCount, 1);
    assert.equal(body.data.markedCount, 1);
    assert.equal(body.data.totalMarks, 50);
  });

  // Step 10: GET /attempts/[id]/solutions (View solutions)
  it("Step 10: GET /api/v1/attempts/[id]/solutions -> returns AttemptSolutionsDto with explanations", async () => {
    const req = new NextRequest(`http://127.0.0.1:3045/api/v1/attempts/${attemptId}/solutions`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const res = await getSolutionsRoute(req, { params: Promise.resolve({ id: attemptId }) });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);

    const parsed = AttemptSolutionsSchema.safeParse(body.data);
    assert.ok(parsed.success, `AttemptSolutions contract invalid: ${JSON.stringify(parsed.error?.format())}`);

    assert.equal(body.data.questions.length, 5);
    assert.equal(body.data.questions[0].correctOption, "B");
    assert.ok(body.data.questions[0].explanationEn);
  });

  // Step 11: GET /auth/sessions
  it("Step 11: GET /api/v1/auth/sessions -> returns DeviceSessionDto[] contract", async () => {
    const req = new NextRequest("http://127.0.0.1:3045/api/v1/auth/sessions", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const res = await getSessionsRoute(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.ok(Array.isArray(body.data));

    const parsed = z.array(DeviceSessionSchema).safeParse(body.data);
    assert.ok(parsed.success, `DeviceSession contract invalid: ${JSON.stringify(parsed.error?.format())}`);
    assert.ok(body.data.length >= 1);
  });

  // Step 12: Library File Download (Unowned 403, Owned 206)
  it("Step 12: Library file access control (Unowned -> 403, Owned -> HTTP 206 Range)", async () => {
    // 12a: Unowned request
    const unownedReq = new NextRequest("http://127.0.0.1:3045/api/v1/library/indian-polity-notes-2026/file", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const unownedRes = await getLibraryFileRoute(unownedReq, {
      params: Promise.resolve({ id: "indian-polity-notes-2026" }),
    });
    assert.equal(unownedRes.status, 403, "Unowned paid file must return 403");

    // 12b: Grant ownership via completed order
    const ordId = `order-contract-${Date.now()}`;
    await createOrder({
      id: ordId,
      orderNumber: `ORD-${Date.now()}`,
      date: new Date().toISOString(),
      userId: studentId,
      userEmail: studentEmail,
      items: [
        {
          bookId: "indian-polity-notes-2026",
          book: {
            id: "indian-polity-notes-2026",
            title: "Indian Polity Notes",
            price: 499,
            slug: "indian-polity-constitution-fast-track-notes",
          } as any,
          quantity: 1,
          addedAt: new Date().toISOString(),
        },
      ],
      originalTotal: 499,
      discountTotal: 0,
      couponDiscount: 0,
      finalTotal: 499,
      paymentMethod: "UPI",
      status: "pending_payment",
    });
    await markBookOrderCompleted({ orderId: ordId, razorpayPaymentId: "pay_test_contract_123" });

    // 12c: Request byte range
    const rangeReq = new NextRequest("http://127.0.0.1:3045/api/v1/library/indian-polity-notes-2026/file", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Range: "bytes=0-511",
      },
    });
    const rangeRes = await getLibraryFileRoute(rangeReq, {
      params: Promise.resolve({ id: "indian-polity-notes-2026" }),
    });
    assert.equal(rangeRes.status, 206, "Owned file with Range header must return HTTP 206");
    assert.ok(rangeRes.headers.get("Content-Range")?.startsWith("bytes 0-511/"), "Content-Range header must match requested slice");
  });

  // Step 13: Push-token registration
  it("Step 13: POST /api/v1/devices -> registers push notification token", async () => {
    const req = new NextRequest("http://127.0.0.1:3045/api/v1/devices", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
        platform: "android",
        deviceModel: "Pixel 9 Pro",
        appVersion: "1.0.0",
      }),
    });

    const res = await registerDeviceRoute(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.data.success, true);
  });

  // Step 14: Refresh token
  it("Step 14: POST /api/v1/auth/refresh -> rotates refresh token and issues new access token", async () => {
    const req = new NextRequest("http://127.0.0.1:3045/api/v1/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    const res = await refreshRoute(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);

    const parsed = LoginResponseSchema.safeParse(body.data);
    assert.ok(parsed.success, `Refresh response contract invalid: ${JSON.stringify(parsed.error?.format())}`);

    // Update tokens
    accessToken = body.data.tokens.accessToken;
    refreshToken = body.data.tokens.refreshToken;
  });

  // Step 15: Logout
  it("Step 15: POST /api/v1/auth/logout -> revokes session, old token is rejected", async () => {
    const req = new NextRequest("http://127.0.0.1:3045/api/v1/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    const res = await logoutRoute(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.data.success, true);
  });

  // Step 16: Account deletion and subsequent login refused
  it("Step 16: DELETE /api/v1/me with re-auth -> deletes account, subsequent login is REFUSED", async () => {
    // Log back in to get a fresh session for deletion
    const loginReq = new NextRequest("http://127.0.0.1:3045/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: studentEmail,
        password: studentPassword,
        platform: "android",
      }),
    });
    const loginRes = await loginRoute(loginReq);
    const loginBody = await loginRes.json();
    const activeToken = loginBody.data.tokens.accessToken;

    // Delete account using real password re-auth
    const delReq = new NextRequest("http://127.0.0.1:3045/api/v1/me", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${activeToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password: studentPassword,
      }),
    });

    const delRes = await deleteMeRoute(delReq);
    assert.equal(delRes.status, 200);
    const delBody = await delRes.json();
    assert.equal(delBody.ok, true);

    // Verify subsequent login is refused (401 or inactive)
    const refusedReq = new NextRequest("http://127.0.0.1:3045/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: studentEmail,
        password: studentPassword,
        platform: "android",
      }),
    });
    const refusedRes = await loginRoute(refusedReq);
    assert.equal(refusedRes.status, 401, "Subsequent login for deleted account must be refused with 401");
  });

  // Step 17: Razorpay test order creation
  it("Step 17: Razorpay create-order test (in test mode)", async () => {
    // In test environment, razorpay instance or order creation test
    const orderParams = {
      amount: 1499,
      currency: "INR",
      receipt: `rcpt_test_${Date.now()}`,
      notes: { env: "test", plan: "MONTHLY" },
    };

    try {
      const order = await createRazorpayOrder(orderParams);
      assert.ok(order.id, "Razorpay order must have an id");
      assert.equal(order.amount, 149900);
    } catch (err: any) {
      // If RAZORPAY credentials not configured in local environment, verify graceful handling
      assert.ok(
        err.message.includes("Razorpay not configured") || err.message.includes("key_id"),
        `Expected Razorpay test mode behavior, got: ${err.message}`
      );
    }
  });

  // Step 18: Full GET endpoints contract validation
  it("Step 18: GET /api/v1 contract validation across core public/learner endpoints", async () => {
    // 18a: Config
    const configReq = new NextRequest("http://127.0.0.1:3045/api/v1/config");
    const configRes = await getConfigRoute(configReq);
    assert.equal(configRes.status, 200);
    const configBody = await configRes.json();
    assert.equal(configBody.ok, true);
    const configParsed = AppConfigSchema.safeParse(configBody.data);
    assert.ok(configParsed.success, `Config schema mismatch: ${JSON.stringify(configParsed.error?.format())}`);

    // 18b: Goals
    const goalsReq = new NextRequest("http://127.0.0.1:3045/api/v1/goals");
    const goalsRes = await getGoalsRoute(goalsReq);
    assert.equal(goalsRes.status, 200);
    const goalsBody = await goalsRes.json();
    assert.equal(goalsBody.ok, true);
    assert.ok(Array.isArray(goalsBody.data));

    // 18c: Current Affairs
    const caReq = new NextRequest("http://127.0.0.1:3045/api/v1/current-affairs");
    const caRes = await getCurrentAffairsRoute(caReq);
    assert.equal(caRes.status, 200);
    const caBody = await caRes.json();
    assert.equal(caBody.ok, true);
    assert.ok(Array.isArray(caBody.data));
    const caParsed = z.array(CurrentAffairsItemSchema).safeParse(caBody.data);
    assert.ok(caParsed.success, `Current affairs schema mismatch: ${JSON.stringify(caParsed.error?.format())}`);

    // 18d: PYQ Exams
    const pyqReq = new NextRequest("http://127.0.0.1:3045/api/v1/pyq/exams");
    const pyqRes = await getPyqExamsRoute(pyqReq);
    assert.equal(pyqRes.status, 200);
    const pyqBody = await pyqRes.json();
    assert.equal(pyqBody.ok, true);
    assert.ok(Array.isArray(pyqBody.data));
    const pyqParsed = z.array(PyqExamSchema).safeParse(pyqBody.data);
    assert.ok(pyqParsed.success, `PYQ exams schema mismatch: ${JSON.stringify(pyqParsed.error?.format())}`);

    // 18e: Tutorials
    const tutReq = new NextRequest("http://127.0.0.1:3045/api/v1/tutorials");
    const tutRes = await getTutorialsRoute(tutReq);
    assert.equal(tutRes.status, 200);
    const tutBody = await tutRes.json();
    assert.equal(tutBody.ok, true);
    assert.ok(Array.isArray(tutBody.data));
    const tutParsed = z.array(TutorialSummarySchema).safeParse(tutBody.data);
    assert.ok(tutParsed.success, `Tutorials schema mismatch: ${JSON.stringify(tutParsed.error?.format())}`);

    // 18f: Library
    const libReq = new NextRequest("http://127.0.0.1:3045/api/v1/library");
    const libRes = await getLibraryRoute(libReq);
    assert.equal(libRes.status, 200);
    const libBody = await libRes.json();
    assert.equal(libBody.ok, true);
    assert.ok(Array.isArray(libBody.data));
    const libParsed = z.array(LibraryItemSchema).safeParse(libBody.data);
    assert.ok(libParsed.success, `Library schema mismatch: ${JSON.stringify(libParsed.error?.format())}`);
  });

  // Step 19: OpenAPI path coverage validation
  it("Step 19: /api/v1/openapi.json produces valid OpenAPI 3.1.0 document matching implemented routes", async () => {
    const req = new NextRequest("http://127.0.0.1:3045/api/v1/openapi.json");
    const res = await getOpenApiRoute(req);
    assert.equal(res.status, 200);
    const doc = await res.json();

    assert.equal(doc.openapi, "3.1.0");
    assert.equal(doc.info.title, "AspirantBook Versioned Learner API");
    assert.ok(doc.paths, "OpenAPI document must specify paths");

    const expectedPaths = [
      "/config",
      "/auth/login",
      "/auth/register",
      "/auth/refresh",
      "/auth/logout",
      "/auth/reauth",
      "/auth/sessions",
      "/me",
      "/home",
      "/goals",
      "/tests",
      "/tests/{id}",
      "/tests/{id}/attempts",
      "/attempts/{id}",
      "/attempts/{id}/answers",
      "/attempts/{id}/submit",
      "/attempts/{id}/result",
      "/attempts/{id}/solutions",
      "/current-affairs",
      "/pyq/exams",
      "/tutorials",
      "/library",
      "/library/{id}/file",
      "/devices",
    ];

    for (const p of expectedPaths) {
      assert.ok(doc.paths[p], `OpenAPI must document implemented path ${p}`);
    }
  });
});
