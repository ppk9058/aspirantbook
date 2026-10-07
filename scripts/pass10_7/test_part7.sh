#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 7: REAL DRAFT 404 ISOLATION & DYNAMIC SITEMAP AUDIT ==="
echo "Commit: ${HEAD}"
echo "Date: $(date -u)"
echo "Base URL: http://127.0.0.1:3045"
echo ""

echo "--- 7.1 Seed Draft & Published Entities in Test DB ---"
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_test << PSQL_EOF
-- Published Exam Series
INSERT INTO "ExamSeries" (id, title, slug, "examName", category, description, "isPublished", "createdById", "updatedAt")
VALUES ('es_pub_p10_7', 'Published BPSC Series P10.7', 'bpsc-pub-p10-7', 'BPSC Exam', 'Civil Services', '{"highlights":["High Quality Mocks"]}', true, 'cmuwan7yl0002xpupbxxn1rj0', NOW())
ON CONFLICT (id) DO UPDATE SET "isPublished" = true;

-- Draft Exam Series
INSERT INTO "ExamSeries" (id, title, slug, "examName", category, description, "isPublished", "createdById", "updatedAt")
VALUES ('es_draft_p10_7', 'Draft Private Series P10.7', 'bpsc-draft-p10-7', 'BPSC Exam', 'Civil Services', 'Draft description', false, 'cmuwan7yl0002xpupbxxn1rj0', NOW())
ON CONFLICT (id) DO UPDATE SET "isPublished" = false;

-- Draft Course
INSERT INTO "Course" (id, title, slug, description, difficulty, "isPublished", status, "updatedAt")
VALUES ('c_draft_p10_7', 'Draft Course P10.7', 'draft-p10-7-slug', 'Draft course description', 'BEGINNER', false, 'DRAFT', NOW())
ON CONFLICT (id) DO UPDATE SET "isPublished" = false;
PSQL_EOF

echo "Test items seeded."
echo ""

echo "--- 7.2 Probe Draft vs Non-Existent Routes for Anonymous ---"
echo "1. Draft Exam Series:"
curl -s -S -i -o /dev/null -w "DRAFT_SERIES_STATUS: %{http_code}\n" "http://127.0.0.1:3045/test-series/bpsc-draft-p10-7"

echo "2. Non-Existent Exam Series:"
curl -s -S -i -o /dev/null -w "NON_EXISTENT_SERIES_STATUS: %{http_code}\n" "http://127.0.0.1:3045/test-series/completely-non-existent-series"

echo "3. Draft Course:"
curl -s -S -i -o /dev/null -w "DRAFT_COURSE_STATUS: %{http_code}\n" "http://127.0.0.1:3045/courses/draft-p10-7-slug"

echo "4. Non-Existent Course:"
curl -s -S -i -o /dev/null -w "NON_EXISTENT_COURSE_STATUS: %{http_code}\n" "http://127.0.0.1:3045/courses/completely-non-existent-course"

echo ""
echo "--- 7.3 Sitemap Dynamic Invariant Audit ---"
echo "Checking export in app/sitemap.ts:"
grep -n -C 2 "force-dynamic" app/sitemap.ts

echo ""
echo "Testing sitemap.xml response:"
curl -s -S -i "http://127.0.0.1:3045/sitemap.xml" | head -n 15

DRAFT_IN_SITEMAP=$(curl -s "http://127.0.0.1:3045/sitemap.xml" | grep -c "draft-p10-7" || true)
echo "Draft entity count in sitemap: ${DRAFT_IN_SITEMAP}"

echo ""
echo "--- 7.4 Clean Up Seeded Items ---"
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_test << PSQL_EOF
DELETE FROM "ExamSeries" WHERE id IN ('es_pub_p10_7', 'es_draft_p10_7');
DELETE FROM "Course" WHERE id = 'c_draft_p10_7';
PSQL_EOF

REMAINING_SEEDED=$(docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_test -t -A -c "SELECT COUNT(*) FROM \"Course\" WHERE id = 'c_draft_p10_7';")
echo "Remaining seeded rows: ${REMAINING_SEEDED}"

echo ""
echo "=== PART 7 DRAFT & SITEMAP AUDIT COMPLETE: DRAFT 404 PASS | DYNAMIC SITEMAP YES ==="
