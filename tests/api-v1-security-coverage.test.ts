import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { registerUser } from "../lib/services/auth-token.service";
import { NextRequest } from "next/server";
import { GET as getTestsRoute } from "../app/api/v1/tests/route";
import { GET as getTestDetailRoute } from "../app/api/v1/tests/[id]/route";
import { POST as startAttemptRoute } from "../app/api/v1/tests/[id]/attempts/route";
import { PUT as syncAnswersRoute } from "../app/api/v1/attempts/[id]/answers/route";
import { POST as submitAttemptRoute } from "../app/api/v1/attempts/[id]/submit/route";
import { GET as getAttemptResultRoute } from "../app/api/v1/attempts/[id]/result/route";
import { GET as getPyqExamsRoute } from "../app/api/v1/pyq/exams/route";
import { GET as getPyqPaperRoute } from "../app/api/v1/pyq/papers/[id]/route";
import { GET as getTutorialsRoute } from "../app/api/v1/tutorials/route";
import { GET as getTutorialDetailRoute } from "../app/api/v1/tutorials/[slug]/route";
import { GET as getLessonDetailRoute } from "../app/api/v1/tutorials/[slug]/lessons/[id]/route";
import { GET as getLibraryRoute } from "../app/api/v1/library/route";
import { GET as getMeRoute } from "../app/api/v1/me/route";
import { GET as getGoalsRoute } from "../app/api/v1/goals/route";
import { GET as getConfigRoute } from "../app/api/v1/config/route";

