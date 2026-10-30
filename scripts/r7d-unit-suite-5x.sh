#!/usr/bin/env bash
# R7d: run the full unit suite 5 consecutive times in a clean environment and
# record every run with the commit SHA in its header.
set -uo pipefail
cd "$(dirname "$0")/.."

SHA="$(git rev-parse HEAD)"
OUT="docs/evidence/raw/r7d-unit-suite-5x-${SHA:0:7}.txt"
: > "$OUT"
{
  echo "# R7d clean-env unit suite, 5 consecutive runs"
  echo "# SHA: $SHA"
  echo "# branch: $(git branch --show-current)"
  echo "# date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "# command: scripts/r7d-clean-env-suite.sh (env -i + CI vars only)"
  echo "# DB: postgresql://postgres:***@127.0.0.1:54329/trillionskill_test"
} >> "$OUT"

FAILED=0
for i in 1 2 3 4 5; do
  TMP="$(mktemp)"
  {
    echo ""
    echo "===== RUN $i/5 ====="
    echo "# SHA: $SHA"
  } >> "$OUT"
  RESULT="$(scripts/r7d-clean-env-suite.sh "$TMP")"
  {
    echo "# $RESULT"
    grep -E "^# (tests|suites|pass|fail|cancelled|skipped|todo)" "$TMP" || echo "# no summary"
    grep -E "^not ok" "$TMP" || echo "# no failing suites"
  } >> "$OUT"
  if [ "$RESULT" != "EXIT:0" ]; then FAILED=$((FAILED+1)); fi
  rm -f "$TMP"
done

{
  echo ""
  echo "===== SUMMARY ====="
  echo "# SHA: $SHA"
  echo "# runs: 5, failed runs: $FAILED"
} >> "$OUT"

echo "SHA=$SHA FAILED_RUNS=$FAILED LOG=$OUT"
