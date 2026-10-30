import test, { describe, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

import { prisma } from "@/lib/prisma";
import { authorizeCredentials } from "@/auth";
import { POST as mobileLoginRoute } from "@/app/api/v1/auth/login/route";
import { GET as nextAuthGet, POST as nextAuthPost } from "@/app/api/auth/[...nextauth]/route";
import { register, requestPasswordResetAction } from "@/lib/actions/auth";
import { submitContactForm } from "@/lib/actions/legal";
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

  beforeEach(async () => {
    receivedRequests = [];
    mockStatus = 200;
    mockBody = { success: true };
    process.env = { ...originalEnv };
    // Reset the static-IP buckets used by the server-action tests so repeated
    // 5x runs are independent (mobile tests use random keys of their own).
    await prisma.rateLimit.deleteMany({
      where: {
        key: {
          in: ["register:127.0.0.1", "forgot-ip:127.0.0.1", "contact-form:127.0.0.1"],
        },
      },
    });
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
          assert.ok(err?.code === "turnstile_failed", `expected turnstile_failed, got ${err?.code || err?.message}`);
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
          assert.ok(err?.code === "turnstile_failed", `expected turnstile_failed, got ${err?.code || err?.message}`);
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
          assert.ok(err?.code === "turnstile_failed", `expected turnstile_failed, got ${err?.code || err?.message}`);
          return true;
        }
      );
    });

    test("5b. HTTP-level NextAuth credentials callback with valid password and NO turnstile token yields no session", async () => {
      // Exercise the real NextAuth route handler, including CSRF token handling,
      // exactly as a browser or scripted attacker would. A direct authorize() call
      // is already covered above; this proves the bypass is blocked over HTTP too.
      const base = "http://127.0.0.1:3000";

      const csrfRes = await nextAuthGet(new NextRequest(`${base}/api/auth/csrf`));
      assert.equal(csrfRes.status, 200);
      const csrfJson = (await csrfRes.json()) as { csrfToken: string };
      assert.ok(csrfJson.csrfToken, "NextAuth must issue a CSRF token");

      const setCookie = csrfRes.headers.getSetCookie
        ? csrfRes.headers.getSetCookie()
        : [csrfRes.headers.get("set-cookie")].filter(Boolean);
      const cookie = setCookie
        .map((entry) => String(entry).split(";")[0])
        .join("; ");
      assert.ok(cookie.includes("authjs.csrf-token"), "CSRF cookie must be present");

      const body = new URLSearchParams({
        csrfToken: csrfJson.csrfToken,
        email: testEmail,
        password: testPassword,
        callbackUrl: `${base}/dashboard`,
      });

      const res = await nextAuthPost(
        new NextRequest(`${base}/api/auth/callback/credentials`, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            cookie,
          },
          body: body.toString(),
        })
      );

      const location = res.headers.get("location") || "";
      const sessionCookie = (res.headers.getSetCookie ? res.headers.getSetCookie() : [])
        .join(";");

      assert.ok(
        !/authjs\.session-token|next-auth\.session-token/.test(sessionCookie),
        `Must not issue a session cookie without Turnstile (location: ${location})`
      );
      assert.match(location, /error=/i, "Must redirect to the login error state, not a signed-in page");
      assert.equal(receivedRequests.length, 0, "Missing token must be rejected before contacting Cloudflare");
    });

    test("5c. Register server action rejects a missing Turnstile token", async () => {
      const formData = new FormData();
      formData.set("name", "Turnstile Register");
      formData.set("email", `g1_register_${Date.now()}@example.com`);
      formData.set("password", "ValidPassword123!");

      const res = await register(null, formData);
      assert.ok("error" in res && res.error, "Registration must be rejected without a token");
      assert.match(String(res.error), /Security check required|Bot verification failed/i);
    });

    test("5d. Register server action rejects an invalid Turnstile token", async () => {
      mockBody = { success: false, "error-codes": ["invalid-input-response"] };
      const formData = new FormData();
      formData.set("name", "Turnstile Register");
      formData.set("email", `g1_register_invalid_${Date.now()}@example.com`);
      formData.set("password", "ValidPassword123!");
      formData.set("cf-turnstile-response", "invalid_expired_token");

      const res = await register(null, formData);
      assert.ok("error" in res && res.error, "Registration must be rejected with an invalid token");
      assert.match(String(res.error), /Bot verification failed/i);
    });

    test("5e. Password-reset request action rejects a missing Turnstile token", async () => {
      const formData = new FormData();
      formData.set("email", `g1_reset_${Date.now()}@example.com`);

      const res = await requestPasswordResetAction(null, formData);
      assert.ok("error" in res && res.error, "Reset request must be rejected without a token");
      assert.match(String(res.error), /Security check required|Bot verification failed/i);
    });

    test("5f. Contact form rejects a missing Turnstile token", async () => {
      const formData = new FormData();
      formData.set("name", "Turnstile Contact");
      formData.set("email", `g1_contact_${Date.now()}@example.com`);
      formData.set("subject", "Bot protection check");
      formData.set("message", "This submission must be rejected without a Turnstile token.");

      const res = await submitContactForm(null, formData);
      assert.equal(res.success, false);
      assert.match(String(res.error), /Security check required|Bot verification failed/i);
    });
  });

  describe("Mobile v1 Login (Exempt from Turnstile, Rate-Limited per user+IP)", () => {
    beforeEach(() => {
      process.env.TURNSTILE_ENABLED = "true";
      process.env.TURNSTILE_SECRET_KEY = "0x4AAAAAAABbbbbbbbbbb";
      process.env.TURNSTILE_VERIFY_URL = `http://127.0.0.1:${mockPort}/siteverify`;
      process.env.TRUST_PROXY = "true";
    });

    const RATE_LIMIT_WINDOW_MS = 60_000;

    /**
     * checkRateLimit buckets counters by wall-clock minute. A burst that
     * straddles a boundary starts a fresh counter, so "the request after the
     * limit is blocked" becomes a coin flip when the suite is slow or the
     * machine is busy. Start each burst with headroom instead of relaxing the
     * assertion.
     */
    async function alignToFreshRateLimitWindow() {
      const remaining = RATE_LIMIT_WINDOW_MS - (Date.now() % RATE_LIMIT_WINDOW_MS);
      if (remaining < 45_000) {
        await new Promise((resolve) => setTimeout(resolve, remaining + 50));
      }
    }

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
      await alignToFreshRateLimitWindow();
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

    test("8. Rate-limit key includes user+IP: the same user on a different IP is counted separately", async () => {
      await alignToFreshRateLimitWindow();
      const email = `mobile_key_ip_${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      await prisma.user.create({
        data: { email, password: hashedPassword, name: "Mobile Key IP", role: "FREE", isActive: true },
      });

      const ipA = `10.77.10.${Math.floor(Math.random() * 200)}`;
      const ipB = `10.77.11.${Math.floor(Math.random() * 200)}`;

      const makeReq = (ip: string) =>
        new NextRequest("http://127.0.0.1:3000/api/v1/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json", "x-forwarded-for": ip },
          body: JSON.stringify({ email, password: testPassword }),
        });

      for (let i = 0; i < 5; i++) {
        assert.equal((await mobileLoginRoute(makeReq(ipA))).status, 200);
      }
      // Same user, same IP -> exhausted.
      assert.equal((await mobileLoginRoute(makeReq(ipA))).status, 429);
      // Same user, DIFFERENT IP -> a distinct key, so still allowed.
      assert.equal((await mobileLoginRoute(makeReq(ipB))).status, 200);

      await prisma.user.deleteMany({ where: { email } });
    });

    test("9. Rate-limit key includes user+IP: a different user on the same IP is counted separately", async () => {
      await alignToFreshRateLimitWindow();
      const emailA = `mobile_key_user_a_${Date.now()}@example.com`;
      const emailB = `mobile_key_user_b_${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      await prisma.user.createMany({
        data: [
          { email: emailA, password: hashedPassword, name: "Mobile Key A", role: "FREE", isActive: true },
          { email: emailB, password: hashedPassword, name: "Mobile Key B", role: "FREE", isActive: true },
        ],
      });

      const sharedIp = `10.77.12.${Math.floor(Math.random() * 200)}`;
      const makeReq = (email: string) =>
        new NextRequest("http://127.0.0.1:3000/api/v1/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json", "x-forwarded-for": sharedIp },
          body: JSON.stringify({ email, password: testPassword }),
        });

      for (let i = 0; i < 5; i++) {
        assert.equal((await mobileLoginRoute(makeReq(emailA))).status, 200);
      }
      assert.equal((await mobileLoginRoute(makeReq(emailA))).status, 429);
      // Different user, SAME IP -> a distinct key, so still allowed.
      assert.equal((await mobileLoginRoute(makeReq(emailB))).status, 200);

      await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB] } } });
    });
  });
});
