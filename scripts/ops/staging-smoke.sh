#!/usr/bin/env bash
# scripts/ops/staging-smoke.sh
# Staging / production smoke tests for AspirantBook.
# Takes BASE_URL from env.
# Refuses non-https unless localhost / 127.0.0.1.
# Prints PASS/FAIL per check, exit 1 on any failure.
set -euo pipefail

: "${BASE_URL:?BASE_URL is required (e.g. https://staging.aspirantbook.com or http://127.0.0.1:3045)}"

# Normalize trailing slash
BASE_URL="${BASE_URL%/}"

# Protocol validation
if [[ "$BASE_URL" =~ ^https:// ]]; then
  : # HTTPS is allowed
elif [[ "$BASE_URL" =~ ^http://(127\.0\.0\.1|localhost)(:[0-9]+)?$ ]]; then
  : # Localhost HTTP is allowed
else
  echo "FAIL: Refusing non-https BASE_URL (${BASE_URL}). Only localhost/127.0.0.1 may use plain http." >&2
  exit 1
fi

echo "=== AspirantBook Staging Smoke Test ==="
echo "Target: ${BASE_URL}"
echo "Started: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "----------------------------------------"

FAILED=0
TIMEOUT_SEC=10
TIME_BUDGET_MS=3000

get_time_ms() {
  python3 -c 'import time; print(int(time.time()*1000))' 2>/dev/null || perl -MTime::HiRes=time -e 'print int(time()*1000)' 2>/dev/null || echo "$(( $(date +%s) * 1000 ))"
}

check_endpoint() {
  local desc="$1"
  local path="$2"
  local expected_status="$3"
  local method="${4:-GET}"
  local headers="${5:-}"

  local url="${BASE_URL}${path}"
  local start_ts
  start_ts="$(get_time_ms)"

  local tmp_header
  tmp_header="$(mktemp)"
  local tmp_body
  tmp_body="$(mktemp)"

  local http_code
  if [[ -n "$headers" ]]; then
    http_code=$(curl -s -S -X "$method" -H "$headers" \
      -m "$TIMEOUT_SEC" \
      -D "$tmp_header" \
      -o "$tmp_body" \
      -w "%{http_code}" \
      "$url" || echo "000")
  else
    http_code=$(curl -s -S -X "$method" \
      -m "$TIMEOUT_SEC" \
      -D "$tmp_header" \
      -o "$tmp_body" \
      -w "%{http_code}" \
      "$url" || echo "000")
  fi

  local end_ts
  end_ts="$(get_time_ms)"
  local duration=$((end_ts - start_ts))

  local pass=1

  # Status code check
  if [[ "$http_code" != "$expected_status" ]]; then
    echo "FAIL: [${desc}] ${method} ${path} expected ${expected_status}, got ${http_code} (${duration}ms)"
    pass=0
  fi

  # Response time budget check
  if [[ $duration -gt $TIME_BUDGET_MS ]]; then
    echo "WARN: [${desc}] ${method} ${path} response time ${duration}ms exceeded budget ${TIME_BUDGET_MS}ms"
  fi

  if [[ $pass -eq 1 ]]; then
    echo "PASS: [${desc}] ${method} ${path} -> ${http_code} (${duration}ms)"
  else
    FAILED=$((FAILED + 1))
  fi

  # Clean up temp files
  rm -f "$tmp_header" "$tmp_body"
}

# 1. Health endpoint: 200, status ok, no secret leaks
check_health() {
  local url="${BASE_URL}/api/health"
  local start_ts
  start_ts="$(get_time_ms)"

  local tmp_body
  tmp_body="$(mktemp)"
  local http_code
  http_code=$(curl -s -S -m "$TIMEOUT_SEC" -o "$tmp_body" -w "%{http_code}" "$url" || echo "000")
  local end_ts
  end_ts="$(get_time_ms)"
  local duration=$((end_ts - start_ts))

  local pass=1
  if [[ "$http_code" != "200" ]]; then
    echo "FAIL: [Health Check] GET /api/health expected 200, got ${http_code} (${duration}ms)"
    pass=0
  fi

  local body
  body="$(cat "$tmp_body")"
  rm -f "$tmp_body"

  # Secret leak pattern check
  if echo "$body" | grep -Ei 'postgres:|postgresql://|password|bearer |secret_key|private_key|service_role|sk_live|rzp_live_' >/dev/null; then
    echo "FAIL: [Health Check] /api/health payload contains potential secret or credential string"
    pass=0
  fi

  if [[ $pass -eq 1 ]]; then
    echo "PASS: [Health Check] GET /api/health -> 200 (no secrets leaked, ${duration}ms)"
  else
    FAILED=$((FAILED + 1))
  fi
}

# 2. Security headers check on /login
check_security_headers() {
  local url="${BASE_URL}/login"
  local tmp_header
  tmp_header="$(mktemp)"

  curl -s -S -I -m "$TIMEOUT_SEC" -o "$tmp_header" "$url" || true
  local headers
  headers="$(cat "$tmp_header")"
  rm -f "$tmp_header"

  local pass=1

  # X-Content-Type-Options
  if ! echo "$headers" | grep -i 'X-Content-Type-Options: nosniff' >/dev/null; then
    echo "FAIL: [Security Headers] Missing or invalid X-Content-Type-Options: nosniff"
    pass=0
  fi

  # Content-Security-Policy
  if ! echo "$headers" | grep -i 'Content-Security-Policy:' >/dev/null; then
    echo "FAIL: [Security Headers] Missing Content-Security-Policy header"
    pass=0
  fi

  # Strict-Transport-Security (HSTS)
  if ! echo "$headers" | grep -i 'Strict-Transport-Security:' >/dev/null; then
    echo "FAIL: [Security Headers] Missing Strict-Transport-Security header"
    pass=0
  fi

  if [[ $pass -eq 1 ]]; then
    echo "PASS: [Security Headers] Strict-Transport-Security, X-Content-Type-Options, CSP verified"
  else
    FAILED=$((FAILED + 1))
  fi
}

# Run all smoke checks
echo "Executing smoke checks..."
check_health
check_endpoint "Admin Redirect" "/admin" "307" "GET"
check_endpoint "Admin API Guard" "/api/admin" "401" "GET"
check_endpoint "Auth Role Guard" "/api/auth/role" "404" "GET"
check_endpoint "Exam Bulk Guard" "/api/exam/test/bulk" "401" "POST"
check_endpoint "Login Page" "/login" "200" "GET"
check_endpoint "Register Page" "/register" "200" "GET"
check_endpoint "Robots" "/robots.txt" "200" "GET"
check_endpoint "Sitemap" "/sitemap.xml" "200" "GET"
check_security_headers

echo "----------------------------------------"
if [[ $FAILED -eq 0 ]]; then
  echo "OVERALL RESULT: PASS (All checks passed)"
  exit 0
else
  echo "OVERALL RESULT: FAIL (${FAILED} checks failed)"
  exit 1
fi
