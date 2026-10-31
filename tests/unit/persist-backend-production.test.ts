import test, { describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { getPersistBackend } from "../../lib/storage/persist-backend";
import { validateBootSecurity } from "../../lib/boot-guard";

function setEnvValue(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    Object.defineProperty(process.env, key, {
      value,
      configurable: true,
      writable: true,
      enumerable: true,
    });
  }
}

function setNodeEnv(value: string) {
  setEnvValue("NODE_ENV", value);
}

const KEYS = ["NODE_ENV", "PERSIST_BACKEND", "APP_ENV", "ALLOW_DEV_MOBILE_LOGIN", "DATABASE_URL", "DIRECT_URL"] as const;
const saved: Record<string, string | undefined> = {};

for (const key of KEYS) {
  saved[key] = process.env[key];
}

function restore() {
  for (const key of KEYS) {
    setEnvValue(key, saved[key]);
  }
}

afterEach(restore);

describe("R9-S2-F: PERSIST_BACKEND production policy", () => {
  test("production defaults to the db backend when PERSIST_BACKEND is unset", () => {
    setNodeEnv("production");
    delete process.env.PERSIST_BACKEND;
    delete process.env.APP_ENV;

    assert.equal(
      getPersistBackend(),
      "db",
      "production must never fall back to the local-disk backend"
    );
  });

  test("production refuses to boot when PERSIST_BACKEND=fs", () => {
    setNodeEnv("production");
    process.env.PERSIST_BACKEND = "fs";
    delete process.env.APP_ENV;
    delete process.env.ALLOW_DEV_MOBILE_LOGIN;

    assert.throws(
      () => validateBootSecurity(),
      /PERSIST_BACKEND/,
      "production with a local-disk persistence backend must be refused at boot"
    );
  });

  test("production boots when PERSIST_BACKEND=db", () => {
    setNodeEnv("production");
    process.env.PERSIST_BACKEND = "db";
    process.env.DATABASE_URL = "postgresql://user:pass@ep-cool-forest-123456.us-east-2.aws.neon.tech/mydb?sslmode=require";
    process.env.DIRECT_URL = "postgresql://user:pass@ep-cool-forest-123456.us-east-2.aws.neon.tech/mydb?sslmode=require";
    delete process.env.APP_ENV;
    delete process.env.ALLOW_DEV_MOBILE_LOGIN;

    assert.doesNotThrow(() => validateBootSecurity());
    assert.equal(getPersistBackend(), "db");
  });

  test("non-production keeps the legacy fs default when PERSIST_BACKEND is unset", () => {
    setNodeEnv("test");
    delete process.env.PERSIST_BACKEND;

    assert.equal(getPersistBackend(), "fs");
  });

  test("an explicit db value wins in non-production", () => {
    setNodeEnv("development");
    process.env.PERSIST_BACKEND = "db";

    assert.equal(getPersistBackend(), "db");
  });
});
