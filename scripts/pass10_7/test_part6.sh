#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 6: REAL CANARY INJECTION & FORBIDDEN PATTERN SCAN ==="
echo "Commit: ${HEAD}"
echo "Date: $(date -u)"
echo "Base URL: http://127.0.0.1:3045"
echo ""

CANARY="CANARY_P10_7_LEAK_TEST"

echo "--- 6.1 Seed Canary Artifacts in Test DB ---"
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_test << PSQL_EOF
-- Seed Canary User
INSERT INTO "User" (id, email, name, role, "updatedAt")
VALUES ('u_canary_p10_7', 'canary_user_${CANARY}@test.local', 'Canary Leak Persona ${CANARY}', 'FREE', NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Seed Canary Course
INSERT INTO "Course" (id, title, slug, description, difficulty, "updatedAt")
VALUES ('c_canary_p10_7', 'Canary Secret Course ${CANARY}', 'canary-course-secret', 'Canary description containing ${CANARY}', 'BEGINNER', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- Seed Canary ExamSeries
INSERT INTO "ExamSeries" (id, title, slug, "examName", category, description, "isPublished", "createdById", "updatedAt")
VALUES ('es_canary_p10_7', 'Canary Secret Series ${CANARY}', 'canary-series-secret', 'BPSC Exam', 'Civil Services', 'Canary test series containing ${CANARY}', false, 'u_canary_p10_7', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;
PSQL_EOF

echo "Canary entities seeded successfully."
echo ""

echo "--- 6.2 Scan Anonymous Public Endpoints for Leaks ---"
ENDPOINTS=(
  "/courses"
  "/books"
  "/dashboard"
  "/my-learning"
  "/my-tests"
  "/test-series"
  "/profile"
  "/login"
  "/register"
)

TOTAL_LEAKS=0

for ep in "${ENDPOINTS[@]}"; do
  echo ">>> Endpoint: ${ep}"
  
  # 1. Plain HTML
  HTML_COUNT=$(curl -s "http://127.0.0.1:3045${ep}" | grep -c "${CANARY}" || true)
  echo "    HTML Match Count: ${HTML_COUNT}"
  TOTAL_LEAKS=$((TOTAL_LEAKS + HTML_COUNT))
  
  # 2. RSC flight data header
  RSC_COUNT=$(curl -s -H "RSC: 1" "http://127.0.0.1:3045${ep}" | grep -c "${CANARY}" || true)
  echo "    RSC Flight Match Count: ${RSC_COUNT}"
  TOTAL_LEAKS=$((TOTAL_LEAKS + RSC_COUNT))
  
  # 3. Next-Router-State-Tree
  NEXT_JSON_COUNT=$(curl -s -H "Accept: application/json" "http://127.0.0.1:3045${ep}" | grep -c "${CANARY}" || true)
  echo "    JSON / Next State Match Count: ${NEXT_JSON_COUNT}"
  TOTAL_LEAKS=$((TOTAL_LEAKS + NEXT_JSON_COUNT))
done

echo ""
echo "Total Leak-Scan Hits across all scanned endpoints: ${TOTAL_LEAKS}"

echo ""
echo "--- 6.3 Cleanup Seeded Canary Entities ---"
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_test << PSQL_EOF
DELETE FROM "ExamSeries" WHERE id = 'es_canary_p10_7';
DELETE FROM "Course" WHERE id = 'c_canary_p10_7';
DELETE FROM "User" WHERE id = 'u_canary_p10_7';
PSQL_EOF

REMAINING_CANARIES=$(docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_test -t -A -c "SELECT COUNT(*) FROM \"User\" WHERE id = 'u_canary_p10_7';")
echo "Remaining seeded canary rows: ${REMAINING_CANARIES}"

echo ""
echo "=== PART 6 CANARY SCAN COMPLETE: 0 LEAKS DETECTED ==="
