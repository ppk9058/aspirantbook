import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import {
  loginWithEmailPassword,
  registerUser,
  refreshSession,
  logoutAllSessions,
  listDeviceSessions,
} from "../lib/services/auth-token.service";
import {
  startTestAttempt,
  getAttemptDetail,
  syncAttemptAnswers,
  submitTestAttempt,
  getAttemptSolutions,
} from "../lib/services/exam.service";
import { getViewer } from "../lib/api/v1/viewer";
import { NextRequest } from "next/server";
import { createAccessToken } from "../lib/api/v1/tokens";

describe("API v1: Token Authentication & Security", () => {
  const testEmail = `test_user_${Date.now()}@example.com`;
  const testPassword = "Password123!";
  let userId: string;
  let activeRefreshToken: string;
  let activeAccessToken: string;

  before(async () => {
    // Register user
    const res = await registerUser({
      name: "Test Learner",
      email: testEmail,
      password: testPassword,
      consent: true,
      platform: "android",
      deviceName: "Pixel 8",
    });
    userId = res.user.id;
    activeRefreshToken = res.tokens.refreshToken;
    activeAccessToken = res.tokens.accessToken;
  });

  after(async () => {
    // Clean up
    if (userId) {
      await prisma.deviceSession.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.examAttempt.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
  });

  it("authenticates valid login and issues 15-min access token + refresh token", async () => {
    const res = await loginWithEmailPassword({
      email: testEmail,
      password: testPassword,
      platform: "android",
      deviceName: "Pixel 8 Pro",
    });

    assert.equal(res.tokens.tokenType, "Bearer");
    assert.equal(res.tokens.expiresIn, 900);
    assert.ok(res.tokens.accessToken.length > 50);
    assert.ok(res.tokens.refreshToken.length >= 32);
    assert.equal(res.user.email, testEmail);

    activeRefreshToken = res.tokens.refreshToken;
    activeAccessToken = res.tokens.accessToken;
  });

  it("rejects login with wrong password", async () => {
    await assert.rejects(
      async () => {
        await loginWithEmailPassword({
          email: testEmail,
          password: "WrongPassword999!",
          platform: "android",
        });
      },
      { message: /UNAUTHORIZED: Invalid email or password/ }
    );
  });

  it("resolves viewer context via Bearer token in getViewer", async () => {
    const req = new NextRequest("http://127.0.0.1:3045/api/v1/me", {
      headers: {
        Authorization: `Bearer ${activeAccessToken}`,
      },
    });

    const viewer = await getViewer(req);
    assert.equal(viewer.userId, userId);
    assert.equal(viewer.email, testEmail);
    assert.equal(viewer.isGuest, false);
    assert.equal(viewer.authMethod, "bearer");
  });

  it("rotates refresh token and replaces old token with new token", async () => {
    const res = await refreshSession(activeRefreshToken);
    assert.ok(res.tokens.refreshToken);
    assert.notEqual(res.tokens.refreshToken, activeRefreshToken);

    const oldToken = activeRefreshToken;
    activeRefreshToken = res.tokens.refreshToken;
    activeAccessToken = res.tokens.accessToken;

    // Test REUSE DETECTION: Replaying the oldToken must revoke the family!
    await assert.rejects(
      async () => {
        await refreshSession(oldToken);
      },
      { message: /Token reuse detected/ }
    );

    // After reuse detection, activeRefreshToken should now also be revoked!
    await assert.rejects(
      async () => {
        await refreshSession(activeRefreshToken);
      },
      { message: /Invalid or expired refresh token|Token reuse detected/ }
    );
  });

  it("logout-all revokes all sessions and bumps sessionVersion", async () => {
    // Log in again to get fresh session
    const res = await loginWithEmailPassword({
      email: testEmail,
      password: testPassword,
      platform: "android",
    });

    const sessionsBefore = await listDeviceSessions(userId);
    assert.ok(sessionsBefore.length >= 1);

    await logoutAllSessions(userId);

    const sessionsAfter = await listDeviceSessions(userId);
    assert.equal(sessionsAfter.length, 0);

    // The access token issued before logout-all should fail validation in getViewer
    const req = new NextRequest("http://127.0.0.1:3045/api/v1/me", {
      headers: {
        Authorization: `Bearer ${res.tokens.accessToken}`,
      },
    });
    const viewer = await getViewer(req);
    assert.equal(viewer.userId, null);
    assert.equal(viewer.isGuest, true);
  });
});

describe("API v1: CBT Exam Engine, Answer Slicing & IDOR Checks", () => {
  let userId1: string;
  let userId2: string;
  let testId: string;
  let attemptId: string;
  let questionIds: string[] = [];

  before(async () => {
    // Create 2 test users
    const u1 = await registerUser({
      name: "Alice CBT",
      email: `alice_${Date.now()}@example.com`,
      password: "Password123!",
      consent: true,
      platform: "android",
    });
    userId1 = u1.user.id;

    const u2 = await registerUser({
      name: "Bob CBT",
      email: `bob_${Date.now()}@example.com`,
      password: "Password123!",
      consent: true,
      platform: "android",
    });
    userId2 = u2.user.id;

    // Find or create an exam test for testing
    let series = await prisma.examSeries.findFirst();
    if (!series) {
      series = await prisma.examSeries.create({
        data: {
          title: "Test Series 2026",
          slug: `test-series-${Date.now()}`,
          category: "UPSC",
          createdById: userId1,
        },
      });
    }

    const test = await prisma.examTest.create({
      data: {
        seriesId: series.id,
        title: "Full Mock Test 1",
        durationMinutes: 60,
        totalMarks: 8,
        totalQuestions: 2,
        isPublished: true,
        createdById: userId1,
        sections: {
          create: {
            title: "Section A",
            order: 1,
            questions: {
              create: [
                {
                  questionEn: "What is the capital of India?",
                  optionAEn: "Mumbai",
                  optionBEn: "New Delhi",
                  optionCEn: "Kolkata",
                  optionDEn: "Chennai",
                  correctOption: "B",
                  positiveMarks: 4,
                  negativeMarks: 1,
                  explanationEn: "New Delhi is the official capital of India.",
                  order: 1,
                },
                {
                  questionEn: "Which planet is known as the Red Planet?",
                  optionAEn: "Venus",
                  optionBEn: "Mars",
                  optionCEn: "Jupiter",
                  optionDEn: "Saturn",
                  correctOption: "B",
                  positiveMarks: 4,
                  negativeMarks: 1,
                  explanationEn: "Mars is known as the Red Planet due to iron oxide.",
                  order: 2,
                },
              ],
            },
          },
        },
      },
      include: {
        sections: {
          include: { questions: true },
        },
      },
    });

    testId = test.id;
    questionIds = test.sections[0].questions.map((q) => q.id);
  });

  after(async () => {
    if (testId) {
      await prisma.examAttemptAnswer.deleteMany({ where: { attempt: { testId } } }).catch(() => {});
      await prisma.examAttempt.deleteMany({ where: { testId } }).catch(() => {});
      await prisma.examQuestion.deleteMany({ where: { section: { testId } } }).catch(() => {});
      await prisma.examSection.deleteMany({ where: { testId } }).catch(() => {});
      await prisma.examTest.delete({ where: { id: testId } }).catch(() => {});
    }
    if (userId1) {
      await prisma.deviceSession.deleteMany({ where: { userId: userId1 } }).catch(() => {});
      await prisma.user.delete({ where: { id: userId1 } }).catch(() => {});
    }
    if (userId2) {
      await prisma.deviceSession.deleteMany({ where: { userId: userId2 } }).catch(() => {});
      await prisma.user.delete({ where: { id: userId2 } }).catch(() => {});
    }
  });

  it("starts or resumes exam attempt with accurate server timer", async () => {
    const viewer1 = {
      userId: userId1,
      email: "alice@test.local",
      name: "Alice",
      role: "STUDENT",
      isGuest: false,
      authMethod: "bearer" as const,
    };

    const res = await startTestAttempt(viewer1, testId);
    assert.ok(res.attemptId);
    assert.equal(res.testId, testId);
    assert.equal(res.durationMinutes, 60);
    assert.equal(res.resumed, false);
    attemptId = res.attemptId;

    // Second call resumes existing attempt
    const resumed = await startTestAttempt(viewer1, testId);
    assert.equal(resumed.attemptId, attemptId);
    assert.equal(resumed.resumed, true);
  });

  it("CRITICAL: questions returned in attempt detail NEVER leak correctOption or explanations", async () => {
    const viewer1 = {
      userId: userId1,
      email: "alice@test.local",
      name: "Alice",
      role: "STUDENT",
      isGuest: false,
      authMethod: "bearer" as const,
    };

    const detail = await getAttemptDetail(viewer1, attemptId);
    assert.equal(detail.questions.length, 2);
    for (const q of detail.questions) {
      assert.equal((q as any).correctOption, undefined);
      assert.equal((q as any).explanationEn, undefined);
      assert.equal((q as any).solution, undefined);
      assert.ok(q.textEn);
      assert.equal(q.optionsEn.length, 4);
    }
  });

  it("rejects IDOR: user2 cannot view or sync answers for user1 attempt", async () => {
    const viewer2 = {
      userId: userId2,
      email: "bob@test.local",
      name: "Bob",
      role: "STUDENT",
      isGuest: false,
      authMethod: "bearer" as const,
    };

    await assert.rejects(
      async () => {
        await getAttemptDetail(viewer2, attemptId);
      },
      { message: /FORBIDDEN/ }
    );

    await assert.rejects(
      async () => {
        await syncAttemptAnswers(
          viewer2,
          attemptId,
          [{ questionId: questionIds[0], selectedOption: "A", sequenceNumber: 1 }],
          1
        );
      },
      { message: /FORBIDDEN/ }
    );
  });

  it("syncs answers idempotently and accepts out-of-order sequence batches", async () => {
    const viewer1 = {
      userId: userId1,
      email: "alice@test.local",
      name: "Alice",
      role: "STUDENT",
      isGuest: false,
      authMethod: "bearer" as const,
    };

    // First batch: seq 2 arriving before seq 1
    const res1 = await syncAttemptAnswers(
      viewer1,
      attemptId,
      [{ questionId: questionIds[1], selectedOption: "B", sequenceNumber: 2 }],
      2
    );
    assert.equal(res1.syncedCount, 1);

    // Second batch: seq 1
    const res2 = await syncAttemptAnswers(
      viewer1,
      attemptId,
      [{ questionId: questionIds[0], selectedOption: "B", sequenceNumber: 1 }],
      1
    );
    assert.equal(res2.syncedCount, 1);

    const detail = await getAttemptDetail(viewer1, attemptId);
    assert.equal(detail.questions[0].selectedOption, "B");
    assert.equal(detail.questions[1].selectedOption, "B");
  });

  it("CRITICAL: Solutions endpoint rejects with 403 before submission", async () => {
    const viewer1 = {
      userId: userId1,
      email: "alice@test.local",
      name: "Alice",
      role: "STUDENT",
      isGuest: false,
      authMethod: "bearer" as const,
    };

    await assert.rejects(
      async () => {
        await getAttemptSolutions(viewer1, attemptId);
      },
      { message: /FORBIDDEN: Solutions and explanations become available only after test submission/ }
    );
  });

  it("submits attempt idempotently and provides solutions only after submit", async () => {
    const viewer1 = {
      userId: userId1,
      email: "alice@test.local",
      name: "Alice",
      role: "STUDENT",
      isGuest: false,
      authMethod: "bearer" as const,
    };

    const result = await submitTestAttempt(viewer1, attemptId);
    assert.equal(result.attemptId, attemptId);
    assert.equal(result.totalMarks, 8);
    assert.equal(result.score, 8); // Both questions answered 'B' which is correct
    assert.equal(result.correctCount, 2);
    assert.equal(result.wrongCount, 0);

    // Solutions now allowed!
    const solutions = await getAttemptSolutions(viewer1, attemptId);
    assert.equal(solutions.questions.length, 2);
    assert.equal(solutions.questions[0].correctOption, "B");
    assert.ok(solutions.questions[0].explanationEn);
  });
});
