import test, { describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isDevBypassAllowed } from "../../lib/api/v1/dev-bypass";
import { getAppConfig } from "../../lib/services/config.service";

const root = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf-8");

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

const KEYS = ["NODE_ENV", "APP_ENV", "ALLOW_DEV_MOBILE_LOGIN", "DATABASE_URL"] as const;
const saved: Record<string, string | undefined> = {};
for (const key of KEYS) saved[key] = process.env[key];

function restore() {
  for (const key of KEYS) {
    setEnvValue(key, saved[key]);
  }
}

afterEach(restore);

describe("R9-S2-G: single dev-bypass policy and server-start boot guard", () => {
  test("boot guard runs from instrumentation.ts register()", () => {
    const instrumentationPath = path.join(root, "instrumentation.ts");
    assert.ok(fs.existsSync(instrumentationPath), "instrumentation.ts must exist at the repo root");

    const source = fs.readFileSync(instrumentationPath, "utf-8");
    assert.match(source, /export\s+(async\s+)?function\s+register\s*\(/, "register() must be exported");
    assert.match(
      source,
      /validateBootSecurity/,
      "register() must invoke the boot security validation so it runs at server start"
    );
  });

  test("mobile-login route delegates to isDevBypassAllowed instead of its own copy", () => {
    const source = read("app/api/auth/mobile-login/route.ts");
    assert.match(source, /isDevBypassAllowed/, "mobile-login must import the shared policy helper");
    assert.ok(
      !source.includes("ALLOW_DEV_MOBILE_LOGIN"),
      "mobile-login must not re-implement the ALLOW_DEV_MOBILE_LOGIN policy"
    );
  });

  test("config.service delegates the OTP bypass decision to isDevBypassAllowed", () => {
    const source = read("lib/services/config.service.ts");
    assert.match(source, /isDevBypassAllowed/, "config.service must import the shared policy helper");
    assert.ok(
      !source.includes("ALLOW_DEV_MOBILE_LOGIN"),
      "config.service must not re-implement the ALLOW_DEV_MOBILE_LOGIN policy"
    );
  });

  test("the shared policy is closed in production even when the dev flag is set", () => {
    setNodeEnv("production");
    delete process.env.APP_ENV;
    process.env.ALLOW_DEV_MOBILE_LOGIN = "true";

    assert.equal(isDevBypassAllowed(), false);
    assert.equal(getAppConfig().otpAuthEnabled, false);
  });

  test("the shared policy opens for an explicit local test database", () => {
    setNodeEnv("test");
    process.env.APP_ENV = "test";
    process.env.DATABASE_URL = "postgresql://user:pass@127.0.0.1:54329/trillionskill_test";
    delete process.env.ALLOW_DEV_MOBILE_LOGIN;

    assert.equal(isDevBypassAllowed(), true);
    assert.equal(getAppConfig().otpAuthEnabled, true);
  });
});
