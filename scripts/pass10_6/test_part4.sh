#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 4: COMPLETE 97-ROUTE API AUDIT & SERVER ACTIONS ==="
echo "Commit: ${HEAD}"
echo "Date: $(date -u)"
echo "Base URL: http://127.0.0.1:3045"
echo ""

echo "--- 4.1 Count and List all route.ts Files ---"
ROUTES=$(find app/api -name "route.ts" | sort)
ROUTE_COUNT=$(echo "${ROUTES}" | wc -l | tr -d ' ')
echo "Total API Routes found: ${ROUTE_COUNT}"
echo ""

echo "--- 4.2 Control Tests: Non-Existent Routes ---"
echo "Testing /api/non-existent-route-for-audit-control:"
curl -s -S -i "http://127.0.0.1:3045/api/non-existent-route-for-audit-control" | head -n 5
echo ""
echo "Testing /api/exam/non-existent-endpoint:"
curl -s -S -i "http://127.0.0.1:3045/api/exam/non-existent-endpoint" | head -n 5
echo ""

echo "--- 4.3 Scan Every Method on Every API Route (Anonymous Requests) ---"
for r in ${ROUTES}; do
  # Determine route URL path from file path
  # Example: app/api/auth/[...nextauth]/route.ts -> /api/auth/...
  URL_PATH=$(echo "$r" | sed -E 's|^app||' | sed -E 's|/route\.ts$||')
  # Substitute dynamic params with sample strings for probing
  SAMPLE_PATH=$(echo "$URL_PATH" | sed -E 's|\[\.\.\.[^]]+\]|test|g' | sed -E 's|\[[^]]+\]|test-probe|g')
  
  # Detect exported methods in route.ts
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
echo "--- 4.4 Server Actions Inventory & Auth Checks ---"
SERVER_ACTION_FILES=$(grep -rnwl "use server" app lib | sort)
SA_COUNT=$(echo "${SERVER_ACTION_FILES}" | wc -l | tr -d ' ')
echo "Total Files with 'use server': ${SA_COUNT}"
echo ""

for f in ${SERVER_ACTION_FILES}; do
  echo ">>> File: $f"
  # Show auth checks in this action file
  AUTH_LINES=$(grep -nE "(auth\(\)|getServerSession|session|requireAuth|requireAdmin|requireTeacher|UserRole)" "$f" || echo "NO_EXPLICIT_AUTH_LINE")
  echo "$AUTH_LINES"
  echo ""
done
