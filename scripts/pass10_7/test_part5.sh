#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 5: COMPLETE 97-ROUTE ANONYMOUS API AUDIT & SERVER ACTIONS ==="
echo "Commit: ${HEAD}"
echo "Date: $(date -u)"
echo "Base URL: http://127.0.0.1:3045"
echo ""

echo "--- 5.1 Count and List all route.ts Files ---"
ROUTES=$(find app/api -name "route.ts" | sort)
ROUTE_COUNT=$(echo "${ROUTES}" | wc -l | tr -d ' ')
echo "Total API Routes found: ${ROUTE_COUNT}"
echo ""

echo "--- 5.2 Control Tests: Non-Existent Routes ---"
echo "Testing /api/non-existent-route-for-audit-control:"
curl -s -S -i "http://127.0.0.1:3045/api/non-existent-route-for-audit-control" | head -n 5
echo ""
echo "Testing /api/exam/non-existent-endpoint:"
curl -s -S -i "http://127.0.0.1:3045/api/exam/non-existent-endpoint" | head -n 5
echo ""

echo "--- 5.3 Scan Every Method on Every API Route (Anonymous Requests) ---"
for r in ${ROUTES}; do
  URL_PATH=$(echo "$r" | sed -E 's|^app||' | sed -E 's|/route\.ts$||')
  SAMPLE_PATH=$(echo "$URL_PATH" | sed -E 's|\[\.\.\.[^]]+\]|test|g' | sed -E 's|\[[^]]+\]|test-probe|g')
  
  METHODS=$(grep -oE "export async function (GET|POST|PUT|PATCH|DELETE)" "$r" | awk '{print $4}' | sort -u || true)
  if [ -z "$METHODS" ]; then
    METHODS=$(grep -oE "export function (GET|POST|PUT|PATCH|DELETE)" "$r" | awk '{print $3}' | sort -u || true)
  fi

  for m in ${METHODS}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X "$m" "http://127.0.0.1:3045${SAMPLE_PATH}" || echo "ERR")
    echo "ROUTE: ${URL_PATH} | METHOD: ${m} | PROBE: ${SAMPLE_PATH} | ANON_STATUS: ${STATUS}"
  done
done

echo ""
echo "--- 5.4 Check Key Changed Endpoints ---"
echo "1. /api/admin/batches [GET, POST]:"
curl -s -o /dev/null -w "GET: %{http_code}\n" http://127.0.0.1:3045/api/admin/batches
curl -s -o /dev/null -w "POST: %{http_code}\n" -X POST http://127.0.0.1:3045/api/admin/batches

echo "2. /api/admin/batches/[id] [GET, PUT, DELETE]:"
curl -s -o /dev/null -w "GET: %{http_code}\n" http://127.0.0.1:3045/api/admin/batches/test-probe
curl -s -o /dev/null -w "PUT: %{http_code}\n" -X PUT http://127.0.0.1:3045/api/admin/batches/test-probe
curl -s -o /dev/null -w "DELETE: %{http_code}\n" -X DELETE http://127.0.0.1:3045/api/admin/batches/test-probe

echo "3. /api/classroom/[id]/chat [POST]:"
curl -s -o /dev/null -w "POST: %{http_code}\n" -X POST http://127.0.0.1:3045/api/classroom/test-probe/chat

echo "4. /api/auth/logout [GET, POST]:"
curl -s -o /dev/null -w "GET: %{http_code}\n" http://127.0.0.1:3045/api/auth/logout
curl -s -o /dev/null -w "POST: %{http_code}\n" -X POST http://127.0.0.1:3045/api/auth/logout

echo ""
echo "=== PART 5 API SCAN COMPLETE ==="
