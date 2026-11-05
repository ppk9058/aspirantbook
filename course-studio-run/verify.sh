#!/usr/bin/env bash
#
# Course Studio generalize — one-command verification.
#
# Every check prints a single PASS/FAIL line and the script exits non-zero if
# anything failed. Nothing here writes to the dev/Supabase database: DB-touching
# suites run against the Docker test DB via course-studio-run/test-env.sh.
#
# Usage:
#   ./course-studio-run/verify.sh                 # typecheck, lint, unit, DB, API, mobile tsc
#   RUN_E2E=1 ./course-studio-run/verify.sh       # + Playwright (needs the 3045 test server)
#
# Optional overrides:
#   SKIP_LINT=1 SKIP_TSC=1 SKIP_MOBILE=1 SKIP_E2E=1
#
set -uo pipefail

cd "$(dirname "$0")/.." || exit 1

FAILED=0
declare -a RESULTS=()

pass() { RESULTS+=("PASS  $1"); printf 'PASS  %s\n' "$1"; }
fail() { RESULTS+=("FAIL  $1"); printf 'FAIL  %s\n' "$1"; FAILED=1; }

run_check() {
  local name="$1"
  shift
  local log
  log="$(mktemp)"
  if "$@" >"$log" 2>&1; then
    pass "$name"
  else
    fail "$name  (log: $log)"
    tail -n 25 "$log" | sed 's/^/      /'
  fi
}

echo "== Course Studio generalize — verify =="
echo "   branch: $(git branch --show-current 2>/dev/null || echo '?')"
echo

# ---------------------------------------------------------------- static checks
if [[ "${SKIP_TSC:-0}" != "1" ]]; then
  run_check "web typecheck (npx tsc --noEmit)" npx tsc --noEmit
else
  echo "SKIP  web typecheck (SKIP_TSC=1)"
fi

if [[ "${SKIP_LINT:-0}" != "1" ]]; then
  run_check "web lint (npm run lint)" npm run lint
else
  echo "SKIP  web lint (SKIP_LINT=1)"
fi

# ------------------------------------------------------------------ pure logic
# shellcheck disable=SC1091
. ./course-studio-run/test-env.sh

run_check "unit: course format / i18n / derive / ics / draft" \
  npx tsx --test \
    tests/unit/course-format.test.ts \
    tests/unit/course-studio-p3.test.ts \
    tests/unit/course-syllabus-stats.test.ts \
    tests/unit/course-studio-p4-draft.test.ts

run_check "db: units, syllabus authoring, PYQ counts" \
  npx tsx --test tests/course-studio-p4-db.test.ts

run_check "api: v1 course + callback contracts" \
  npx tsx --test tests/api-v1-courses-learning.test.ts tests/api-v1-course-callback.test.ts tests/contract-v1.test.ts

# ------------------------------------------------------------------- mobile
if [[ "${SKIP_MOBILE:-0}" != "1" ]]; then
  run_check "mobile typecheck (apps/mobile npx tsc --noEmit)" \
    bash -c 'cd apps/mobile && npx tsc --noEmit'
else
  echo "SKIP  mobile typecheck (SKIP_MOBILE=1)"
fi

# ------------------------------------------------------------------ browser e2e
if [[ "${RUN_E2E:-0}" == "1" && "${SKIP_E2E:-0}" != "1" ]]; then
  BASE="${BASE_URL:-http://127.0.0.1:3045}"
  if curl -sf -o /dev/null --max-time 5 "$BASE/" || curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$BASE/" | grep -qE '^[23]'; then
    BASE_URL="$BASE" run_check "e2e: course detail v2 (Playwright @ $BASE)" \
      npx playwright test tests/e2e/course-detail-v2.spec.ts
  else
    fail "e2e: no test server on $BASE — start: PORT=3045 NEXT_DIST_DIR=.next-test npx next dev --hostname 127.0.0.1 --port 3045"
  fi
else
  echo "SKIP  e2e: course detail v2 (set RUN_E2E=1 with the 3045 test server running)"
fi

# ------------------------------------------------------------------- summary
echo
echo "== Summary =="
for line in "${RESULTS[@]}"; do
  echo "  $line"
done
echo
if [[ "$FAILED" -eq 0 ]]; then
  echo "RESULT: PASS"
  exit 0
fi
echo "RESULT: FAIL"
exit 1
