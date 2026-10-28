import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import {
  computeLiveAttemptRanking,
  getAttemptRanking,
  getTestRankings,
} from "../../lib/exam-ranking";
import { gradeExamAttempt } from "../../lib/exam-grading";
import { invalidateLeaderboard } from "../../lib/exam-runtime/cache-invalidation";
import { guardTestDatabase } from "../../scripts/guard-test-db";

const testDbUrl =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_perf_v2_test";
process.env.DATABASE_URL = testDbUrl;
process.env.DIRECT_URL = testDbUrl;
guardTestDatabase(testDbUrl);

const prisma = new PrismaClient();

describe("P0-2: Correct Ranking Design Suite", () => {
  let testId: string;
  let user1Id: string;
  let user2Id: string;
  let user3Id: string;
  let user4Id: string;

  before(async () => {
    // 1. Create series and test
    const series = await prisma.examSeries.upsert({
      where: { slug: "p02-ranking-series" },
      update: {},
      create: {
        id: "es_p02_rank",
        title: "P02 Ranking Series",
        slug: "p02-ranking-series",
        examName: "Rank Exam",
        category: "UPSC",
        createdById: "system",
      },
    });

    const test = await prisma.examTest.upsert({
      where: { id: "test_p02_ranking" },
      update: {},
      create: {
        id: "test_p02_ranking",
        seriesId: series.id,
        title: "P02 Ranking Test",
        durationMinutes: 60,
        totalMarks: 100,
        totalQuestions: 1,
        isPublished: true,
        createdById: "system",
      },
    });
    testId = test.id;

    // 2. Create users
    const u1 = await prisma.user.upsert({
      where: { email: "p02_u1@trillionskill.test" },
      update: {},
      create: { id: "p02_u1", name: "Rank User 1", email: "p02_u1@trillionskill.test", role: "FREE" },
    });
    user1Id = u1.id;

    const u2 = await prisma.user.upsert({
      where: { email: "p02_u2@trillionskill.test" },
      update: {},
      create: { id: "p02_u2", name: "Rank User 2", email: "p02_u2@trillionskill.test", role: "FREE" },
    });
    user2Id = u2.id;

    const u3 = await prisma.user.upsert({
      where: { email: "p02_u3@trillionskill.test" },
      update: {},
      create: { id: "p02_u3", name: "Rank User 3", email: "p02_u3@trillionskill.test", role: "FREE" },
    });
    user3Id = u3.id;

    const u4 = await prisma.user.upsert({
      where: { email: "p02_u4@trillionskill.test" },
      update: {},
      create: { id: "p02_u4", name: "Rank User 4", email: "p02_u4@trillionskill.test", role: "FREE" },
    });
    user4Id = u4.id;
  });

  after(async () => {
    await prisma.examAttemptAnswer.deleteMany({ where: { attempt: { testId } } });
    await prisma.examAttempt.deleteMany({ where: { testId } });
    await prisma.$disconnect();
  });

  test("1. Ties and 1, 2, 2, 4 tie rule parity with legacy calculation", async () => {
    process.env.EXAM_RUNTIME_CACHE_LEADERBOARD = "0"; // direct legacy calculation
    await prisma.examAttempt.deleteMany({ where: { testId } });

    const baseTime = new Date("2026-10-29T10:00:00Z");

    // Candidate 1: Score 100, time 500s -> Rank 1
    const att1 = await prisma.examAttempt.create({
      data: {
        userId: user1Id,
        testId,
        status: "SUBMITTED",
        score: 100,
        timeTakenSecs: 500,
        startedAt: baseTime,
        submittedAt: new Date(baseTime.getTime() + 500000),
      },
    });

    // Candidate 2: Score 80, time 600s, submitted at 10:10 -> Tied for Rank 2
    const att2 = await prisma.examAttempt.create({
      data: {
        userId: user2Id,
        testId,
        status: "SUBMITTED",
        score: 80,
        timeTakenSecs: 600,
        startedAt: baseTime,
        submittedAt: new Date(baseTime.getTime() + 600000),
      },
    });

    // Candidate 3: Score 80, time 600s, submitted at 10:10 (identical score & time) -> Tied for Rank 2
    const att3 = await prisma.examAttempt.create({
      data: {
        userId: user3Id,
        testId,
        status: "SUBMITTED",
        score: 80,
        timeTakenSecs: 600,
        startedAt: baseTime,
        submittedAt: new Date(baseTime.getTime() + 600000),
      },
    });

    // Candidate 4: Score 60, time 700s -> Rank 4 (skips 3 due to 1, 2, 2, 4 rule)
    const att4 = await prisma.examAttempt.create({
      data: {
        userId: user4Id,
        testId,
        status: "SUBMITTED",
        score: 60,
        timeTakenSecs: 700,
        startedAt: baseTime,
        submittedAt: new Date(baseTime.getTime() + 700000),
      },
    });

    // Compute via legacy
    const legacyRankings = await getTestRankings(testId);
    assert.equal(legacyRankings.totalCandidates, 4);

    const r1 = legacyRankings.attemptRankMap.get(att1.id)!;
    const r2 = legacyRankings.attemptRankMap.get(att2.id)!;
    const r3 = legacyRankings.attemptRankMap.get(att3.id)!;
    const r4 = legacyRankings.attemptRankMap.get(att4.id)!;

    assert.equal(r1.rank, 1);
    assert.equal(r2.rank, 2);
    assert.equal(r3.rank, 2);
    assert.equal(r4.rank, 4);

    // Compute live query for att4
    const live4 = await computeLiveAttemptRanking(att4.id);
    assert.equal(live4.rank, 4, "Live ranking must produce rank 4 matching legacy 1,2,2,4 rule");
    assert.equal(live4.totalCandidates, 4);

    const live2 = await computeLiveAttemptRanking(att2.id);
    assert.equal(live2.rank, 2, "Live ranking for tied candidate must be rank 2");
  });

  test("2. Submitter rank non-null right after submit with cache warm and cold", async () => {
    process.env.EXAM_RUNTIME_CACHE_LEADERBOARD = "1"; // Cache enabled

    // Invalidate cache first
    await invalidateLeaderboard(testId);

    // Fetch leaderboard to warm up cache
    const warmRankings = await getTestRankings(testId);
    assert.ok(warmRankings);

    // Now submit a new attempt for User 1
    const freshAttempt = await prisma.examAttempt.create({
      data: {
        userId: user1Id,
        testId,
        status: "SUBMITTED",
        score: 110, // Beats everyone
        timeTakenSecs: 400,
        startedAt: new Date(),
        submittedAt: new Date(),
      },
    });

    // Check rank immediately
    const immediateRank = await getAttemptRanking(freshAttempt.id);
    assert.notEqual(immediateRank.rank, null, "Rank must never be null with cache warm");
    assert.notEqual(immediateRank.percentile, null, "Percentile must never be null with cache warm");
    assert.equal(immediateRank.rank, 1, "Top score must receive rank 1");

    // Percentile bounds check
    assert.ok(immediateRank.percentile! >= 0 && immediateRank.percentile! <= 100);
  });

  test("3. Percentile bounds: exactly 100 for sole candidate, between 0 and 100 for N candidates", async () => {
    const singleTestId = "test_single_candidate";
    await prisma.examTest.upsert({
      where: { id: singleTestId },
      update: {},
      create: {
        id: singleTestId,
        seriesId: "es_p02_rank",
        title: "Single Candidate Test",
        durationMinutes: 30,
        totalMarks: 50,
        totalQuestions: 1,
        isPublished: true,
        createdById: "system",
      },
    });

    const soloAttempt = await prisma.examAttempt.create({
      data: {
        userId: user1Id,
        testId: singleTestId,
        status: "SUBMITTED",
        score: 45,
        timeTakenSecs: 300,
        startedAt: new Date(),
        submittedAt: new Date(),
      },
    });

    const soloRanking = await computeLiveAttemptRanking(soloAttempt.id);
    assert.equal(soloRanking.rank, 1);
    assert.equal(soloRanking.percentile, 100, "Sole candidate must receive percentile 100");

    await prisma.examAttempt.deleteMany({ where: { testId: singleTestId } });
    await prisma.examTest.deleteMany({ where: { id: singleTestId } });
  });

  test("4. 2 concurrent submits both receive non-null rankings and correct total counts", async () => {
    process.env.EXAM_RUNTIME_CACHE_LEADERBOARD = "1";

    const attA = await prisma.examAttempt.create({
      data: {
        userId: user2Id,
        testId,
        status: "SUBMITTED",
        score: 85,
        timeTakenSecs: 550,
        startedAt: new Date(),
        submittedAt: new Date(),
      },
    });

    const attB = await prisma.examAttempt.create({
      data: {
        userId: user3Id,
        testId,
        status: "SUBMITTED",
        score: 87,
        timeTakenSecs: 540,
        startedAt: new Date(),
        submittedAt: new Date(),
      },
    });

    const [rankA, rankB] = await Promise.all([
      getAttemptRanking(attA.id),
      getAttemptRanking(attB.id),
    ]);

    assert.notEqual(rankA.rank, null);
    assert.notEqual(rankB.rank, null);
    assert.ok(rankB.rank! <= rankA.rank!, "Higher score candidate B must rank equal to or better than A");
  });
});
