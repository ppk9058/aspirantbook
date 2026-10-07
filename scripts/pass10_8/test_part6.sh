#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 6: ANONYMOUS API AUDIT v2 & PROBE EVALUATION ==="
echo "Commit: ${HEAD}"
echo "Date: $(date -u)"
echo "Base URL: http://127.0.0.1:3045"
echo ""

ROUTES=$(find app/api -name "route.ts" | sort)
ROUTE_COUNT=$(echo "${ROUTES}" | wc -l | tr -d ' ')
echo "Total API Routes found: ${ROUTE_COUNT}"
echo ""

echo "--- 6.1 Scanning All Routes (Anonymous) ---"
for r in ${ROUTES}; do
  URL_PATH=$(echo "$r" | sed -E 's|^app||' | sed -E 's|/route\.ts$||')
  SAMPLE_PATH=$(echo "$URL_PATH" | sed -E 's|\[\.\.\.[^]]+\]|test|g' | sed -E 's|\[[^]]+\]|test-probe|g')
  
  METHODS=$(grep -oE "export async function (GET|POST|PUT|PATCH|DELETE)" "$r" | awk '{print $4}' | sort -u || true)
  if [ -z "$METHODS" ]; then
    METHODS=$(grep -oE "export function (GET|POST|PUT|PATCH|DELETE)" "$r" | awk '{print $3}' | sort -u || true)
  fi

  for m in ${METHODS}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X "$m" "http://127.0.0.1:3045${SAMPLE_PATH}" || echo "ERR")
    echo "ROUTE: ${URL_PATH} | METHOD: ${m} | STATUS: ${STATUS}"
    
    if [ "$STATUS" = "200" ] || [ "$STATUS" = "500" ]; then
      BODY_SNIPPET=$(curl -s -X "$m" "http://127.0.0.1:3045${SAMPLE_PATH}" | cut -c 1-200 || true)
      echo "    [BODY SNIPPET]: ${BODY_SNIPPET}"
    fi
  done
done

echo ""
echo "--- 6.2 Key Hardened Route Verifications ---"
echo "1. /api/auth/debug [GET]:"
curl -s -i "http://127.0.0.1:3045/api/auth/debug" | head -n 8

echo ""
echo "2. /api/auth/check-user [POST]:"
curl -s -i -X POST -H "Content-Type: application/json" -d '{"phone":"9876543210"}' "http://127.0.0.1:3045/api/auth/check-user" | head -n 8

echo ""
echo "3. /api/auth/logout [GET (405 expected) & POST (307 redirect expected)]:"
curl -s -i "http://127.0.0.1:3045/api/auth/logout" | head -n 8
curl -s -i -X POST "http://127.0.0.1:3045/api/auth/logout" | head -n 8

echo ""
echo "4. Admin & Classroom Routes (401 Unauthorized for Anonymous):"
curl -s -o /dev/null -w "GET /api/admin/batches: %{http_code}\n" http://127.0.0.1:3045/api/admin/batches
curl -s -o /dev/null -w "GET /api/teacher/classes: %{http_code}\n" http://127.0.0.1:3045/api/teacher/classes
curl -s -o /dev/null -w "GET /api/classroom/test-probe: %{http_code}\n" http://127.0.0.1:3045/api/classroom/test-probe
curl -s -o /dev/null -w "POST /api/classroom/test-probe/chat: %{http_code}\n" -X POST http://127.0.0.1:3045/api/classroom/test-probe/chat
curl -s -o /dev/null -w "POST /api/classroom/test-probe/authorize: %{http_code}\n" -X POST http://127.0.0.1:3045/api/classroom/test-probe/authorize
curl -s -o /dev/null -w "POST /api/books/orders: %{http_code}\n" -X POST http://127.0.0.1:3045/api/books/orders

echo ""
echo "=== PART 6 API AUDIT COMPLETE ==="
