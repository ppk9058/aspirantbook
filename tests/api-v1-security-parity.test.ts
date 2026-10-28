import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { registerUser, logoutAllSessions } from "../lib/services/auth-token.service";
import { NextRequest } from "next/server";
import { POST as startAttemptRoute } from "../app/api/v1/tests/[id]/attempts/route";
import { GET as getAttemptRoute } from "../app/api/v1/attempts/[id]/route";
import { PUT as syncAnswersRoute } from "../app/api/v1/attempts/[id]/answers/route";
import { POST as submitAttemptRoute } from "../app/api/v1/attempts/[id]/submit/route";
import { GET as getResultRoute } from "../app/api/v1/attempts/[id]/result/route";
import { GET as getSolutionsRoute } from "../app/api/v1/attempts/[id]/solutions/route";
import { GET as getLessonRoute } from "../app/api/v1/tutorials/[slug]/lessons/[id]/route";
import { GET as getLibraryFileRoute } from "../app/api/v1/library/[id]/file/route";
import { createOrder, markBookOrderCompleted } from "../lib/books/bookService";

describe("API v1 Security Parity & Exam Integrity (Real-Flow HTTP)", () => {
  let user1Id: string;
  let user1Email: string;
  let user1Token: string;

  let user2Id: string;
  let user2Email: string;
  let user2Token: string;

  let deactUserId: string;
  let deactEmail: string;
  let deactToken: string;

  let testSeriesId: string;
  let standardTestId: string;
  let liveTestId: string;
  let question1Id: string;
  let question2Id: string;

  let courseSlug: string;
  let lessonQuizId: string;

  before(async () => {
    // 1. Users
    user1Email = `sec_std1_${Date.now()}@example.com`;
    const u1 = await registerUser({
      name: "Security Student 1",
      email: user1Email,
      password: "Password123!",
      consent: true,
      platform: "android",
    });
    user1Id = u1.user.id;
    user1Token = u1.tokens.accessToken;

    user2Email = `sec_std2_${Date.now()}@example.com`;
    const u2 = await registerUser({
      name: "Security Student 2",
      email: user2Email,
      password: "Password123!",
      consent: true,
      platform: "android",
    });
    user2Id = u2.user.id;
    user2Token = u2.tokens.accessToken;

    deactEmail = `sec_deact_${Date.now()}@example.com`;
    const u3 = await registerUser({
      name: "Security Deactivated",
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

    // 2. Exam Series + Tests (Standard and Live)
    const series = await prisma.examSeries.create({
      data: {
        title: `Security Parity Series ${Date.now()}`,
        slug: `sec-parity-series-${Date.now()}`,
        examName: "Civil Services",
        category: "UPSC",
        createdById: user1Id,
        isPublished: true,
      },
    });
    testSeriesId = series.id;

    // Standard Test
    const stdTest = await prisma.examTest.create({
      data: {
        title: "Standard Test for Security Parity",
        seriesId: testSeriesId,
        createdById: user1Id,
        isPublished: true,
        accessMode: "FREE",
        durationMinutes: 60,
        totalMarks: 200,
        positiveMarks: 2,
        negativeMarks: 0.66,
        isLive: false,
      },
    });
    standardTestId = stdTest.id;

    // Live Test (Concludes 1 hour in the FUTURE)
    const futureDate = new Date(Date.now() + 3600 * 1000);
    const pastStart = new Date(Date.now() - 1800 * 1000);
    const liveTest = await prisma.examTest.create({
      data: {
        title: "Active Live Test for Security Parity",
        seriesId: testSeriesId,
        createdById: user1Id,
        isPublished: true,
        accessMode: "FREE",
        durationMinutes: 60,
        totalMarks: 200,
        positiveMarks: 2,
        negativeMarks: 0.66,
        isLive: true,
        liveStartAt: pastStart,
        liveEndAt: futureDate,
      },
    });
    liveTestId = liveTest.id;

    // Section + Questions
    const section = await prisma.examSection.create({
      data: {
        testId: standardTestId,
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
        explanationEn: "New Delhi is the national capital.",
        positiveMarks: 2,
        negativeMarks: 0.66,
      },
    });
    question1Id = q1.id;

    const q2 = await prisma.examQuestion.create({
      data: {
        sectionId: section.id,
        order: 2,
        questionEn: "Which article deals with Fundamental Rights?",
        optionAEn: "Article 12-35",
        optionBEn: "Article 36-51",
        optionCEn: "Article 51A",
        optionDEn: "Article 352",
        correctOption: "A",
        explanationEn: "Part III, Articles 12-35 covers Fundamental Rights.",
        positiveMarks: 2,
        negativeMarks: 0.66,
      },
    });
    question2Id = q2.id;

    // Add section and question to Live Test as well
    const liveSection = await prisma.examSection.create({
      data: {
        testId: liveTestId,
        title: "General Studies Live",
        order: 1,
      },
    });
    await prisma.examQuestion.create({
      data: {
        sectionId: liveSection.id,
        order: 1,
        questionEn: "Live Test Question 1",
        optionAEn: "Opt A",
        optionBEn: "Opt B",
        optionCEn: "Opt C",
        optionDEn: "Opt D",
        correctOption: "C",
        explanationEn: "Live explanation must be protected until liveEndAt.",
        positiveMarks: 2,
        negativeMarks: 0.66,
      },
    });

    // 3. Tutorial course with Rosera quiz block
    courseSlug = `sec-course-${Date.now()}`;
    const course = await prisma.course.create({
      data: {
        title: "Security Course with Quiz",
        slug: courseSlug,
        description: "Security course description",
        difficulty: "BEGINNER",
        isPublished: true,
        isGated: true,
        previewPercentage: 20,
      },
    });
    const chapter = await prisma.chapter.create({
      data: {
        title: "Chapter 1",
        courseId: course.id,
        order: 1,
      },
    });
    const lesson = await prisma.lesson.create({
      data: {
        title: "Lesson with Quiz Block",
        chapterId: chapter.id,
        type: "TUTORIAL",
        gateMode: "preview",
        previewPercentage: 20,
        content: JSON.stringify([
          { type: "p", text: "Introduction paragraph" },
          {
            type: "quiz",
            q: "Secret quiz question?",
            options: ["Wrong 1", "Correct Ans", "Wrong 2"],
            a: 1, // Correct answer index
            why: "Secret explanation for quiz",
          },
          { type: "p", text: "Locked paragraph 1" },
          { type: "p", text: "Locked paragraph 2" },
          { type: "p", text: "Locked paragraph 3" },
        ]),
      },
    });
    lessonQuizId = lesson.id;
  });

  after(async () => {
    // Cleanup
    try {
      await prisma.user.deleteMany({
        where: { id: { in: [user1Id, user2Id, deactUserId] } },
      });
      await prisma.examSeries.deleteMany({ where: { id: testSeriesId } });
      await prisma.course.deleteMany({ where: { slug: courseSlug } });
    } catch {
      // Ignored
    }
  });

  // ─── Rule 1: No correct answers or explanations before submit / forbidden by web rules ─────
  it("Rule 1: Active attempt questions NEVER leak correctOption or explanations", async () => {
    const startReq = new NextRequest(`http://127.0.0.1:3045/api/v1/tests/${standardTestId}/attempts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const startRes = await startAttemptRoute(startReq, { params: Promise.resolve({ id: standardTestId }) });
    assert.equal(startRes.status, 201);
    const startJson = await startRes.json();
    const attemptId = startJson.data.attemptId;

    const detailReq = new NextRequest(`http://127.0.0.1:3045/api/v1/attempts/${attemptId}`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const detailRes = await getAttemptRoute(detailReq, { params: Promise.resolve({ id: attemptId }) });
    assert.equal(detailRes.status, 200);
    const detailJson = await detailRes.json();

    assert.ok(detailJson.data.questions.length > 0);
    for (const q of detailJson.data.questions) {
      assert.equal("correctOption" in q, false, "Leaked correctOption in attempt detail!");
      assert.equal("explanationEn" in q, false, "Leaked explanationEn in attempt detail!");
      assert.equal("explanationHi" in q, false, "Leaked explanationHi in attempt detail!");
      assert.equal("solution" in q, false, "Leaked solution in attempt detail!");
    }

    // Solutions endpoint before submit must return 403
    const solReq = new NextRequest(`http://127.0.0.1:3045/api/v1/attempts/${attemptId}/solutions`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const solRes = await getSolutionsRoute(solReq, { params: Promise.resolve({ id: attemptId }) });
    assert.equal(solRes.status, 403);
  });

  it("Rule 1 (Live Test): Submitted attempt of active live test forbids solutions until liveEndAt", async () => {
    const startReq = new NextRequest(`http://127.0.0.1:3045/api/v1/tests/${liveTestId}/attempts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const startRes = await startAttemptRoute(startReq, { params: Promise.resolve({ id: liveTestId }) });
    const startJson = await startRes.json();
    const attemptId = startJson.data.attemptId;

    // Submit the live attempt
    const submitReq = new NextRequest(`http://127.0.0.1:3045/api/v1/attempts/${attemptId}/submit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user1Token}` },
      body: JSON.stringify({ answers: [] }),
    });
    const submitRes = await submitAttemptRoute(submitReq, { params: Promise.resolve({ id: attemptId }) });
    assert.equal(submitRes.status, 200);

    // Now request solutions: because live test has liveEndAt in future, solutions must be FORBIDDEN (403)
    const solReq = new NextRequest(`http://127.0.0.1:3045/api/v1/attempts/${attemptId}/solutions`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const solRes = await getSolutionsRoute(solReq, { params: Promise.resolve({ id: attemptId }) });
    assert.equal(solRes.status, 403, "Live test solutions must be forbidden while live test is active!");
    const solJson = await solRes.json();
    assert.match(solJson.error.message, /live test concludes/i);
  });

  // ─── Rule 2: Another user's attempt/result/solutions -> 403/404 ─────────────────────────────
  it("Rule 2: User 2 is strictly forbidden from accessing or mutating User 1's attempt", async () => {
    // User 1 starts standard attempt
    const startReq = new NextRequest(`http://127.0.0.1:3045/api/v1/tests/${standardTestId}/attempts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const startRes = await startAttemptRoute(startReq, { params: Promise.resolve({ id: standardTestId }) });
    const attemptId = (await startRes.json()).data.attemptId;

    // User 2 tries to GET attempt detail -> 403
    const getReq = new NextRequest(`http://127.0.0.1:3045/api/v1/attempts/${attemptId}`, {
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    const getRes = await getAttemptRoute(getReq, { params: Promise.resolve({ id: attemptId }) });
    assert.equal(getRes.status, 403);

    // User 2 tries to sync answers -> 403
    const syncReq = new NextRequest(`http://127.0.0.1:3045/api/v1/attempts/${attemptId}/answers`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${user2Token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        lastSequenceNumber: 1,
        answers: [{ questionId: question1Id, selectedOption: "A", sequenceNumber: 1 }],
      }),
    });
    const syncRes = await syncAnswersRoute(syncReq, { params: Promise.resolve({ id: attemptId }) });
    assert.equal(syncRes.status, 403);

    // User 2 tries to submit User 1's attempt -> 403
    const submitReq = new NextRequest(`http://127.0.0.1:3045/api/v1/attempts/${attemptId}/submit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user2Token}` },
      body: JSON.stringify({ answers: [] }),
    });
    const submitRes = await submitAttemptRoute(submitReq, { params: Promise.resolve({ id: attemptId }) });
    assert.equal(submitRes.status, 403);
  });

  // ─── Rule 3: Response bodies contain only whitelisted fields (exact key sets) ──────────────
  it("Rule 3: Response bodies conform strictly to whitelisted DTO key sets", async () => {
    // 1. Start attempt response keys
    const startReq = new NextRequest(`http://127.0.0.1:3045/api/v1/tests/${standardTestId}/attempts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const startRes = await startAttemptRoute(startReq, { params: Promise.resolve({ id: standardTestId }) });
    const startJson = await startRes.json();
    assert.deepEqual(
      Object.keys(startJson.data).sort(),
      ["attemptId", "durationMinutes", "durationSeconds", "resumed", "serverNow", "startedAt", "testId"].sort()
    );
    const attemptId = startJson.data.attemptId;

    // 2. Attempt detail keys
    const detailReq = new NextRequest(`http://127.0.0.1:3045/api/v1/attempts/${attemptId}`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const detailRes = await getAttemptRoute(detailReq, { params: Promise.resolve({ id: attemptId }) });
    const detailJson = await detailRes.json();
    assert.deepEqual(
      Object.keys(detailJson.data).sort(),
      [
        "attemptId",
        "durationMinutes",
        "questions",
        "sections",
        "serverNow",
        "startedAt",
        "status",
        "submittedAt",
        "testId",
        "testTitle",
        "timeRemainingSecs",
      ].sort()
    );

    // 3. Question keys in detail
    const q0 = detailJson.data.questions[0];
    assert.deepEqual(
      Object.keys(q0).sort(),
      [
        "id",
        "isMarked",
        "negativeMarks",
        "optionsEn",
        "optionsHi",
        "positiveMarks",
        "questionNumber",
        "sectionId",
        "sectionName",
        "selectedOption",
        "textEn",
        "textHi",
        "timeSpentSecs",
      ].sort()
    );

    // Submit attempt
    const submitReq = new NextRequest(`http://127.0.0.1:3045/api/v1/attempts/${attemptId}/submit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user1Token}` },
      body: JSON.stringify({ answers: [] }),
    });
    const submitRes = await submitAttemptRoute(submitReq, { params: Promise.resolve({ id: attemptId }) });
    const submitJson = await submitRes.json();

    // 4. Result keys
    assert.deepEqual(
      Object.keys(submitJson.data).sort(),
      [
        "accuracyPercentage",
        "allIndiaRank",
        "attemptId",
        "correctCount",
        "markedCount",
        "percentile",
        "score",
        "skippedCount",
        "submittedAt",
        "testId",
        "testTitle",
        "timeTakenSecs",
        "totalCandidates",
        "totalMarks",
        "wrongCount",
      ].sort()
    );

    // 5. Solutions keys
    const solReq = new NextRequest(`http://127.0.0.1:3045/api/v1/attempts/${attemptId}/solutions`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const solRes = await getSolutionsRoute(solReq, { params: Promise.resolve({ id: attemptId }) });
    const solJson = await solRes.json();
    assert.deepEqual(
      Object.keys(solJson.data).sort(),
      ["attemptId", "questions", "testId"].sort()
    );
    const solQ0 = solJson.data.questions[0];
    assert.deepEqual(
      Object.keys(solQ0).sort(),
      [
        "correctOption",
        "explanationEn",
        "explanationHi",
        "id",
        "isCorrect",
        "isMarked",
        "marksAwarded",
        "negativeMarks",
        "optionsEn",
        "optionsHi",
        "positiveMarks",
        "questionNumber",
        "sectionId",
        "sectionName",
        "selectedOption",
        "textEn",
        "textHi",
        "timeSpentSecs",
      ].sort()
    );
  });

  // ─── Rule 4: Answers after deadline are rejected/ignored and cannot change score ───────────
  it("Rule 4: Answers sent after the server deadline are rejected with 400 and cannot alter score", async () => {
    // Start fresh attempt
    const startReq = new NextRequest(`http://127.0.0.1:3045/api/v1/tests/${standardTestId}/attempts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    const startRes = await startAttemptRoute(startReq, { params: Promise.resolve({ id: standardTestId }) });
    const attemptId = (await startRes.json()).data.attemptId;

    // Mutate startedAt to 3 hours in the past
    await prisma.examAttempt.update({
      where: { id: attemptId },
      data: { startedAt: new Date(Date.now() - 3 * 3600 * 1000) },
    });

    // Attempt to sync an answer after deadline
    const syncReq = new NextRequest(`http://127.0.0.1:3045/api/v1/attempts/${attemptId}/answers`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${user2Token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        lastSequenceNumber: 1,
        answers: [{ questionId: question1Id, selectedOption: "B", sequenceNumber: 1 }],
      }),
    });
    const syncRes = await syncAnswersRoute(syncReq, { params: Promise.resolve({ id: attemptId }) });
    assert.equal(syncRes.status, 400, "Answers after server deadline must be rejected with 400 Bad Request");
    const syncJson = await syncRes.json();
    assert.match(syncJson.error.message, /deadline has expired/i);
  });

  // ─── Rule 5: Submit is idempotent ──────────────────────────────────────────────────────────
  it("Rule 5: Submit is idempotent: repeated submissions return identical results without regrading", async () => {
    // User 1 starts and answers question 1 with correct option B
    const startReq = new NextRequest(`http://127.0.0.1:3045/api/v1/tests/${standardTestId}/attempts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const startRes = await startAttemptRoute(startReq, { params: Promise.resolve({ id: standardTestId }) });
    const attemptId = (await startRes.json()).data.attemptId;

    await syncAnswersRoute(
      new NextRequest(`http://127.0.0.1:3045/api/v1/attempts/${attemptId}/answers`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${user1Token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          lastSequenceNumber: 1,
          answers: [{ questionId: question1Id, selectedOption: "B", sequenceNumber: 1 }],
        }),
      }),
      { params: Promise.resolve({ id: attemptId }) }
    );

    // Submit #1
    const sub1 = await submitAttemptRoute(
      new NextRequest(`http://127.0.0.1:3045/api/v1/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user1Token}` },
        body: JSON.stringify({ answers: [] }),
      }),
      { params: Promise.resolve({ id: attemptId }) }
    );
    assert.equal(sub1.status, 200);
    const json1 = await sub1.json();

    // Submit #2 (idempotent duplicate submission)
    const sub2 = await submitAttemptRoute(
      new NextRequest(`http://127.0.0.1:3045/api/v1/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user1Token}` },
        body: JSON.stringify({ answers: [] }),
      }),
      { params: Promise.resolve({ id: attemptId }) }
    );
    assert.equal(sub2.status, 200);
    const json2 = await sub2.json();

    assert.equal(json1.data.score, json2.data.score);
    assert.equal(json1.data.correctCount, json2.data.correctCount);
    assert.equal(json1.data.submittedAt, json2.data.submittedAt);
  });

  // ─── Rule 6: Older clientSeq cannot overwrite a newer answer ───────────────────────────────
  it("Rule 6: Monotonic clientSeq guard prevents out-of-order packets from overwriting newer answers", async () => {
    const startReq = new NextRequest(`http://127.0.0.1:3045/api/v1/tests/${standardTestId}/attempts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const startRes = await startAttemptRoute(startReq, { params: Promise.resolve({ id: standardTestId }) });
    const attemptId = (await startRes.json()).data.attemptId;

    // Send newer answer with sequenceNumber = 10 (Selected "B")
    const resNew = await syncAnswersRoute(
      new NextRequest(`http://127.0.0.1:3045/api/v1/attempts/${attemptId}/answers`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${user1Token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          lastSequenceNumber: 10,
          answers: [{ questionId: question1Id, selectedOption: "B", sequenceNumber: 10 }],
        }),
      }),
      { params: Promise.resolve({ id: attemptId }) }
    );
    assert.equal(resNew.status, 200);

    // Send older delayed packet with sequenceNumber = 3 (Selected "A")
    const resOld = await syncAnswersRoute(
      new NextRequest(`http://127.0.0.1:3045/api/v1/attempts/${attemptId}/answers`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${user1Token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          lastSequenceNumber: 3,
          answers: [{ questionId: question1Id, selectedOption: "A", sequenceNumber: 3 }],
        }),
      }),
      { params: Promise.resolve({ id: attemptId }) }
    );
    assert.equal(resOld.status, 200);

    // Verify DB retains Option "B" with clientSeq = 10
    const ansRow = await prisma.examAttemptAnswer.findUnique({
      where: {
        attemptId_questionId: { attemptId, questionId: question1Id },
      },
    });
    assert.equal(ansRow?.selectedOption, "B", "Older packet with sequenceNumber=3 overwrote newer answer!");
    assert.equal(ansRow?.clientSeq, 10);
  });

  // ─── Rule 7: Locked/preview content never leaks past sliced blocks (incl quiz answers) ─────
  it("Rule 7: Guest receives only 20% preview and Rosera quiz blocks NEVER leak answers or 'why'", async () => {
    const req = new NextRequest(`http://127.0.0.1:3045/api/v1/tutorials/${courseSlug}/lessons/${lessonQuizId}`);
    const res = await getLessonRoute(req, {
      params: Promise.resolve({ slug: courseSlug, id: lessonQuizId }),
    });
    assert.equal(res.status, 200);
    const json = await res.json();

    assert.equal(json.data.isLockedForGuest, true);
    // Preview slice
    assert.ok(json.data.blocks.length <= 2, "Leaked more than preview slice count!");

    // Check quiz blocks inside previewBlocks
    const quizBlocks = json.data.blocks.filter((b: any) => b.type === "quiz" || b.t === "quiz");
    for (const qb of quizBlocks) {
      assert.equal("a" in qb, false, "Leaked correct answer index 'a' in guest quiz block!");
      assert.equal("why" in qb, false, "Leaked explanation 'why' in guest quiz block!");
      assert.equal("answer" in qb, false, "Leaked answer in guest quiz block!");
      assert.equal("correctOption" in qb, false, "Leaked correctOption in guest quiz block!");
    }
  });

  // ─── Rule 8: Library files need ownership and respect Range ────────────────────────────────
  it("Rule 8: Unowned paid library file rejects access; owned file supports HTTP 206 Partial Content", async () => {
    // 1. Unowned book file request by guest or non-owner -> 403
    const unownedReq = new NextRequest(`http://127.0.0.1:3045/api/v1/library/indian-polity-notes-2026/file`, {
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    const unownedRes = await getLibraryFileRoute(unownedReq, {
      params: Promise.resolve({ id: "indian-polity-notes-2026" }),
    });
    assert.equal(unownedRes.status, 403, "Unowned paid book file must return 403 Forbidden");

    // 2. Grant ownership to User 1 via completed book order
    const ordId = `order-sec-${Date.now()}`;
    await createOrder({
      id: ordId,
      orderNumber: `ORD-${Date.now()}`,
      date: new Date().toISOString(),
      userId: user1Id,
      userEmail: user1Email,
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
    await markBookOrderCompleted({ orderId: ordId, razorpayPaymentId: `pay_sec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` });

    // 3. Request with Range header
    const rangeReq = new NextRequest(`http://127.0.0.1:3045/api/v1/library/indian-polity-notes-2026/file`, {
      headers: {
        Authorization: `Bearer ${user1Token}`,
        Range: "bytes=0-511",
      },
    });
    const rangeRes = await getLibraryFileRoute(rangeReq, {
      params: Promise.resolve({ id: "indian-polity-notes-2026" }),
    });
    assert.equal(rangeRes.status, 206, "Owned book file must return 206 Partial Content");
    assert.equal(rangeRes.headers.get("Accept-Ranges"), "bytes");
    assert.ok(rangeRes.headers.get("Content-Range")?.startsWith("bytes 0-511/"));
  });

  // ─── Rule 9: Deactivated users and revoked sessions are refused ────────────────────────────
  it("Rule 9: Deactivated users and revoked sessions are rejected", async () => {
    // 1. Deactivated user token in getAttemptRoute
    const deactReq = new NextRequest(`http://127.0.0.1:3045/api/v1/me`, {
      headers: { Authorization: `Bearer ${deactToken}` },
    });
    const { GET: getMeRoute } = await import("../app/api/v1/me/route");
    const meRes = await getMeRoute(deactReq);
    assert.equal(meRes.status, 401, "Deactivated user must be rejected with 401 Unauthorized");

    // 2. Revoked session via logoutAllSessions
    await logoutAllSessions(user1Id);
    const revokedReq = new NextRequest(`http://127.0.0.1:3045/api/v1/me`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const revokedRes = await getMeRoute(revokedReq);
    assert.equal(revokedRes.status, 401, "Revoked session token must be rejected with 401 Unauthorized");
  });
});