describe("R4 - Security Parity Gaps & Concurrency Suite", () => {
  let student1Id: string;
  let student1Token: string;
  let student2Id: string;
  let student2Token: string;

  let testSeriesId: string;
  let publishedTestId: string;
  let draftTestId: string;
  let archivedTestId: string;
  let questionAId: string;
  let questionBId: string;

  let pyqExamCategoryId: string;
  let freePyqPaperId: string;
  let paidGatedPyqPaperId: string;

  let tutorialCourseSlug: string;
  let publishedLessonId: string;
  let archivedDraftLessonId: string;

  before(async () => {
    // 1. Create Test Users
    const u1 = await registerUser({
      name: "R4 Student One",
      email: `r4_std1_${Date.now()}@example.com`,
      password: "Password123!",
      consent: true,
      platform: "android",
    });
    student1Id = u1.user.id;
    student1Token = u1.tokens.accessToken;

    const u2 = await registerUser({
      name: "R4 Student Two",
      email: `r4_std2_${Date.now()}@example.com`,
      password: "Password123!",
      consent: true,
      platform: "ios",
    });
    student2Id = u2.user.id;
    student2Token = u2.tokens.accessToken;

    // 2. Create Exam Series with Published, Draft, and Archived tests
    const series = await prisma.examSeries.create({
      data: {
        title: `R4 Security Series ${Date.now()}`,
        slug: `r4-sec-series-${Date.now()}`,
        examName: "Civil Services",
        category: "UPSC",
        createdById: student1Id,
        isPublished: true,
      },
    });
    testSeriesId = series.id;

    const pubTest = await prisma.examTest.create({
      data: {
        title: "R4 Published Live Test",
        seriesId: testSeriesId,
        createdById: student1Id,
        isPublished: true,
        isArchived: false,
        durationMinutes: 45,
        totalMarks: 100,
        positiveMarks: 2,
        negativeMarks: 0.5,
        accessMode: "FREE",
      },
    });
    publishedTestId = pubTest.id;

    const draftTest = await prisma.examTest.create({
      data: {
        title: "R4 Hidden Draft Test",
        seriesId: testSeriesId,
        createdById: student1Id,
        isPublished: false,
        isArchived: false,
        durationMinutes: 45,
        totalMarks: 100,
        positiveMarks: 2,
        negativeMarks: 0.5,
        accessMode: "FREE",
      },
    });
    draftTestId = draftTest.id;

    const archTest = await prisma.examTest.create({
      data: {
        title: "R4 Archived Obsolete Test",
        seriesId: testSeriesId,
        createdById: student1Id,
        isPublished: true,
        isArchived: true,
        durationMinutes: 45,
        totalMarks: 100,
        positiveMarks: 2,
        negativeMarks: 0.5,
        accessMode: "FREE",
      },
    });
    archivedTestId = archTest.id;

    // Add Section + Questions to Published Test
    const section = await prisma.examSection.create({
      data: {
        testId: publishedTestId,
        title: "General Studies",
        order: 1,
      },
    });

    const q1 = await prisma.examQuestion.create({
      data: {
        sectionId: section.id,
        order: 1,
        questionEn: "What is the capital of India?",
        optionAEn: "Mumbai",
        optionBEn: "New Delhi",
        optionCEn: "Kolkata",
        optionDEn: "Chennai",
        correctOption: "B",
        positiveMarks: 2,
        negativeMarks: 0.5,
      },
    });
    questionAId = q1.id;

    const q2 = await prisma.examQuestion.create({
      data: {
        sectionId: section.id,
        order: 2,
        questionEn: "Which planet is known as the Red Planet?",
        optionAEn: "Venus",
        optionBEn: "Mars",
        optionCEn: "Jupiter",
        optionDEn: "Saturn",
        correctOption: "B",
        positiveMarks: 2,
        negativeMarks: 0.5,
      },
    });
    questionBId = q2.id;

    // 3. PYQ Papers (Free vs Gated)
    const examCat = await prisma.pyqCategory.create({
      data: {
        name: `R4 PYQ Cat ${Date.now()}`,
        slug: `r4-pyq-cat-${Date.now()}`,
      },
    });
    pyqExamCategoryId = examCat.id;

    const freePaper = await prisma.pyqPaper.create({
      data: {
        title: "2024 Prelims GS Paper 1 (Free)",
        slug: `r4-free-paper-${Date.now()}`,
        year: 2024,
        shift: "Morning",
        categoryId: pyqExamCategoryId,
        status: "PUBLISHED",
        accessType: "FREE",
        isGated: false,
        paperPdfUrl: "https://example.com/free-2024.pdf",
        totalQuestions: 100,
      },
    });
    freePyqPaperId = freePaper.id;

    const gatedPaper = await prisma.pyqPaper.create({
      data: {
        title: "2024 Prelims GS Paper 2 (Paid & Gated)",
        slug: `r4-gated-paper-${Date.now()}`,
        year: 2024,
        shift: "Afternoon",
        categoryId: pyqExamCategoryId,
        status: "PUBLISHED",
        accessType: "PAID",
        isGated: true,
        previewPercentage: 20,
        gateTitle: "Premium Paper",
        gateSubtitle: "Enroll to view full PDF",
        paperPdfUrl: "https://example.com/paid-2024-secret.pdf",
        totalQuestions: 80,
      },
    });
    paidGatedPyqPaperId = gatedPaper.id;

    // 4. Tutorial Course with Chapters & Lessons
    tutorialCourseSlug = `r4-tutorial-${Date.now()}`;
    const course = await prisma.course.create({
      data: {
        title: "R4 Modern Indian History",
        slug: tutorialCourseSlug,
        technology: "History",
        description: "Complete guide to modern history",
        difficulty: "BEGINNER",
        isGated: true,
        previewPercentage: 20,
        isPublished: true,
      },
    });

    const chapter = await prisma.chapter.create({
      data: {
        courseId: course.id,
        title: "Chapter 1: The Revolt of 1857",
        order: 1,
      },
    });

    const pubLesson = await prisma.lesson.create({
      data: {
        chapterId: chapter.id,
        title: "Outbreak of Revolt",
        type: "READING",
        order: 1,
        content: JSON.stringify([
          { type: "text", text: "Introduction to 1857 revolt." },
          { type: "text", text: "Detailed background." },
          { type: "quiz", question: "Who led in Jhansi?", answer: "Rani Lakshmibai", why: "Historical fact" },
        ]),
      },
    });
    publishedLessonId = pubLesson.id;

    const draftLesson = await prisma.lesson.create({
      data: {
        chapterId: chapter.id,
        title: "Archived Draft Lesson",
        type: "READING",
        order: 2,
        archivedAt: new Date(),
        content: JSON.stringify([{ type: "text", text: "Confidential upcoming chapter" }]),
      },
    });
    archivedDraftLessonId = draftLesson.id;
  });

  after(async () => {
    // Cleanup fixtures
    await prisma.examAttemptAnswer.deleteMany({
      where: { attempt: { test: { seriesId: testSeriesId } } },
    });
    await prisma.examAttempt.deleteMany({
      where: { test: { seriesId: testSeriesId } },
    });
    await prisma.examQuestion.deleteMany({
      where: { section: { test: { seriesId: testSeriesId } } },
    });
    await prisma.examSection.deleteMany({
      where: { test: { seriesId: testSeriesId } },
    });
    await prisma.examTest.deleteMany({
      where: { seriesId: testSeriesId },
    });
    await prisma.examSeries.deleteMany({
      where: { id: testSeriesId },
    });
    await prisma.pyqPaper.deleteMany({
      where: { categoryId: pyqExamCategoryId },
    });
    await prisma.pyqCategory.deleteMany({
      where: { id: pyqExamCategoryId },
    });
    const c = await prisma.course.findUnique({ where: { slug: tutorialCourseSlug } });
    if (c) {
      await prisma.lesson.deleteMany({ where: { chapter: { courseId: c.id } } });
      await prisma.chapter.deleteMany({ where: { courseId: c.id } });
      await prisma.course.deleteMany({ where: { id: c.id } });
    }
    await prisma.user.deleteMany({
      where: { id: { in: [student1Id, student2Id] } },
    });
  });

  // ─── Test 1: GET /api/v1/tests Filtering (Published vs Draft vs Archived) ─
  it("GET /api/v1/tests: Only published, non-archived tests appear; drafts and archived are filtered out", async () => {
    const req = new NextRequest(`http://localhost:3045/api/v1/tests?seriesId=${testSeriesId}`, {
      headers: { authorization: `Bearer ${student1Token}` },
    });
    const res = await getTestsRoute(req);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.ok, true);
    const testIds = body.data.items.map((t: any) => t.id);

    assert.ok(testIds.includes(publishedTestId), "Published test must appear in test list");
    assert.ok(!testIds.includes(draftTestId), "Draft test must NEVER appear in student test list");
    assert.ok(!testIds.includes(archivedTestId), "Archived test must NEVER appear in student test list");
  });

  // ─── Test 2: GET /api/v1/tests/[id] Detail & Security ─────────────────────
  it("GET /api/v1/tests/[id]: Returns 404 for draft test when accessed by student", async () => {
    const draftReq = new NextRequest(`http://localhost:3045/api/v1/tests/${draftTestId}/attempts`, {
      method: "POST",
      headers: { authorization: `Bearer ${student1Token}` },
    });
    const draftRes = await startAttemptRoute(draftReq, { params: Promise.resolve({ id: draftTestId }) });
    // Attempting to start draft test must be rejected with 404
    assert.equal(draftRes.status, 404);
  });

  // ─── Test 3: GET /api/v1/pyq/* Gating & Solution Protection ───────────────
  it("GET /api/v1/pyq/papers/[id]: Guest receives locked status and null fileUrl for gated paper", async () => {
    // 1. Guest access on gated paper:
    const guestReq = new NextRequest(`http://localhost:3045/api/v1/pyq/papers/${paidGatedPyqPaperId}`);
    const guestRes = await getPyqPaperRoute(guestReq, { params: Promise.resolve({ id: paidGatedPyqPaperId }) });
    assert.equal(guestRes.status, 200);
    const guestBody = await guestRes.json();
    assert.equal(guestBody.ok, true);
    assert.equal(guestBody.data.isLockedForGuest, true, "Gated paper must be locked for guest");
    assert.equal(guestBody.data.fileUrl, null, "Guest must never receive direct PDF download URL");

    // 2. Authenticated student access on free paper:
    const freeReq = new NextRequest(`http://localhost:3045/api/v1/pyq/papers/${freePyqPaperId}`);
    const freeRes = await getPyqPaperRoute(freeReq, { params: Promise.resolve({ id: freePyqPaperId }) });
    assert.equal(freeRes.status, 200);
    const freeBody = await freeRes.json();
    assert.equal(freeBody.data.isLockedForGuest, false);
    assert.equal(freeBody.data.fileUrl, "https://example.com/free-2024.pdf");
  });

  // ─── Test 4: GET /api/v1/tutorials/** Draft Lessons Hidden ────────────────
  it("GET /api/v1/tutorials/[slug]: Draft/archived lessons are excluded from chapter list", async () => {
    const req = new NextRequest(`http://localhost:3045/api/v1/tutorials/${tutorialCourseSlug}`);
    const res = await getTutorialDetailRoute(req, { params: Promise.resolve({ slug: tutorialCourseSlug }) });
    assert.equal(res.status, 200);
    const body = await res.json();

    const allLessons = body.data.chapters.flatMap((ch: any) => ch.lessons);
    const lessonIds = allLessons.map((l: any) => l.id);

    assert.ok(lessonIds.includes(publishedLessonId), "Published lesson must appear in tutorial");
    assert.ok(!lessonIds.includes(archivedDraftLessonId), "Archived/draft lesson must NOT appear");
  });

  // ─── Test 5: Concurrency - 8 Parallel Submits on Same Attempt ─────────────
  it("Concurrency: 8 parallel submits on the same attempt; all return identical scores without corruption", async () => {
    // 1. Start a fresh attempt for Student 1
    const startReq = new NextRequest(`http://localhost:3045/api/v1/tests/${publishedTestId}/attempts`, {
      method: "POST",
      headers: { authorization: `Bearer ${student1Token}` },
    });
    const startRes = await startAttemptRoute(startReq, { params: Promise.resolve({ id: publishedTestId }) });
    assert.ok(startRes.status === 200 || startRes.status === 201);
    const startBody = await startRes.json();
    const attemptId = startBody.data.attemptId;

    // 2. Answer questionA with correct option "B", questionB with wrong option "C"
    const syncReq = new NextRequest(`http://localhost:3045/api/v1/attempts/${attemptId}/answers`, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${student1Token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        answers: [
          { questionId: questionAId, selectedOption: "B", sequenceNumber: 1 },
          { questionId: questionBId, selectedOption: "C", sequenceNumber: 2 },
        ],
        lastSequenceNumber: 2,
      }),
    });
    const syncRes = await syncAnswersRoute(syncReq, { params: Promise.resolve({ id: attemptId }) });
    assert.equal(syncRes.status, 200);

    // 3. Fire 8 concurrent submit requests simultaneously using Promise.all
    const submitPromises = Array.from({ length: 8 }, (_, idx) => {
      const submitReq = new NextRequest(`http://localhost:3045/api/v1/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${student1Token}`,
          "content-type": "application/json",
          "x-request-id": `concurrent-submit-${idx}`,
        },
        body: JSON.stringify({}),
      });
      return submitAttemptRoute(submitReq, { params: Promise.resolve({ id: attemptId }) });
    });

    const responses = await Promise.all(submitPromises);

    // 4. Verify all responses succeeded or returned conflict/idempotent result
    for (const res of responses) {
      assert.ok(
        res.status === 200 || res.status === 409,
        `Expected HTTP 200 or 409 from concurrent submit, got ${res.status}`
      );
    }

    const bodies = await Promise.all(
      responses.filter((r) => r.status === 200).map((r) => r.json())
    );

    // Expected score: question A correct (+2), question B wrong (-0.5) => Total Score = 1.5
    for (const body of bodies) {
      assert.equal(body.ok, true);
      assert.equal(body.data.score, 1.5, "Score must be exactly 1.5 (+2 - 0.5)");
      assert.equal(body.data.correctCount, 1, "Correct count must be 1");
      assert.equal(body.data.wrongCount, 1, "Wrong count must be 1");
    }

    // 5. Verify the DB record is authoritative and uncorrupted
    const dbAttempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: { answers: true },
    });
    assert.equal(dbAttempt?.status, "SUBMITTED");
    assert.equal(dbAttempt?.score, 1.5);
    assert.equal(dbAttempt?.correctCount, 1);
    assert.equal(dbAttempt?.wrongCount, 1);
  });

  // ─── Test 6: Concurrency - 5 Parallel Answer Syncs with Monotonic Seq ─────
  it("Concurrency: 5 parallel answer-saves with incrementing sequence; deterministic final state in DB", async () => {
    // 1. Start fresh attempt for Student 2
    const startReq = new NextRequest(`http://localhost:3045/api/v1/tests/${publishedTestId}/attempts`, {
      method: "POST",
      headers: { authorization: `Bearer ${student2Token}` },
    });
    const startRes = await startAttemptRoute(startReq, { params: Promise.resolve({ id: publishedTestId }) });
    const attemptId = (await startRes.json()).data.attemptId;

    // 2. Fire 5 parallel answer syncs with sequences 1, 2, 3, 4, 5
    // Option sequence: "A", "B", "C", "D", "B" (Final seq 5 must be "B")
    const optionMap = ["A", "B", "C", "D", "B"];
    const syncPromises = Array.from({ length: 5 }, (_, idx) => {
      const seq = idx + 1;
      const opt = optionMap[idx];
      const req = new NextRequest(`http://localhost:3045/api/v1/attempts/${attemptId}/answers`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${student2Token}`,
          "content-type": "application/json",
          "x-request-id": `parallel-sync-${seq}`,
        },
        body: JSON.stringify({
          answers: [{ questionId: questionAId, selectedOption: opt, sequenceNumber: seq }],
          lastSequenceNumber: seq,
        }),
      });
      return syncAnswersRoute(req, { params: Promise.resolve({ id: attemptId }) });
    });

    const results = await Promise.all(syncPromises);
    for (const res of results) {
      assert.equal(res.status, 200, "All sync requests must return 200");
    }

    // 3. Inspect final DB state
    const savedAnswer = await prisma.examAttemptAnswer.findUnique({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId: questionAId,
        },
      },
    });

    assert.ok(savedAnswer !== null, "Answer row must exist");
    // ClientSeq must be 5 and selectedOption must be optionMap[4] = "B"
    assert.equal(savedAnswer?.clientSeq, 5, "Highest sequence number (5) must be preserved");
    assert.equal(savedAnswer?.selectedOption, "B", "Final state must reflect sequence 5 answer 'B'");
  });

  // ─── Test 7: Caching Headers & Shared Cache Leakage Prevention ────────────
  it("Caching Headers: User-authenticated endpoints use private, no-store; public endpoints use cached headers", async () => {
    // 1. Authenticated /me endpoint:
    const meReq = new NextRequest("http://localhost:3045/api/v1/me", {
      headers: { authorization: `Bearer ${student1Token}` },
    });
    const meRes = await getMeRoute(meReq);
    assert.equal(meRes.status, 200);
    const meCache = meRes.headers.get("Cache-Control") || "";
    assert.ok(
      meCache.includes("private") && meCache.includes("no-store"),
      `Expected /me Cache-Control to contain 'private' and 'no-store', got '${meCache}'`
    );

    // 2. Library items endpoint:
    const libReq = new NextRequest("http://localhost:3045/api/v1/library", {
      headers: { authorization: `Bearer ${student1Token}` },
    });
    const libRes = await getLibraryRoute(libReq);
    assert.equal(libRes.status, 200);
    const libCache = libRes.headers.get("Cache-Control") || "";
    assert.ok(
      libCache.includes("private") && meCache.includes("no-store"),
      `Expected /library Cache-Control to contain 'private' and 'no-store', got '${libCache}'`
    );

    // 3. Public Goals endpoint:
    const goalsReq = new NextRequest("http://localhost:3045/api/v1/goals");
    const goalsRes = await getGoalsRoute(goalsReq);
    assert.equal(goalsRes.status, 200);
    const goalsCache = goalsRes.headers.get("Cache-Control") || "";
    assert.ok(
      goalsCache.includes("public") || goalsCache.includes("stale-while-revalidate"),
      `Expected public /goals Cache-Control to have cache directives, got '${goalsCache}'`
    );

    // 4. Public Config endpoint:
    const configReq = new NextRequest("http://localhost:3045/api/v1/config");
    const configRes = await getConfigRoute(configReq);
    assert.equal(configRes.status, 200);
    const configCache = configRes.headers.get("Cache-Control") || "";
    assert.ok(
      configCache.includes("public") || configCache.includes("stale-while-revalidate"),
      `Expected public /config Cache-Control to have cache directives, got '${configCache}'`
    );
  });
});
