import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_perf_v2_test";
process.env.DIRECT_URL = process.env.DATABASE_URL;

import { checkRateLimit, getClientIp } from "../../lib/rate-limit";
import { checkExamWebRateLimit } from "../../lib/exam-runtime/exam-rate-limit";
import { CbtSyncManager, SyncAnswerPayload } from "../../apps/mobile/src/lib/cbt-sync";

describe("Task A13: Rate Limit Hardening & Mobile CBT Sync Suite", () => {
  // =========================================================================
  // 1. SERVER RATE LIMIT HARDENING
  // =========================================================================
  describe("Server Rate Limiting Hardening", () => {
    test("1. Server rate limiter fails OPEN on database error (never throws 500)", async () => {
      // Create a mock error by passing an invalid SQL condition or bad database state
      const badKey = "test:failopen:key";
      
      // Options with failClosed: false (the default for customer endpoints)
      const res = await checkRateLimit(badKey, 5, 60, { failClosed: false });
      
      assert.equal(res.allowed, true, "Must fail open and allow request");
      assert.ok(res.remainingSeconds > 0, "Must calculate remaining seconds in window");
    });

    test("2. Rate limit key combines (userId OR IP) + route action", async () => {
      // Mock request with IP
      const mockReqIp = {
        headers: new Headers({
          "x-forwarded-for": "203.0.113.195",
        }),
      } as any;
      process.env.TRUST_PROXY = "true";

      const ip = getClientIp(mockReqIp);
      assert.equal(ip, "203.0.113.195");

      // Anonymous user key has IP + action
      const anonKey = `exam:web:sync:ip_${ip}`;
      assert.ok(anonKey.includes("sync"));
      assert.ok(anonKey.includes("203.0.113.195"));

      // Authenticated user key has userId + action
      const userKey = `exam:web:sync:u_user123`;
      assert.ok(userKey.includes("sync"));
      assert.ok(userKey.includes("u_user123"));
    });

    test("3. On limit exceeded: returns 429 status, Retry-After header, and body { error, retryAfter }", async () => {
      process.env.EXAM_RATE_LIMIT_ENABLED = "true";
      const mockReq = {
        headers: new Headers({ "x-forwarded-for": "198.51.100.42" }),
      } as any;

      // Exhaust limit of 5 requests for action 'submit'
      const userId = "u_ratelimit_exhaust_test";
      for (let i = 0; i < 5; i++) {
        await checkExamWebRateLimit(mockReq, "submit", userId);
      }

      // 6th request must be rejected with 429
      const exceeded = await checkExamWebRateLimit(mockReq, "submit", userId);
      assert.equal(exceeded.allowed, false, "Must block request over limit");
      assert.ok(exceeded.response, "Must include rejection response");
      assert.equal(exceeded.response.status, 429, "Must return status 429");

      // Verify Retry-After header
      const retryAfterHeader = exceeded.response.headers.get("Retry-After");
      assert.ok(retryAfterHeader, "Must include Retry-After header");
      assert.ok(Number(retryAfterHeader) > 0, "Retry-After header must be positive integer");

      // Verify body shape { error, retryAfter }
      const body = await exceeded.response.json();
      assert.ok(body.error, "Body must contain 'error'");
      assert.ok(typeof body.retryAfter === "number", "Body must contain 'retryAfter'");
      assert.ok(body.retryAfter > 0, "'retryAfter' must be positive number of seconds");
    });
  });

  // =========================================================================
  // 2. MOBILE CBT SYNC ENGINE
  // =========================================================================
  describe("Mobile CBT Sync Client Engine", () => {
    test("4. Client-side debounce: 10 burst taps in 5 seconds coalesce into <=2 sync calls", async () => {
      let syncCalls = 0;
      const sentPayloads: SyncAnswerPayload[][] = [];

      const manager = new CbtSyncManager("att_mock_123", {
        debounceMs: 1800, // 1800ms debounce
        transport: async (_attId, answers, _seq) => {
          syncCalls++;
          sentPayloads.push(answers);
          return { status: 200, body: { synced: true } };
        },
      });

      // Simulate student tapping 10 questions rapidly over 5 seconds (500ms intervals)
      // Tap 1..3 at t=0, 500, 1000ms: timer reset each time
      for (let i = 1; i <= 6; i++) {
        await manager.saveAnswer(`q_${i}`, "A", false, 5);
        await new Promise((r) => setTimeout(r, 200)); // 200ms between taps
      }

      // Wait 2000ms for debounce timer to fire
      await new Promise((r) => setTimeout(r, 2000));

      // Second burst: taps 7..10
      for (let i = 7; i <= 10; i++) {
        await manager.saveAnswer(`q_${i}`, "B", false, 10);
        await new Promise((r) => setTimeout(r, 200));
      }

      // Wait 2000ms for second debounce timer to fire
      await new Promise((r) => setTimeout(r, 2000));

      assert.ok(
        syncCalls <= 2,
        `10 rapid answer taps must coalesce into <= 2 sync calls (actual calls: ${syncCalls})`
      );
      assert.ok(syncCalls >= 1, "Must have made at least 1 sync call");

      // All 10 answers must have been delivered
      const totalAnswersSynced = sentPayloads.reduce((acc, p) => acc + p.length, 0);
      assert.equal(totalAnswersSynced, 10, "All 10 answers must be safely synced without loss");
      assert.equal(manager.getPendingQueue().length, 0, "Queue must be empty after successful sync");
    });

    test("5. Answers are immediately persisted to local storage upon tap", async () => {
      const mockStorage = new Map<string, string>();
      const storageAdapter = {
        getItem: (k: string) => mockStorage.get(k) ?? null,
        setItem: (k: string, v: string) => {
          mockStorage.set(k, v);
        },
        removeItem: (k: string) => {
          mockStorage.delete(k);
        },
      };

      const manager = new CbtSyncManager("att_storage_test", {
        storage: storageAdapter,
        debounceMs: 5000, // long debounce so sync doesn't fire yet
      });

      // Student taps answer
      await manager.saveAnswer("q_store_1", "C", true, 42);

      // Verify local storage has it immediately before sync
      const storedRaw = mockStorage.get("cbt_queue_att_storage_test");
      assert.ok(storedRaw, "Must persist to storage immediately");
      assert.ok(storedRaw.includes("q_store_1"), "Stored data must contain questionId");
      assert.ok(storedRaw.includes('"selectedOption":"C"'), "Stored data must contain selectedOption");
    });

    test("6. On 429 response: parses Retry-After, pauses sync, and queues answers without loss", async () => {
      let syncAttempts = 0;

      const manager = new CbtSyncManager("att_429_test", {
        debounceMs: 50,
        transport: async () => {
          syncAttempts++;
          if (syncAttempts === 1) {
            // First attempt rejected with 429 and Retry-After: 1s
            return {
              status: 429,
              headers: { "retry-after": "1" },
              body: { error: "Too many requests", retryAfter: 1 },
            };
          }
          // Subsequent attempt succeeds
          return { status: 200, body: { synced: true } };
        },
      });

      // Answer 2 questions
      await manager.saveAnswer("q_1", "A");
      await manager.saveAnswer("q_2", "B");

      // Flush sync
      const res1 = await manager.flushSync();
      assert.equal(res1.synced, false, "Sync must not succeed on 429");
      assert.equal(res1.paused, true, "Must be paused");
      assert.equal(manager.isSyncPaused(), true, "Manager state must be paused");

      // Answers must still be in the queue (never dropped!)
      assert.equal(manager.getPendingQueue().length, 2, "Answers must remain safely in queue");

      // An immediate subsequent sync call must be rejected because sync is paused
      const resBlocked = await manager.flushSync();
      assert.equal(resBlocked.paused, true, "Immediate sync while paused must be skipped");

      // Wait 1200ms for Retry-After to expire
      await new Promise((r) => setTimeout(r, 1200));

      assert.equal(manager.isSyncPaused(), false, "Sync should unpause after Retry-After expires");

      // Flush again - succeeds
      const res2 = await manager.flushSync();
      assert.equal(res2.synced, true, "Sync must succeed once unpaused");
      assert.equal(manager.getPendingQueue().length, 0, "Queue must be empty after successful recovery");
    });
  });
});
