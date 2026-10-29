#!/usr/bin/env node

/**
 * TypeScript Ratchet Script
 *
 * Hard Rule #7: Do not make tsc a hard CI gate that blocks on 0 if legacy errors exist.
 * Instead, use a ratchet mechanism:
 * - Compares the current tsc error count to config/tsc-baseline-count.txt.
 * - FAILS if current > baseline (no new errors allowed; ratchet principle).
 * - PASSES if current == baseline.
 * - PASSES and advises updating the baseline if current < baseline (errors decreased).
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const baselineFile = path.join(rootDir, "config", "tsc-baseline-count.txt");

if (!fs.existsSync(baselineFile)) {
  console.error(`[Error] Baseline file not found: ${baselineFile}`);
  process.exit(1);
}

const baselineText = fs.readFileSync(baselineFile, "utf-8").trim();
const baselineCount = Number.parseInt(baselineText, 10);

if (Number.isNaN(baselineCount)) {
  console.error(`[Error] Invalid integer in baseline file: "${baselineText}"`);
  process.exit(1);
}

console.log(`[tsc-ratchet] Current checked-in baseline: ${baselineCount} error(s)`);
console.log(`[tsc-ratchet] Running npx tsc --noEmit...`);

let tscOutput = "";
let exitCode = 0;

try {
  tscOutput = execSync("npx tsc --noEmit", {
    cwd: rootDir,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (err) {
  exitCode = err.status || 1;
  tscOutput = (err.stdout || "") + "\n" + (err.stderr || "");
}

// Extract error count
let currentErrorCount = 0;

const summaryMatch = tscOutput.match(/Found (\d+) error/);
if (summaryMatch) {
  currentErrorCount = Number.parseInt(summaryMatch[1], 10);
} else {
  // Count lines matching ": error TS"
  const matches = tscOutput.match(/: error TS\d+:/g);
  currentErrorCount = matches ? matches.length : 0;
}

console.log(`[tsc-ratchet] Current tsc error count: ${currentErrorCount}`);

if (currentErrorCount > baselineCount) {
  console.error(
    `\n❌ [RATCHET VIOLATION] TypeScript error count increased! Expected <= ${baselineCount}, got ${currentErrorCount}.`
  );
  console.error(`New errors must be fixed before merging.\n`);
  process.exit(1);
}

if (currentErrorCount < baselineCount) {
  console.log(
    `\n🎉 [IMPROVEMENT] TypeScript errors decreased! Current: ${currentErrorCount}, Baseline: ${baselineCount}.`
  );
  console.log(`Baseline can be updated to ${currentErrorCount} in config/tsc-baseline-count.txt.\n`);
  process.exit(0);
}

console.log(
  `\n✅ [PASS] TypeScript error count matches ratchet baseline (${currentErrorCount} <= ${baselineCount}).\n`
);
process.exit(0);
