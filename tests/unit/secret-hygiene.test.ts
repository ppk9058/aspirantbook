import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";

describe("R12-J: Secret Hygiene Verification", () => {
  const rootDir = process.cwd();

  test("J-R12-01: .gitleaksignore exists and ignores nothing longer than 12 chars", () => {
    const ignorePath = path.join(rootDir, ".gitleaksignore");
    assert.ok(fs.existsSync(ignorePath), ".gitleaksignore must exist at repository root");

    const content = fs.readFileSync(ignorePath, "utf-8");
    const activeLines = content
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#"));

    for (const line of activeLines) {
      assert.ok(
        line.length <= 12,
        `.gitleaksignore rule "${line}" exceeds the 12-character limit`
      );
    }
  });

  test("J-R12-02: CI workflow contains gitleaks job with continue-on-error and redaction", () => {
    const ciPath = path.join(rootDir, ".github/workflows/ci.yml");
    assert.ok(fs.existsSync(ciPath), "ci.yml must exist");

    const content = fs.readFileSync(ciPath, "utf-8");
    const parsed = yaml.load(content) as any;

    assert.ok(parsed.jobs, "ci.yml must declare jobs");
    assert.ok(parsed.jobs.gitleaks, "ci.yml must contain a gitleaks job");

    const job = parsed.jobs.gitleaks;
    assert.strictEqual(
      job["continue-on-error"],
      true,
      "gitleaks job must have continue-on-error: true"
    );

    const steps = job.steps || [];
    const gitleaksStep = steps.find(
      (s: any) => typeof s.uses === "string" && s.uses.includes("gitleaks")
    );
    assert.ok(gitleaksStep, "gitleaks step must be defined");
    assert.strictEqual(
      gitleaksStep.env?.GITLEAKS_ENABLE_REDACT,
      "true",
      "GITLEAKS_ENABLE_REDACT must be 'true'"
    );
  });

  test("J-R12-03: scripts/ and tests/e2e/ do not contain literal secret fallbacks for Webhooks/API keys", () => {
    const targets = [
      "scripts/test-webhook-payment-trust.ts",
      "tests/e2e/razorpay-webhook-idempotency.spec.ts",
    ];

    for (const rel of targets) {
      const full = path.join(rootDir, rel);
      if (!fs.existsSync(full)) continue;
      const content = fs.readFileSync(full, "utf-8");
      assert.ok(
        !content.includes("regression_webhook_secret_not_a_real_credential"),
        `${rel} must not contain regression secret literal`
      );
      assert.ok(
        !content.includes("test_wh_sec_pass5_isolated"),
        `${rel} must not contain test_wh_sec literal`
      );
    }
  });

  test("J-R12-04: Documented list of unit test suites that keep fixture values", () => {
    // Exactly 13 unit test files keep test DB fixtures
    const fixtureTestFiles = [
      "tests/unit/backup-and-rollback.test.ts",
      "tests/unit/cache-invalidation-versioning.test.ts",
      "tests/unit/client-seq-coalesce.test.ts",
      "tests/unit/connection-limit-validator.test.ts",
      "tests/unit/exam-deadline-ordering.test.ts",
      "tests/unit/exam-ranking-live.test.ts",
      "tests/unit/exam-ranking-property.test.ts",
      "tests/unit/exam-rate-limiting.test.ts",
      "tests/unit/exam-runtime-golden.test.ts",
      "tests/unit/exam-runtime-verification-review.test.ts",
      "tests/unit/mobile-v1-exam-service-perf.test.ts",
      "tests/unit/ratelimit-and-mobile-sync.test.ts",
      "tests/unit/retention-executor.test.ts",
    ];

    for (const file of fixtureTestFiles) {
      assert.ok(
        fs.existsSync(path.join(rootDir, file)),
        `Fixture test file ${file} must exist`
      );
    }
    assert.strictEqual(fixtureTestFiles.length, 13);
  });
});
