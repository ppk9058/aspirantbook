import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { runCompaction } from "../../scripts/compact-attempts";
import { isExamAttemptCompactionEnabled } from "../../lib/exam-flags";

const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres_password@127.0.0.1:54345/trillionskill_compact?connection_limit=10";
process.env.DATABASE_URL = dbUrl;
process.env.DIRECT_URL = dbUrl;

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

describe("Task C3: Exam Attempt Compaction & Archive Fallback", () => {
  const testUserId = `u_comp_unit_${Date.now()}`;
  const testExamId = `e_comp_unit_${Date.now()}`;
  const attemptId1 = `att_comp_1_${Date.now()}`;
  const attemptId2 = `att_comp_2_${Date.now()}`;

  before(async () => {
    // Clean up
    await prisma.examAttemptArchive.deleteMany({ where: { testId: testExamId } });
    await prisma.examAttemptAnswer.deleteMany({ where: { attempt: { testId: testExamId } } });
    await prisma.examAttempt.deleteMany({ where: { testId: testExamId } });
    await prisma.examQuestion.deleteMany({ where: { section: { testId: testExamId } } });
    await prisma.examSection.deleteMany({ where: { testId: testExamId } });
    await prisma.examTest.deleteMany({ where: { id: testExamId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });

    // Seed test fixtures
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `${testUserId}@example.com`,
        name: "Compaction Test User",
      },
    });

    const series = await prisma.examSeries.findFirst();
    if (!series) throw new Error("No series found");

    await prisma.examTest.create({
      data: {
        id: testExamId,
        title: "Compaction Unit Test Paper",
        seriesId: series.id,
        createdById: testUserId,
        durationMinutes: 60,
        totalQuestions: 2,
        totalMarks: 4,
      },
    });

    const section = await prisma.examSection.create({
      data: {
        id: `sec_${Date.now()}`,
        testId: testExamId,
        title: "Section A",
        order: 1,
      },
    });

    const q1 = await prisma.examQuestion.create({
      data: {
        id: `q1_${Date.now()}`,
        sectionId: section.id,
        questionEn: "Question 1",
        correctOption: "A",
        positiveMarks: 2,
        negativeMarks: 0.5,
      },
    });

    const q2 = await prisma.examQuestion.create({
      data: {
        id: `q2_${Date.now()}`,
        sectionId: section.id,
        questionEn: "Question 2",
        correctOption: "B",
        positiveMarks: 2,
        negativeMarks: 0.5,
      },
    });

    // Create 2 submitted attempts
    await prisma.examAttempt.create({
      data: {
        id: attemptId1,
        testId: testExamId,
        userId: testUserId,
        status: "SUBMITTED",
        score: 4,
        correctCount: 2,
        wrongCount: 0,
        submittedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days old
      },
    });

    await prisma.examAttemptAnswer.createMany({
      data: [
        {
          attemptId: attemptId1,
          questionId: q1.id,
          selectedOption: "A",
          isCorrect: true,
          marksAwarded: 2,
          timeSpentSecs: 30,
        },
        {
          attemptId: attemptId1,
          questionId: q2.id,
          selectedOption: "B",
          isCorrect: true,
          marksAwarded: 2,
          timeSpentSecs: 45,
        },
      ],
    });

    await prisma.examAttempt.create({
      data: {
        id: attemptId2,
        testId: testExamId,
        userId: testUserId,
        status: "SUBMITTED",
        score: 1.5,
        correctCount: 1,
        wrongCount: 1,
        submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days old
      },
    });

    await prisma.examAttemptAnswer.createMany({
      data: [
        {
          attemptId: attemptId2,
          questionId: q1.id,
          selectedOption: "A",
          isCorrect: true,
          marksAwarded: 2,
          timeSpentSecs: 20,
        },
        {
          attemptId: attemptId2,
          questionId: q2.id,
          selectedOption: "C",
          isCorrect: false,
          marksAwarded: -0.5,
          timeSpentSecs: 50,
        },
      ],
    });
  });

  after(async () => {
    await prisma.examAttemptArchive.deleteMany({ where: { testId: testExamId } });
    await prisma.examAttemptAnswer.deleteMany({ where: { attempt: { testId: testExamId } } });
    await prisma.examAttempt.deleteMany({ where: { testId: testExamId } });
    await prisma.examQuestion.deleteMany({ where: { section: { testId: testExamId } } });
    await prisma.examSection.deleteMany({ where: { testId: testExamId } });
    await prisma.examTest.deleteMany({ where: { id: testExamId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  test("1. Feature flag EXAM_ATTEMPT_COMPACTION_ENABLED defaults to false", () => {
    delete process.env.EXAM_ATTEMPT_COMPACTION_ENABLED;
    assert.equal(isExamAttemptCompactionEnabled(), false);

    process.env.EXAM_ATTEMPT_COMPACTION_ENABLED = "true";
    assert.equal(isExamAttemptCompactionEnabled(), true);

    process.env.EXAM_ATTEMPT_COMPACTION_ENABLED = "false";
    assert.equal(isExamAttemptCompactionEnabled(), false);
  });

  test("2. Dry-run reports eligible rows without mutating ExamAttemptArchive", async () => {
    const stats = await runCompaction({
      dryRun: true,
      examId: testExamId,
      daysOld: 0,
    });

    assert.equal(stats.scannedAttempts, 2);
    assert.equal(stats.totalAnswersArchived, 4);

    const archiveCount = await prisma.examAttemptArchive.count({
      where: { testId: testExamId },
    });
    assert.equal(archiveCount, 0);
  });

  test("3. Days-old filter respects 30-day cutoff", async () => {
    // Only attemptId1 is 40 days old; attemptId2 is 5 days old
    const stats = await runCompaction({
      dryRun: true,
      examId: testExamId,
      daysOld: 30,
    });

    assert.equal(stats.scannedAttempts, 1);
    assert.equal(stats.totalAnswersArchived, 2);
  });

  test("4. Live compaction populates ExamAttemptArchive with correct JSON blob and fields", async () => {
    const stats = await runCompaction({
      dryRun: false,
      examId: testExamId,
      daysOld: 30, // Compacts attemptId1
    });

    assert.equal(stats.compactedAttempts, 1);
    assert.equal(stats.totalAnswersArchived, 2);

    const archive = await prisma.examAttemptArchive.findUnique({
      where: { attemptId: attemptId1 },
    });

    assert.ok(archive);
    assert.equal(archive!.attemptId, attemptId1);
    assert.equal(archive!.testId, testExamId);
    assert.equal(archive!.userId, testUserId);
    assert.equal(archive!.score, 4);
    assert.equal(archive!.accuracy, 100);

    const blob = archive!.answersBlob as any[];
    assert.ok(Array.isArray(blob));
    assert.equal(blob.length, 2);
    assert.equal(blob[0].selectedOption, "A");
    assert.equal(blob[0].isCorrect, true);
  });

  test("5. Purge flag safely deletes ExamAttemptAnswer after archiving", async () => {
    const answersBefore = await prisma.examAttemptAnswer.count({
      where: { attemptId: attemptId2 },
    });
    assert.equal(answersBefore, 2);

    const stats = await runCompaction({
      dryRun: false,
      examId: testExamId,
      daysOld: 0,
      purge: true,
    });

    assert.equal(stats.compactedAttempts, 1);
    assert.equal(stats.purgedAnswers, 2);

    const answersAfter = await prisma.examAttemptAnswer.count({
      where: { attemptId: attemptId2 },
    });
    assert.equal(answersAfter, 0);

    const archive2 = await prisma.examAttemptArchive.findUnique({
      where: { attemptId: attemptId2 },
    });
    assert.ok(archive2);
    assert.equal(archive2!.score, 1.5);
    assert.equal(archive2!.accuracy, 50);
  });
});
