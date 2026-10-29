import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { verifyCompaction } from "../../scripts/verify-compaction";

const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres_password@127.0.0.1:54345/trillionskill_compact?connection_limit=10";
process.env.DATABASE_URL = dbUrl;
process.env.DIRECT_URL = dbUrl;

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

describe("Task C4: Compaction Verifier Test Suite", () => {
  const testUserId = `u_vc_${Date.now()}`;
  const testExamId = `e_vc_${Date.now()}`;

  before(async () => {
    await prisma.user.create({
      data: { id: testUserId, email: `${testUserId}@example.com`, name: "VC User" },
    });

    const series = await prisma.examSeries.findFirst();
    if (!series) throw new Error("No series found");

    await prisma.examTest.create({
      data: {
        id: testExamId,
        title: "VC Test",
        seriesId: series.id,
        createdById: testUserId,
        durationMinutes: 30,
        totalQuestions: 2,
        totalMarks: 2,
      },
    });

    const sec = await prisma.examSection.create({
      data: { id: `sec_vc_${Date.now()}`, testId: testExamId, title: "Sec A", order: 1 },
    });

    const q1 = await prisma.examQuestion.create({
      data: {
        id: `q1_vc_${Date.now()}`,
        sectionId: sec.id,
        questionEn: "Q1",
        correctOption: "A",
        positiveMarks: 1,
        negativeMarks: 0,
      },
    });

    // Create 5 attempts with answers and archive
    for (let i = 0; i < 5; i++) {
      const attId = `att_vc_${Date.now()}_${i}`;
      const att = await prisma.examAttempt.create({
        data: {
          id: attId,
          testId: testExamId,
          userId: testUserId,
          status: "SUBMITTED",
          submittedAt: new Date(),
          score: 1,
        },
      });

      await prisma.examAttemptAnswer.create({
        data: {
          attemptId: attId,
          questionId: q1.id,
          selectedOption: "A",
          isCorrect: true,
          marksAwarded: 1,
          timeSpentSecs: 25,
        },
      });

      await prisma.examAttemptArchive.create({
        data: {
          attemptId: attId,
          testId: testExamId,
          userId: testUserId,
          score: 1,
          submittedAt: att.submittedAt!,
          answersBlob: [
            {
              questionId: q1.id,
              selectedOption: "A",
              isCorrect: true,
              marksAwarded: 1,
              timeSpentSecs: 25,
              isMarked: false,
            },
          ],
        },
      });
    }
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

  test("1. Verifier confirms 100% field-by-field match across archived attempts", async () => {
    const res = await verifyCompaction({
      examId: testExamId,
      sampleSize: 5,
    });

    assert.equal(res.sampledAttempts, 5);
    assert.equal(res.totalAnswersVerified, 5);
    assert.equal(res.mismatches.length, 0);
  });
});
