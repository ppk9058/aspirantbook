import test, { describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { getBrandConfig } from "@/lib/config/brand";
import { getAuthAppUrl } from "@/lib/actions/auth-url-helper";

describe("R12-I: Codebase Hygiene Guards", () => {
  const rootDir = process.cwd();

  test("I-R12-01: LICENSE file exists with 'All rights reserved' and legal entity name", () => {
    const licensePath = path.join(rootDir, "LICENSE");
    assert.ok(fs.existsSync(licensePath), "LICENSE file must exist at repository root");

    const content = fs.readFileSync(licensePath, "utf-8");
    const brand = getBrandConfig();

    assert.ok(
      content.includes("All rights reserved"),
      "LICENSE must state 'All rights reserved'"
    );
    assert.ok(
      content.includes(brand.legalEntityName),
      `LICENSE must include legal entity name '${brand.legalEntityName}'`
    );
  });

  test("I-R12-02: Server code in lib/ and app/api/ does not contain unauthorized console.log", () => {
    // Only student practice sample strings (coding-practice-data.ts) and intentional audit logs (audit.ts) are exempt
    const exemptFiles = new Set([
      "lib/coding-practice-data.ts",
      "lib/actions/admin/audit.ts",
    ]);

    const targetDirs = ["lib", "app/api"];
    const found: string[] = [];

    function scan(dir: string) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        const rel = path.relative(rootDir, full);
        if (entry.isDirectory()) {
          scan(full);
        } else if (/\.(ts|js|tsx|jsx)$/.test(entry.name) && !exemptFiles.has(rel)) {
          const lines = fs.readFileSync(full, "utf-8").split("\n");
          lines.forEach((line, idx) => {
            if (/console\.log\s*\(/.test(line)) {
              found.push(`${rel}:${idx + 1}`);
            }
          });
        }
      }
    }

    for (const d of targetDirs) {
      scan(path.join(rootDir, d));
    }

    assert.deepStrictEqual(
      found,
      [],
      `Found unauthorized console.log calls in server code:\n${found.join("\n")}`
    );
  });

  test("I-R12-03: No supabase.co in non-test application code or configuration", () => {
    const targetPaths = ["app", "components", "lib", "middleware.ts", "next.config.js"];
    const found: string[] = [];

    for (const target of targetPaths) {
      const fullPath = path.join(rootDir, target);
      if (!fs.existsSync(fullPath)) continue;

      if (fs.statSync(fullPath).isDirectory()) {
        const cmd = `grep -rnF --exclude-dir=testing "supabase.co" "${fullPath}" || true`;
        const res = execSync(cmd, { encoding: "utf-8" }).trim();
        if (res) {
          found.push(res);
        }
      } else {
        const content = fs.readFileSync(fullPath, "utf-8");
        if (content.includes("supabase.co")) {
          found.push(target);
        }
      }
    }

    assert.deepStrictEqual(
      found,
      [],
      `Found prohibited supabase.co in production code:\n${found.join("\n")}`
    );
  });

  test("I-R12-04: Auth appUrl resolution fails closed in production and falls back in dev/test", () => {
    const origEnv = { ...process.env };
    try {
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.NEXTAUTH_URL;

      // Dev / Test mode: falls back safely to local test server
      (process.env as any).NODE_ENV = "test";
      assert.strictEqual(getAuthAppUrl(), "http://127.0.0.1:3045");

      (process.env as any).NODE_ENV = "development";
      assert.strictEqual(getAuthAppUrl(), "http://127.0.0.1:3045");

      // Production mode: must fail closed when unconfigured
      (process.env as any).NODE_ENV = "production";
      assert.throws(
        () => getAuthAppUrl(),
        /Missing NEXT_PUBLIC_APP_URL or NEXTAUTH_URL in production/
      );

      // Production mode with configured URL: returns configured URL
      process.env.NEXT_PUBLIC_APP_URL = "https://aspirantbook.com";
      assert.strictEqual(getAuthAppUrl(), "https://aspirantbook.com");
    } finally {
      process.env = origEnv;
    }
  });

  test("I-R12-05: Tracked files inventory over 1MB is audited and accounted for", () => {
    const gitLs = execSync("git ls-files", { encoding: "utf-8" }).trim().split("\n");
    const over1MB: string[] = [];

    for (const rel of gitLs) {
      if (!rel) continue;
      const full = path.join(rootDir, rel);
      if (fs.existsSync(full) && fs.statSync(full).size > 1048576) {
        over1MB.push(rel);
      }
    }

    // Every known large file must be accounted for and no new untracked large blobs added.
    // splash-image.png is now 258 KB after the brand refresh, so it is no longer over 1 MB.
    const expected = ["docs/design_walkthrough.pdf"].sort();
    assert.deepStrictEqual(
      over1MB.sort(),
      expected,
      `Tracked files over 1MB must match the audited list: ${JSON.stringify(over1MB)}`
    );
  });
});
