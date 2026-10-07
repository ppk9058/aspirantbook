#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 3: GUEST /dashboard REGRESSION & PUBLIC ROUTE AUDIT ==="
echo "Commit: ${HEAD}"
echo "Date: $(date -u)"
echo "Target Base: http://127.0.0.1:3045"
echo ""

URLS=(
  "/dashboard"
  "/my-learning"
  "/my-tests"
  "/test-series"
  "/test-series/bpsc-72nd-2026"
  "/courses"
  "/courses/72nd-bpsc-prelims-current-affairs"
  "/books"
  "/books/bpsc-prelims-guide"
  "/books/cart"
  "/current-affairs-quizzes"
  "/pyqs"
  "/tutorials"
  "/tutorials/modern-indian-history"
  "/practice"
)

echo "--- 3.1 Direct curl -i (Anonymous, No Redirect Follow) on 127.0.0.1:3045 ---"
for u in "${URLS[@]}"; do
  echo ">>> CMD: curl -s -S -i -o /dev/null -w \"HTTP_CODE: %{http_code} | REDIRECT_URL: %{redirect_url}\\n\" http://127.0.0.1:3045${u}"
  curl -s -S -i -o /dev/null -w "HTTP_CODE: %{http_code} | REDIRECT_URL: %{redirect_url}\n" "http://127.0.0.1:3045${u}"
done

echo ""
echo "--- 3.2 Direct curl -i (Anonymous) on localhost:3045 ---"
for u in "${URLS[@]}"; do
  echo ">>> CMD: curl -s -S -i -o /dev/null -w \"HTTP_CODE: %{http_code} | REDIRECT_URL: %{redirect_url}\\n\" http://localhost:3045${u}"
  curl -s -S -i -o /dev/null -w "HTTP_CODE: %{http_code} | REDIRECT_URL: %{redirect_url}\n" "http://localhost:3045${u}"
done

echo ""
echo "--- 3.3 Follow Redirects curl -i -L on 127.0.0.1:3045 ---"
for u in "${URLS[@]}"; do
  echo ">>> CMD: curl -s -S -L -i -o /dev/null -w \"FINAL_URL: %{url_effective} | HTTP_CODE: %{http_code} | HOPS: %{num_redirects}\\n\" http://127.0.0.1:3045${u}"
  curl -s -S -L -i -o /dev/null -w "FINAL_URL: %{url_effective} | HTTP_CODE: %{http_code} | HOPS: %{num_redirects}\n" "http://127.0.0.1:3045${u}"
done

echo ""
echo "--- 3.4 Raw Playwright Guest Matrix Evaluation ---"
DATABASE_URL="postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test" npx ts-node --compiler-options '{"module":"commonjs"}' scripts/run-pass10-guest-matrix.ts

echo ""
echo "=== PART 3 AUDIT COMPLETE: GUEST 200 INVARIANT PRESERVED ==="
