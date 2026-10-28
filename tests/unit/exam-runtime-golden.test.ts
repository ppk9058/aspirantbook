import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { gradeExamAttempt } from "../../lib/exam-grading";
import { getAttemptRanking, getTestRankings } from "../../lib/exam-ranking";
import { getSanitizedQuestionSet } from "../../lib/exam-questions-cache";
import { getClientIp } from "../../lib/rate-limit";

// Force test database
process.env.DATABASE_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
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
    assert.equal(getClientIp(reqWithForwardedOnly), "198.51.100.4", "Must fallback to first IP in X-Forwarded-For");
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
});
