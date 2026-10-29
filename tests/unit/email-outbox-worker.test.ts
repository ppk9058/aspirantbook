import test, { describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

import { prisma } from "@/lib/prisma";
import {
  processEmailOutbox,
  calculateBackoffMs,
} from "@/lib/email/outbox-worker";
import { POST as internalOutboxRoute } from "@/app/api/internal/email-outbox/route";
import { NextRequest } from "next/server";

describe("Task G5: Email Outbox Worker Verification", () => {
  let mockServer: http.Server;
  let mockPort: number;
  let receivedBrevoRequests: any[] = [];
  let receivedResendRequests: any[] = [];
  let mockBrevoSuccess = true;
  let mockResendSuccess = true;

  const originalEnv = { ...process.env };
  const CRON_SECRET_TEST = "test_cron_secret_must_be_long_and_secure_12345";

  before(async () => {
    // Local mock HTTP sink for Brevo and Resend endpoints
    mockServer = http.createServer((req, res) => {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", () => {
        const url = req.url || "";
        const idempotencyKey = req.headers["idempotency-key"] as string;

        if (url.includes("/brevo")) {
          receivedBrevoRequests.push({ headers: req.headers, data, idempotencyKey });
          if (mockBrevoSuccess) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ messageId: "brevo_mock_id_123" }));
          } else {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ message: "Brevo downstream error" }));
          }
        } else if (url.includes("/resend")) {
          receivedResendRequests.push({ headers: req.headers, data, idempotencyKey });
          if (mockResendSuccess) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ id: "resend_mock_id_456" }));
          } else {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ message: "Resend downstream error" }));
          }
        } else {
          res.writeHead(404);
          res.end();
        }
      });
    });

    await new Promise<void>((resolve) => {
      mockServer.listen(0, "127.0.0.1", () => {
        const addr = mockServer.address() as any;
        mockPort = addr.port;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => mockServer.close(() => resolve()));
    await prisma.emailOutbox.deleteMany({
      where: { to: { contains: "g5_test_" } },
    });
    process.env = { ...originalEnv };
  });

  beforeEach(() => {
    receivedBrevoRequests = [];
    receivedResendRequests = [];
    mockBrevoSuccess = true;
    mockResendSuccess = true;
    process.env = { ...originalEnv };
    process.env.BREVO_API_KEY = "mock_brevo_key";
    process.env.BREVO_API_URL = `http://127.0.0.1:${mockPort}/brevo`;
    process.env.RESEND_API_KEY = "mock_resend_key";
    process.env.RESEND_API_URL = `http://127.0.0.1:${mockPort}/resend`;
    process.env.CRON_SECRET = CRON_SECRET_TEST;
    process.env.EMAIL_OUTBOX_MAX_ATTEMPTS = "3";
  });

  describe("1. Security: CRON_SECRET Protection (Constant-Time Compare)", () => {
    test("Rejects request with missing CRON_SECRET (401)", async () => {
      const req = new NextRequest("http://127.0.0.1:3000/api/internal/email-outbox", {
        method: "POST",
      });
      const res = await internalOutboxRoute(req);
      assert.equal(res.status, 401);
    });

    test("Rejects request with invalid CRON_SECRET (401)", async () => {
      const req = new NextRequest("http://127.0.0.1:3000/api/internal/email-outbox", {
        method: "POST",
        headers: { "x-cron-secret": "wrong_cron_secret_attacker" },
      });
      const res = await internalOutboxRoute(req);
      assert.equal(res.status, 401);
    });

    test("Accepts request with valid CRON_SECRET (200)", async () => {
      const req = new NextRequest("http://127.0.0.1:3000/api/internal/email-outbox", {
        method: "POST",
        headers: { "x-cron-secret": CRON_SECRET_TEST },
      });
      const res = await internalOutboxRoute(req);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
    });
  });

  describe("2. Processor: Retry, Backoff, Fallback & Dead-Letter", () => {
    test("Successfully sends pending row via primary provider (Brevo) and marks SENT", async () => {
      const testEmail = `g5_test_${Date.now()}@example.com`;
      const row = await prisma.emailOutbox.create({
        data: {
          to: testEmail,
          subject: "Welcome to AspirantBook",
          html: "<p>Hello Student</p>",
          status: "PENDING",
          attempts: 0,
        },
      });

      const stats = await processEmailOutbox({ batchSize: 10 });
      assert.ok(stats.sent >= 1);

      const updated = await prisma.emailOutbox.findUnique({ where: { id: row.id } });
      assert.equal(updated?.status, "SENT");
      assert.equal(updated?.provider, "brevo");
      assert.ok(updated?.sentAt);
      assert.equal(receivedBrevoRequests.length, 1);
      assert.equal(receivedResendRequests.length, 0, "Resend not called when Brevo succeeds");
    });

    test("Falls back to Resend when Brevo fails", async () => {
      mockBrevoSuccess = false; // Primary fails
      mockResendSuccess = true; // Fallback succeeds

      const testEmail = `g5_test_fallback_${Date.now()}@example.com`;
      const row = await prisma.emailOutbox.create({
        data: {
          to: testEmail,
          subject: "Password Reset Request",
          html: "<p>Reset Link</p>",
          status: "PENDING",
          attempts: 0,
        },
      });

      const stats = await processEmailOutbox({ batchSize: 10 });
      assert.ok(stats.sent >= 1);

      const updated = await prisma.emailOutbox.findUnique({ where: { id: row.id } });
      assert.equal(updated?.status, "SENT");
      assert.equal(updated?.provider, "resend");
      assert.equal(receivedBrevoRequests.length, 1, "Brevo attempted first");
      assert.equal(receivedResendRequests.length, 1, "Resend succeeded on fallback");
    });

    test("Backoff schedule: exponential backoff with jitter on total provider failure", () => {
      const delay0 = calculateBackoffMs(0, 10); // attempt 0, base 10s
      assert.ok(delay0 >= 10000 && delay0 <= 13000, `Expected delay0 ~10s+jitter, got ${delay0}`);

      const delay1 = calculateBackoffMs(1, 10); // attempt 1, base 10s -> 20s
      assert.ok(delay1 >= 20000 && delay1 <= 26000, `Expected delay1 ~20s+jitter, got ${delay1}`);

      const delay2 = calculateBackoffMs(2, 10); // attempt 2, base 10s -> 40s
      assert.ok(delay2 >= 40000 && delay2 <= 52000, `Expected delay2 ~40s+jitter, got ${delay2}`);
    });

    test("Transitions to DEAD_LETTER after max attempts exceeded", async () => {
      mockBrevoSuccess = false;
      mockResendSuccess = false;

      const testEmail = `g5_test_deadletter_${Date.now()}@example.com`;
      // Create row already at attempt 2 (maxAttempts is 3)
      const row = await prisma.emailOutbox.create({
        data: {
          to: testEmail,
          subject: "Test Dead Letter",
          html: "<p>Dead letter test</p>",
          status: "PENDING",
          attempts: 2,
        },
      });

      const stats = await processEmailOutbox({ batchSize: 10 });
      assert.ok(stats.deadLettered >= 1);

      const updated = await prisma.emailOutbox.findUnique({ where: { id: row.id } });
      assert.equal(updated?.status, "DEAD_LETTER");
      assert.equal(updated?.attempts, 3);
      assert.match(updated?.error || "", /Max delivery attempts \(3\) exceeded/);
    });
  });

  describe("3. Concurrency Safety: FOR UPDATE SKIP LOCKED & Idempotency", () => {
    test("Two concurrent workers never send the same row twice", async () => {
      // Seed 5 pending email rows
      const rows = [];
      for (let i = 0; i < 5; i++) {
        const row = await prisma.emailOutbox.create({
          data: {
            to: `g5_test_concurrent_${i}_${Date.now()}@example.com`,
            subject: `Concurrent Batch ${i}`,
            html: `<p>Content ${i}</p>`,
            status: "PENDING",
            attempts: 0,
          },
        });
        rows.push(row);
      }

      // Launch two workers concurrently with batchSize 5
      const [worker1Result, worker2Result] = await Promise.all([
        processEmailOutbox({ batchSize: 5 }),
        processEmailOutbox({ batchSize: 5 }),
      ]);

      const totalSent = worker1Result.sent + worker2Result.sent;
      assert.equal(totalSent, 5, "Total sent across both workers must equal exactly 5 rows (no double-sends)");

      // Verify each sent request had a unique idempotency key
      const idempotencyKeys = receivedBrevoRequests.map((r) => r.idempotencyKey);
      const uniqueKeys = new Set(idempotencyKeys);
      assert.equal(idempotencyKeys.length, uniqueKeys.size, "Every sent email must have a unique idempotency key");

      // Verify DB status
      for (const row of rows) {
        const updated = await prisma.emailOutbox.findUnique({ where: { id: row.id } });
        assert.equal(updated?.status, "SENT");
        assert.equal(updated?.attempts, 1);
      }
    });
  });
});
