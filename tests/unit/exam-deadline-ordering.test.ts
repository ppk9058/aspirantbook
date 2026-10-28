import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { examDeadline, DEADLINE_EXPIRED_MESSAGE, isAnswerWriteAllowed } from "../../lib/exam-deadline";
import { syncAttemptAnswers, submitTestAttempt } from "../../lib/services/exam.service";
import { Viewer } from "../../lib/api/v1/viewer";
import { guardTestDatabase } from "../../scripts/guard-test-db";

const testDbUrl = process.env.TEST_DATABASE_URL || "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_perf_v2_test";
process.env.DATABASE_URL = testDbUrl;
process.env.DIRECT_URL = testDbUrl;
guardTestDatabase(testDbUrl);

const prisma = new PrismaClient();

describe("P0-1: Exam Deadline Before Write Verification", () => {
  let testId: string;
  let questionId: string;
  let studentId: string;
  let viewer: Viewer;

  before(async () => {
    // Setup student user
    const user = await prisma.user.upsert({
      where: { email: "p0_deadline_student@trillionskill.test" },
      update: {},
      create: {
        id: "u_p0_deadline_student",
        name: "P0 Student",
        email: "p0_deadline_student@trillionskill.test",
        role: "FREE",
      },
    });
    studentId = user.id;
    viewer = {
      userId: studentId,
      role: "FREE",
      email: user.email,
      name: user.name,
      isGuest: false,
      authMethod: "bearer",
    };

    // Setup exam test (60 min)
    const series = await prisma.examSeries.upsert({
      where: { slug: "p0-deadline-series" },
      update: {},
      create: {
        id: "es_p0_deadline",
        title: "P0 Deadline Series",
        slug: "p0-deadline-series",
        examName: "Civil Services",
        category: "UPSC",
        createdById: studentId,
      },
    });

    const examTest = await prisma.examTest.upsert({
      where: { id: "test_p0_deadline" },
      update: { durationMinutes: 60 },
      create: {
        id: "test_p0_deadline",
        seriesId: series.id,
        title: "P0 Deadline Test (60m)",
        durationMinutes: 60,
        totalMarks: 200,
        totalQuestions: 1,
        isPublished: true,
        createdById: studentId,
      },
    });
    testId = examTest.id;

    // Create section and question
    const section = await prisma.examSection.upsert({
      where: { id: "sec_p0_deadline" },
      update: {},
      create: {
        id: "sec_p0_deadline",
        testId,
        title: "General Studies",
        order: 1,
        positiveMarks: 2,
        negativeMarks: 0.66,
      },
    });

    const question = await prisma.examQuestion.upsert({
      where: { id: "q_p0_deadline" },
      update: {},
      create: {
        id: "q_p0_deadline",
        sectionId: section.id,
        order: 1,
        questionEn: "What is 2+2?",
        optionAEn: "3",
        optionBEn: "4",
        optionCEn: "5",
        optionDEn: "6",
        correctOption: "B",
        positiveMarks: 2,
        negativeMarks: 0.66,
      },
    });
    questionId = question.id;
  });

  after(async () => {
    await prisma.examAttemptAnswer.deleteMany({ where: { questionId } });
    await prisma.examAttempt.deleteMany({ where: { testId } });
    await prisma.$disconnect();
  });

  test("1. Boundary check: 60 min test with 30s grace allows writes at +20s but rejects at +31s", () => {
    const startedAt = new Date("2026-10-29T10:00:00Z");
    const testDurationMinutes = 60;

    // 10:59:50 -> 59m50s elapsed (within duration)
    const tWithin = new Date("2026-10-29T10:59:50Z");
    const dWithin = examDeadline({ startedAt, durationMinutes: testDurationMinutes }, tWithin);
    assert.equal(dWithin.expired, false);
    assert.equal(dWithin.withinGrace, true);

    // 11:00:20 -> 60m20s elapsed (within 30s grace)
    const tGrace = new Date("2026-10-29T11:00:20Z");
    const dGrace = examDeadline({ startedAt, durationMinutes: testDurationMinutes }, tGrace);
    assert.equal(dGrace.expired, false);
    assert.equal(dGrace.withinGrace, true);

    // 11:00:31 -> 60m31s elapsed (expired past 30s grace)
    const tExpired = new Date("2026-10-29T11:00:31Z");
    const dExpired = examDeadline({ startedAt, durationMinutes: testDurationMinutes }, tExpired);
    assert.equal(dExpired.expired, true);
    assert.equal(dExpired.withinGrace, false);
  });

  test("2. syncAttemptAnswers past deadline writes zero rows to ExamAttemptAnswer", async () => {
    // Create attempt started 2 hours ago (test is 60 mins)
    const lateAttempt = await prisma.examAttempt.create({
      data: {
        userId: studentId,
        testId,
        status: "IN_PROGRESS",
        startedAt: new Date(Date.now() - 120 * 60 * 1000),
      },
    });

    // Attempt to sync
    await assert.rejects(
      async () => {
        await syncAttemptAnswers(
          viewer,
          lateAttempt.id,
          [
            {
              questionId,
              selectedOption: "B",
              isMarked: false,
              timeSpentSecs: 10,
              sequenceNumber: 1,
            },
          ],
          1
        );
      },
      (err: Error) => {
        return err.message.includes(DEADLINE_EXPIRED_MESSAGE) || err.message.includes("deadline has expired");
      }
    );

    // Verify zero rows in database
    const savedAnswers = await prisma.examAttemptAnswer.findMany({
      where: { attemptId: lateAttempt.id },
    });
    assert.equal(savedAnswers.length, 0, "Late sync must persist zero answer rows");
  });

  test("3. submitTestAttempt past deadline writes zero final answer rows but completes grading", async () => {
    // Create attempt started 90 mins ago
    const lateAttempt = await prisma.examAttempt.create({
      data: {
        userId: studentId,
        testId,
        status: "IN_PROGRESS",
        startedAt: new Date(Date.now() - 90 * 60 * 1000),
      },
    });

    const result = await submitTestAttempt(
      viewer,
      lateAttempt.id,
      [
        {
          questionId,
          selectedOption: "B",
          isMarked: false,
          timeSpentSecs: 20,
          sequenceNumber: 1,
        },
      ]
    );

    assert.ok(result);
    assert.equal(result.attemptId, lateAttempt.id);

    // Verify answers were rejected and NOT written
    const savedAnswers = await prisma.examAttemptAnswer.findMany({
      where: { attemptId: lateAttempt.id },
    });
    assert.equal(savedAnswers.length, 0, "Late submit final answers must not be written to DB");

    // Verify attempt is now finalized
    const finalized = await prisma.examAttempt.findUnique({
      where: { id: lateAttempt.id },
    });
    assert.equal(finalized?.status, "SUBMITTED");
  });

  test("4. Attempt already submitted rejects concurrent sync writes", async () => {
    const freshAttempt = await prisma.examAttempt.create({
      data: {
        userId: studentId,
        testId,
        status: "SUBMITTED",
        startedAt: new Date(),
        submittedAt: new Date(),
      },
    });

    await assert.rejects(
      async () => {
        await syncAttemptAnswers(
          viewer,
          freshAttempt.id,
          [
            {
              questionId,
              selectedOption: "A",
              isMarked: false,
              timeSpentSecs: 5,
              sequenceNumber: 1,
            },
          ],
          1
        );
      },
      /Cannot sync answers on an already finalized attempt/
    );

    const saved = await prisma.examAttemptAnswer.findMany({
      where: { attemptId: freshAttempt.id },
    });
    assert.equal(saved.length, 0, "No answers written after submit");
  });
});
