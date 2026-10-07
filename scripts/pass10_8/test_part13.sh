#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 13: 310-CASE QA MATRIX EXECUTION AUDIT ==="
echo "Commit: ${HEAD}"
echo "Date: $(date -u)"
echo "Base URL: http://127.0.0.1:3045"
echo ""

echo "--- 13.1 Running 310 QA Matrix Suite ---"
DATABASE_URL="postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test" npx ts-node --compiler-options '{"module":"commonjs"}' scripts/run-pass9-qa-matrix.ts

echo ""
echo "=== PART 13 AUDIT COMPLETE ==="
