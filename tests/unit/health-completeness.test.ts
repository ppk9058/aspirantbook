import test, { describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

import { GET } from "@/app/api/health/route";
import { resetMigrationHealthCache } from "@/lib/health/health-service";
import { NextRequest } from "next/server";

describe("Task G4: /api/health Completeness & Hardening", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    if (resetMigrationHealthCache) resetMigrationHealthCache();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    if (resetMigrationHealthCache) resetMigrationHealthCache();
  });

  test("1. Returns 200 OK with complete detailed telemetry when token is valid or unset", async () => {
    const res = await GET(new NextRequest("http://127.0.0.1:3000/api/health"));
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.status, "ok");
    assert.ok(data.timestamp);
    assert.ok(typeof data.uptime === "number");
    assert.ok(data.commit);

    // G4 Telemetry Fields
    assert.ok(data.migrations, "Migration status must be present");
    assert.ok(typeof data.migrations.applied === "number", "applied count must be number");
    assert.ok(typeof data.migrations.pending === "number", "pending count must be number");

    assert.ok(typeof data.paymentsConfigured === "boolean", "paymentsConfigured must be boolean");
    assert.ok(data.storageBackend === "db" || data.storageBackend === "fs", "storageBackend must be 'db' or 'fs'");

    assert.ok(data.emailProviders, "emailProviders must be present");
    assert.ok(typeof data.emailProviders.brevo === "boolean", "emailProviders.brevo must be boolean");
    assert.ok(typeof data.emailProviders.resend === "boolean", "emailProviders.resend must be boolean");
  });

  test("2. Correct 'pending migrations' detection when unapplied migration exists on disk", async () => {
    const testMigrationDir = path.join(process.cwd(), "prisma/migrations/99999999999999_pending_test");
    try {
      fs.mkdirSync(testMigrationDir, { recursive: true });
      fs.writeFileSync(path.join(testMigrationDir, "migration.sql"), "-- mock pending migration\n");

      resetMigrationHealthCache();
      const res = await GET(new NextRequest("http://127.0.0.1:3000/api/health"));
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(data.migrations.pending >= 1, `Expected pending >= 1, got ${data.migrations.pending}`);
    } finally {
      if (fs.existsSync(testMigrationDir)) {
        fs.rmSync(testMigrationDir, { recursive: true, force: true });
      }
      resetMigrationHealthCache();
    }
  });

  test("3. Migration status is cached for 60 seconds", async () => {
    resetMigrationHealthCache();
    const res1 = await GET(new NextRequest("http://127.0.0.1:3000/api/health"));
    const data1 = await res1.json();
    const initialPending = data1.migrations.pending;

    // Create an unapplied migration on disk
    const testMigrationDir = path.join(process.cwd(), "prisma/migrations/99999999999998_cache_test");
    try {
      fs.mkdirSync(testMigrationDir, { recursive: true });
      fs.writeFileSync(path.join(testMigrationDir, "migration.sql"), "-- mock unapplied\n");

      // Without clearing the cache, health check should return cached value (cheap liveness)
      const res2 = await GET(new NextRequest("http://127.0.0.1:3000/api/health"));
      const data2 = await res2.json();
      assert.equal(data2.migrations.pending, initialPending, "Must return cached pending count within 60s window");
    } finally {
      if (fs.existsSync(testMigrationDir)) {
        fs.rmSync(testMigrationDir, { recursive: true, force: true });
      }
      resetMigrationHealthCache();
    }
  });

  test("4. Details hidden behind HEALTH_DETAILS_TOKEN when configured", async () => {
    process.env.HEALTH_DETAILS_TOKEN = "super_secret_health_token_123";

    // Request without token gets cheap public liveness (no migration/storage details)
    const publicReq = new NextRequest("http://127.0.0.1:3000/api/health");
    const publicRes = await GET(publicReq);
    assert.equal(publicRes.status, 200);
    const publicData = await publicRes.json();
    assert.equal(publicData.status, "ok");
    assert.equal(publicData.migrations, undefined, "Public response must not leak migrations count");
    assert.equal(publicData.storageBackend, undefined, "Public response must not leak storage backend");

    // Request with valid token gets full telemetry
    const authedReq = new NextRequest("http://127.0.0.1:3000/api/health", {
      headers: { "x-health-details-token": "super_secret_health_token_123" },
    });
    const authedRes = await GET(authedReq);
    assert.equal(authedRes.status, 200);
    const authedData = await authedRes.json();
    assert.ok(authedData.migrations, "Authed response must include migrations");
    assert.ok(authedData.storageBackend, "Authed response must include storageBackend");
  });

  test("5. Zero credential or secret string leakage across all response bodies", async () => {
    // Populate dummy sensitive secrets
    process.env.HEALTH_DETAILS_TOKEN = "test_health_details_secret_token";
    process.env.BREVO_API_KEY = "xkeysib-9876543210abcdef9876543210";
    process.env.RESEND_API_KEY = "re_1234567890abcdef1234567890";
    process.env.RAZORPAY_KEY_SECRET = "rzp_secret_key_super_secret_99";
    process.env.DATABASE_URL = "postgresql://postgres:my_super_secret_db_pass@127.0.0.1:54340/trillionskill_launch";

    const authedReq = new NextRequest("http://127.0.0.1:3000/api/health", {
      headers: { "x-health-details-token": "test_health_details_secret_token" },
    });
    const res = await GET(authedReq);
    const rawText = JSON.stringify(await res.json());

    // Known public safe strings exempt from secret leak check
    const publicSafeStrings = new Set([
      "healthy",
      "configured",
      "not configured",
      "trillionskill",
      "127.0.0.1",
      "localhost",
      "production",
      "degraded",
      "development",
    ]);

    // Check every env key for secret value leakage
    const sensitiveKeys = Object.keys(process.env).filter((k) =>
      /SECRET|KEY|PASSWORD|TOKEN|URL|DATABASE|PRIVATE/i.test(k)
    );

    for (const key of sensitiveKeys) {
      const val = process.env[key];
      if (val && typeof val === "string" && val.length > 8) {
        if (publicSafeStrings.has(val.toLowerCase())) continue;
        assert.ok(
          !rawText.includes(val),
          `Health response must NOT leak secret from process.env.${key} (value: ${val.slice(0, 4)}...)`
        );
      }
    }
  });

  test("6. Health endpoint works in read-only filesystem environment (zero file writes)", async () => {
    // Verify GET executes cleanly without calling writeFileSync or mkdirSync
    let attemptedWrite = false;
    const originalWriteFileSync = fs.writeFileSync;
    const originalMkdirSync = fs.mkdirSync;

    try {
      (fs as any).writeFileSync = () => {
        attemptedWrite = true;
        const err: any = new Error("EROFS: read-only file system");
        err.code = "EROFS";
        throw err;
      };
      (fs as any).mkdirSync = () => {
        attemptedWrite = true;
        const err: any = new Error("EROFS: read-only file system");
        err.code = "EROFS";
        throw err;
      };

      const res = await GET(new NextRequest("http://127.0.0.1:3000/api/health"));
      assert.equal(res.status, 200);
      assert.equal(attemptedWrite, false, "Health endpoint must not attempt any disk writes");
    } finally {
      fs.writeFileSync = originalWriteFileSync;
      fs.mkdirSync = originalMkdirSync;
    }
  });
});
