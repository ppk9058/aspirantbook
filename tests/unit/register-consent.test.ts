import test, { describe, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { register } from "@/lib/actions/auth";
import { POST as registerApiRoute } from "@/app/api/v1/auth/register/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

describe("Task B: Consent Checkbox & Enforcement (Web + API)", () => {
  beforeEach(async () => {
    // Reset rate limits so repeated runs do not 429
    await prisma.$executeRawUnsafe(
      `DELETE FROM "RateLimit" WHERE key LIKE 'v1:auth_register%' OR key LIKE 'register:%'`
    );
  });

  after(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: "consent_missing_" } },
          { email: { contains: "consent_false_" } },
          { email: { contains: "consent_valid_" } },
          { email: { contains: "api_no_consent_" } },
          { email: { contains: "api_false_consent_" } },
          { email: { contains: "api_valid_consent_" } },
        ],
      },
    });
    await prisma.$executeRawUnsafe(
      `DELETE FROM "RateLimit" WHERE key LIKE 'v1:auth_register%' OR key LIKE 'register:%'`
    );
  });

  describe("Web Server Action: register()", () => {
    test("1. Fails when consent is missing from FormData", async () => {
      const formData = new FormData();
      formData.set("name", "Consent Test Candidate");
      formData.set("email", `consent_missing_${Date.now()}@example.com`);
      formData.set("password", "SecureConsentPass!123");
      formData.set("selectedGoal", "upsc");
      // consent is intentionally NOT added

      const res = await register(null, formData);
      assert.ok(res, "Result must exist");
      assert.ok(res.error, "Must return an error when consent is missing");
      assert.match(
        res.error,
        /Terms and Privacy Policy|agree to/i,
        `Expected consent error message, got: ${res.error}`
      );
    });

    test("2. Fails when consent is explicitly false", async () => {
      const formData = new FormData();
      formData.set("name", "Consent False Candidate");
      formData.set("email", `consent_false_${Date.now()}@example.com`);
      formData.set("password", "SecureConsentPass!123");
      formData.set("selectedGoal", "upsc");
      formData.set("consent", "false");

      const res = await register(null, formData);
      assert.ok(res, "Result must exist");
      assert.ok(res.error, "Must return an error when consent is false");
      assert.match(
        res.error,
        /Terms and Privacy Policy|agree to/i,
        `Expected consent error message, got: ${res.error}`
      );
    });

    test("3. Succeeds when consent is accepted ('on' or 'true')", async () => {
      const formData = new FormData();
      formData.set("name", "Consent Accepted Candidate");
      formData.set("email", `consent_valid_${Date.now()}@example.com`);
      formData.set("password", "SecureConsentPass!123");
      formData.set("selectedGoal", "upsc");
      formData.set("consent", "on");

      const res = await register(null, formData);
      assert.ok(res, "Result must exist");
      assert.ok(!res.error, `Unexpected error: ${res.error}`);
      assert.ok(res.success, "Should succeed with valid consent");
    });
  });

  describe("API Endpoint: POST /api/v1/auth/register", () => {
    test("4. Rejects registration payload with 400 when consent is missing", async () => {
      const payload = {
        name: "Api No Consent",
        email: `api_no_consent_${Date.now()}@example.com`,
        password: "SecureApiPassword!99",
      };

      const req = new NextRequest("http://127.0.0.1:3045/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await registerApiRoute(req);
      assert.equal(res.status, 400, "API must return 400 VALIDATION_ERROR");
      const json = await res.json();
      assert.equal(json.ok, false);
      assert.equal(json.error?.code, "VALIDATION_ERROR");
      assert.match(json.error?.message, /Terms and Privacy Policy|agree to/i);
    });

    test("5. Rejects registration payload with 400 when consent is false", async () => {
      const payload = {
        name: "Api False Consent",
        email: `api_false_consent_${Date.now()}@example.com`,
        password: "SecureApiPassword!99",
        consent: false,
      };

      const req = new NextRequest("http://127.0.0.1:3045/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await registerApiRoute(req);
      assert.equal(res.status, 400, "API must return 400 VALIDATION_ERROR");
      const json = await res.json();
      assert.equal(json.ok, false);
      assert.equal(json.error?.code, "VALIDATION_ERROR");
      assert.match(json.error?.message, /Terms and Privacy Policy|agree to/i);
    });

    test("6. Accepts registration payload with 201 when consent is true", async () => {
      const payload = {
        name: "Api Valid Consent",
        email: `api_valid_consent_${Date.now()}@example.com`,
        password: "SecureApiPassword!99",
        consent: true,
      };

      const req = new NextRequest("http://127.0.0.1:3045/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await registerApiRoute(req);
      assert.equal(res.status, 201, "API must return 201 Created");
      const json = await res.json();
      assert.equal(json.ok, true);
      assert.ok(json.data?.tokens?.accessToken);
      assert.ok(json.data?.user?.id);
    });
  });
});
