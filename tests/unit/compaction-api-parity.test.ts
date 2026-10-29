import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { setMockSessionProvider } from "../../auth";
import { GET } from "../../app/api/exam/attempt/[attemptId]/result/route";

const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres_password@127.0.0.1:54345/trillionskill_compact?connection_limit=10";
process.env.DATABASE_URL = dbUrl;
process.env.DIRECT_URL = dbUrl;

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

describe("Task C5c: End-to-End API Parity (Compacted vs Legacy Review)", () => {
  const testUserId = `u_cap_${Date.now()}`;
  const testExamId = `e_cap_${Date.now()}`;
  const attemptIds: string[] = [];

  before(async () => {
    await prisma.user.create({
      data: { id: testUserId, email: `${testUserId}@example.com`, name: "CAP User" },
    });

    const series = await prisma.examSeries.findFirst();
    if (!series) throw new Error("No series found");

    await prisma.examTest.create({
      data: {
        id: testExamId,
        title: "CAP Test",
        seriesId: series.id,
        createdById: testUserId,
        durationMinutes: 30,
        totalQuestions: 2,
        totalMarks: 2,
      },
    });

    const sec = await prisma.examSection.create({
      data: { id: `sec_cap_${Date.now()}`, testId: testExamId, title: "Sec A", order: 1 },
    });

    const q1 = await prisma.examQuestion.create({
      data: {
        id: `q1_cap_${Date.now()}`,
        sectionId: sec.id,
        questionEn: "Q1",
        correctOption: "A",
        positiveMarks: 1,
        negativeMarks: 0,
      },
    });

    for (let i = 0; i < 5; i++) {
      const attId = `att_cap_${Date.now()}_${i}`;
      attemptIds.push(attId);
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
          timeSpentSecs: 20,
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
              timeSpentSecs: 20,
              isMarked: false,
            },
          ],
        },
      });
    }
  });

  after(async () => {
    setMockSessionProvider(null);
    await prisma.examAttemptArchive.deleteMany({ where: { testId: testExamId } });
    await prisma.examAttemptAnswer.deleteMany({ where: { attempt: { testId: testExamId } } });
    await prisma.examAttempt.deleteMany({ where: { testId: testExamId } });
    await prisma.examQuestion.deleteMany({ where: { section: { testId: testExamId } } });
    await prisma.examSection.deleteMany({ where: { testId: testExamId } });
    await prisma.examTest.deleteMany({ where: { id: testExamId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  test("1. Attempts produce 100% byte-identical JSON responses between legacy and archive paths", async () => {
    assert.equal(attemptIds.length, 5);

    for (const attId of attemptIds) {
      setMockSessionProvider(() => ({
        user: { id: testUserId, role: "USER" },
      }));

      const req = new NextRequest(`http://127.0.0.1:3045/api/exam/attempt/${attId}/result`);

      // Legacy path
      process.env.EXAM_ATTEMPT_COMPACTION_ENABLED = "false";
      const resLegacy = await GET(req, { params: Promise.resolve({ attemptId: attId }) });
      assert.equal(resLegacy.status, 200);
      const jsonLegacy = await resLegacy.json();
      const strLegacy = JSON.stringify(jsonLegacy);

      // Compact path
      process.env.EXAM_ATTEMPT_COMPACTION_ENABLED = "true";
      const resCompact = await GET(req, { params: Promise.resolve({ attemptId: attId }) });
      assert.equal(resCompact.status, 200);
      const jsonCompact = await resCompact.json();
      const strCompact = JSON.stringify(jsonCompact);

      assert.equal(strLegacy, strCompact, `Byte mismatch for attempt ${attId}`);
    }
  });
});
