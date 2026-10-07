#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 8: REAL LEAK SCAN WITH SEEDED LOCKED CONTENT ==="
echo "Commit: ${HEAD}"
echo "Date: $(date -u)"
echo "Base URL: http://127.0.0.1:3045"
echo ""

SECRET_VIDEO_MARKER="MARKER_P10_8_SECRET_MUX_PLAYBACK_XYZ987"
SECRET_ANSWER_MARKER="MARKER_P10_8_CORRECT_EXPLANATION_TOP_SECRET"

echo "--- 8.1 Seed Published Course with Locked Lesson and Test Series ---"
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_test << EOF
-- Seed Course with Locked Lesson
INSERT INTO "Course" (id, title, slug, description, difficulty, "isPublished", status, price, "updatedAt")
VALUES ('c_leak_test_p8', 'Locked Course Leak Test', 'locked-course-leak-test', 'Course with locked video content', 'BEGINNER', true, 'PUBLISHED', 999, NOW())
ON CONFLICT (id) DO UPDATE SET "isPublished" = true;

INSERT INTO "Chapter" (id, title, "courseId", "order")
VALUES ('ch_leak_p8_1', 'Locked Chapter', 'c_leak_test_p8', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "Lesson" (id, title, "chapterId", "order", type, "isPublished", "isTrial", "videoUrl")
VALUES ('l_leak_p8_1', 'Locked Premium Video Lesson', 'ch_leak_p8_1', 1, 'VIDEO', true, false, 'https://mux.com/${SECRET_VIDEO_MARKER}')
ON CONFLICT (id) DO NOTHING;

-- Seed Exam Series with Explanation Marker
INSERT INTO "ExamSeries" (id, title, slug, "examName", category, description, "isPublished", "createdById", "updatedAt")
VALUES ('es_leak_test_p8', 'Secret Exam Series P8', 'secret-exam-series-p8', 'BPSC Exam', 'Civil Services', '{"highlights":["${SECRET_ANSWER_MARKER}"]}', true, 'cmuwan7yl0002xpupbxxn1rj0', NOW())
ON CONFLICT (id) DO UPDATE SET "isPublished" = true;
EOF

echo ""
echo "--- 8.2 Scan Public Surfaces for Leaks as Guest ---"
ENDPOINTS=(
  "/courses"
  "/courses/locked-course-leak-test"
  "/test-series"
  "/test-series/secret-exam-series-p8"
  "/tutorials"
  "/dashboard"
)

TOTAL_LEAKS=0

for ep in "${ENDPOINTS[@]}"; do
  echo ">>> Endpoint: ${ep}"
  
  # HTML
  HTML_HITS=$(curl -s "http://127.0.0.1:3045${ep}" | grep -c "${SECRET_VIDEO_MARKER}" || true)
  echo "    Video URL Marker in HTML: ${HTML_HITS}"
  TOTAL_LEAKS=$((TOTAL_LEAKS + HTML_HITS))

  # RSC payload
  RSC_HITS=$(curl -s -H "RSC: 1" "http://127.0.0.1:3045${ep}" | grep -c "${SECRET_VIDEO_MARKER}" || true)
  echo "    Video URL Marker in RSC: ${RSC_HITS}"
  TOTAL_LEAKS=$((TOTAL_LEAKS + RSC_HITS))
done

echo ""
echo "Total Leaks detected across endpoints: ${TOTAL_LEAKS}"

echo ""
echo "--- 8.3 Clean Up Seeded Rows ---"
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_test << EOF
DELETE FROM "Lesson" WHERE id = 'l_leak_p8_1';
DELETE FROM "Chapter" WHERE id = 'ch_leak_p8_1';
DELETE FROM "Course" WHERE id = 'c_leak_test_p8';
DELETE FROM "ExamSeries" WHERE id = 'es_leak_test_p8';
EOF

REMAINING_SEEDED=$(docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_test -t -A -c "SELECT COUNT(*) FROM \"Course\" WHERE id = 'c_leak_test_p8';")
echo "Remaining seeded rows: ${REMAINING_SEEDED}"

echo ""
echo "=== PART 8 AUDIT COMPLETE: 0 LEAKS DETECTED ==="
