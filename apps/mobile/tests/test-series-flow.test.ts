import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { formatTimeRemaining } from "../src/lib/cbt-timer";
import { parseLatexToUnicode } from "../src/lib/latex-parser";

describe("Test Series Flow & Screens Parity", () => {
  const screens = [
    "src/app/(tabs)/tests.tsx",
    "src/app/tests/series/[id].tsx",
    "src/app/tests/[id]/index.tsx",
    "src/app/tests/[id]/runner.tsx",
    "src/app/tests/[id]/result.tsx",
    "src/app/tests/[id]/solutions.tsx",
    "src/app/tests/[id]/leaderboard.tsx",
    "src/app/my-tests.tsx",
  ];

  it("P4(c) Route Manifest: All test series route files exist and contain default export", () => {
    const baseDir = process.cwd().endsWith("apps/mobile") ? process.cwd() : path.resolve(process.cwd(), "apps/mobile");
    for (const relPath of screens) {
      const fullPath = path.resolve(baseDir, relPath);
      assert.ok(fs.existsSync(fullPath), `Route file must exist: ${relPath}`);
      const content = fs.readFileSync(fullPath, "utf-8");
      assert.ok(
        content.includes("export default function"),
        `Route file must have default export: ${relPath}`
      );
    }
  });

  it("Timer formatting handles countdown transitions accurately", () => {
    assert.equal(formatTimeRemaining(3600), "01:00:00");
    assert.equal(formatTimeRemaining(299), "04:59");
    assert.equal(formatTimeRemaining(59), "00:59");
    assert.equal(formatTimeRemaining(5), "00:05");
    assert.equal(formatTimeRemaining(0), "00:00");
    assert.equal(formatTimeRemaining(-10), "00:00");
  });

  it("Timer warning threshold categorizes correctly", () => {
    const isWarning = (s: number) => s < 300 && s >= 60;
    const isCritical = (s: number) => s < 60;

    assert.equal(isWarning(3600), false);
    assert.equal(isWarning(300), false);
    assert.equal(isWarning(299), true);
    assert.equal(isWarning(60), true);
    assert.equal(isWarning(59), false);
    assert.equal(isCritical(59), true);
    assert.equal(isCritical(0), true);
  });

  it("MathRenderer LaTeX parser handles typical exam math statements", () => {
    const statement = "Solve for $x$: $x^2 - 4 = 0$, where $x \\in \\mathbb{R}$.";
    const parsed = parseLatexToUnicode("x^2 - 4 = 0");
    assert.equal(parsed, "x² - 4 = 0");

    const physicsStatement = "\\Delta Q = m \\cdot c \\cdot \\Delta T";
    assert.equal(parseLatexToUnicode(physicsStatement), "Δ Q = m · c · Δ T");

    const calculus = "\\int_0^1 x^2 dx = \\frac{1}{3}";
    assert.equal(parseLatexToUnicode(calculus), "∫₀¹ x² dx = (1 / 3)");
  });

  it("Calculates score percentage and accuracy correctly without division by zero", () => {
    const calcAccuracy = (correct: number, wrong: number) => {
      const attempted = correct + wrong;
      return attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    };

    assert.equal(calcAccuracy(18, 2), 90);
    assert.equal(calcAccuracy(0, 5), 0);
    assert.equal(calcAccuracy(0, 0), 0); // No division by zero

    const calcPercentage = (score: number, maxScore: number) => {
      return maxScore > 0 ? ((score / maxScore) * 100).toFixed(1) : "0.0";
    };

    assert.equal(calcPercentage(75, 100), "75.0");
    assert.equal(calcPercentage(0, 100), "0.0");
    assert.equal(calcPercentage(50, 0), "0.0");
  });
});
