import test, { describe, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

import { verifyTurnstileToken, isTurnstileEnabled } from "@/lib/security/turnstile";
import { submitContactForm } from "@/lib/actions/legal";

describe("Task B8: Turnstile Server-Side Verification", () => {
  let mockServer: http.Server;
  let mockPort: number;
  let receivedRequests: any[] = [];
  let mockStatus = 200;
  let mockBody: any = { success: true };
  let mockDelayMs = 0;

  const originalEnv = { ...process.env };

  before(async () => {
    mockServer = http.createServer((req, res) => {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", () => {
        receivedRequests.push({
          headers: req.headers,
          data: data,
        });

        const sendResponse = () => {
          res.writeHead(mockStatus, { "Content-Type": "application/json" });
          res.end(JSON.stringify(mockBody));
        };

        if (mockDelayMs > 0) {
          setTimeout(sendResponse, mockDelayMs);
        } else {
          sendResponse();
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
    receivedRequests = [];
    mockStatus = 200;
    mockBody = { success: true };
    mockDelayMs = 0;
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("Flag OFF (Default - Dev/Test Uninterrupted)", () => {
    test("1. Returns success immediately when TURNSTILE_ENABLED is not true", async () => {
      delete process.env.TURNSTILE_ENABLED;
      assert.equal(isTurnstileEnabled(), false);

      const res = await verifyTurnstileToken(null);
      assert.equal(res.success, true);
      assert.equal(receivedRequests.length, 0);
    });

    test("2. Contact form passes without Turnstile token when flag is OFF", async () => {
      delete process.env.TURNSTILE_ENABLED;

      const formData = new FormData();
      formData.set("name", "Student Tester");
      formData.set("email", "student.turnstile@example.com");
      formData.set("subject", "Question about exam syllabus");
      formData.set("message", "Could you provide more details about section 3 topics?");

      const res = await submitContactForm(null, formData);
      assert.equal(res.success, true);
    });
  });

  describe("Flag ON (TURNSTILE_ENABLED=true)", () => {
    beforeEach(() => {
      process.env.TURNSTILE_ENABLED = "true";
      process.env.TURNSTILE_SECRET_KEY = "0x4AAAAAAABbbbbbbbbbb";
      process.env.TURNSTILE_VERIFY_URL = `http://127.0.0.1:${mockPort}/siteverify`;
    });

    test("3. Fails closed with 500 when TURNSTILE_SECRET_KEY is missing", async () => {
      delete process.env.TURNSTILE_SECRET_KEY;

      const res = await verifyTurnstileToken("sample_token");
      assert.equal(res.success, false);
      assert.equal(res.status, 500);
      assert.match(res.error!, /misconfigured/i);
      assert.equal(receivedRequests.length, 0);
    });

    test("4. Fails with 400 when token is missing or empty", async () => {
      const res1 = await verifyTurnstileToken(null);
      assert.equal(res1.success, false);
      assert.equal(res1.status, 400);

      const res2 = await verifyTurnstileToken("");
      assert.equal(res2.success, false);
      assert.equal(res2.status, 400);
    });

    test("5. Validates token with Cloudflare and returns success when valid", async () => {
      mockBody = {
        success: true,
        challenge_ts: new Date().toISOString(),
        hostname: "aspirantbook.com",
      };

      const res = await verifyTurnstileToken("cf_valid_token_123", "203.0.113.195");
      assert.equal(res.success, true);
      assert.equal(receivedRequests.length, 1);

      const requestBody = receivedRequests[0].data;
      assert.match(requestBody, /response=cf_valid_token_123/);
      assert.match(requestBody, /secret=0x4AAAAAAABbbbbbbbbbb/);
      assert.match(requestBody, /remoteip=203\.0\.113\.195/);
    });

    test("6. Rejects with 400 when Cloudflare reports invalid-input-response", async () => {
      mockBody = {
        success: false,
        "error-codes": ["invalid-input-response"],
      };

      const res = await verifyTurnstileToken("bad_or_expired_token");
      assert.equal(res.success, false);
      assert.equal(res.status, 400);
      assert.deepEqual(res.errorCodes, ["invalid-input-response"]);
    });

    test("7. Rejects with 504 when Cloudflare endpoint times out", async () => {
      // Simulate fast timeout via test env variable
      process.env.TURNSTILE_TIMEOUT_MS = "150";
      mockDelayMs = 400;

      const res = await verifyTurnstileToken("timeout_token");
      assert.equal(res.success, false);
      assert.equal(res.status, 504);
      assert.match(res.error!, /timed out/i);
    });

    test("8. Protected form rejects submission when TURNSTILE_ENABLED=true and token is missing", async () => {
      const formData = new FormData();
      formData.set("name", "Student Tester");
      formData.set("email", "student.turnstile.reject@example.com");
      formData.set("subject", "Question about exam syllabus");
      formData.set("message", "Could you provide more details about section 3 topics?");

      const res = await submitContactForm(null, formData);
      assert.equal(res.success, false);
      assert.match(res.error!, /Security check required|verification failed/i);
    });
  });
});
