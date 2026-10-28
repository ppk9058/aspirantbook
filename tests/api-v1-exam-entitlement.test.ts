import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { registerUser } from "../lib/services/auth-token.service";
import { NextRequest } from "next/server";
import { POST as startAttemptRoute } from "../app/api/v1/tests/[id]/attempts/route";
import { checkTestAccess } from "../lib/auth/entitlements";
import { createApiClient } from "@aspirantbook/shared";

/**
 * A2: free learners must not be able to start a premium (PRO) test from the
 * mobile v1 API. The decision comes from the same shared `checkTestAccess`
 * policy the web start route uses, so both surfaces agree.
 */
describe("API v1: premium test entitlement parity", () => {
  let userId = "";
  let token = "";
  let teacherId = "";
  let seriesId = "";
  let testId = "";

  before(async () => {
    const email = `a2_free_${Date.now()}@example.com`;
    const reg = await registerUser({
      name: "Free Learner",
      email,
      password: "FreePassword123!",
      consent: true,
      platform: "android",
    });
    userId = reg.user.id;
    token = reg.tokens.accessToken;

    const teacher = await registerUser({
      name: "Author Teacher",
      email: `a2_teacher_${Date.now()}@example.com`,
      password: "TeacherPassword123!",
      consent: true,
      platform: "android",
    });
    teacherId = teacher.user.id;

    const series = await prisma.examSeries.create({
      data: {
        title: "A2 Premium Series",
        slug: `a2-premium-${Date.now()}`,
        examName: "BPSC",
        category: "BPSC",
        isPublished: true,
        isFree: false,
        createdById: teacherId,
      },
    });
    seriesId = series.id;

    const test = await prisma.examTest.create({
      data: {
        seriesId,
        title: "A2 Premium Mock",
        accessMode: "PRO",
        durationMinutes: 60,
        totalQuestions: 5,
        totalMarks: 5,
        positiveMarks: 1,
        negativeMarks: 0.25,
        isPublished: true,
        createdById: teacherId,
      },
    });
    testId = test.id;
  });

  after(async () => {
    if (testId) await prisma.examAttempt.deleteMany({ where: { testId } });
    if (testId) await prisma.examTest.deleteMany({ where: { id: testId } });
    if (seriesId) {
      await prisma.examSeriesEnrollment.deleteMany({ where: { seriesId } });
      await prisma.examSeries.deleteMany({ where: { id: seriesId } });
    }
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    if (teacherId) await prisma.user.deleteMany({ where: { id: teacherId } });
  });

  it("shared policy denies a free learner on a PRO test", async () => {
    const access = await checkTestAccess(userId, testId, "STUDENT");
    assert.equal(access.allowed, false);
    assert.equal(access.reason, "LOCKED");
  });

  it("POST /api/v1/tests/:id/attempts returns 403 and creates no attempt", async () => {
    const req = new NextRequest(`http://127.0.0.1:3045/api/v1/tests/${testId}/attempts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = await startAttemptRoute(req, { params: Promise.resolve({ id: testId }) });
    assert.equal(res.status, 403);
    const json = await res.json();
    assert.equal(json.ok, false);
    assert.equal(json.error.code, "FORBIDDEN");
    assert.match(json.error.message, /Pass|subscription/i);

    const attempts = await prisma.examAttempt.count({ where: { testId, userId } });
    assert.equal(attempts, 0);
  });

  it("the mobile shared client surfaces the denial as a readable error", async () => {
    const client = createApiClient({
      baseUrl: "http://mobile.test",
      getAccessToken: () => token,
      fetchFn: async (url, init) => {
        const path = new URL(String(url)).pathname;
        const req = new NextRequest(`http://127.0.0.1:3045${path}`, init as any);
        return startAttemptRoute(req, { params: Promise.resolve({ id: testId }) });
      },
    });

    const res = await client.startAttempt(testId);
    assert.equal(res.ok, false);
    assert.equal(res.error?.code, "FORBIDDEN");
    assert.match(res.error?.message || "", /Pass|subscription/i);
    assert.equal(res.data, undefined);
  });
});
