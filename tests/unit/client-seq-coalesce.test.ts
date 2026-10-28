import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { guardTestDatabase } from "../../scripts/guard-test-db";

const testDbUrl =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_perf_v2_test";
process.env.DATABASE_URL = testDbUrl;
process.env.DIRECT_URL = testDbUrl;
guardTestDatabase(testDbUrl);

const prisma = new PrismaClient();

describe("P1-2: clientSeq NOT NULL COALESCE & Edge Case Verification", () => {
  let testId: string;
  let sectionId: string;
  let questionId: string;
  let userId: string;
  let attemptId: string;

  before(async () => {
    const user = await prisma.user.upsert({
      where: { email: "p12_seq@trillionskill.test" },
      update: {},
      create: {
        id: "u_p12_seq",
        name: "Seq User",
        email: "p12_seq@trillionskill.test",
        role: "FREE",
      },
    });
    userId = user.id;

    const series = await prisma.examSeries.upsert({
      where: { slug: "p12-seq-series" },
      update: {},
      create: {
        id: "es_p12_seq",
        title: "P12 Seq Series",
        slug: "p12-seq-series",
        examName: "Civil Services",
        category: "UPSC",
        createdById: userId,
      },
    });

    const examTest = await prisma.examTest.upsert({
      where: { id: "test_p12_seq" },
      update: {},
      create: {
        id: "test_p12_seq",
        seriesId: series.id,
        title: "P12 Seq Test",
        durationMinutes: 60,
        totalMarks: 50,
        totalQuestions: 1,
        isPublished: true,
        createdById: userId,
      },
    });
    testId = examTest.id;

    const section = await prisma.examSection.upsert({
      where: { id: "sec_p12_seq" },
      update: {},
      create: {
        id: "sec_p12_seq",
        testId,
        title: "General",
        order: 1,
        positiveMarks: 2,
        negativeMarks: 0.5,
      },
    });
    sectionId = section.id;

    const q = await prisma.examQuestion.upsert({
      where: { id: "q_p12_seq" },
      update: {},
      create: {
        id: "q_p12_seq",
        sectionId,
        order: 1,
        questionEn: "Test Seq Question",
        optionAEn: "A",
        optionBEn: "B",
        correctOption: "A",
        positiveMarks: 2,
        negativeMarks: 0.5,
      },
    });
    questionId = q.id;

    const attempt = await prisma.examAttempt.create({
      data: {
        userId,
        testId,
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
    });
    attemptId = attempt.id;
  });

  after(async () => {
    await prisma.examAttemptAnswer.deleteMany({ where: { attemptId } });
    await prisma.examAttempt.deleteMany({ where: { testId } });
    await prisma.$disconnect();
  });

  test("1. Absent and null clientSeq coalesce to 0 without 23502 not-null constraint violation", async () => {
    // Execute raw SQL where clientSeq in UNNEST is NULL
    const rawIds = ["ans_p12_1"];
    const qIds = [questionId];
    const options = ["A"];
    const markeds = [false];
    const seqs = [null as any]; // NULL passed
    const times = [5];

    await assert.doesNotReject(async () => {
      await prisma.$executeRaw`
        INSERT INTO "ExamAttemptAnswer" ("id", "attemptId", "questionId", "selectedOption", "isMarked", "clientSeq", "timeSpentSecs")
        SELECT
          v.id,
          ${attemptId},
          v.question_id,
          v.selected_option,
          v.is_marked,
          COALESCE(v.client_seq, 0),
          v.time_spent_secs
        FROM UNNEST(
          ${rawIds}::text[],
          ${qIds}::text[],
          ${options}::text[],
          ${markeds}::boolean[],
          ${seqs}::int[],
          ${times}::int[]
        ) AS v(id, question_id, selected_option, is_marked, client_seq, time_spent_secs)
        ON CONFLICT ("attemptId", "questionId")
        DO UPDATE SET
          "selectedOption" = EXCLUDED."selectedOption",
          "isMarked" = EXCLUDED."isMarked",
          "clientSeq" = COALESCE(EXCLUDED."clientSeq", 0),
          "timeSpentSecs" = EXCLUDED."timeSpentSecs"
        WHERE COALESCE("ExamAttemptAnswer"."clientSeq", 0) <= COALESCE(EXCLUDED."clientSeq", 0);
      `;
    });

    const record = await prisma.examAttemptAnswer.findUnique({
      where: { attemptId_questionId: { attemptId, questionId } },
    });
    assert.ok(record);
    assert.equal(record.clientSeq, 0, "Null clientSeq must coalesce to default 0");
    assert.equal(record.selectedOption, "A");
  });

  test("2. Increasing clientSeq values update the record cleanly", async () => {
    const rawIds = ["ans_p12_2"];
    const qIds = [questionId];
    const options = ["B"];
    const markeds = [false];
    const seqs = [5];
    const times = [15];

    await prisma.$executeRaw`
      INSERT INTO "ExamAttemptAnswer" ("id", "attemptId", "questionId", "selectedOption", "isMarked", "clientSeq", "timeSpentSecs")
      SELECT
        v.id,
        ${attemptId},
        v.question_id,
        v.selected_option,
        v.is_marked,
        COALESCE(v.client_seq, 0),
        v.time_spent_secs
      FROM UNNEST(
        ${rawIds}::text[],
        ${qIds}::text[],
        ${options}::text[],
        ${markeds}::boolean[],
        ${seqs}::int[],
        ${times}::int[]
      ) AS v(id, question_id, selected_option, is_marked, client_seq, time_spent_secs)
      ON CONFLICT ("attemptId", "questionId")
      DO UPDATE SET
        "selectedOption" = EXCLUDED."selectedOption",
        "isMarked" = EXCLUDED."isMarked",
        "clientSeq" = COALESCE(EXCLUDED."clientSeq", 0),
        "timeSpentSecs" = EXCLUDED."timeSpentSecs"
      WHERE COALESCE("ExamAttemptAnswer"."clientSeq", 0) <= COALESCE(EXCLUDED."clientSeq", 0);
    `;

    const record = await prisma.examAttemptAnswer.findUnique({
      where: { attemptId_questionId: { attemptId, questionId } },
    });
    assert.equal(record?.clientSeq, 5);
    assert.equal(record?.selectedOption, "B");
  });

  test("3. Out-of-order batches: older packet (seq 2) arriving after seq 5 is rejected", async () => {
    const rawIds = ["ans_p12_3"];
    const qIds = [questionId];
    const options = ["C"];
    const markeds = [true];
    const seqs = [2]; // Older than stored 5!
    const times = [20];

    await prisma.$executeRaw`
      INSERT INTO "ExamAttemptAnswer" ("id", "attemptId", "questionId", "selectedOption", "isMarked", "clientSeq", "timeSpentSecs")
      SELECT
        v.id,
        ${attemptId},
        v.question_id,
        v.selected_option,
        v.is_marked,
        COALESCE(v.client_seq, 0),
        v.time_spent_secs
      FROM UNNEST(
        ${rawIds}::text[],
        ${qIds}::text[],
        ${options}::text[],
        ${markeds}::boolean[],
        ${seqs}::int[],
        ${times}::int[]
      ) AS v(id, question_id, selected_option, is_marked, client_seq, time_spent_secs)
      ON CONFLICT ("attemptId", "questionId")
      DO UPDATE SET
        "selectedOption" = EXCLUDED."selectedOption",
        "isMarked" = EXCLUDED."isMarked",
        "clientSeq" = COALESCE(EXCLUDED."clientSeq", 0),
        "timeSpentSecs" = EXCLUDED."timeSpentSecs"
      WHERE COALESCE("ExamAttemptAnswer"."clientSeq", 0) <= COALESCE(EXCLUDED."clientSeq", 0);
    `;

    const record = await prisma.examAttemptAnswer.findUnique({
      where: { attemptId_questionId: { attemptId, questionId } },
    });
    assert.equal(record?.clientSeq, 5, "Older seq 2 must not overwrite seq 5");
    assert.equal(record?.selectedOption, "B", "Option must remain B from seq 5");
  });
});
