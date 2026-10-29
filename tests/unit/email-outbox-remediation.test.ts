import test, { describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

/**
 * R6 / G5 remediation proof.
 *
 * Modules that were added by G5 are imported dynamically so the fail-before run
 * against be36a3e reports "worker/route must exist" instead of a top-level
 * module-resolution error.
 */
async function loadModule(specifier: string): Promise<any | null> {
  try {
    return await import(specifier);
  } catch {
    return null;
  }
}

describe("Task G5 remediation: retry, idempotency, cron auth, workflow triggers", () => {
  let mockServer: http.Server;
  let mockPort: number;
  let providerOrder: string[] = [];
  let brevoRequests: Array<{ idempotencyKey?: string }> = [];
  let resendRequests: Array<{ idempotencyKey?: string }> = [];
  let worker: any;
  let route: any;
  let providersSucceed = false;

  const originalEnv = { ...process.env };
  const CRON_SECRET_TEST = "g5_remediation_cron_secret_1234567890";

  before(async () => {
    worker = await loadModule("@/lib/email/outbox-worker");
    route = await loadModule("@/app/api/internal/email-outbox/route");

    mockServer = http.createServer((req, res) => {
      let data = "";
      req.on("data", (chunk) => (data += chunk));
      req.on("end", () => {
        const url = req.url || "";
        if (url.includes("/brevo")) {
          providerOrder.push("brevo");
          brevoRequests.push({ idempotencyKey: req.headers["idempotency-key"] as string });
          res.writeHead(providersSucceed ? 200 : 500, { "Content-Type": "application/json" });
          res.end(JSON.stringify(providersSucceed ? { messageId: "g5r_brevo_ok" } : { message: "brevo down" }));
        } else if (url.includes("/resend")) {
          providerOrder.push("resend");
          resendRequests.push({ idempotencyKey: req.headers["idempotency-key"] as string });
          res.writeHead(providersSucceed ? 200 : 500, { "Content-Type": "application/json" });
          res.end(JSON.stringify(providersSucceed ? { id: "g5r_resend_ok" } : { message: "resend down" }));
        } else {
          res.writeHead(404);
          res.end();
        }
      });
    });

    await new Promise<void>((resolve) => {
      mockServer.listen(0, "127.0.0.1", () => {
        mockPort = (mockServer.address() as any).port;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => mockServer.close(() => resolve()));
    await prisma.emailOutbox.deleteMany({ where: { to: { contains: "g5r_" } } });
    process.env = { ...originalEnv };
  });

  beforeEach(async () => {
    providerOrder = [];
    brevoRequests = [];
    resendRequests = [];
    providersSucceed = false;
    process.env = { ...originalEnv };
    process.env.BREVO_API_KEY = "g5r_mock_brevo_key";
    process.env.BREVO_API_URL = `http://127.0.0.1:${mockPort}/brevo`;
    process.env.RESEND_API_KEY = "g5r_mock_resend_key";
    process.env.RESEND_API_URL = `http://127.0.0.1:${mockPort}/resend`;
    process.env.CRON_SECRET = CRON_SECRET_TEST;
    process.env.EMAIL_OUTBOX_MAX_ATTEMPTS = "3";
    await prisma.emailOutbox.deleteMany({
      where: { to: { contains: "g5r_" }, status: { in: ["PENDING", "PROCESSING"] } },
    });
  });

  function requireWorker() {
    assert.ok(worker, "Email outbox worker module must exist");
    assert.equal(typeof worker.processEmailOutbox, "function");
    assert.equal(typeof worker.calculateBackoffMs, "function");
  }

  test("1. A failed delivery is retried: attempts increments, nextRetryAt is set with jittered backoff", async () => {
    requireWorker();
    const row = await prisma.emailOutbox.create({
      data: {
        to: `g5r_retry_${Date.now()}@example.com`,
        subject: "Retry me",
        html: "<p>retry</p>",
        status: "PENDING",
        attempts: 0,
      },
    });

    const before = Date.now();
    const stats = await worker.processEmailOutbox({ batchSize: 50, baseBackoffSec: 60 });
    assert.ok(stats.failed >= 1, "The failed delivery must be counted as failed/retried");

    const updated = await prisma.emailOutbox.findUnique({ where: { id: row.id } });
    assert.equal(updated?.status, "PENDING", "Failed delivery must return to PENDING for retry");
    assert.equal(updated?.attempts, 1, "Attempt count must increment");
    assert.ok(updated?.nextRetryAt, "A retry time must be scheduled");
    assert.equal(updated?.sentAt, null);

    const delayMs = new Date(updated!.nextRetryAt!).getTime() - before;
    // attempt 1 => base 60s * 2^1 = 120s, plus 0-20% jitter => 120-144s.
    assert.ok(delayMs >= 110_000, `Backoff must be at least ~120s minus scheduling slack, got ${delayMs}ms`);
    assert.ok(delayMs <= 150_000, `Backoff plus jitter must stay bounded (~144s), got ${delayMs}ms`);
    assert.match(updated?.error || "", /Brevo:[\s\S]*Resend:/, "Both provider errors must be retained");
  });

  test("2. Idempotency key is deterministic per attempt and a second worker pass does not re-send the row", async () => {
    requireWorker();
    const row = await prisma.emailOutbox.create({
      data: {
        to: `g5r_idem_${Date.now()}@example.com`,
        subject: "Send once",
        html: "<p>once</p>",
        status: "PENDING",
        attempts: 0,
      },
    });

    providersSucceed = true;
    const stats1 = await worker.processEmailOutbox({ batchSize: 50 });
    assert.ok(stats1.sent >= 1);
    const expectedKey = `email_outbox_${row.id}_attempt_1`;
    const rowRequests = brevoRequests.filter((r) =>
      (r.idempotencyKey || "").startsWith(`email_outbox_${row.id}_`)
    );
    assert.equal(rowRequests.length, 1, "The row must be sent exactly once on the first pass");
    assert.equal(
      rowRequests[0].idempotencyKey,
      expectedKey,
      "The provider must receive a deterministic idempotency key for attempt 1"
    );

    await worker.processEmailOutbox({ batchSize: 50 });
    const sendsForRow = brevoRequests.filter((r) => r.idempotencyKey === expectedKey).length;
    assert.equal(sendsForRow, 1, "A second pass must not re-send an already-SENT row");

    const updated = await prisma.emailOutbox.findUnique({ where: { id: row.id } });
    assert.equal(updated?.status, "SENT");
    assert.equal(updated?.attempts, 1);
  });

  test("3. Provider order is Brevo first, then Resend when Brevo fails", async () => {
    requireWorker();
    await prisma.emailOutbox.create({
      data: {
        to: `g5r_order_${Date.now()}@example.com`,
        subject: "Order",
        html: "<p>order</p>",
        status: "PENDING",
        attempts: 0,
      },
    });

    await worker.processEmailOutbox({ batchSize: 50 });
    assert.deepEqual(providerOrder.slice(0, 2), ["brevo", "resend"], "Brevo must be attempted before Resend");
  });

  test("4. CRON_SECRET: a wrong secret of the SAME length returns 401 without throwing", async () => {
    assert.ok(route, "Email outbox route module must exist");
    assert.equal(typeof route.POST, "function");

    const sameLengthWrong = "x".repeat(CRON_SECRET_TEST.length);
    assert.equal(sameLengthWrong.length, CRON_SECRET_TEST.length);

    const res = await route.POST(
      new NextRequest("http://127.0.0.1:3000/api/internal/email-outbox", {
        method: "POST",
        headers: { "x-cron-secret": sameLengthWrong },
      })
    );
    assert.equal(res.status, 401);

    const missing = await route.POST(
      new NextRequest("http://127.0.0.1:3000/api/internal/email-outbox", { method: "POST" })
    );
    assert.equal(missing.status, 401);
  });

  test("5. The disabled cron stub has no active triggers (not loaded by GitHub Actions)", () => {
    const active = path.join(process.cwd(), ".github/workflows/email-outbox-cron.yml");
    const disabled = `${active}.disabled`;
    assert.equal(fs.existsSync(active), false, "No active .yml workflow may exist for the outbox cron");
    assert.ok(fs.existsSync(disabled), "The disabled stub must be kept for documentation");

    const content = fs.readFileSync(disabled, "utf8");
    assert.match(content, /DISABLED/);
    const activeTriggerLines = content
      .split("\n")
      .filter((line) => /^\s*(on|schedule|workflow_dispatch):/.test(line));
    assert.deepEqual(activeTriggerLines, [], "Every trigger must be commented out or absent");
  });
});
