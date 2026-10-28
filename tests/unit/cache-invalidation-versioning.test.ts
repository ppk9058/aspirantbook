import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { getSanitizedQuestionSet } from "../../lib/exam-questions-cache";
import {
  invalidateExamQuestions,
  getExamQuestionsVersion,
  onAiQuestionTranslationBatchApproved,
  clearLocalVersionTracker,
} from "../../lib/exam-runtime/cache-invalidation";
import { guardTestDatabase } from "../../scripts/guard-test-db";

const testDbUrl =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_perf_v2_test";
process.env.DATABASE_URL = testDbUrl;
process.env.DIRECT_URL = testDbUrl;
guardTestDatabase(testDbUrl);

const prisma = new PrismaClient();

describe("P1-1: Cache Invalidation & Inter-Process Versioning Suite", () => {
  let testId: string;
  let sectionId: string;
  let q1Id: string;
  let q2Id: string;

  before(async () => {
    process.env.EXAM_RUNTIME_CACHE_QUESTIONS = "1";

    const series = await prisma.examSeries.upsert({
      where: { slug: "p11-cache-series" },
      update: {},
      create: {
        id: "es_p11_cache",
        title: "P1-1 Cache Series",
        slug: "p11-cache-series",
        examName: "Cache Test Exam",
        category: "UPSC",
        createdById: "system",
      },
    });

    const test = await prisma.examTest.upsert({
      where: { id: "test_p11_cache" },
      update: {},
      create: {
        id: "test_p11_cache",
        seriesId: series.id,
        title: "P1-1 Cache Test",
        durationMinutes: 45,
        totalMarks: 50,
        totalQuestions: 2,
        isPublished: true,
        createdById: "system",
      },
    });
    testId = test.id;

    const section = await prisma.examSection.upsert({
      where: { id: "sec_p11_cache" },
      update: {},
      create: {
        id: "sec_p11_cache",
        testId,
        title: "Section 1",
        order: 1,
        positiveMarks: 2,
        negativeMarks: 0.5,
      },
    });
    sectionId = section.id;

    const q1 = await prisma.examQuestion.upsert({
      where: { id: "q_p11_1" },
      update: {},
      create: {
        id: "q_p11_1",
        sectionId,
        order: 1,
        questionEn: "Original Question 1",
        optionAEn: "Opt 1A",
        optionBEn: "Opt 1B",
        correctOption: "A",
        positiveMarks: 2,
        negativeMarks: 0.5,
      },
    });
    q1Id = q1.id;

    const q2 = await prisma.examQuestion.upsert({
      where: { id: "q_p11_2" },
      update: {},
      create: {
        id: "q_p11_2",
        sectionId,
        order: 2,
        questionEn: "Original Question 2",
        optionAEn: "Opt 2A",
        optionBEn: "Opt 2B",
        correctOption: "B",
        positiveMarks: 2,
        negativeMarks: 0.5,
      },
    });
    q2Id = q2.id;
  });

  after(async () => {
    await prisma.examQuestion.deleteMany({ where: { sectionId } });
    await prisma.examSection.deleteMany({ where: { testId } });
    await prisma.examTest.deleteMany({ where: { id: testId } });
    await prisma.$disconnect();
  });

  test("1. Edit question followed by immediate invalidateExamQuestions shows new data on same instance", async () => {
    // 1. Initial warm read
    const initial = await getSanitizedQuestionSet(testId);
    assert.ok(initial);
    assert.equal(initial.sections[0].questions[0].questionEn, "Original Question 1");

    // 2. Edit question
    await prisma.examQuestion.update({
      where: { id: q1Id },
      data: { questionEn: "Updated Question 1 Title" },
    });

    // Invalidate
    await invalidateExamQuestions(testId);

    // 3. Immediate read must show updated data
    const updated = await getSanitizedQuestionSet(testId);
    assert.ok(updated);
    assert.equal(updated.sections[0].questions[0].questionEn, "Updated Question 1 Title");
  });

  test("2. Cross-process edit is detected via version check without explicit local invalidate", async () => {
    // 1. Warm read
    const warm = await getSanitizedQuestionSet(testId);
    assert.ok(warm);

    // 2. Simulate another process updating question 2 directly in DB
    await prisma.examQuestion.update({
      where: { id: q2Id },
      data: { questionEn: "Question 2 Remote Edit" },
    });

    // Simulate process B's version check interval (local in-memory version tracker reset)
    clearLocalVersionTracker(testId);
    const newVersion = await getExamQuestionsVersion(testId);
    assert.ok(newVersion);

    // 3. Read again - detects version change against Redis cache and reloads
    const reloaded = await getSanitizedQuestionSet(testId);
    assert.ok(reloaded);
    assert.equal(reloaded.sections[0].questions[1].questionEn, "Question 2 Remote Edit");
  });

  test("3. onAiQuestionTranslationBatchApproved hook invalidates and triggers fresh translation read", async () => {
    // 1. Ensure cache is warm
    await getSanitizedQuestionSet(testId);

    // 2. AI batch approves Hindi translations
    await prisma.examQuestion.update({
      where: { id: q1Id },
      data: { questionHi: "AI Translated Question 1 (Hindi)" },
    });

    // Invoke documented AI integration hook
    await onAiQuestionTranslationBatchApproved(testId, [q1Id]);

    // 3. Immediate read returns newly approved Hindi translation
    const postAi = await getSanitizedQuestionSet(testId);
    assert.ok(postAi);
    assert.equal(
      postAi.sections[0].questions[0].questionHi,
      "AI Translated Question 1 (Hindi)"
    );
  });
});
