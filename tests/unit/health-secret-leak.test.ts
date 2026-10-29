import test, { describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

import { GET } from "@/app/api/health/route";
import { NextRequest } from "next/server";

/**
 * R5 / G4: non-vacuous secret-leak guard.
 *
 * The guard must have something to catch. We therefore:
 *  1. Count the environment values longer than 8 characters and assert a
 *     minimum population (N = 10) exists.
 *  2. Inject synthetic secret-looking values for every provider variable the
 *     health payload could plausibly read.
 *  3. Assert none of those values appear in the public response, the detailed
 *     response, or their headers.
 */
const SYNTHETIC: Record<string, string> = {
  NEXTAUTH_SECRET: "SYNTHETIC_nextauth_secret_9f3a7c1e5b2d",
  HEALTH_DETAILS_TOKEN: "SYNTHETIC_health_details_token_4c8e2a6f",
  BREVO_API_KEY: "SYNTHETIC_xkeysib_brevo_key_7a1d3f5b9c",
  BREVO_API_URL: "https://SYNTHETIC-brevo.invalid/v3/smtp/email",
  RESEND_API_KEY: "SYNTHETIC_re_resend_key_2b4d6f8a0c",
  RESEND_API_URL: "https://SYNTHETIC-resend.invalid/emails",
  RAZORPAY_KEY_ID: "SYNTHETIC_rzp_key_id_5e7a9c1b3d",
  RAZORPAY_KEY_SECRET: "SYNTHETIC_rzp_key_secret_8f0a2c4e6b",
  RAZORPAY_WEBHOOK_SECRET: "SYNTHETIC_rzp_webhook_secret_1d3f5b7a9c",
  GOOGLE_CLIENT_ID: "SYNTHETIC_google_client_id_6b8d0f2a4c",
  GOOGLE_CLIENT_SECRET: "SYNTHETIC_google_client_secret_9a1c3e5f7b",
  GOOGLE_CLIENT_IDS: "SYNTHETIC_google_client_ids_2c4e6a8b0d",
  TURNSTILE_SECRET_KEY: "SYNTHETIC_turnstile_secret_3e5a7c9b1d",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "SYNTHETIC_turnstile_site_key_4f6b8d0a2c",
  AWS_ACCESS_KEY_ID: "SYNTHETIC_aws_access_key_5a7c9e1b3d",
  AWS_SECRET_ACCESS_KEY: "SYNTHETIC_aws_secret_key_6b8d0f2a4c",
  AWS_S3_BUCKET_NAME: "SYNTHETIC_bucket_name_7c9e1a3b5d",
  S3_ENDPOINT: "https://SYNTHETIC-s3.invalid",
  EMAIL_FROM: "SYNTHETIC Sender <synthetic-secret-sender@example.invalid>",
  CRON_SECRET: "SYNTHETIC_cron_secret_8d0f2b4a6c",
  DATABASE_URL: "postgresql://synthetic_user:SYNTHETIC_db_password_9e1a3c@127.0.0.1:54329/synthetic",
};

const MIN_SECRET_POPULATION = 10;

describe("Task G4 remediation: non-vacuous health secret-leak guard", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, ...SYNTHETIC };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test("1. Guard is non-vacuous: at least 10 secret-like env values are actually checked", () => {
    const values = Object.entries(process.env)
      .filter(([key, value]) => {
        if (!value || typeof value !== "string" || value.length <= 8) return false;
        return /SECRET|KEY|PASSWORD|TOKEN|URL|DATABASE|PRIVATE|CLIENT|BUCKET|EMAIL/i.test(key);
      })
      .map(([, value]) => value as string);

    assert.ok(
      values.length >= MIN_SECRET_POPULATION,
      `Expected at least ${MIN_SECRET_POPULATION} secret-like env values to guard, found ${values.length}`
    );

    // Every synthetic provider variable must be present and long enough to matter.
    for (const [key, value] of Object.entries(SYNTHETIC)) {
      assert.equal(process.env[key], value, `${key} must be injected for this guard`);
      assert.ok(value.length > 8, `${key} synthetic value must be longer than 8 chars`);
    }
  });

  test("2. Neither the public nor the detailed response leaks any secret value", async () => {
    const publicRes = await GET(new NextRequest("http://127.0.0.1:3000/api/health"));
    assert.equal(publicRes.status, 200);
    const publicText = await publicRes.text();

    const detailedReq = new NextRequest("http://127.0.0.1:3000/api/health", {
      headers: { "x-health-details-token": SYNTHETIC.HEALTH_DETAILS_TOKEN },
    });
    const detailedRes = await GET(detailedReq);
    assert.equal(detailedRes.status, 200);
    const detailedText = await detailedRes.text();
    const detailedHeaders = Array.from(detailedRes.headers.entries())
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    const haystacks = {
      publicBody: publicText,
      detailedBody: detailedText,
      detailedHeaders,
    };

    for (const [key, value] of Object.entries(SYNTHETIC)) {
      for (const [where, haystack] of Object.entries(haystacks)) {
        assert.ok(
          !haystack.includes(value),
          `Secret from ${key} leaked into ${where}`
        );
      }
    }
  });

  test("3. The detailed response exposes only documented non-secret telemetry fields", async () => {
    // The guard above is only meaningful if the detailed surface actually
    // contains the new fields. This assertion also gives the fail-before run a
    // behavioural (not import) failure against the pre-G4 health payload.
    const res = await GET(
      new NextRequest("http://127.0.0.1:3000/api/health", {
        headers: { "x-health-details-token": SYNTHETIC.HEALTH_DETAILS_TOKEN },
      })
    );
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.migrations, "Detailed payload must include migrations");
    assert.equal(typeof data.migrations.applied, "number");
    assert.equal(typeof data.migrations.pending, "number");
    assert.equal(typeof data.paymentsConfigured, "boolean");
    assert.ok(["db", "fs"].includes(data.storageBackend));
    assert.equal(typeof data.emailProviders.brevo, "boolean");
    assert.equal(typeof data.emailProviders.resend, "boolean");
  });

  test("4. The public response hides details when HEALTH_DETAILS_TOKEN is set", async () => {
    const res = await GET(new NextRequest("http://127.0.0.1:3000/api/health"));
    const data = await res.json();
    assert.equal(data.migrations, undefined);
    assert.equal(data.storageBackend, undefined);
    assert.equal(data.emailProviders, undefined);
    assert.equal(data.paymentsConfigured, undefined);
  });
});
