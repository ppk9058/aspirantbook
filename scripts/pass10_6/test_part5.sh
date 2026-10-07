#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 5: REAL CANARY INJECTION & FORBIDDEN PATTERN SCAN ==="
echo "Commit: ${HEAD}"
echo "Date: $(date -u)"
echo "Base URL: http://127.0.0.1:3045"
echo ""

CANARY="CANARY_P10_6_LEAK_TEST"

echo "--- 5.1 Seed Canary Artifacts in Test DB ---"
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_test << PSQL_EOF
-- Seed Canary User
INSERT INTO "User" (id, email, name, role, "updatedAt")
VALUES ('u_canary_p10_6', 'canary_user_${CANARY}@test.local', 'Canary Leak Persona ${CANARY}', 'FREE', NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Seed Canary Course
INSERT INTO "Course" (id, title, slug, description, difficulty, "updatedAt")
VALUES ('c_canary_p10_6', 'Canary Secret Course ${CANARY}', 'canary-course-secret', 'Canary description containing ${CANARY}', 'BEGINNER', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- Seed Canary ExamSeries
INSERT INTO "ExamSeries" (id, title, slug, "examName", category, description, "isPublished", "createdById", "updatedAt")
VALUES ('es_canary_p10_6', 'Canary Secret Series ${CANARY}', 'canary-series-secret', 'BPSC Exam', 'Civil Services', 'Canary test series containing ${CANARY}', false, 'u_canary_p10_6', NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;
PSQL_EOF

echo "Canary entities seeded successfully."
echo ""

echo "--- 5.2 Scan Anonymous Public Endpoints for Leaks ---"
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

for ep in "${ENDPOINTS[@]}"; do
  echo ">>> Endpoint: ${ep}"
  
  # 1. Plain HTML
  HTML_COUNT=$(curl -s "http://127.0.0.1:3045${ep}" | grep -c "${CANARY}" || true)
  echo "    HTML Match Count: ${HTML_COUNT}"
  
  # 2. RSC flight data header
  RSC_COUNT=$(curl -s -H "RSC: 1" "http://127.0.0.1:3045${ep}" | grep -c "${CANARY}" || true)
  echo "    RSC Flight Match Count: ${RSC_COUNT}"
  
  # 3. Next-Router-State-Tree
  NEXT_JSON_COUNT=$(curl -s -H "Accept: application/json" "http://127.0.0.1:3045${ep}" | grep -c "${CANARY}" || true)
  echo "    JSON / Next State Match Count: ${NEXT_JSON_COUNT}"
  echo ""
done

echo "--- 5.3 Test Private Data Isolation ---"
echo "Checking if Canary User email or secret series leaks on anonymous /profile or /dashboard:"
DASH_LEAK=$(curl -s "http://127.0.0.1:3045/dashboard" | grep -c "${CANARY}" || true)
PROF_LEAK=$(curl -s "http://127.0.0.1:3045/profile" | grep -c "${CANARY}" || true)
echo "Dashboard Canary Leak Count: ${DASH_LEAK}"
echo "Profile Canary Leak Count: ${PROF_LEAK}"

echo ""
echo "--- 5.4 Clean Up Canary Artifacts ---"
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_test << PSQL_EOF
DELETE FROM "ExamSeries" WHERE id = 'es_canary_p10_6';
DELETE FROM "Course" WHERE id = 'c_canary_p10_6';
DELETE FROM "User" WHERE id = 'u_canary_p10_6';
PSQL_EOF
echo "Canary artifacts removed cleanly."
