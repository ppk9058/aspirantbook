import test, { describe, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

import { prisma } from "@/lib/prisma";
import { authorizeCredentials, TurnstileError } from "@/auth";
import { POST as mobileLoginRoute } from "@/app/api/v1/auth/login/route";
import { NextRequest } from "next/server";

describe("Task G1: Turnstile on Login Verification", () => {
  let mockServer: http.Server;
  let mockPort: number;
  let receivedRequests: any[] = [];
  let mockStatus = 200;
  let mockBody: any = { success: true };

  const originalEnv = { ...process.env };
  const testEmail = `g1_turnstile_${Date.now()}@example.com`;
  const testPassword = "ValidPassword123!";

  before(async () => {
    // 1. Setup mock Turnstile verification server
    mockServer = http.createServer((req, res) => {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", () => {
        receivedRequests.push({ headers: req.headers, data });
        res.writeHead(mockStatus, { "Content-Type": "application/json" });
        res.end(JSON.stringify(mockBody));
      });
    });

    await new Promise<void>((resolve) => {
      mockServer.listen(0, "127.0.0.1", () => {
        const addr = mockServer.address() as any;
        mockPort = addr.port;
        resolve();
      });
    });

    // 2. Seed test user
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    await prisma.user.create({
      data: {
        email: testEmail,
        password: hashedPassword,
        name: "Turnstile Test Student",
        role: "FREE",
        isActive: true,
      },
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => mockServer.close(() => resolve()));
    await prisma.user.deleteMany({ where: { email: testEmail } });
    process.env = { ...originalEnv };
  });

  beforeEach(() => {
    receivedRequests = [];
    mockStatus = 200;
    mockBody = { success: true };
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("Flag OFF (Default - Unchanged Login)", () => {
    test("1. Login succeeds without turnstile token when TURNSTILE_ENABLED is off", async () => {
      delete process.env.TURNSTILE_ENABLED;

      const user = await authorizeCredentials({
        email: testEmail,
        password: testPassword,
      });

      assert.ok(user, "User should be authenticated successfully");
      assert.equal(user.email, testEmail);
      assert.equal(receivedRequests.length, 0, "No turnstile requests made when flag is OFF");
    });
  });

  describe("Flag ON (TURNSTILE_ENABLED=true)", () => {
    beforeEach(() => {
      process.env.TURNSTILE_ENABLED = "true";
      process.env.TURNSTILE_SECRET_KEY = "0x4AAAAAAABbbbbbbbbbb";
      process.env.TURNSTILE_VERIFY_URL = `http://127.0.0.1:${mockPort}/siteverify`;
    });

    test("2. Fails with TurnstileError when token is missing", async () => {
      await assert.rejects(
        async () => {
          await authorizeCredentials({
            email: testEmail,
            password: testPassword,
          });
        },
        (err: any) => {
          assert.ok(err instanceof TurnstileError || err?.code === "turnstile_failed");
          return true;
        }
      );
    });

    test("3. Fails with TurnstileError when token is invalid", async () => {
      mockBody = {
        success: false,
        "error-codes": ["invalid-input-response"],
      };

      await assert.rejects(
        async () => {
          await authorizeCredentials({
            email: testEmail,
            password: testPassword,
            turnstileToken: "invalid_expired_token",
          });
        },
        (err: any) => {
          assert.ok(err instanceof TurnstileError || err?.code === "turnstile_failed");
          return true;
        }
      );
      assert.equal(receivedRequests.length, 1);
    });

    test("4. Succeeds when token is valid (mock)", async () => {
      mockBody = {
        success: true,
        challenge_ts: new Date().toISOString(),
        hostname: "aspirantbook.com",
      };

      const user = await authorizeCredentials({
        email: testEmail,
        password: testPassword,
        turnstileToken: "cf_valid_token_123",
      });

      assert.ok(user);
      assert.equal(user.email, testEmail);
      assert.equal(receivedRequests.length, 1);
      assert.match(receivedRequests[0].data, /response=cf_valid_token_123/);
    });

    test("5. Direct-call bypass fails: calling credentials authorize directly without token fails closed", async () => {
      await assert.rejects(
        async () => {
          // Attacker directly submits payload to authorize without passing through UI widget
          await authorizeCredentials({
            email: testEmail,
            password: testPassword,
            turnstileToken: "",
          });
        },
        (err: any) => {
          assert.ok(err instanceof TurnstileError || err?.code === "turnstile_failed");
          return true;
        }
      );
    });
  });

  describe("Mobile v1 Login (Exempt from Turnstile, Rate-Limited per user+IP)", () => {
    beforeEach(() => {
      process.env.TURNSTILE_ENABLED = "true";
      process.env.TURNSTILE_SECRET_KEY = "0x4AAAAAAABbbbbbbbbbb";
      process.env.TURNSTILE_VERIFY_URL = `http://127.0.0.1:${mockPort}/siteverify`;
      process.env.TRUST_PROXY = "true";
    });

    test("6. Mobile login succeeds without turnstile token even when TURNSTILE_ENABLED=true", async () => {
      const uniqueIp = `10.50.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;
      const req = new NextRequest("http://127.0.0.1:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": uniqueIp,
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      const res = await mobileLoginRoute(req);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.ok, true);
      assert.equal(json.data.user.email, testEmail);
      assert.equal(receivedRequests.length, 0, "Mobile v1 does not call Turnstile");
    });

    test("7. Mobile login is rate-limited per user+IP", async () => {
      const mobileRlEmail = `mobile_rl_${Date.now()}_${Math.random()}@example.com`;
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      await prisma.user.create({
        data: {
          email: mobileRlEmail,
          password: hashedPassword,
          name: "Mobile RL Student",
          role: "FREE",
          isActive: true,
        },
      });

      const fixedIp = `10.99.88.${Math.floor(Math.random() * 200)}`;
      const makeReq = () =>
        new NextRequest("http://127.0.0.1:3000/api/v1/auth/login", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": fixedIp,
          },
          body: JSON.stringify({
            email: mobileRlEmail,
            password: testPassword,
          }),
        });

      // Send 5 rapid requests (allowed limit is 5)
      for (let i = 0; i < 5; i++) {
        const res = await mobileLoginRoute(makeReq());
        assert.equal(res.status, 200);
      }

      // The 6th request from same user+IP must be rate-limited (429)
      const res6 = await mobileLoginRoute(makeReq());
      assert.equal(res6.status, 429);
      const json6 = await res6.json();
      assert.equal(json6.ok, false);
      assert.match(json6.error.code, /TOO_MANY_REQUESTS|RATE_LIMITED/);

      await prisma.user.deleteMany({ where: { email: mobileRlEmail } });
    });
  });
});
