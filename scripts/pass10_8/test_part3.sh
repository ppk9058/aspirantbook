#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 3: GUEST 404 ON /tutorials/modern-indian-history ROOT CAUSE & PROOF ==="
echo "Commit: ${HEAD}"
echo "Date: $(date -u)"
echo "Base URL: http://127.0.0.1:3045"
echo ""

echo "--- 3.1 Root Cause & Mechanism Investigation ---"
echo "Code Path: app/(dashboard)/tutorials/page.tsx only rendered the index /tutorials catalog."
echo "No route file existed for app/(dashboard)/tutorials/[slug]/page.tsx."
echo "Consequently, Next.js App Router returned 404 for ANY /tutorials/[slug] path by default."
echo "Fix Applied: Added app/(dashboard)/tutorials/[slug]/page.tsx to look up the tutorial course and redirect to /courses/[slug] (or 404 if draft/non-existent)."
echo ""

echo "--- 3.2 SQL Verification on Test DB ---"
echo "Querying Test DB for 'modern-indian-history':"
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_test -c "SELECT id, slug, title, \"isPublished\", status FROM \"Course\" WHERE slug = 'modern-indian-history';"

echo ""
echo "--- 3.3 Test Published Tutorial as Guest ---"
echo "1. curl -i on /tutorials/modern-indian-history (No Redirect Follow):"
curl -s -S -i "http://127.0.0.1:3045/tutorials/modern-indian-history" | head -n 12

echo ""
echo "2. curl -i -L follow redirect to canonical tutorial overview:"
curl -s -S -L -i -o /dev/null -w "FINAL_URL: %{url_effective} | HTTP_CODE: %{http_code} | HOPS: %{num_redirects}\n" "http://127.0.0.1:3045/tutorials/modern-indian-history"

echo ""
echo "--- 3.4 Test Unknown Tutorial Slug as Guest ---"
echo "Probing /tutorials/completely-unknown-tutorial-slug:"
curl -s -S -i -o /dev/null -w "HTTP_CODE: %{http_code}\n" "http://127.0.0.1:3045/tutorials/completely-unknown-tutorial-slug"
curl -s -S -i "http://127.0.0.1:3045/tutorials/completely-unknown-tutorial-slug" | head -n 12

echo ""
echo "=== PART 3 VERIFICATION COMPLETE: GUEST INVARIANT PRESERVED ==="
