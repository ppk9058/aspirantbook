import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { setMockSessionProvider } from "@/auth";

// Import Route Handlers
import { GET as getSeriesList } from "@/app/api/exam/series/list/route";
import { POST as postSeriesCreate } from "@/app/api/exam/series/create/route";
import { GET as getSeriesEnroll, POST as postSeriesEnroll } from "@/app/api/exam/series/enroll/route";
import { GET as getTestList } from "@/app/api/exam/test/list/route";
import { POST as postTestCreate } from "@/app/api/exam/test/create/route";
import { GET as getTestQuestions } from "@/app/api/exam/[testId]/questions/route";
import { GET as getTestLeaderboard } from "@/app/api/exam/[testId]/leaderboard/route";
import { POST as postAiParse } from "@/app/api/exam/ai-parse/route";
import { GET as getTeacherQuestions } from "@/app/api/exam/teacher/[testId]/questions/route";
import { POST as postAttemptStart } from "@/app/api/exam/attempt/start/route";
import { GET as getAttemptById } from "@/app/api/exam/attempt/[attemptId]/route";
import { POST as postAttemptSync } from "@/app/api/exam/attempt/[attemptId]/sync/route";
import { POST as postAttemptSubmit } from "@/app/api/exam/attempt/[attemptId]/submit/route";
import { GET as getAttemptResult } from "@/app/api/exam/attempt/[attemptId]/result/route";
import { GET as getUserStatus } from "@/app/api/exam/attempt/user-status/route";

interface TestUser {
  id: string;
  name: string;
  email: string;
  role: "FREE" | "TEACHER" | "ADMIN";
}

