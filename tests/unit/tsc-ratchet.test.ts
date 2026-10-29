import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

describe("Task B10: TypeScript Ratchet Verification", () => {
  const rootDir = process.cwd();
  const baselineFile = path.join(rootDir, "config", "tsc-baseline-count.txt");
  const origBaseline = fs.readFileSync(baselineFile, "utf-8");

  test("1. Ratchet passes when error count matches baseline", () => {
    fs.writeFileSync(baselineFile, "0\n");
    try {
      const output = execSync("node scripts/check-tsc-ratchet.mjs", {
        encoding: "utf-8",
        cwd: rootDir,
      });
      assert.match(output, /PASS/);
      assert.match(output, /matches ratchet baseline/);
    } finally {
      fs.writeFileSync(baselineFile, origBaseline);
    }
  });

  test("2. Ratchet suggests lower count when current < baseline", () => {
    fs.writeFileSync(baselineFile, "5\n");
    try {
      const output = execSync("node scripts/check-tsc-ratchet.mjs", {
        encoding: "utf-8",
        cwd: rootDir,
      });
      assert.match(output, /IMPROVEMENT/);
      assert.match(output, /Baseline can be updated to 0/);
    } finally {
      fs.writeFileSync(baselineFile, origBaseline);
    }
  });

  test("3. Ratchet fails closed when error count exceeds baseline", () => {
    // Artificial baseline set to -1 so any count >= 0 triggers ratchet violation
    fs.writeFileSync(baselineFile, "-1\n");
    try {
      assert.throws(
        () => {
          execSync("node scripts/check-tsc-ratchet.mjs", {
            encoding: "utf-8",
            cwd: rootDir,
            stdio: ["ignore", "pipe", "pipe"],
          });
        },
        (err: any) => {
          assert.equal(err.status, 1);
          const combined = (err.stdout || "") + "\n" + (err.stderr || "");
          assert.match(combined, /RATCHET VIOLATION/);
          return true;
        }
      );
    } finally {
      fs.writeFileSync(baselineFile, origBaseline);
    }
  });
});
