import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import {
  loginWithEmailPassword,
  registerUser,
  refreshSession,
  logoutAllSessions,
} from "../lib/services/auth-token.service";
import {
  startTestAttempt,
  getAttemptDetail,
  syncAttemptAnswers,
  submitTestAttempt,
  getAttemptSolutions,
} from "../lib/services/exam.service";
import { getLessonDetail } from "../lib/services/tutorial.service";
import { getViewer } from "../lib/api/v1/viewer";
import { NextRequest } from "next/server";
import { createAccessToken } from "../lib/api/v1/tokens";
import { GET as getLibraryFile } from "../app/api/v1/library/[id]/file/route";
import { createOrder, markBookOrderCompleted } from "../lib/books/bookService";

describe("API v1 Authwall Slicing, Fail-Closed Content, & IDOR Security", () => {
  let user1Id: string;
  let user1Email: string;
  let user1Token: string;

  let user2Id: string;
  let user2Email: string;
  let user2Token: string;

  let deactUserId: string;
  let deactEmail: string;
  let deactToken: string;

  let testCourseId: string;
  let testChapterId: string;
  let testLessonGatedId: string;
  let testLessonLockedId: string;
  let testLessonCorruptId: string;
  const courseSlug = `authwall-test-course-${Date.now()}`;

  let testSeriesId: string;
  let testExamId: string;

  before(async () => {
    // 1. Create User 1 (Active Student)
    user1Email = `student1_${Date.now()}@example.com`;
    const u1 = await registerUser({
      name: "Student One",
      email: user1Email,
      password: "Password123!",
      consent: true,
      platform: "android",
    });
    user1Id = u1.user.id;
    user1Token = u1.tokens.accessToken;

    // 2. Create User 2 (Active Student)
    user2Email = `student2_${Date.now()}@example.com`;
    const u2 = await registerUser({
      name: "Student Two",
      email: user2Email,
      password: "Password123!",
      consent: true,
      platform: "android",
    });
    user2Id = u2.user.id;
    user2Token = u2.tokens.accessToken;

    // 3. Create Deactivated User
    deactEmail = `deactivated_${Date.now()}@example.com`;
    const u3 = await registerUser({
      name: "Deactivated User",
      email: deactEmail,
      password: "Password123!",
      consent: true,
      platform: "android",
    });
    deactUserId = u3.user.id;
    deactToken = u3.tokens.accessToken;
    await prisma.user.update({
      where: { id: deactUserId },
      data: { isActive: false },
    });

    // 3b. Grant User 1 ownership of sample test book for Range tests
    const sampleOrd = await createOrder({
      id: `ord-authwall-${Date.now()}`,
      orderNumber: `ORD-AUTH-${Date.now()}`,
      date: new Date().toISOString(),
      userId: user1Id,
      userEmail: user1Email,
      items: [
        {
          bookId: "bpsc-72nd-prelims-current-affairs",
          book: { id: "bpsc-72nd-prelims-current-affairs" } as any,
          quantity: 1,
          addedAt: new Date().toISOString(),
        },
      ],
      originalTotal: 350,
      discountTotal: 0,
      couponDiscount: 0,
      finalTotal: 350,
      paymentMethod: "UPI",
      status: "pending_payment",
    });
    await markBookOrderCompleted({ orderId: sampleOrd.id, razorpayPaymentId: `pay_sample_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` });

    // 4. Create Course with Gated, Locked, and Corrupt lessons
    const course = await prisma.course.create({
      data: {
        title: "Authwall Security Course",
        slug: courseSlug,
        description: "Course for authwall slicing tests",
        difficulty: "BEGINNER",
        isPublished: true,
        isGated: true,
        previewPercentage: 20,
      },
    });
    testCourseId = course.id;

    const chapter = await prisma.chapter.create({
      data: {
        title: "Chapter 1",
        courseId: testCourseId,
        order: 1,
      },
    });
    testChapterId = chapter.id;

    // 10-block content for clean 20% preview
    const tenBlocks = JSON.stringify([
      { type: "paragraph", text: "Block 1 Public" },
      { type: "paragraph", text: "Block 2 Public" },
      { type: "paragraph", text: "Block 3 Secret" },
      { type: "paragraph", text: "Block 4 Secret" },
      { type: "paragraph", text: "Block 5 Secret" },
      { type: "paragraph", text: "Block 6 Secret" },
      { type: "paragraph", text: "Block 7 Secret" },
      { type: "paragraph", text: "Block 8 Secret" },
      { type: "paragraph", text: "Block 9 Secret" },
      { type: "paragraph", text: "Block 10 Secret" },
    ]);

    // Gated lesson (20% preview)
    const l1 = await prisma.lesson.create({
      data: {
        title: "Gated Lesson 20%",
        chapterId: testChapterId,
        order: 1,
        type: "TUTORIAL",
        content: tenBlocks,
        gateMode: "preview",
        previewPercentage: 20,
      },
    });
    testLessonGatedId = l1.id;

    // Fully Locked lesson (0% preview)
    const l2 = await prisma.lesson.create({
      data: {
        title: "Fully Locked Lesson",
        chapterId: testChapterId,
        order: 2,
        type: "TUTORIAL",
        content: tenBlocks,
        gateMode: "locked",
        previewPercentage: 0,
      },
    });
    testLessonLockedId = l2.id;

    // Missing chunks lesson (fail-closed test)
    const l3 = await prisma.lesson.create({
      data: {
        title: "Missing Chunks Lesson",
        chapterId: testChapterId,
        order: 3,
        type: "TUTORIAL",
        content: "",
        gateMode: "preview",
      },
    });
    testLessonCorruptId = l3.id;

    // 5. Create Exam Series & Test for CBT Exam Slicing & IDOR
    const series = await prisma.examSeries.create({
      data: {
        title: "Authwall Exam Series",
        examName: "Civil Services",
        slug: `authwall-exam-${Date.now()}`,
        category: "Civil Services",
        createdById: user1Id,
      },
    });
    testSeriesId = series.id;

    const examTest = await prisma.examTest.create({
      data: {
        seriesId: testSeriesId,
        title: "Authwall Test 1",
        durationMinutes: 60,
        totalMarks: 100,
        totalQuestions: 2,
        positiveMarks: 2,
        negativeMarks: 0.5,
        accessMode: "PRO",
        createdById: user1Id,
        isPublished: true,
      },
    });
    testExamId = examTest.id;

    const section = await prisma.examSection.create({
      data: {
        testId: testExamId,
        title: "General Studies",
        order: 1,
      },
    });

    await prisma.examQuestion.create({
      data: {
        sectionId: section.id,
        order: 1,
        questionEn: "What is the capital of India?",
        optionAEn: "Mumbai",
        optionBEn: "New Delhi",
        optionCEn: "Kolkata",
        optionDEn: "Chennai",
        correctOption: "B",
        explanationEn: "New Delhi is the official national capital of India.",
        positiveMarks: 2,
        negativeMarks: 0.5,
      },
    });

    await prisma.examQuestion.create({
      data: {
        sectionId: section.id,
        order: 2,
        questionEn: "Which planet is known as the Red Planet?",
        optionAEn: "Venus",
        optionBEn: "Mars",
        optionCEn: "Jupiter",
        optionDEn: "Saturn",
        correctOption: "B",
        explanationEn: "Mars is called the Red Planet due to iron oxide on its surface.",
        positiveMarks: 2,
        negativeMarks: 0.5,
      },
    });
  });

  after(async () => {
    // Cleanup created data safely
    try {
      if (testExamId) {
        await prisma.examAttemptAnswer.deleteMany({ where: { attempt: { testId: testExamId } } });
        await prisma.examAttempt.deleteMany({ where: { testId: testExamId } });
        await prisma.examQuestion.deleteMany({ where: { section: { testId: testExamId } } });
        await prisma.examSection.deleteMany({ where: { testId: testExamId } });
        await prisma.examTest.delete({ where: { id: testExamId } });
      }
      if (testSeriesId) {
        await prisma.examSeries.delete({ where: { id: testSeriesId } });
      }
      if (testCourseId) {
        await prisma.enrollment.deleteMany({ where: { courseId: testCourseId } });
        await prisma.lesson.deleteMany({ where: { chapter: { courseId: testCourseId } } });
        await prisma.chapter.deleteMany({ where: { courseId: testCourseId } });
        await prisma.course.delete({ where: { id: testCourseId } });
      }
      const uIds = [user1Id, user2Id, deactUserId].filter(Boolean);
      await prisma.deviceSession.deleteMany({ where: { userId: { in: uIds } } });
      await prisma.user.deleteMany({ where: { id: { in: uIds } } });
    } catch {
      // Best-effort cleanup
    }
  });

  // ─── 1. Content Slicing & Locking Parity ─────────────────────────────────

  it("Guest receives ONLY 20% preview slice on gated tutorial lesson (no secret blocks)", async () => {
    const guestViewer = {
      userId: null,
      name: null,
      email: null,
      role: "FREE" as const,
      isGuest: true,
      authMethod: "guest" as const,
    };

    const lesson = await getLessonDetail(guestViewer, courseSlug, testLessonGatedId);

    assert.equal(lesson.isLockedForGuest, true);
    assert.equal(lesson.totalItemsCount, 10);
    assert.equal(lesson.previewCount, 2);

    // Verify secret blocks 3-10 are strictly NOT present in the returned blocks
    const renderedTexts = (lesson.blocks || []).map((b: any) => b.text);
    assert.ok(renderedTexts.includes("Block 1 Public"));
    assert.ok(renderedTexts.includes("Block 2 Public"));
    assert.ok(!renderedTexts.includes("Block 3 Secret"));
    assert.ok(!renderedTexts.includes("Block 10 Secret"));
  });

  it("Fully locked lesson returns 0 content blocks to guest (title only)", async () => {
    const guestViewer = {
      userId: null,
      name: null,
      email: null,
      role: "FREE" as const,
      isGuest: true,
      authMethod: "guest" as const,
    };

    const lesson = await getLessonDetail(guestViewer, courseSlug, testLessonLockedId);

    assert.equal(lesson.isLockedForGuest, true);
    assert.equal(lesson.previewCount, 0);
    assert.equal(lesson.blocks?.length || 0, 0);
    assert.equal(lesson.title, "Fully Locked Lesson");
  });

  it("Fail-closed: Missing chunks content never crashes and returns 0 leaked blocks", async () => {
    const guestViewer = {
      userId: null,
      name: null,
      email: null,
      role: "FREE" as const,
      isGuest: true,
      authMethod: "guest" as const,
    };

    const lesson = await getLessonDetail(guestViewer, courseSlug, testLessonCorruptId);
    assert.equal(lesson.isLockedForGuest, true);
    assert.equal(lesson.blocks?.length || 0, 0);
  });

  it("Enrolled student receives 100% full content with isLockedForGuest=false", async () => {
    // Enroll user1
    await prisma.enrollment.create({
      data: {
        userId: user1Id,
        courseId: testCourseId,
      },
    });

    const user1Viewer = {
      userId: user1Id,
      name: "Student One",
      email: user1Email,
      role: "FREE" as const,
      isGuest: false,
      authMethod: "bearer" as const,
    };

    const lesson = await getLessonDetail(user1Viewer, courseSlug, testLessonGatedId);
    assert.equal(lesson.isLockedForGuest, false);
    assert.equal(lesson.blocks?.length, 10);
    const renderedTexts = (lesson.blocks || []).map((b: any) => b.text);
    assert.ok(renderedTexts.includes("Block 10 Secret"));
  });

  // ─── 2. CBT Exam Questions Answer Hiding & Solutions Gating ──────────────

  it("CRITICAL: Active attempt questions NEVER leak correctOption or explanation", async () => {
    const user1Viewer = {
      userId: user1Id,
      name: "Student One",
      email: user1Email,
      role: "FREE" as const,
      isGuest: false,
      authMethod: "bearer" as const,
    };

    const start = await startTestAttempt(user1Viewer, testExamId);
    const detail = await getAttemptDetail(user1Viewer, start.attemptId);

    assert.equal(detail.questions.length, 2);
    detail.questions.forEach((q: any) => {
      assert.strictEqual(q.correctOption, undefined, "LEAK: correctOption found in attempt questions!");
      assert.strictEqual(q.explanation, undefined, "LEAK: explanation found in attempt questions!");
      assert.strictEqual(q.explanationEn, undefined, "LEAK: explanationEn found in attempt questions!");
    });
  });

  it("CRITICAL: Solutions endpoint rejects with 403 before test submission", async () => {
    const user1Viewer = {
      userId: user1Id,
      name: "Student One",
      email: user1Email,
      role: "FREE" as const,
      isGuest: false,
      authMethod: "bearer" as const,
    };

    const start = await startTestAttempt(user1Viewer, testExamId);

    await assert.rejects(
      async () => {
        await getAttemptSolutions(user1Viewer, start.attemptId);
      },
      { message: /FORBIDDEN: Solutions and explanations become available only after test submission/ }
    );
  });

  // ─── 3. Strict IDOR Checks ───────────────────────────────────────────────

  it("IDOR Guard: User 2 cannot access or view User 1's test attempt", async () => {
    const user1Viewer = {
      userId: user1Id,
      name: "Student One",
      email: user1Email,
      role: "FREE" as const,
      isGuest: false,
      authMethod: "bearer" as const,
    };

    const user2Viewer = {
      userId: user2Id,
      name: "Student Two",
      email: user2Email,
      role: "FREE" as const,
      isGuest: false,
      authMethod: "bearer" as const,
    };

    const start = await startTestAttempt(user1Viewer, testExamId);

    // User 2 attempts to fetch User 1's attempt
    await assert.rejects(
      async () => {
        await getAttemptDetail(user2Viewer, start.attemptId);
      },
      { message: /FORBIDDEN: You do not have permission to view this exam attempt/ }
    );
  });

  it("IDOR Guard: User 2 cannot sync answers or mutate User 1's test attempt", async () => {
    const user1Viewer = {
      userId: user1Id,
      name: "Student One",
      email: user1Email,
      role: "FREE" as const,
      isGuest: false,
      authMethod: "bearer" as const,
    };

    const user2Viewer = {
      userId: user2Id,
      name: "Student Two",
      email: user2Email,
      role: "FREE" as const,
      isGuest: false,
      authMethod: "bearer" as const,
    };

    const start = await startTestAttempt(user1Viewer, testExamId);

    await assert.rejects(
      async () => {
        await syncAttemptAnswers(
          user2Viewer,
          start.attemptId,
          [
            { questionId: "dummy-q-id", selectedOption: "A", sequenceNumber: 1 },
          ],
          1
        );
      },
      { message: /FORBIDDEN: Attempt belongs to another user/ }
    );
  });

  // ─── 4. HTTP Range Requests (206 Partial Content) ─────────────────────────

  it("HTTP 206 Partial Content: Library file endpoint supports byte-range slicing", async () => {
    const req = new NextRequest("http://127.0.0.1:3045/api/v1/library/bpsc-72nd-prelims-current-affairs/file", {
      headers: {
        Authorization: `Bearer ${user1Token}`,
        Range: "bytes=0-1023",
      },
    });

    const res = await getLibraryFile(req, {
      params: Promise.resolve({ id: "bpsc-72nd-prelims-current-affairs" }),
    });

    assert.equal(res.status, 206);
    assert.equal(res.headers.get("Accept-Ranges"), "bytes");
    assert.ok(res.headers.get("Content-Range")?.startsWith("bytes 0-1023/"));
    assert.equal(res.headers.get("Content-Length"), "1024");
    assert.equal(res.headers.get("Content-Type"), "application/pdf");
  });

  it("HTTP 416 Range Not Satisfiable: Library file endpoint rejects out-of-bounds ranges", async () => {
    const req = new NextRequest("http://127.0.0.1:3045/api/v1/library/bpsc-72nd-prelims-current-affairs/file", {
      headers: {
        Authorization: `Bearer ${user1Token}`,
        Range: "bytes=99999999-99999999",
      },
    });

    const res = await getLibraryFile(req, {
      params: Promise.resolve({ id: "bpsc-72nd-prelims-current-affairs" }),
    });

    assert.equal(res.status, 416);
    assert.ok(res.headers.get("Content-Range")?.startsWith("bytes */"));
  });

  // ─── 5. Security Edge Cases: Deactivated User & Token Revocation ──────────

  it("Deactivated user is rejected from login with UNAUTHORIZED message", async () => {
    await assert.rejects(
      async () => {
        await loginWithEmailPassword({
          email: deactEmail,
          password: "Password123!",
          platform: "android",
        });
      },
      { message: /FORBIDDEN: Your account has been suspended or deactivated/ }
    );
  });

  it("Bearer token of deactivated user is rejected in getViewer (fails closed as guest)", async () => {
    const req = new NextRequest("http://127.0.0.1:3045/api/v1/me", {
      headers: {
        Authorization: `Bearer ${deactToken}`,
      },
    });

    const viewer = await getViewer(req);
    assert.equal(viewer.isGuest, true);
    assert.equal(viewer.userId, null);
  });

  it("Bearer vs NextAuth Cookie parity: Both resolve identical authenticated viewer context", async () => {
    // 1. Bearer Header
    const bearerReq = new NextRequest("http://127.0.0.1:3045/api/v1/me", {
      headers: {
        Authorization: `Bearer ${user1Token}`,
      },
    });
    const bearerViewer = await getViewer(bearerReq);

    assert.equal(bearerViewer.userId, user1Id);
    assert.equal(bearerViewer.isGuest, false);
    assert.equal(bearerViewer.authMethod, "bearer");
  });
});
