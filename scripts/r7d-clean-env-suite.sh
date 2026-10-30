#!/usr/bin/env bash
# R7d helper: run the full unit suite in a clean environment.
# Usage: scripts/r7d-clean-env-suite.sh <log-file> [db-url]
# Only CI variables are exported; nothing from the developer shell leaks in.
set -uo pipefail

LOG="$1"
DB_URL="${2:-postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test}"

NODE_BIN_DIR="$(dirname "$(command -v node)")"

env -i \
  PATH="$NODE_BIN_DIR:/usr/bin:/bin:/usr/sbin:/sbin" \
  HOME="$HOME" \
  TMPDIR="${TMPDIR:-/tmp}" \
  SHELL=/bin/bash \
  CI=true \
  APP_ENV=test \
  NODE_ENV=test \
  AUTH_TRUST_HOST=true \
  NEXTAUTH_SECRET=ci-dummy-nextauth-secret-not-a-real-secret \
  DATABASE_URL="$DB_URL" \
  DIRECT_URL="$DB_URL" \
  npx tsx --test --test-concurrency=1 tests/unit/*.test.ts >"$LOG" 2>&1
echo "EXIT:$?"
