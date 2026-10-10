#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

set -a
source .env.test
set +a

if [[ "${TEST_DATABASE_URL}" != *"127.0.0.1:54329/trillionskill_test"* ]]; then
  echo "Refusing to run: TEST_DATABASE_URL is not the Docker test database." >&2
  exit 2
fi

if curl --silent --show-error --max-time 2 http://127.0.0.1:3045/ >/dev/null 2>&1; then
  echo "Port 3045 is already serving a page. Stop it before running the E2E suite." >&2
  exit 2
fi

mkdir -p logs/verify-studio/e2e
export TEST_DATABASE_URL
export DATABASE_URL="$TEST_DATABASE_URL"
export DIRECT_URL="$TEST_DATABASE_URL"
export NEXTAUTH_URL="http://localhost:3045"
export AUTH_URL="http://localhost:3045"
export NEXT_PUBLIC_APP_URL="http://localhost:3045"
export APP_ENV=test
export ALLOW_DEV_MOBILE_LOGIN=false
export NEXT_DIST_DIR=.next-test
export E2E_RUN_NONCE="E2E-$(date +%Y%m%d%H%M%S)-$RANDOM"
export PORT=3045

npx next dev --hostname 127.0.0.1 --port 3045 > logs/verify-studio/e2e/server.log 2>&1 &
SERVER_PID=$!
cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

ready=0
for _ in $(seq 1 90); do
  if curl --silent --fail --max-time 2 http://127.0.0.1:3045/ >/dev/null; then
    ready=1
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    cat logs/verify-studio/e2e/server.log
    exit 1
  fi
  sleep 2
done

if [[ "$ready" != 1 ]]; then
  echo "Next.js did not become ready on port 3045." >&2
  cat logs/verify-studio/e2e/server.log
  exit 1
fi

BASE_URL=http://127.0.0.1:3045 npx playwright test \
  tests/e2e/teacher-authoring-to-student.spec.ts \
  tests/e2e/guest-student-journey.spec.ts \
  --reporter=list "$@"
