import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";

// We need to reset modules between tests since boot-guard self-executes on import
// We'll test via dynamic import with module cache busting

describe("R12-B: DATABASE_URL safety for Neon (production only)", () => {
  const savedEnv: Record<string, string | undefined> = {};
  const envKeys = [
    "NODE_ENV", "DATABASE_URL", "DIRECT_URL", "PERSIST_BACKEND",
    "APP_ENV", "ALLOW_DEV_MOBILE_LOGIN", "FAST2SMS_API_KEY",
    "TWILIO_AUTH_TOKEN", "MSG91_AUTH_KEY"
  ];

  beforeEach(() => {
    for (const k of envKeys) {
      savedEnv[k] = process.env[k];
    }
  });

  afterEach(() => {
    for (const k of envKeys) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
  });

  // Helper: import boot-guard with fresh module cache
  async function loadBootGuard() {
    // Clear the module from require cache
    const modPath = require.resolve("../../lib/boot-guard");
    delete require.cache[modPath];
    // Also clear persist-backend dependency
    try {
      const pbPath = require.resolve("../../lib/storage/persist-backend");
      delete require.cache[pbPath];
    } catch { /* ignore */ }
    return require("../../lib/boot-guard");
  }

  function setProdEnv(overrides: Record<string, string | undefined> = {}) {
    process.env.NODE_ENV = "production";
    process.env.PERSIST_BACKEND = "db";
    // Default: valid remote Neon DB URL with sslmode
    process.env.DATABASE_URL = "postgresql://user:pass@ep-cool-forest-123456.us-east-2.aws.neon.tech/mydb?sslmode=require";
    process.env.DIRECT_URL = "postgresql://user:pass@ep-cool-forest-123456.us-east-2.aws.neon.tech/mydb?sslmode=require";
    delete process.env.ALLOW_DEV_MOBILE_LOGIN;
    delete process.env.APP_ENV;
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }

  it("B-R12-01: rejects localhost DATABASE_URL in production", async () => {
    setProdEnv({ DATABASE_URL: "postgresql://user:pass@localhost:5432/mydb?sslmode=require" });
    await assert.rejects(
      () => loadBootGuard(),
      /local host.*production/i
    );
  });

  it("B-R12-02: rejects 127.0.0.1 DATABASE_URL in production", async () => {
    setProdEnv({ DATABASE_URL: "postgresql://user:pass@127.0.0.1:5432/mydb?sslmode=require" });
    await assert.rejects(
      () => loadBootGuard(),
      /local host.*production/i
    );
  });

  it("B-R12-03: rejects DATABASE_URL without sslmode=require in production", async () => {
    setProdEnv({ DATABASE_URL: "postgresql://user:pass@ep-cool.neon.tech/mydb" });
    await assert.rejects(
      () => loadBootGuard(),
      /sslmode=require/i
    );
  });

  it("B-R12-04: rejects pooler host without pgbouncer=true in production", async () => {
    setProdEnv({
      DATABASE_URL: "postgresql://user:pass@ep-cool-forest-123456-pooler.us-east-2.aws.neon.tech/mydb?sslmode=require"
    });
    await assert.rejects(
      () => loadBootGuard(),
      /pgbouncer=true/i
    );
  });

  it("B-R12-05: accepts pooler host WITH pgbouncer=true in production", async () => {
    setProdEnv({
      DATABASE_URL: "postgresql://user:pass@ep-cool-forest-123456-pooler.us-east-2.aws.neon.tech/mydb?sslmode=require&pgbouncer=true"
    });
    await assert.doesNotReject(() => loadBootGuard());
  });

  it("B-R12-06: rejects missing DIRECT_URL in production", async () => {
    setProdEnv({ DIRECT_URL: undefined });
    await assert.rejects(
      () => loadBootGuard(),
      /DIRECT_URL.*not set/i
    );
  });

  it("B-R12-07: accepts valid Neon URL with sslmode and DIRECT_URL in production", async () => {
    setProdEnv();
    await assert.doesNotReject(() => loadBootGuard());
  });

  it("B-R12-08: non-production is unaffected by Neon guards", async () => {
    process.env.NODE_ENV = "development";
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/mydb";
    delete process.env.DIRECT_URL;
    delete process.env.PERSIST_BACKEND;
    delete process.env.APP_ENV;
    delete process.env.ALLOW_DEV_MOBILE_LOGIN;
    await assert.doesNotReject(() => loadBootGuard());
  });

  it("B-R12-09: error messages never contain the actual URL", async () => {
    const url = "postgresql://secretuser:secretpass@localhost:5432/secretdb?sslmode=require";
    setProdEnv({ DATABASE_URL: url });
    try {
      await loadBootGuard();
      assert.fail("should have thrown");
    } catch (err: any) {
      assert.ok(!err.message.includes("secretuser"), "URL username must not appear in error");
      assert.ok(!err.message.includes("secretpass"), "URL password must not appear in error");
      assert.ok(!err.message.includes("secretdb"), "URL dbname must not appear in error");
    }
  });
});
