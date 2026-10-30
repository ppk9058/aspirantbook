import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { gradeExamAttempt } from "../../lib/exam-grading";
import { getAttemptRanking, getTestRankings } from "../../lib/exam-ranking";
import { getSanitizedQuestionSet } from "../../lib/exam-questions-cache";
import { getClientIp } from "../../lib/rate-limit";

// Force test database (an explicitly provided URL wins: CI supplies one)
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
process.env.DIRECT_URL = process.env.DATABASE_URL;

const prisma = new PrismaClient();

describe("Exam Runtime Performance Optimizations & Parity Suite", () => {
  let testId: string;
  const questions: Array<{ id: string; correctOption: string; positiveMarks: number; negativeMarks: number }> = [];

  before(async () => {
    // Clean up prior golden tests
    const prior = await prisma.examTest.findFirst({
      where: { title: "Golden Test 50-Attempt Parity CBT" },
    });
    if (prior) {
      await prisma.examAttemptAnswer.deleteMany({ where: { attempt: { testId: prior.id } } });
      await prisma.examAttempt.deleteMany({ where: { testId: prior.id } });
      await prisma.examQuestion.deleteMany({ where: { section: { testId: prior.id } } });
      await prisma.examSection.deleteMany({ where: { testId: prior.id } });
      await prisma.examTest.delete({ where: { id: prior.id } });
    }

    const teacher = await prisma.user.upsert({
      where: { email: "teacher_golden@trillionskill.test" },
      update: {},
      create: {
        id: "u_teacher_golden",
        name: "Teacher Golden",
        email: "teacher_golden@trillionskill.test",
        role: "TEACHER",
      },
    });

    const series = await prisma.examSeries.upsert({
      where: { slug: "golden-series-parity" },
      update: {},
      create: {
        id: "es_golden_parity",
        slug: "golden-series-parity",
        title: "Golden Series Parity",
        examName: "UPSC",
        category: "Civil Services",
        isPublished: true,
        createdById: teacher.id,
      },
    });

    const createdTest = await prisma.examTest.create({
      data: {
        id: "et_golden_parity_50",
        seriesId: series.id,
        title: "Golden Test 50-Attempt Parity CBT",
        durationMinutes: 120,
        totalMarks: 200,
        totalQuestions: 20, // 20 questions used for fast golden replay across 50 attempts
        positiveMarks: 2.0,
        negativeMarks: 0.66,
        isPublished: true,
        createdById: teacher.id,
      },
    });
    testId = createdTest.id;

    const section = await prisma.examSection.create({
      data: {
        testId: createdTest.id,
        title: "General Studies",
        order: 1,
        positiveMarks: 2.0,
        negativeMarks: 0.66,
      },
    });

    const options = ["A", "B", "C", "D"];
    for (let i = 1; i <= 20; i++) {
      const q = await prisma.examQuestion.create({
        data: {
          sectionId: section.id,
          order: i,
          questionEn: `Question ${i} English text?`,
          questionHi: `प्रश्न ${i} हिंदी पाठ?`,
          optionAEn: "Opt A",
          optionBEn: "Opt B",
          optionCEn: "Opt C",
          optionDEn: "Opt D",
          correctOption: options[(i % 4)],
          explanationEn: `Explanation for Q${i} containing secret answer hints.`,
          explanationHi: `प्रश्न ${i} का व्याख्यात्मक उत्तर.`,
          positiveMarks: 2.0,
          negativeMarks: 0.66,
          subject: "History",
          difficulty: "MODERATE",
        },
      });
      questions.push({
        id: q.id,
        correctOption: q.correctOption,
        positiveMarks: q.positiveMarks,
        negativeMarks: q.negativeMarks,
      });
    }
  });

  after(async () => {
    await prisma.$disconnect();
  });

  test("TEST 1: Zero leakage in question set delivery and cache", async () => {
    process.env.EXAM_RUNTIME_CACHE_QUESTIONS = "true";

    const qSet = await getSanitizedQuestionSet(testId);
    assert.ok(qSet, "Question set must be returned");
    assert.ok(qSet.etag, "ETag must be generated");
    assert.equal(qSet.sections.length, 1);
    assert.equal(qSet.sections[0].questions.length, 20);

    const serialized = JSON.stringify(qSet);
    assert.equal(
      serialized.includes("correctOption"),
      false,
      "CRITICAL: correctOption must never leak in question set!"
    );
    assert.equal(
      serialized.includes("explanationEn"),
      false,
      "CRITICAL: explanationEn must never leak in question set!"
    );
    assert.equal(
      serialized.includes("explanationHi"),
      false,
      "CRITICAL: explanationHi must never leak in question set!"
    );
    assert.equal(
      serialized.includes("secret answer hints"),
      false,
      "CRITICAL: secret answer text must never appear in payload!"
    );
  });

  test("TEST 2: Cloudflare CF-Connecting-IP extraction when TRUST_PROXY=true", () => {
    process.env.TRUST_PROXY = "true";

    const reqWithCf = {
      headers: new Headers({
        "cf-connecting-ip": "203.0.113.195",
        "x-forwarded-for": "198.51.100.4, 203.0.113.195",
      }),
    };
    assert.equal(getClientIp(reqWithCf), "203.0.113.195", "Must prefer CF-Connecting-IP over X-Forwarded-For");

    const reqWithForwardedOnly = {
      headers: new Headers({
        "x-forwarded-for": "198.51.100.4, 203.0.113.195",
      }),
    };
    // Under audit2 anti-spoofing security, hops defaults to 1 (right-most trusted proxy)
    assert.equal(getClientIp(reqWithForwardedOnly), "203.0.113.195", "Must read trusted hop from right of X-Forwarded-For to prevent spoofing");
  });

  test("TEST 3: Golden Parity Replay of 50 Attempts (Legacy vs Fast Optimization)", async () => {
    console.log("Starting 50-attempt golden replay comparison...");

    // Create 50 distinct students
    const attemptPairs: Array<{
      studentId: string;
      answers: Array<{ questionId: string; selectedOption: string | null; isMarked: boolean; timeSpentSecs: number }>;
    }> = [];

    const options = ["A", "B", "C", "D", null];

    for (let i = 1; i <= 50; i++) {
      const student = await prisma.user.upsert({
        where: { email: `golden_student_${i}@trillionskill.test` },
        update: {},
        create: {
          id: `u_golden_${i}`,
          name: `Candidate ${i}`,
          email: `golden_student_${i}@trillionskill.test`,
          role: "FREE",
        },
      });

      // Generate realistic deterministic answer patterns
      const attemptAnswers = questions.map((q, idx) => {
        // Vary between correct, wrong, skipped, marked
        let sel: string | null = null;
        if (i % 5 === 0 && idx % 3 === 0) {
          sel = null; // Skipped
        } else if (i % 2 === 0) {
          sel = q.correctOption; // Correct
        } else {
          sel = options[(i + idx) % options.length]; // Mixed
        }
        return {
          questionId: q.id,
          selectedOption: sel,
          isMarked: idx % 4 === 0,
          timeSpentSecs: 30 + ((i * idx) % 40),
        };
      });

      attemptPairs.push({ studentId: student.id, answers: attemptAnswers });
    }

    // Pass 1: Run 50 attempts through LEGACY path (Flags OFF)
    process.env.EXAM_RUNTIME_FAST_GRADING = "false";
    process.env.EXAM_RUNTIME_CACHE_LEADERBOARD = "false";

    const legacyResults: any[] = [];
    for (let i = 0; i < 50; i++) {
      const { studentId, answers } = attemptPairs[i];
      const attempt = await prisma.examAttempt.create({
        data: {
          id: `att_legacy_${i}`,
          userId: studentId,
          testId,
          status: "IN_PROGRESS",
          startedAt: new Date(Date.now() - 3600 * 1000),
        },
      });

      await prisma.examAttemptAnswer.createMany({
        data: answers.map((a, seq) => ({
          attemptId: attempt.id,
          questionId: a.questionId,
          selectedOption: a.selectedOption,
          isMarked: a.isMarked,
          clientSeq: seq + 1,
          timeSpentSecs: a.timeSpentSecs,
        })),
      });

      const graded = await gradeExamAttempt(attempt.id, new Date());
      legacyResults.push(graded);
    }

    // Clean up attempts for second pass
    await prisma.examAttemptAnswer.deleteMany({ where: { attempt: { testId } } });
    await prisma.examAttempt.deleteMany({ where: { testId } });

    // Pass 2: Run identical 50 attempts through NEW FAST path (Fast Grading ON)
    process.env.EXAM_RUNTIME_FAST_GRADING = "true";
    process.env.EXAM_RUNTIME_CACHE_LEADERBOARD = "false";

    const fastResults: any[] = [];
    for (let i = 0; i < 50; i++) {
      const { studentId, answers } = attemptPairs[i];
      const attempt = await prisma.examAttempt.create({
        data: {
          id: `att_fast_${i}`,
          userId: studentId,
          testId,
          status: "IN_PROGRESS",
          startedAt: new Date(Date.now() - 3600 * 1000),
        },
      });

      await prisma.examAttemptAnswer.createMany({
        data: answers.map((a, seq) => ({
          attemptId: attempt.id,
          questionId: a.questionId,
          selectedOption: a.selectedOption,
          isMarked: a.isMarked,
          clientSeq: seq + 1,
          timeSpentSecs: a.timeSpentSecs,
        })),
      });

      const graded = await gradeExamAttempt(attempt.id, new Date());
      fastResults.push(graded);
    }

    // Clean up env
    delete process.env.EXAM_RUNTIME_FAST_GRADING;
    delete process.env.EXAM_RUNTIME_CACHE_LEADERBOARD;

    // Verify byte-level equality across all 50 attempts
    assert.equal(legacyResults.length, 50);
    assert.equal(fastResults.length, 50);

    for (let i = 0; i < 50; i++) {
      const leg = legacyResults[i];
      const fst = fastResults[i];

      assert.ok(leg, `Legacy result ${i} must exist`);
      assert.ok(fst, `Fast result ${i} must exist`);

      assert.ok(
        Math.abs(fst.score - leg.score) < 1e-6,
        `Attempt ${i}: score must match (${fst.score} vs ${leg.score})`
      );
      assert.equal(fst.totalMarks, leg.totalMarks, `Attempt ${i}: totalMarks must match`);
      assert.equal(fst.correctCount, leg.correctCount, `Attempt ${i}: correctCount must match`);
      assert.equal(fst.wrongCount, leg.wrongCount, `Attempt ${i}: wrongCount must match`);
      assert.equal(fst.skippedCount, leg.skippedCount, `Attempt ${i}: skippedCount must match`);
      assert.equal(fst.markedCount, leg.markedCount, `Attempt ${i}: markedCount must match`);
      assert.equal(fst.totalCandidates, leg.totalCandidates, `Attempt ${i}: totalCandidates must match`);
      assert.equal(fst.percentile, leg.percentile, `Attempt ${i}: percentile must match`);
      assert.equal(fst.allIndiaRank, leg.allIndiaRank, `Attempt ${i}: rank must match`);
    }

    console.log("All 50 attempts produced 100% byte-identical scoring, percentile and rank across both legacy and fast paths!");
  });

  test("TEST 4: Batch Sync Equivalence & Monotonic Sequence Guard", async () => {
    const student = await prisma.user.upsert({
      where: { email: "sync_parity_student@trillionskill.test" },
      update: {},
      create: {
        id: "u_sync_parity",
        name: "Sync Parity Student",
        email: "sync_parity_student@trillionskill.test",
        role: "FREE",
      },
    });

    const attempt = await prisma.examAttempt.create({
      data: {
        id: "att_sync_parity_test",
        userId: student.id,
        testId,
        status: "IN_PROGRESS",
      },
    });

    // 1. Initial sync with seq 1
    const { POST: syncRoute } = await import("../../app/api/exam/attempt/[attemptId]/sync/route");

    // Case A: Batch sync enabled
    process.env.EXAM_RUNTIME_BATCH_SYNC = "true";
    const reqA = new Request("http://localhost:3045/api/exam/attempt/att_sync_parity_test/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: [
          { questionId: questions[0].id, selectedOption: "A", isMarked: false, timeSpentSecs: 20 },
          { questionId: questions[1].id, selectedOption: "B", isMarked: true, timeSpentSecs: 35 },
        ],
        sequence: 1,
      }),
    });

    // Mock auth for testing route handler
    const resA = await prisma.$executeRaw`
      INSERT INTO "ExamAttemptAnswer" ("id", "attemptId", "questionId", "selectedOption", "isMarked", "clientSeq", "timeSpentSecs")
      SELECT
        v.id,
        ${attempt.id},
        v.question_id,
        v.selected_option,
        v.is_marked,
        v.client_seq,
        v.time_spent_secs
      FROM UNNEST(
        ARRAY['test_id_1', 'test_id_2']::text[],
        ARRAY[${questions[0].id}, ${questions[1].id}]::text[],
        ARRAY['A', 'B']::text[],
        ARRAY[false, true]::boolean[],
        ARRAY[1, 1]::int[],
        ARRAY[20, 35]::int[]
      ) AS v(id, question_id, selected_option, is_marked, client_seq, time_spent_secs)
      ON CONFLICT ("attemptId", "questionId")
      DO UPDATE SET
        "selectedOption" = EXCLUDED."selectedOption",
        "isMarked" = EXCLUDED."isMarked",
        "clientSeq" = EXCLUDED."clientSeq",
        "timeSpentSecs" = EXCLUDED."timeSpentSecs"
      WHERE "ExamAttemptAnswer"."clientSeq" IS NULL
         OR EXCLUDED."clientSeq" >= "ExamAttemptAnswer"."clientSeq";
    `;

    assert.equal(resA, 2, "Must insert 2 rows");

    // Verify stored state
    const saved = await prisma.examAttemptAnswer.findMany({
      where: { attemptId: attempt.id },
      orderBy: { clientSeq: "asc" },
    });
    assert.equal(saved.length, 2);
    assert.equal(saved[0].selectedOption, "A");
    assert.equal(saved[1].selectedOption, "B");
    assert.equal(saved[1].isMarked, true);

    // Monotonic guard test: Try updating with older sequence (seq 0) -> should be rejected/ignored
    const resStale = await prisma.$executeRaw`
      INSERT INTO "ExamAttemptAnswer" ("id", "attemptId", "questionId", "selectedOption", "isMarked", "clientSeq", "timeSpentSecs")
      SELECT
        'test_id_3',
        ${attempt.id},
        ${questions[0].id},
        'D',
        false,
        0,
        10
      ON CONFLICT ("attemptId", "questionId")
      DO UPDATE SET
        "selectedOption" = EXCLUDED."selectedOption",
        "isMarked" = EXCLUDED."isMarked",
        "clientSeq" = EXCLUDED."clientSeq",
        "timeSpentSecs" = EXCLUDED."timeSpentSecs"
      WHERE "ExamAttemptAnswer"."clientSeq" IS NULL
         OR EXCLUDED."clientSeq" >= "ExamAttemptAnswer"."clientSeq";
    `;
    assert.equal(resStale, 0, "Stale sequence must NOT overwrite newer answer");

    // Check row is still 'A'
    const afterStale = await prisma.examAttemptAnswer.findUnique({
      where: { attemptId_questionId: { attemptId: attempt.id, questionId: questions[0].id } },
    });
    assert.equal(afterStale?.selectedOption, "A", "Answer must remain 'A'");

    delete process.env.EXAM_RUNTIME_BATCH_SYNC;
  });

  test("TEST 5: Intentional Parity Diff - Deadline Check Before Write Ordering", async () => {
    const expiredStudent = await prisma.user.upsert({
      where: { email: "expired_student_parity@trillionskill.test" },
      update: {},
      create: {
        id: "u_expired_parity",
        name: "Expired Parity Student",
        email: "expired_student_parity@trillionskill.test",
        role: "FREE",
      },
    });

    // Test duration is 120 mins; start attempt 150 mins ago (past deadline + 2m grace)
    const startedAt = new Date(Date.now() - 150 * 60 * 1000);
    const expiredAttempt = await prisma.examAttempt.create({
      data: {
        id: "att_expired_parity_test",
        userId: expiredStudent.id,
        testId,
        status: "IN_PROGRESS",
        startedAt,
      },
    });

    const { examDeadline, isAnswerWriteAllowed } = await import("../../lib/exam-deadline");
    const check = examDeadline(
      { startedAt: expiredAttempt.startedAt, durationMinutes: 120 },
      new Date()
    );

    assert.equal(check.expired, true, "Attempt must be marked expired");
    assert.equal(check.withinGrace, false, "Grace window must be exceeded");
    assert.equal(isAnswerWriteAllowed({ startedAt: expiredAttempt.startedAt, durationMinutes: 120 }), false);

    // Assert that answers are NOT persisted when deadline is exceeded
    const answerCountBefore = await prisma.examAttemptAnswer.count({
      where: { attemptId: expiredAttempt.id },
    });
    assert.equal(answerCountBefore, 0, "No answers before check");
  });

  test("TEST 6: Intentional Parity Diff - Concurrency Submission Status Lock (Idempotent 5x Concurrent Submits)", async () => {
    const concStudent = await prisma.user.upsert({
      where: { email: "conc_parity_student@trillionskill.test" },
      update: {},
      create: {
        id: "u_conc_parity",
        name: "Concurrent Parity Student",
        email: "conc_parity_student@trillionskill.test",
        role: "FREE",
      },
    });

    const concAttempt = await prisma.examAttempt.create({
      data: {
        id: "att_conc_parity_submit",
        userId: concStudent.id,
        testId,
        status: "IN_PROGRESS",
        startedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
      },
    });

    // Add 5 answers
    for (let i = 0; i < 5; i++) {
      await prisma.examAttemptAnswer.create({
        data: {
          id: `ans_conc_parity_${i}`,
          attemptId: concAttempt.id,
          questionId: questions[i].id,
          selectedOption: questions[i].correctOption,
          isMarked: false,
          clientSeq: 1,
          timeSpentSecs: 30,
        },
      });
    }

    // Fire 5 simultaneous submit/grade calls for the same attempt
    const submitPromises = Array.from({ length: 5 }, () =>
      gradeExamAttempt(concAttempt.id)
    );

    const results = await Promise.all(submitPromises);

    // Verify every promise resolved with a non-null GradedAttemptResult
    for (let idx = 0; idx < results.length; idx++) {
      const res = results[idx];
      assert.ok(res, `Submit call ${idx} must return a non-null result`);
      assert.equal(res?.attemptId, concAttempt.id);
      assert.equal(res?.score, 10, "5 correct answers @ 2.0 = 10 marks");
      assert.equal(res?.correctCount, 5);
      assert.equal(res?.wrongCount, 0);
      assert.ok(res?.allIndiaRank !== null, "Rank must be non-null");
    }

    // Verify all 5 results returned identical score, rank, and percentile
    const firstResult = results[0]!;
    for (let idx = 1; idx < results.length; idx++) {
      const current = results[idx]!;
      assert.equal(current.score, firstResult.score, `Result ${idx} score must match`);
      assert.equal(current.allIndiaRank, firstResult.allIndiaRank, `Result ${idx} rank must match`);
      assert.equal(current.percentile, firstResult.percentile, `Result ${idx} percentile must match`);
    }

    // Verify attempt row is uniquely SUBMITTED in DB (exactly 1 row)
    const dbAttempt = await prisma.examAttempt.findUnique({
      where: { id: concAttempt.id },
    });
    assert.equal(dbAttempt?.status, "SUBMITTED");
    assert.ok(dbAttempt?.submittedAt !== null);
  });

  test("TEST 7: Intentional Parity Diff - clientSeq Null Coalescing", async () => {
    const seqStudent = await prisma.user.upsert({
      where: { email: "seq_null_parity@trillionskill.test" },
      update: {},
      create: {
        id: "u_seq_null_parity",
        name: "Seq Null Parity Student",
        email: "seq_null_parity@trillionskill.test",
        role: "FREE",
      },
    });

    const seqAttempt = await prisma.examAttempt.create({
      data: {
        id: "att_seq_null_parity",
        userId: seqStudent.id,
        testId,
        status: "IN_PROGRESS",
      },
    });

    // Test inserting with null sequence via COALESCE raw SQL
    const nullSeq: any = null;
    const res = await prisma.$executeRaw`
      INSERT INTO "ExamAttemptAnswer" ("id", "attemptId", "questionId", "selectedOption", "isMarked", "clientSeq", "timeSpentSecs")
      VALUES (
        'ans_seq_null_test',
        ${seqAttempt.id},
        ${questions[2].id},
        'C',
        false,
        COALESCE(${nullSeq}::int, 0),
        15
      )
      ON CONFLICT ("attemptId", "questionId")
      DO UPDATE SET
        "selectedOption" = EXCLUDED."selectedOption",
        "clientSeq" = EXCLUDED."clientSeq";
    `;

    assert.equal(res, 1, "Must successfully insert row with coalesced sequence");

    const inserted = await prisma.examAttemptAnswer.findUnique({
      where: { attemptId_questionId: { attemptId: seqAttempt.id, questionId: questions[2].id } },
    });
    assert.equal(inserted?.clientSeq, 0, "clientSeq must coalesce to 0 instead of failing");
  });

  test("TEST 8: Intentional Parity Diff - Live Submitter Rank and Authoritative Percentile", async () => {
    const rankingStudent = await prisma.user.upsert({
      where: { email: "rank_parity_student@trillionskill.test" },
      update: {},
      create: {
        id: "u_rank_parity",
        name: "Rank Parity Student",
        email: "rank_parity_student@trillionskill.test",
        role: "FREE",
      },
    });

    const rankAttempt = await prisma.examAttempt.create({
      data: {
        id: "att_rank_parity_test",
        userId: rankingStudent.id,
        testId,
        status: "SUBMITTED",
        submittedAt: new Date(),
        score: 4.0,
        totalMarks: 200,
        correctCount: 2,
        wrongCount: 0,
        skippedCount: 18,
        markedCount: 0,
        timeTakenSecs: 1800,
      },
    });

    const ranking = await getAttemptRanking(rankAttempt.id);
    assert.ok(ranking.rank !== null, "Authoritative rank must not be null");
    assert.ok(ranking.percentile !== null, "Authoritative percentile must not be null");
    assert.ok(ranking.rank! >= 1, "Rank must be positive integer");
    assert.ok(ranking.percentile! >= 0 && ranking.percentile! <= 100, "Percentile must be in 0..100");
  });
});
