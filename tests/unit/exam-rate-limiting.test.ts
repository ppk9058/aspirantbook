import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  checkExamWebRateLimit,
  checkExamV1RateLimit,
  EXAM_RATE_LIMIT_CONFIG,
} from "../../lib/exam-runtime/exam-rate-limit";
import { guardTestDatabase } from "../../scripts/guard-test-db";
import { prisma } from "../../lib/prisma";

const testDbUrl =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_perf_v2_test";
process.env.DATABASE_URL = testDbUrl;
guardTestDatabase(testDbUrl);

describe("P1-5: Exam Route Rate Limiting Hardening", () => {
  const origFlag = process.env.EXAM_RATE_LIMIT_ENABLED;

  afterEach(() => {
    process.env.EXAM_RATE_LIMIT_ENABLED = origFlag;
  });

  test("Flag OFF: rate limiter allows requests indefinitely without 429", async () => {
    process.env.EXAM_RATE_LIMIT_ENABLED = "false";
    const dummyReq = new Request("http://127.0.0.1:3000/api/exam/attempt/123/sync", {
      headers: { "x-forwarded-for": "10.0.0.99" },
    });

    for (let i = 0; i < 70; i++) {
      const res = await checkExamWebRateLimit(dummyReq, "sync", "user_flag_off_test");
      assert.equal(res.allowed, true, `Request ${i} should be allowed when flag is OFF`);
      assert.equal(res.response, undefined);
    }
  });

  test("Flag ON: bursts exceeding limit are rejected with 429 and Retry-After header (Web)", async () => {
    process.env.EXAM_RATE_LIMIT_ENABLED = "true";
    const testUserId = `user_rate_limit_web_${Date.now()}`;
    const dummyReq = new Request("http://127.0.0.1:3000/api/exam/attempt/submit", {
      headers: { "x-forwarded-for": "10.0.0.101" },
    });

    const limit = EXAM_RATE_LIMIT_CONFIG.submit.limit; // 5

    // First `limit` calls should succeed
    for (let i = 0; i < limit; i++) {
      const res = await checkExamWebRateLimit(dummyReq, "submit", testUserId);
      assert.equal(res.allowed, true, `Submit request ${i + 1} within limit should succeed`);
    }

    // Next request should fail with 429
    const blockedRes = await checkExamWebRateLimit(dummyReq, "submit", testUserId);
    assert.equal(blockedRes.allowed, false, "Request exceeding limit must be blocked");
    assert.ok(blockedRes.response, "429 response must be defined");
    assert.equal(blockedRes.response.status, 429);
    assert.equal(
      blockedRes.response.headers.get("Retry-After"),
      String(EXAM_RATE_LIMIT_CONFIG.submit.windowSeconds)
    );

    const body = await blockedRes.response.json();
    assert.match(body.error, /Too many requests/i);
  });

  test("Flag ON: bursts exceeding limit are rejected with 429 and Retry-After header (Mobile v1)", async () => {
    process.env.EXAM_RATE_LIMIT_ENABLED = "true";
    const testUserId = `user_rate_limit_v1_${Date.now()}`;
    const dummyReq = {
      headers: new Headers({ "x-forwarded-for": "10.0.0.102" }),
    } as any;

    const limit = EXAM_RATE_LIMIT_CONFIG.start.limit; // 10

    for (let i = 0; i < limit; i++) {
      const res = await checkExamV1RateLimit(dummyReq, "start", testUserId);
      assert.equal(res.allowed, true, `Start request ${i + 1} within limit should succeed`);
    }

    const blockedRes = await checkExamV1RateLimit(dummyReq, "start", testUserId);
    assert.equal(blockedRes.allowed, false, "Request exceeding start limit must be blocked");
    assert.ok(blockedRes.response, "429 response must be defined");
    assert.equal(blockedRes.response.status, 429);
    assert.equal(
      blockedRes.response.headers.get("Retry-After"),
      String(EXAM_RATE_LIMIT_CONFIG.start.windowSeconds)
    );

    const body = await blockedRes.response.json();
    assert.equal(body.ok, false);
    assert.equal(body.error.code, "TOO_MANY_REQUESTS");
  });
});
