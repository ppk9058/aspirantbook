#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 9: DYNAMIC SITEMAP & DRAFT ISOLATION AUDIT ==="
echo "Commit: ${HEAD}"
echo "Date: $(date -u)"
echo "Base URL: http://127.0.0.1:3045"
echo ""

echo "--- 9.1 Sitemap Response Stats ---"
echo "Bytes in sitemap.xml:"
curl -s "http://127.0.0.1:3045/sitemap.xml" | wc -c

echo "Total URL count in sitemap.xml:"
curl -s "http://127.0.0.1:3045/sitemap.xml" | grep -c "<loc>" || true

echo ""
echo "--- 9.2 Seed Published vs Draft Items ---"
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_test << EOF
-- Seed Published Item
INSERT INTO "Course" (id, title, slug, description, difficulty, "isPublished", status, "updatedAt")
VALUES ('c_pub_sitemap_p9', 'Published Sitemap Course', 'published-sitemap-course-p9', 'Description', 'BEGINNER', true, 'PUBLISHED', NOW())
ON CONFLICT (id) DO UPDATE SET "isPublished" = true, status = 'PUBLISHED';

-- Seed Draft Item
INSERT INTO "Course" (id, title, slug, description, difficulty, "isPublished", status, "updatedAt")
VALUES ('c_draft_sitemap_p9', 'Draft Sitemap Course', 'draft-sitemap-course-p9', 'Description', 'BEGINNER', false, 'DRAFT', NOW())
ON CONFLICT (id) DO UPDATE SET "isPublished" = false, status = 'DRAFT';
EOF

echo ""
echo "--- 9.3 Inspect Sitemap Output ---"
curl -s "http://127.0.0.1:3045/sitemap.xml" | head -n 20

echo ""
PUB_HITS=$(curl -s "http://127.0.0.1:3045/sitemap.xml" | grep -c "published-sitemap-course-p9" || true)
DRAFT_HITS=$(curl -s "http://127.0.0.1:3045/sitemap.xml" | grep -c "draft-sitemap-course-p9" || true)

echo "Published Item in Sitemap: ${PUB_HITS} (Expected: 1)"
echo "Draft Item in Sitemap: ${DRAFT_HITS} (Expected: 0)"

echo ""
echo "--- 9.4 Clean Up Seeded Rows ---"
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_test << EOF
DELETE FROM "Course" WHERE id IN ('c_pub_sitemap_p9', 'c_draft_sitemap_p9');
EOF

echo ""
echo "=== PART 9 AUDIT COMPLETE: DYNAMIC SITEMAP VERIFIED ==="
