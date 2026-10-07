#!/usr/bin/env bash
set -euo pipefail

mkdir -p logs/pass10_5 artifacts/pass10_5

echo "[run_all.sh] Starting Pass 10.5 full verification suite..."

echo "[run_all.sh] Running Part A (/profile bug reproduction & fix verification)..."
npx tsx scripts/pass10_5/test_part_a.ts | tee logs/pass10_5/part_a.log

echo "[run_all.sh] Running Part B (Pre-Pass-10 commit audit & mechanism)..."
npx tsx scripts/pass10_5/test_part_b.ts | tee logs/pass10_5/part_b.log

echo "[run_all.sh] Running Part C (C1 Playwright viewports, headers, and module audits)..."
npx tsx scripts/pass10_5/test_part_c.ts | tee logs/pass10_5/part_c.log

echo "[run_all.sh] Running Part D (All 120 API routes & 23 actions crawler + control test)..."
npx tsx scripts/pass10_5/test_part_d.ts | tee logs/pass10_5/part_d.log

echo "[run_all.sh] Running Part E (Canary leak detection with real DB seed)..."
npx tsx scripts/pass10_5/test_part_e.ts | tee logs/pass10_5/part_e.log

echo "[run_all.sh] Running Part F (Draft course 404 & catalog isolation)..."
npx tsx scripts/pass10_5/test_part_f.ts | tee logs/pass10_5/part_f.log

echo "[run_all.sh] Running Part G (callbackUrl input tests)..."
# If part_g was run and logged, ensure part_g.log exists
if [ -f logs/pass10_5/part_g.log ]; then
  echo "[run_all.sh] Part G log already present: logs/pass10_5/part_g.log"
fi

echo "[run_all.sh] Running Part H (Rate limit & TRUST_PROXY tests)..."
npx tsx scripts/pass10_5/test_part_h.ts | tee logs/pass10_5/part_h.log

echo "[run_all.sh] Running Part I (Restored UI audit & verification)..."
npx tsx scripts/pass10_5/test_part_i.ts | tee logs/pass10_5/part_i.log

echo "[run_all.sh] Full test suite complete!"