function createReq(url: string, method: string = "GET", body?: any): NextRequest {
  const init: any = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

async function runRouteLevelHttpTests() {
  console.log("======================================================================");
  console.log("STARTING ROUTE-LEVEL HTTP INTEGRATION TESTS FOR app/api/exam/**");
  console.log("======================================================================\n");

  const runId = "test_route_" + Date.now();
  let studentUser: TestUser | null = null;
  let otherStudentUser: TestUser | null = null;
  let teacherUser: TestUser | null = null;
  let otherTeacherUser: TestUser | null = null;
  let adminUser: TestUser | null = null;

  let testSeriesId: string | null = null;
  let proSeriesId: string | null = null;
  let testExamId: string | null = null;
  let proExamId: string | null = null;
  let studentAttemptId: string | null = null;

  const resultsTable: Array<{
    route: string;
    method: string;
    scenario: string;
    expectedStatus: number;
    actualStatus: number;
    passed: boolean;
    note?: string;
  }> = [];

  function record(route: string, method: string, scenario: string, expected: number, actual: number, note?: string) {
    const passed = expected === actual;
    resultsTable.push({
      route,
      method,
      scenario,
      expectedStatus: expected,
      actualStatus: actual,
      passed,
      note,
    });
    if (!passed) {
      console.error(`❌ FAILED: ${method} ${route} [${scenario}] - Expected ${expected}, got ${actual} (${note})`);
    } else {
      console.log(`✓ [${actual}] ${method} ${route} - ${scenario}`);
    }
  }

  try {
    // 1. Setup isolated database entities
    console.log("1. Creating dedicated test users in DB...");
    const s1 = await prisma.user.create({
      data: { email: `student_${runId}@internal.test`, name: "Candidate Student", role: "FREE" },
    });
    studentUser = { id: s1.id, name: s1.name!, email: s1.email, role: "FREE" };

    const s2 = await prisma.user.create({
      data: { email: `other_student_${runId}@internal.test`, name: "Other Student", role: "FREE" },
    });
    otherStudentUser = { id: s2.id, name: s2.name!, email: s2.email, role: "FREE" };

    const t1 = await prisma.user.create({
      data: { email: `teacher_${runId}@internal.test`, name: "Teacher Author", role: "TEACHER" },
    });
    teacherUser = { id: t1.id, name: t1.name!, email: t1.email, role: "TEACHER" };

    const t2 = await prisma.user.create({
      data: { email: `other_teacher_${runId}@internal.test`, name: "Other Teacher", role: "TEACHER" },
    });
    otherTeacherUser = { id: t2.id, name: t2.name!, email: t2.email, role: "TEACHER" };

    const a1 = await prisma.user.create({
      data: { email: `admin_${runId}@internal.test`, name: "Platform Admin", role: "ADMIN" },
    });
    adminUser = { id: a1.id, name: a1.name!, email: a1.email, role: "ADMIN" };

    console.log("2. Creating dedicated published test series & exams in DB...");
    const series = await prisma.examSeries.create({
      data: {
        id: "cuid_series_" + runId,
        slug: "slug-series-" + runId,
        title: "Route Test Free Series",
        examName: "UPSC",
        category: "Civil Services",
        isFree: true,
        isPro: false,
        isPublished: true,
        createdById: teacherUser.id,
      },
    });
    testSeriesId = series.id;

    const proSeries = await prisma.examSeries.create({
      data: {
        id: "cuid_pro_series_" + runId,
        slug: "slug-pro-series-" + runId,
        title: "Route Test Pro Series",
        examName: "UPSC",
        category: "Civil Services",
        isFree: false,
        isPro: true,
        isPublished: true,
        createdById: teacherUser.id,
      },
    });
    proSeriesId = proSeries.id;

    // Normal Free Published Test (created by teacherUser)
    const exam = await prisma.examTest.create({
      data: {
        seriesId: series.id,
        title: "Standard Test 1",
        accessMode: "FREE",
        durationMinutes: 60,
        totalQuestions: 2,
        totalMarks: 4,
        positiveMarks: 2,
        negativeMarks: 0.5,
        isPublished: true,
        createdById: teacherUser.id,
        sections: {
          create: {
            title: "General Studies",
            questions: {
              create: [
                {
                  questionEn: "What is the capital of India?",
                  optionAEn: "Mumbai",
                  optionBEn: "New Delhi",
                  optionCEn: "Kolkata",
                  optionDEn: "Chennai",
                  correctOption: "B",
                  explanationEn: "New Delhi is the official capital.",
                  order: 1,
                  positiveMarks: 2,
                  negativeMarks: 0.5,
                },
                {
                  questionEn: "What is 2 + 2?",
                  optionAEn: "3",
                  optionBEn: "4",
                  optionCEn: "5",
                  optionDEn: "6",
                  correctOption: "B",
                  explanationEn: "Basic math 2+2=4.",
                  order: 2,
                  positiveMarks: 2,
                  negativeMarks: 0.5,
                },
              ],
            },
          },
        },
      },
    });
    testExamId = exam.id;

    // Pro Test (created by teacherUser)
    const proExam = await prisma.examTest.create({
      data: {
        seriesId: proSeries.id,
        title: "Premium Pro Test",
        accessMode: "PRO",
        durationMinutes: 90,
        totalQuestions: 1,
        totalMarks: 2,
        isPublished: true,
        createdById: teacherUser.id,
        sections: {
          create: {
            title: "Advanced",
            questions: {
              create: [
                {
                  questionEn: "Advanced Question",
                  optionAEn: "1",
                  optionBEn: "2",
                  optionCEn: "3",
                  optionDEn: "4",
                  correctOption: "A",
                  explanationEn: "Pro question secret",
                },
              ],
            },
          },
        },
      },
    });
    proExamId = proExam.id;

    console.log("\n======================================================================");
    console.log("EXECUTION OF ROUTE-LEVEL TESTS");
    console.log("======================================================================\n");

    // Helper for setting session
    const setSession = (user: TestUser | null) => {
      if (!user) {
        setMockSessionProvider(() => null);
      } else {
        setMockSessionProvider(() => ({
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        }));
      }
    };

    // ─────────────────────────────────────────────────────────────
    // Route 1: GET /api/exam/series/list (Public Catalog)
    // ─────────────────────────────────────────────────────────────
    setSession(null);
    let res: any = await getSeriesList(createReq("/api/exam/series/list"));
    record("/api/exam/series/list", "GET", "Unauthenticated public read", 200, res.status);

    // ─────────────────────────────────────────────────────────────
    // Route 2: POST /api/exam/series/create (TEACHER / ADMIN only)
    // ─────────────────────────────────────────────────────────────
    setSession(null);
    res = await postSeriesCreate(createReq("/api/exam/series/create", "POST", { title: "New Series" }));
    record("/api/exam/series/create", "POST", "Unauthenticated returns 401", 401, res.status);

    setSession(studentUser);
    res = await postSeriesCreate(createReq("/api/exam/series/create", "POST", { title: "New Series" }));
    record("/api/exam/series/create", "POST", "Student forbidden returns 403", 403, res.status);

    setSession(teacherUser);
    res = await postSeriesCreate(createReq("/api/exam/series/create", "POST", { title: "Created by Teacher " + runId }));
    record("/api/exam/series/create", "POST", "Teacher creation returns 200", 200, res.status);

    // ─────────────────────────────────────────────────────────────
    // Route 3: GET & POST /api/exam/series/enroll
    // ─────────────────────────────────────────────────────────────
    setSession(null);
    res = await getSeriesEnroll(createReq(`/api/exam/series/enroll?seriesId=${testSeriesId}`));
    record("/api/exam/series/enroll", "GET", "Unauthenticated returns enrolled: false", 200, res.status);

    setSession(null);
    res = await postSeriesEnroll(createReq("/api/exam/series/enroll", "POST", { seriesId: testSeriesId }));
    record("/api/exam/series/enroll", "POST", "Unauthenticated returns 401", 401, res.status);

    setSession(studentUser);
    res = await postSeriesEnroll(createReq("/api/exam/series/enroll", "POST", { seriesId: "nonexistent-id" }));
    record("/api/exam/series/enroll", "POST", "Unknown series returns 404", 404, res.status);

    // Free student enrolling in free series -> 200
    setSession(studentUser);
    res = await postSeriesEnroll(createReq("/api/exam/series/enroll", "POST", { seriesId: testSeriesId, enrollType: "FREE" }));
    record("/api/exam/series/enroll", "POST", "Student free enrollment in free series returns 200", 200, res.status);

    // Free student trying to enroll in PRO series with FREE -> 403
    setSession(studentUser);
    res = await postSeriesEnroll(createReq("/api/exam/series/enroll", "POST", { seriesId: proSeriesId, enrollType: "FREE" }));
    record("/api/exam/series/enroll", "POST", "FREE enrollment on PRO series rejected with 403", 403, res.status);

    // Free student trying to enroll in PRO series with PASS without entitlement -> 402
    setSession(studentUser);
    res = await postSeriesEnroll(createReq("/api/exam/series/enroll", "POST", { seriesId: proSeriesId, enrollType: "PASS" }));
    record("/api/exam/series/enroll", "POST", "PASS enrollment without entitlement rejected with 402", 402, res.status);

    // ─────────────────────────────────────────────────────────────
    // Route 4: GET /api/exam/test/list
    // ─────────────────────────────────────────────────────────────
    setSession(null);
    res = await getTestList(createReq("/api/exam/test/list"));
    record("/api/exam/test/list", "GET", "Unauthenticated returns 401", 401, res.status);

    setSession(studentUser);
    res = await getTestList(createReq(`/api/exam/test/list?seriesId=${testSeriesId}&includeQuestions=1`));
    const testListJson = await res.json();
    record("/api/exam/test/list", "GET", "Student list returns 200", 200, res.status);
    const leakedInList = testListJson.data?.some((t: any) => t.questionsList && t.questionsList.length > 0);
    if (leakedInList) {
      console.error("❌ CRITICAL: Questions leaked in test/list for student!");
    } else {
      console.log("✓ VERIFIED: Student test/list completely stripped of questions even with includeQuestions=1");
    }

    // ─────────────────────────────────────────────────────────────
    // Route 5: POST /api/exam/test/create (TEACHER / ADMIN only)
    // ─────────────────────────────────────────────────────────────
    setSession(null);
    res = await postTestCreate(createReq("/api/exam/test/create", "POST", { title: "Draft Test" }));
    record("/api/exam/test/create", "POST", "Unauthenticated returns 401", 401, res.status);

    setSession(studentUser);
    res = await postTestCreate(createReq("/api/exam/test/create", "POST", { title: "Draft Test" }));
    record("/api/exam/test/create", "POST", "Student forbidden returns 403", 403, res.status);

    setSession(teacherUser);
    res = await postTestCreate(createReq("/api/exam/test/create", "POST", { title: "Test by Author " + runId, seriesId: testSeriesId }));
    record("/api/exam/test/create", "POST", "Teacher create returns 200", 200, res.status);

    // ─────────────────────────────────────────────────────────────
    // Route 6: POST /api/exam/ai-parse (TEACHER / ADMIN only)
    // ─────────────────────────────────────────────────────────────
    setSession(null);
    res = await postAiParse(createReq("/api/exam/ai-parse", "POST", { action: "generate-topic" }));
    record("/api/exam/ai-parse", "POST", "Unauthenticated returns 401", 401, res.status);

    setSession(studentUser);
    res = await postAiParse(createReq("/api/exam/ai-parse", "POST", { action: "generate-topic" }));
    record("/api/exam/ai-parse", "POST", "Student forbidden returns 403", 403, res.status);

    setSession(teacherUser);
    res = await postAiParse(createReq("/api/exam/ai-parse", "POST", { action: "generate-topic", topic: "Indian Polity" }));
    record("/api/exam/ai-parse", "POST", "Teacher generate returns 200", 200, res.status);

    // ─────────────────────────────────────────────────────────────
    // Route 7: GET /api/exam/teacher/[testId]/questions
    // ─────────────────────────────────────────────────────────────
    setSession(null);
    res = await getTeacherQuestions(createReq(`/api/exam/teacher/${testExamId}/questions`), { params: Promise.resolve({ testId: testExamId! }) });
    record("/api/exam/teacher/[testId]/questions", "GET", "Unauthenticated returns 401", 401, res.status);

    setSession(studentUser);
    res = await getTeacherQuestions(createReq(`/api/exam/teacher/${testExamId}/questions`), { params: Promise.resolve({ testId: testExamId! }) });
    record("/api/exam/teacher/[testId]/questions", "GET", "Student forbidden returns 403", 403, res.status);

    setSession(otherTeacherUser);
    res = await getTeacherQuestions(createReq(`/api/exam/teacher/${testExamId}/questions`), { params: Promise.resolve({ testId: testExamId! }) });
    record("/api/exam/teacher/[testId]/questions", "GET", "Non-author teacher forbidden returns 403", 403, res.status);

    setSession(teacherUser);
    res = await getTeacherQuestions(createReq(`/api/exam/teacher/${testExamId}/questions`), { params: Promise.resolve({ testId: testExamId! }) });
    record("/api/exam/teacher/[testId]/questions", "GET", "Author teacher returns 200 with solutions", 200, res.status);

    setSession(adminUser);
    res = await getTeacherQuestions(createReq(`/api/exam/teacher/${testExamId}/questions`), { params: Promise.resolve({ testId: testExamId! }) });
    record("/api/exam/teacher/[testId]/questions", "GET", "Admin returns 200 with solutions", 200, res.status);

    // ─────────────────────────────────────────────────────────────
    // Route 8: GET /api/exam/[testId]/questions (Pre-attempt leak test)
    // ─────────────────────────────────────────────────────────────
    setSession(null);
    res = await getTestQuestions(createReq(`/api/exam/${testExamId}/questions`), { params: Promise.resolve({ testId: testExamId! }) });
    record("/api/exam/[testId]/questions", "GET", "Unauthenticated returns 401", 401, res.status);

    setSession(studentUser);
    res = await getTestQuestions(createReq("/api/exam/nonexistent-id/questions"), { params: Promise.resolve({ testId: "nonexistent-id" }) });
    record("/api/exam/[testId]/questions", "GET", "Unknown testId returns 404", 404, res.status);

    // Student requesting questions without an attempt -> 403
    setSession(studentUser);
    res = await getTestQuestions(createReq(`/api/exam/${testExamId}/questions`), { params: Promise.resolve({ testId: testExamId! }) });
    record("/api/exam/[testId]/questions", "GET", "Student without active attempt forbidden returns 403", 403, res.status);

    // Student requesting metadataOnly=1 (for instructions/declaration page) -> 200, with NO question text
    setSession(studentUser);
    res = await getTestQuestions(createReq(`/api/exam/${testExamId}/questions?metadataOnly=1`), { params: Promise.resolve({ testId: testExamId! }) });
    const metaJson = await res.json();
    record("/api/exam/[testId]/questions?metadataOnly=1", "GET", "Metadata-only pre-attempt returns 200", 200, res.status);
    const hasQuestionText = metaJson.data?.test?.sections?.some((s: any) => s.questions || s.questionEn);
    if (hasQuestionText) {
      console.error("❌ CRITICAL: Question text leaked in metadataOnly=1 response!");
    } else {
      console.log("✓ VERIFIED: metadataOnly=1 returns 0 question texts/options, only counts and title");
    }

    // ─────────────────────────────────────────────────────────────
    // Route 9: POST /api/exam/attempt/start
    // ─────────────────────────────────────────────────────────────
    setSession(null);
    res = await postAttemptStart(createReq("/api/exam/attempt/start", "POST", { testId: testExamId, language: "English" }));
    record("/api/exam/attempt/start", "POST", "Unauthenticated returns 401", 401, res.status);

    setSession(studentUser);
    res = await postAttemptStart(createReq("/api/exam/attempt/start", "POST", { testId: "nonexistent-id", language: "English" }));
    record("/api/exam/attempt/start", "POST", "Unknown testId returns 404", 404, res.status);

    // Student starting PRO test without entitlement -> 403
    setSession(studentUser);
    res = await postAttemptStart(createReq("/api/exam/attempt/start", "POST", { testId: proExamId, language: "English" }));
    record("/api/exam/attempt/start", "POST", "Un-enrolled student on PRO test forbidden returns 403", 403, res.status);

    // Other teacher starting PRO test (they did NOT create it) -> 403
    setSession(otherTeacherUser);
    res = await postAttemptStart(createReq("/api/exam/attempt/start", "POST", { testId: proExamId, language: "English" }));
    record("/api/exam/attempt/start", "POST", "Other teacher on PRO test (not creator) returns 403", 403, res.status);

    // Author teacher starting PRO test -> 201/200 allowed
    setSession(teacherUser);
    res = await postAttemptStart(createReq("/api/exam/attempt/start", "POST", { testId: proExamId, language: "English" }));
    record("/api/exam/attempt/start", "POST", "Author teacher on PRO test allowed returns 201", 201, res.status);

    // Student starting valid FREE test -> 201
    setSession(studentUser);
    res = await postAttemptStart(createReq("/api/exam/attempt/start", "POST", { testId: testExamId, language: "English" }));
    const startData = await res.json();
    studentAttemptId = startData.data?.attemptId;
    record("/api/exam/attempt/start", "POST", "Student starts valid test returns 201", 201, res.status);

    // Verify start returns sanitized questions (no answers)
    const startQ = startData.data?.test?.sections?.[0]?.questions?.[0];
    if (startQ && ("correctOption" in startQ || "explanationEn" in startQ)) {
      console.error("❌ CRITICAL: Correct answers or explanation leaked in attempt/start response!");
    } else {
      console.log("✓ VERIFIED: attempt/start returns questions with answer keys strictly stripped");
    }

    // Now student calls GET /api/exam/[testId]/questions?attemptId=studentAttemptId -> 200
    setSession(studentUser);
    res = await getTestQuestions(
      createReq(`/api/exam/${testExamId}/questions?attemptId=${studentAttemptId}`),
      { params: Promise.resolve({ testId: testExamId! }) }
    );
    record("/api/exam/[testId]/questions?attemptId=...", "GET", "Student with active attempt returns 200", 200, res.status);

    // Other student tries using studentAttemptId -> 403
    setSession(otherStudentUser);
    res = await getTestQuestions(
      createReq(`/api/exam/${testExamId}/questions?attemptId=${studentAttemptId}`),
      { params: Promise.resolve({ testId: testExamId! }) }
    );
    record("/api/exam/[testId]/questions?attemptId=...", "GET", "Other student using attemptId forbidden returns 403", 403, res.status);

    // ─────────────────────────────────────────────────────────────
    // Route 10: GET /api/exam/attempt/[attemptId]
    // ─────────────────────────────────────────────────────────────
    setSession(null);
    res = await getAttemptById(createReq(`/api/exam/attempt/${studentAttemptId}`), { params: Promise.resolve({ attemptId: studentAttemptId! }) });
    record("/api/exam/attempt/[attemptId]", "GET", "Unauthenticated returns 401", 401, res.status);

    setSession(otherStudentUser);
    res = await getAttemptById(createReq(`/api/exam/attempt/${studentAttemptId}`), { params: Promise.resolve({ attemptId: studentAttemptId! }) });
    record("/api/exam/attempt/[attemptId]", "GET", "Other student accessing attempt returns 403", 403, res.status);

    setSession(studentUser);
    res = await getAttemptById(createReq(`/api/exam/attempt/${studentAttemptId}`), { params: Promise.resolve({ attemptId: studentAttemptId! }) });
    record("/api/exam/attempt/[attemptId]", "GET", "Owner student accessing attempt returns 200", 200, res.status);

    // ─────────────────────────────────────────────────────────────
    // Route 11: POST /api/exam/attempt/[attemptId]/sync
    // ─────────────────────────────────────────────────────────────
    const q1 = await prisma.examQuestion.findFirst({ where: { section: { testId: testExamId } } });

    setSession(null);
    res = await postAttemptSync(createReq(`/api/exam/attempt/${studentAttemptId}/sync`, "POST", { answers: [] }), { params: Promise.resolve({ attemptId: studentAttemptId! }) });
    record("/api/exam/attempt/[attemptId]/sync", "POST", "Unauthenticated returns 401", 401, res.status);

    setSession(otherStudentUser);
    res = await postAttemptSync(
      createReq(`/api/exam/attempt/${studentAttemptId}/sync`, "POST", { answers: [{ questionId: q1!.id, selectedOption: "B", clientSeq: 1 }] }),
      { params: Promise.resolve({ attemptId: studentAttemptId! }) }
    );
    record("/api/exam/attempt/[attemptId]/sync", "POST", "Other student syncing attempt returns 403", 403, res.status);

    setSession(studentUser);
    res = await postAttemptSync(
      createReq(`/api/exam/attempt/${studentAttemptId}/sync`, "POST", { answers: [{ questionId: q1!.id, selectedOption: "B", clientSeq: 1 }] }),
      { params: Promise.resolve({ attemptId: studentAttemptId! }) }
    );
    record("/api/exam/attempt/[attemptId]/sync", "POST", "Owner student syncing attempt returns 200", 200, res.status);

    // ─────────────────────────────────────────────────────────────
    // Route 12: GET /api/exam/attempt/[attemptId]/result (Before submission)
    // ─────────────────────────────────────────────────────────────
    setSession(studentUser);
    res = await getAttemptResult(createReq(`/api/exam/attempt/${studentAttemptId}/result`), { params: Promise.resolve({ attemptId: studentAttemptId! }) });
    record("/api/exam/attempt/[attemptId]/result", "GET", "Result before submission/expiry returns 409", 409, res.status);

    // ─────────────────────────────────────────────────────────────
    // Route 13: POST /api/exam/attempt/[attemptId]/submit
    // ─────────────────────────────────────────────────────────────
    setSession(null);
    res = await postAttemptSubmit(createReq(`/api/exam/attempt/${studentAttemptId}/submit`, "POST", { answers: [] }), { params: Promise.resolve({ attemptId: studentAttemptId! }) });
    record("/api/exam/attempt/[attemptId]/submit", "POST", "Unauthenticated returns 401", 401, res.status);

    setSession(otherStudentUser);
    res = await postAttemptSubmit(createReq(`/api/exam/attempt/${studentAttemptId}/submit`, "POST", { answers: [] }), { params: Promise.resolve({ attemptId: studentAttemptId! }) });
    record("/api/exam/attempt/[attemptId]/submit", "POST", "Other student submitting attempt returns 403", 403, res.status);

    setSession(studentUser);
    res = await postAttemptSubmit(createReq(`/api/exam/attempt/${studentAttemptId}/submit`, "POST", { answers: [] }), { params: Promise.resolve({ attemptId: studentAttemptId! }) });
    record("/api/exam/attempt/[attemptId]/submit", "POST", "Owner student submitting attempt returns 200", 200, res.status);

    // ─────────────────────────────────────────────────────────────
    // Route 14: GET /api/exam/attempt/[attemptId]/result (After submission)
    // ─────────────────────────────────────────────────────────────
    setSession(otherStudentUser);
    res = await getAttemptResult(createReq(`/api/exam/attempt/${studentAttemptId}/result`), { params: Promise.resolve({ attemptId: studentAttemptId! }) });
    record("/api/exam/attempt/[attemptId]/result", "GET", "Other student viewing result returns 403", 403, res.status);

    setSession(studentUser);
    res = await getAttemptResult(createReq(`/api/exam/attempt/${studentAttemptId}/result`), { params: Promise.resolve({ attemptId: studentAttemptId! }) });
    record("/api/exam/attempt/[attemptId]/result", "GET", "Owner viewing result returns 200", 200, res.status);

    // ─────────────────────────────────────────────────────────────
    // Route 15: GET /api/exam/attempt/user-status
    // ─────────────────────────────────────────────────────────────
    setSession(null);
    res = await getUserStatus(createReq(`/api/exam/attempt/user-status?testId=${testExamId}`));
    record("/api/exam/attempt/user-status", "GET", "Unauthenticated returns empty list", 200, res.status);

    setSession(studentUser);
    res = await getUserStatus(createReq(`/api/exam/attempt/user-status?testId=${testExamId}`));
    const statusJson = await res.json();
    record("/api/exam/attempt/user-status", "GET", "Owner user-status returns submitted attempt", 200, res.status);
    console.log(`✓ Owner user-status returned ${statusJson.data?.length} submitted attempts`);

    // ─────────────────────────────────────────────────────────────
    // Route 16: GET /api/exam/[testId]/leaderboard
    // ─────────────────────────────────────────────────────────────
    setSession(null);
    res = await getTestLeaderboard(createReq(`/api/exam/${testExamId}/leaderboard`), { params: Promise.resolve({ testId: testExamId! }) });
    record("/api/exam/[testId]/leaderboard", "GET", "Unauthenticated returns 401", 401, res.status);

    setSession(studentUser);
    res = await getTestLeaderboard(createReq("/api/exam/nonexistent-id/leaderboard"), { params: Promise.resolve({ testId: "nonexistent-id" }) });
    record("/api/exam/[testId]/leaderboard", "GET", "Unknown testId returns 404", 404, res.status);

    setSession(studentUser);
    res = await getTestLeaderboard(createReq(`/api/exam/${testExamId}/leaderboard`), { params: Promise.resolve({ testId: testExamId! }) });
    record("/api/exam/[testId]/leaderboard", "GET", "Authenticated returns 200", 200, res.status);
    const leaderboardJson = await res.json();

    console.log("\n--- ACTUAL LEADERBOARD JSON RESPONSE ---");
    console.log(JSON.stringify(leaderboardJson, null, 2));

    // Confirm no personal fields in leaderboard
    const topEntry = leaderboardJson.data?.leaderboard?.[0];
    if (topEntry) {
      const forbiddenKeys = ["id", "userId", "email", "phoneNumber", "password"];
      const foundForbidden = forbiddenKeys.filter((k) => k in topEntry);
      if (foundForbidden.length > 0) {
        console.error("❌ CRITICAL: Personal fields found in leaderboard:", foundForbidden);
      } else {
        console.log("✓ VERIFIED: Leaderboard contains ONLY display and score fields! No user IDs, emails, or personal fields.");
      }
    }

    console.log("\n======================================================================");
    console.log("ROUTE-LEVEL TESTS SUMMARY");
    console.log("======================================================================\n");
    const failedCount = resultsTable.filter((r) => !r.passed).length;
    console.log(`Total tests executed: ${resultsTable.length}`);
    console.log(`Passed: ${resultsTable.length - failedCount}`);
    console.log(`Failed: ${failedCount}`);

    if (failedCount > 0) {
      throw new Error(`${failedCount} route-level tests failed!`);
    }

  } finally {
    console.log("\n======================================================================");
    console.log("CLEANING UP ROUTE-LEVEL TEST DATA...");
    setMockSessionProvider(null);

    // Delete attempts and enrollments created
    if (studentUser) {
      await prisma.examAttempt.deleteMany({ where: { userId: studentUser.id } }).catch(() => {});
      await prisma.examSeriesEnrollment.deleteMany({ where: { userId: studentUser.id } }).catch(() => {});
    }
    if (otherStudentUser) {
      await prisma.examAttempt.deleteMany({ where: { userId: otherStudentUser.id } }).catch(() => {});
      await prisma.examSeriesEnrollment.deleteMany({ where: { userId: otherStudentUser.id } }).catch(() => {});
    }
    if (teacherUser) {
      await prisma.examAttempt.deleteMany({ where: { userId: teacherUser.id } }).catch(() => {});
    }
    if (otherTeacherUser) {
      await prisma.examAttempt.deleteMany({ where: { userId: otherTeacherUser.id } }).catch(() => {});
    }

    // Delete series (cascades to tests & questions)
    if (testSeriesId) {
      await prisma.examSeries.delete({ where: { id: testSeriesId } }).catch(() => {});
      console.log("Deleted testSeries:", testSeriesId);
    }
    if (proSeriesId) {
      await prisma.examSeries.delete({ where: { id: proSeriesId } }).catch(() => {});
      console.log("Deleted proSeries:", proSeriesId);
    }

    // Delete test users
    if (studentUser) await prisma.user.delete({ where: { id: studentUser.id } }).catch(() => {});
    if (otherStudentUser) await prisma.user.delete({ where: { id: otherStudentUser.id } }).catch(() => {});
    if (teacherUser) await prisma.user.delete({ where: { id: teacherUser.id } }).catch(() => {});
    if (otherTeacherUser) await prisma.user.delete({ where: { id: otherTeacherUser.id } }).catch(() => {});
    if (adminUser) await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});

    console.log("CLEANUP COMPLETE: All test records cleanly removed.");
    console.log("======================================================================\n");
  }
}

runRouteLevelHttpTests().catch((err) => {
  console.error("Test execution threw error:", err);
  process.exit(1);
});
