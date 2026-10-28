import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { registerUser } from "../lib/services/auth-token.service";
import { NextRequest } from "next/server";
import { GET as getExamSeriesRoute } from "../app/api/v1/exam-series/route";
import { GET as getExamSeriesDetailRoute } from "../app/api/v1/exam-series/[id]/route";
import { GET as getMyTestsRoute } from "../app/api/v1/my-tests/route";
import { GET as getLeaderboardRoute } from "../app/api/v1/tests/[id]/leaderboard/route";

describe("API v1: Exam Series, My-Tests, and Leaderboard Parity", () => {
  let studentUser: { id: string; email: string; token: string };
  let seriesId: string;
  let testId: string;
  let attemptId: string;

  before(async () => {
    // 1. Register student user
    const email = `exam_series_student_${Date.now()}@example.com`;
    const reg = await registerUser({
      name: "Series Student",
      email,
      password: "SeriesPassword123!",
      consent: true,
      platform: "android",
    });
    studentUser = {
      id: reg.user.id,
      email,
      token: reg.tokens.accessToken,
    };

    // 2. Create test series
    const series = await prisma.examSeries.create({
      data: {
        title: "Test Series BPSC 70th Prelims",
        slug: `bpsc-70th-${Date.now()}`,
        examName: "BPSC Combined Exam",
        category: "BPSC",
        description: "Comprehensive 2026 test series for BPSC prelims",
        isPublished: true,
        isFree: true,
        totalTests: 1,
        freeTests: 1,
        createdById: studentUser.id,
      },
    });
    seriesId = series.id;

    // 3. Create test inside series
    const test = await prisma.examTest.create({
      data: {
        seriesId: series.id,
        title: "BPSC Prelims Full Mock 1",
        accessMode: "FREE",
        durationMinutes: 120,
        totalQuestions: 10,
        totalMarks: 10,
        positiveMarks: 1.0,
        negativeMarks: 0.25,
        isPublished: true,
        createdById: studentUser.id,
      },
    });
    testId = test.id;

    // 4. Create an enrollment
    await prisma.examSeriesEnrollment.create({
      data: {
        userId: studentUser.id,
        seriesId: series.id,
        status: "ACTIVE",
      },
    });

    // 5. Create a submitted attempt for studentUser
    const attempt = await prisma.examAttempt.create({
      data: {
        userId: studentUser.id,
        testId: test.id,
        status: "SUBMITTED",
        score: 8.5,
        totalMarks: 10,
        correctCount: 9,
        wrongCount: 1,
        skippedCount: 0,
        markedCount: 1,
        timeTakenSecs: 3600,
        percentile: 95.0,
        allIndiaRank: 1,
        startedAt: new Date(Date.now() - 3600000),
        submittedAt: new Date(),
      },
    });
    attemptId = attempt.id;
  });

  after(async () => {
    // Cleanup created data
    if (attemptId) {
      await prisma.examAttempt.deleteMany({ where: { id: attemptId } });
    }
    if (testId) {
      await prisma.examTest.deleteMany({ where: { id: testId } });
    }
    if (seriesId) {
      await prisma.examSeriesEnrollment.deleteMany({ where: { seriesId } });
      await prisma.examSeries.deleteMany({ where: { id: seriesId } });
    }
    if (studentUser?.id) {
      await prisma.user.deleteMany({ where: { id: studentUser.id } });
    }
  });

  it("GET /api/v1/exam-series returns published packages and respects category filter", async () => {
    const req = new NextRequest("http://127.0.0.1:3046/api/v1/exam-series?category=BPSC");
    const res = await getExamSeriesRoute(req);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.ok, true);
    assert.ok(Array.isArray(json.data));
    const found = json.data.find((s: any) => s.id === seriesId);
    assert.ok(found, "Expected created series in package list");
    assert.equal(found.category, "BPSC");
  });

  it("GET /api/v1/exam-series/[id] returns package detail and tests with user status", async () => {
    const req = new NextRequest(`http://127.0.0.1:3046/api/v1/exam-series/${seriesId}`, {
      headers: { Authorization: `Bearer ${studentUser.token}` },
    });
    const res = await getExamSeriesDetailRoute(req, {
      params: Promise.resolve({ id: seriesId }),
    });
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.ok, true);
    assert.equal(json.data.series.id, seriesId);
    assert.equal(json.data.isEnrolled, true);
    assert.ok(json.data.tests.length >= 1);
    const testItem = json.data.tests.find((t: any) => t.id === testId);
    assert.ok(testItem);
    assert.equal(testItem.userStatus.status, "SUBMITTED");
    assert.equal(testItem.userStatus.score, 8.5);
  });

  it("GET /api/v1/exam-series/[id] returns 404 for nonexistent series", async () => {
    const req = new NextRequest("http://127.0.0.1:3046/api/v1/exam-series/nonexistent-series-1234");
    const res = await getExamSeriesDetailRoute(req, {
      params: Promise.resolve({ id: "nonexistent-series-1234" }),
    });
    assert.equal(res.status, 404);
  });

  it("GET /api/v1/my-tests returns 401 for guests", async () => {
    const req = new NextRequest("http://127.0.0.1:3046/api/v1/my-tests");
    const res = await getMyTestsRoute(req);
    assert.equal(res.status, 401);
  });

  it("GET /api/v1/my-tests returns enrolled series and recent attempts for logged-in user", async () => {
    const req = new NextRequest("http://127.0.0.1:3046/api/v1/my-tests", {
      headers: { Authorization: `Bearer ${studentUser.token}` },
    });
    const res = await getMyTestsRoute(req);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.ok, true);
    assert.ok(Array.isArray(json.data.inProgress));
    assert.ok(Array.isArray(json.data.enrolledSeries));
    assert.ok(Array.isArray(json.data.recentAttempts));

    const enrolledFound = json.data.enrolledSeries.find((e: any) => e.seriesId === seriesId);
    assert.ok(enrolledFound, "Expected enrolled series in response");

    const recentFound = json.data.recentAttempts.find((a: any) => a.testId === testId);
    assert.ok(recentFound, "Expected recent submitted attempt in response");
    assert.equal(recentFound.score, 8.5);
  });

  it("GET /api/v1/tests/[id]/leaderboard returns 401 for guests", async () => {
    const req = new NextRequest(`http://127.0.0.1:3046/api/v1/tests/${testId}/leaderboard`);
    const res = await getLeaderboardRoute(req, {
      params: Promise.resolve({ id: testId }),
    });
    assert.equal(res.status, 401);
  });

  it("GET /api/v1/tests/[id]/leaderboard returns 403 when student has NOT submitted the test", async () => {
    const otherEmail = `other_student_${Date.now()}@example.com`;
    const other = await registerUser({
      name: "Other Student",
      email: otherEmail,
      password: "Password123!",
      consent: true,
      platform: "android",
    });
    try {
      const req = new NextRequest(`http://127.0.0.1:3046/api/v1/tests/${testId}/leaderboard`, {
        headers: { Authorization: `Bearer ${other.tokens.accessToken}` },
      });
      const res = await getLeaderboardRoute(req, {
        params: Promise.resolve({ id: testId }),
      });
      assert.equal(res.status, 403);
    } finally {
      await prisma.user.deleteMany({ where: { id: other.user.id } });
    }
  });

  it("GET /api/v1/tests/[id]/leaderboard returns ranking data when student submitted attempt", async () => {
    const req = new NextRequest(`http://127.0.0.1:3046/api/v1/tests/${testId}/leaderboard`, {
      headers: { Authorization: `Bearer ${studentUser.token}` },
    });
    const res = await getLeaderboardRoute(req, {
      params: Promise.resolve({ id: testId }),
    });
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.ok, true);
    assert.equal(json.data.testId, testId);
    assert.ok(json.data.totalParticipants >= 1);
    assert.ok(json.data.currentUserRank);
    assert.equal(json.data.currentUserRank.isCurrentUser, true);
  });
});
