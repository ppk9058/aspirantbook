import test, { describe, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

describe("Task B7: Email Provider Abstraction (Brevo + Resend Fallback)", () => {
  let mockServer: http.Server;
  let mockPort: number;
  let brevoCalls: any[] = [];
  let resendCalls: any[] = [];

  let brevoResponseStatus = 200;
  let brevoResponseBody: any = { messageId: "brevo_success_123" };

  let resendResponseStatus = 200;
  let resendResponseBody: any = { id: "resend_success_456" };

  const originalEnv = { ...process.env };

  before(async () => {
    // Start in-process mock HTTP server to simulate Brevo and Resend APIs
    mockServer = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        const parsed = body ? JSON.parse(body) : {};
        if (req.url?.includes("/brevo")) {
          brevoCalls.push({ headers: req.headers, body: parsed });
          res.writeHead(brevoResponseStatus, { "Content-Type": "application/json" });
          res.end(JSON.stringify(brevoResponseBody));
        } else if (req.url?.includes("/resend")) {
          resendCalls.push({ headers: req.headers, body: parsed });
          res.writeHead(resendResponseStatus, { "Content-Type": "application/json" });
          res.end(JSON.stringify(resendResponseBody));
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
    process.env = { ...originalEnv };
  });

  beforeEach(() => {
    brevoCalls = [];
    resendCalls = [];
    brevoResponseStatus = 200;
    brevoResponseBody = { messageId: "brevo_success_123" };
    resendResponseStatus = 200;
    resendResponseBody = { id: "resend_success_456" };

    process.env.BREVO_API_KEY = "test_brevo_key";
    process.env.BREVO_API_URL = `http://127.0.0.1:${mockPort}/brevo`;
    process.env.RESEND_API_KEY = "test_resend_key";
    process.env.RESEND_API_URL = `http://127.0.0.1:${mockPort}/resend`;
    process.env.PERSIST_BACKEND = "db";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test("1. Primary provider (Brevo) sends successfully; fallback is NOT called", async () => {
    const res = await sendEmail({
      to: "student.one@example.com",
      subject: "Welcome to AspirantBook",
      html: "<p>Your OTP is 123456</p>",
    });

    assert.equal(res.success, true);
    assert.equal(res.provider, "brevo");
    assert.equal(res.id, "brevo_success_123");
    assert.equal(brevoCalls.length, 1);
    assert.equal(resendCalls.length, 0);

    // Verify Brevo payload formatting
    assert.equal(brevoCalls[0].headers["api-key"], "test_brevo_key");
    assert.equal(brevoCalls[0].body.to[0].email, "student.one@example.com");
  });

  test("2. On Primary (Brevo) 500 error, automatically falls back to Resend", async () => {
    brevoResponseStatus = 500;
    brevoResponseBody = { error: "Brevo Internal Service Error" };

    const res = await sendEmail({
      to: "student.two@example.com",
      subject: "Password Reset Token",
      html: '<a href="https://aspirantbook.com/reset?token=xyz">Reset Password</a>',
    });

    assert.equal(res.success, true);
    assert.equal(res.provider, "resend");
    assert.equal(res.id, "resend_success_456");
    assert.equal(brevoCalls.length, 1);
    assert.equal(resendCalls.length, 1);

    // Verify Resend payload formatting
    assert.equal(resendCalls[0].headers["authorization"], "Bearer test_resend_key");
    assert.equal(resendCalls[0].body.to, "student.two@example.com");
  });

  test("3. When both primary and fallback fail, queues to EmailOutbox with status PENDING, attempts 1, nextRetryAt +5 min", async () => {
    brevoResponseStatus = 502;
    brevoResponseBody = { error: "Brevo Bad Gateway" };
    resendResponseStatus = 429;
    resendResponseBody = { error: "Resend Rate Limit Exceeded" };

    const targetEmail = `queued_${Date.now()}@example.com`;
    const res = await sendEmail({
      to: targetEmail,
      subject: "Test Series Scorecard",
      html: "<p>Your All India Rank is #42</p>",
    });

    assert.equal(res.success, false);
    assert.equal(res.queued, true);
    assert.equal(brevoCalls.length, 1);
    assert.equal(resendCalls.length, 1);

    // Verify queued in EmailOutbox table in PostgreSQL
    const queuedRecord = await prisma.emailOutbox.findFirst({
      where: { to: targetEmail },
    });

    assert.ok(queuedRecord, "Email should be stored in EmailOutbox");
    assert.equal(queuedRecord.status, "PENDING");
    assert.equal(queuedRecord.attempts, 1);
    assert.ok(queuedRecord.nextRetryAt, "nextRetryAt timestamp must be populated");

    const expectedMinRetryTime = Date.now() + 4 * 60 * 1000;
    const actualRetryTime = new Date(queuedRecord.nextRetryAt).getTime();
    assert.ok(actualRetryTime > expectedMinRetryTime, "nextRetryAt should be set to ~5 minutes in the future");
  });

  test("4. In dev/test when neither key is configured, writes to outbox without failing", async () => {
    delete process.env.BREVO_API_KEY;
    delete process.env.RESEND_API_KEY;
    process.env.APP_ENV = "test";

    const devEmail = `dev_test_${Date.now()}@example.com`;
    const res = await sendEmail({
      to: devEmail,
      subject: "Dev Mode Email Test",
      html: "<p>Hello dev</p>",
    });

    assert.equal(res.success, true);
    assert.equal(res.provider, "dev_outbox");
    assert.equal(brevoCalls.length, 0);
    assert.equal(resendCalls.length, 0);

    const record = await prisma.emailOutbox.findFirst({
      where: { to: devEmail },
    });
    assert.ok(record);
    assert.equal(record.status, "PENDING");
    assert.equal(record.provider, "dev");
  });
});
