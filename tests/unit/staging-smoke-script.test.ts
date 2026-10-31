import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const SCRIPT_PATH = path.resolve(__dirname, "../../scripts/ops/staging-smoke.sh");
const RUNBOOK_PATH = path.resolve(__dirname, "../../docs/runbooks/staging-neon.md");

describe("R12-D: Staging smoke script validation", () => {
  it("D-R12-01: scripts/ops/staging-smoke.sh exists and is executable", () => {
    assert.ok(fs.existsSync(SCRIPT_PATH), "staging-smoke.sh must exist");
    const stat = fs.statSync(SCRIPT_PATH);
    const isExecutable = Boolean(stat.mode & 0o111);
    assert.ok(isExecutable, "staging-smoke.sh must have executable permissions");
  });

  it("D-R12-02: refuses execution when BASE_URL is empty", () => {
    assert.throws(
      () => {
        execSync(`bash "${SCRIPT_PATH}"`, {
          env: { ...process.env, BASE_URL: "" },
          stdio: "pipe",
        });
      },
      /BASE_URL is required/,
      "must refuse execution without BASE_URL"
    );
  });

  it("D-R12-03: refuses non-https remote URLs", () => {
    assert.throws(
      () => {
        execSync(`bash "${SCRIPT_PATH}"`, {
          env: { ...process.env, BASE_URL: "http://staging.aspirantbook.com" },
          stdio: "pipe",
        });
      },
      /non-https/i,
      "must refuse http:// for remote URLs"
    );
  });

  it("D-R12-04: script source checks all required endpoints and invariants", () => {
    const src = fs.readFileSync(SCRIPT_PATH, "utf-8");
    assert.ok(src.includes("/api/health"), "must check /api/health");
    assert.ok(src.includes("/admin"), "must check /admin");
    assert.ok(src.includes("/api/admin"), "must check /api/admin");
    assert.ok(src.includes("/api/auth/role"), "must check /api/auth/role");
    assert.ok(src.includes("/api/exam/test/bulk"), "must check /api/exam/test/bulk");
    assert.ok(src.includes("/login"), "must check /login");
    assert.ok(src.includes("/register"), "must check /register");
    assert.ok(src.includes("robots"), "must check robots");
    assert.ok(src.includes("sitemap"), "must check sitemap");
    assert.ok(src.includes("Strict-Transport-Security"), "must check HSTS header");
    assert.ok(src.includes("X-Content-Type-Options"), "must check nosniff");
    assert.ok(src.includes("PASS") && src.includes("FAIL"), "must print PASS/FAIL per check");
  });

  it("D-R12-05: docs/runbooks/staging-neon.md documents staging-smoke.sh usage", () => {
    const runbook = fs.readFileSync(RUNBOOK_PATH, "utf-8");
    assert.ok(
      runbook.includes("staging-smoke.sh"),
      "staging-neon.md must document staging-smoke.sh"
    );
  });
});
