#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 6: DRAFT vs PUBLISHED CONTENT ISOLATION & SITEMAP ==="
echo "Commit: ${HEAD}"
echo "Date: $(date -u)"
echo "Base URL: http://127.0.0.1:3045"
echo ""

echo "--- 6.1 Seed Draft & Published Test Series in DB ---"
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_test << PSQL_EOF
-- Published Exam Series
INSERT INTO "ExamSeries" (id, title, slug, "examName", category, description, "isPublished", "createdById", "updatedAt")
VALUES ('es_pub_p10_6', 'Published BPSC Series P10', 'bpsc-pub-p10-6', 'BPSC Exam', 'Civil Services', '{"highlights":["High Quality Mocks"]}', true, 'cmuwan7yl0002xpupbxxn1rj0', NOW())
ON CONFLICT (id) DO UPDATE SET "isPublished" = true;

-- Draft Exam Series
INSERT INTO "ExamSeries" (id, title, slug, "examName", category, description, "isPublished", "createdById", "updatedAt")
VALUES ('es_draft_p10_6', 'Draft Private Series P10', 'bpsc-draft-p10-6', 'BPSC Exam', 'Civil Services', 'Draft description', false, 'cmuwan7yl0002xpupbxxn1rj0', NOW())
ON CONFLICT (id) DO UPDATE SET "isPublished" = false;
PSQL_EOF

echo "Test items seeded."
echo ""

echo "--- 6.2 Verify Direct DB Query on ExamSeries: isPublished Filtering ---"
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_test -c "SELECT id, slug, \"isPublished\" FROM \"ExamSeries\" WHERE id IN ('es_pub_p10_6', 'es_draft_p10_6');"

echo ""
echo "--- 6.3 Verify Static/Dynamic Series Detail Route ---"
echo "Requesting known published test series (/test-series/bpsc-72nd-2026):"
curl -s -S -i -o /dev/null -w "STATUS: %{http_code}\n" "http://127.0.0.1:3045/test-series/bpsc-72nd-2026"
curl -s -S -i "http://127.0.0.1:3045/test-series/bpsc-72nd-2026" | head -n 10 || true

echo ""
echo "--- 6.4 Verify Sitemap & Robots.txt ---"
echo ">>> Sitemap status & draft leak check:"
curl -s -S -i "http://127.0.0.1:3045/sitemap.xml" | head -n 15 || true
DRAFT_IN_SITEMAP=$(curl -s "http://127.0.0.1:3045/sitemap.xml" | grep -c "bpsc-draft-p10-6" || true)
echo "Draft URL count in sitemap: ${DRAFT_IN_SITEMAP}"

echo ""
echo ">>> Robots.txt status:"
curl -s -S -i "http://127.0.0.1:3045/robots.txt"

echo ""
echo "--- 6.5 Clean Up Seeded Items ---"
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_test << PSQL_EOF
DELETE FROM "ExamSeries" WHERE id IN ('es_pub_p10_6', 'es_draft_p10_6');
PSQL_EOF
echo "Cleanup completed."
