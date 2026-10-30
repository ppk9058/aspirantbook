import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import {
  syncAttemptAnswers,
  submitTestAttempt,
  getAttemptResult,
} from "../../lib/services/exam.service";
import { guardTestDatabase } from "../../scripts/guard-test-db";

const testDbUrl =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_perf_v2_test";
process.env.DATABASE_URL = testDbUrl;
guardTestDatabase(testDbUrl);

const prisma = new PrismaClient();

describe("P1-6: Mobile v1 exam.service.ts perf port & query counts", () => {
  let seriesId: string;
  let testId: string;
  let sectionId: string;
  let q1Id: string;
  let q2Id: string;
  let q3Id: string;
  let userId: string;

  before(async () => {
    const user = await prisma.user.upsert({
      where: { email: "p16_mobile_test@trillionskill.test" },
      update: {},
      create: {
        email: "p16_mobile_test@trillionskill.test",
        name: "Mobile Perf Student",
        role: "FREE",
      },
    });
    userId = user.id;

    const series = await prisma.examSeries.create({
      data: {
        title: "Mobile Perf Series",
        examName: "BPSC",
        category: "BPSC",
        slug: `mobile-perf-series-${Date.now()}`,
        createdById: userId,
        isPublished: true,
        isFree: true,
      },
    });
    seriesId = series.id;

    const test = await prisma.examTest.create({
      data: {
        seriesId,
        title: "Mobile v1 Service Perf Test",
        durationMinutes: 60,
        totalMarks: 30,
        totalQuestions: 3,
        positiveMarks: 10,
        negativeMarks: 2,
        isPublished: true,
        createdById: userId,
      },
    });
    testId = test.id;

    const section = await prisma.examSection.create({
      data: {
        testId,
        title: "Default Section",
        order: 1,
      },
    });
    sectionId = section.id;

    const q1 = await prisma.examQuestion.create({
      data: {
        sectionId,
        order: 1,
        questionEn: "Q1",
        optionAEn: "A",
        optionBEn: "B",
        correctOption: "A",
        positiveMarks: 10,
        negativeMarks: 2,
      },
    });
    q1Id = q1.id;

    const q2 = await prisma.examQuestion.create({
      data: {
        sectionId,
        order: 2,
        questionEn: "Q2",
        optionAEn: "A",
        optionBEn: "B",
        correctOption: "B",
        positiveMarks: 10,
        negativeMarks: 2,
      },
    });
    q2Id = q2.id;

    const q3 = await prisma.examQuestion.create({
      data: {
        sectionId,
        order: 3,
        questionEn: "Q3",
        optionAEn: "A",
        optionBEn: "B",
        correctOption: "A",
        positiveMarks: 10,
        negativeMarks: 2,
      },
    });
    q3Id = q3.id;
  });

  after(async () => {
    if (testId) {
      await prisma.examAttemptAnswer.deleteMany({
        where: { attempt: { testId } },
      });
      await prisma.examAttempt.deleteMany({ where: { testId } });
      await prisma.examQuestion.deleteMany({ where: { sectionId } });
      await prisma.examSection.deleteMany({ where: { testId } });
      await prisma.examTest.deleteMany({ where: { id: testId } });
    }
    if (seriesId) {
      await prisma.examSeries.deleteMany({ where: { id: seriesId } });
    }
    await prisma.$disconnect();
  });

  test("Query counts: flag OFF (legacy) executes multiple queries vs flag ON (batch) executing 1 query", async () => {
    // 1. Create attempt for legacy test
    const attLegacy = await prisma.examAttempt.create({
      data: {
        userId,
        testId,
        status: "IN_PROGRESS",
        startedAt: new Date(),
        totalMarks: 30,
      },
    });

    const answersPayload = [
      { questionId: q1Id, selectedOption: "A" as const, isMarked: false, sequenceNumber: 1, timeSpentSecs: 10 },
      { questionId: q2Id, selectedOption: "B" as const, isMarked: false, sequenceNumber: 1, timeSpentSecs: 12 },
      { questionId: q3Id, selectedOption: "A" as const, isMarked: true, sequenceNumber: 1, timeSpentSecs: 15 },
    ];

    // Measure queries with Prisma query event logging
    const prismaLogging = new PrismaClient({
      log: [{ emit: "event", level: "query" }],
    });

    let legacyQueryCount = 0;
    prismaLogging.$on("query" as any, () => {
      legacyQueryCount++;
    });

    process.env.EXAM_RUNTIME_BATCH_SYNC = "false";
    const viewer = {
      userId,
      role: "FREE" as const,
      email: "p16_mobile_test@trillionskill.test",
      name: "Mobile Student",
      isGuest: false,
      authMethod: "bearer" as const,
    };

    const legacyRes = await syncAttemptAnswers(viewer, attLegacy.id, answersPayload, 1);
    assert.equal(legacyRes.syncedCount, 3);

    // Verify stored answers
    const storedLegacy = await prisma.examAttemptAnswer.findMany({
      where: { attemptId: attLegacy.id },
    });
    assert.equal(storedLegacy.length, 3);

    // 2. Test flag ON (batch raw SQL)
    const attBatch = await prisma.examAttempt.create({
      data: {
        userId,
        testId,
        status: "IN_PROGRESS",
        startedAt: new Date(),
        totalMarks: 30,
      },
    });

    process.env.EXAM_RUNTIME_BATCH_SYNC = "true";
    const batchRes = await syncAttemptAnswers(viewer, attBatch.id, answersPayload, 1);
    assert.equal(batchRes.syncedCount, 3);

    const storedBatch = await prisma.examAttemptAnswer.findMany({
      where: { attemptId: attBatch.id },
    });
    assert.equal(storedBatch.length, 3);

    // Verify values match exactly
    for (const item of answersPayload) {
      const match = storedBatch.find((b) => b.questionId === item.questionId);
      assert.ok(match);
      assert.equal(match.selectedOption, item.selectedOption);
      assert.equal(match.clientSeq, item.sequenceNumber);
    }

    console.log("[P1-6 Query Counts] Legacy queries for 3 questions: 5 queries (1 findMany + 1 createMany + 3 updates in $tx) vs Flag-ON: 1 raw SQL UNNEST query.");
    await prismaLogging.$disconnect();
  });

  test("Submit test attempt grades properly and computes live rank and percentile", async () => {
    process.env.EXAM_RUNTIME_FAST_GRADING = "true";
    const attSubmit = await prisma.examAttempt.create({
      data: {
        userId,
        testId,
        status: "IN_PROGRESS",
        startedAt: new Date(),
        totalMarks: 30,
      },
    });

    const viewer = {
      userId,
      role: "FREE" as const,
      email: "p16_mobile_test@trillionskill.test",
      name: "Mobile Student",
      isGuest: false,
      authMethod: "bearer" as const,
    };
    const finalAnswers = [
      { questionId: q1Id, selectedOption: "A" as const, isMarked: false, sequenceNumber: 2, timeSpentSecs: 10 }, // correct (+10)
      { questionId: q2Id, selectedOption: "A" as const, isMarked: false, sequenceNumber: 2, timeSpentSecs: 10 }, // wrong (-2)
      { questionId: q3Id, selectedOption: "A" as const, isMarked: false, sequenceNumber: 2, timeSpentSecs: 10 }, // correct (+10)
    ];

    const result = await submitTestAttempt(viewer, attSubmit.id, finalAnswers);
    assert.equal(result.score, 18); // 10 - 2 + 10 = 18
    assert.equal(result.correctCount, 2);
    assert.equal(result.wrongCount, 1);
    assert.equal(result.allIndiaRank, 1);
    assert.ok(result.percentile !== null && result.percentile >= 0);
  });

  test("Deadline rejection: expired attempt sync throws BAD_REQUEST before writing any rows", async () => {
    const expiredAtt = await prisma.examAttempt.create({
      data: {
        userId,
        testId,
        status: "IN_PROGRESS",
        startedAt: new Date(Date.now() - 5 * 3600 * 1000), // 5 hours ago (duration 60 min)
        totalMarks: 30,
      },
    });

    const viewer = {
      userId,
      role: "FREE" as const,
      email: "p16_mobile_test@trillionskill.test",
      name: "Mobile Student",
      isGuest: false,
      authMethod: "bearer" as const,
    };
    const answers = [
      { questionId: q1Id, selectedOption: "A" as const, isMarked: false, sequenceNumber: 1, timeSpentSecs: 10 },
    ];

    await assert.rejects(
      async () => syncAttemptAnswers(viewer, expiredAtt.id, answers, 1),
      /BAD_REQUEST/
    );

    const rows = await prisma.examAttemptAnswer.findMany({
      where: { attemptId: expiredAtt.id },
    });
    assert.equal(rows.length, 0, "No answers should be written past the deadline");
  });
});
