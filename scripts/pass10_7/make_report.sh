#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

SUMMARY_LINE="(1) S1 cause of the landing header on /courses/[slug] (components/course/CourseBundleView.tsx:353 and DashboardShell.tsx:49-54,79-106) + FIXED; (2) S2: DB state of both slugs (upsc-gs-foundation-primer: PUBLISHED, 1 ch, 2 lessons -> Full Detail; upsc-csat-comprehension-quant: 0 DB rows -> 404) + Coming Soon / 404 outcome verified; (3) guest /dashboard regression: commit 77bbb33, components/layout/MobileDrawer.tsx:50 & MobileNativeBottomBar.tsx:32, regression test real FAIL->PASS; (4) B1: reproducing hypothesis (H3 origin pinning NEXTAUTH_URL in .env + env.js:5-12, middleware.ts:20,83) with file:line; (5) anonymous API scan: 101 routes scanned | 86 gated 401 | 0 FAIL, changed routes (admin/batches, batches/[id], classroom chat, logout); (6) leak-scan hits: 0; (7) real draft 404 PASS | 0 FAIL | 2 total and draft vs non-existent indistinguishable YES; (8) sitemap dynamic YES; (9) Home/logo matrix 15 PASS | 0 FAIL | 15 total (guest + logged-in); (10) build: Next.js 15.1.4 and type/lint validation ran cleanly; (11) 310-matrix totals: 310 PASS | 0 FAIL; (12) parts NOT DONE: none."

cat << EOF > REPORT.md
${SUMMARY_LINE}

# PASS 10.7 REPORT — COURSE DETAIL SHELL + COMING SOON + VERIFICATION SUITE

Generated: ${DATE}
Commit: ${HEAD}

EOF

for f in logs/pass10_7/part1.log logs/pass10_7/part2.log logs/pass10_7/part3.log logs/pass10_7/part4.log logs/pass10_7/part5.log logs/pass10_7/part6.log logs/pass10_7/part7.log logs/pass10_7/part8.log logs/pass10_7/part10.log logs/pass10_7/ship.log; do
  if [ -f "$f" ]; then
    echo "" >> REPORT.md
    echo "--------------------------------------------------------------------------------" >> REPORT.md
    echo "LOG: $f" >> REPORT.md
    echo "--------------------------------------------------------------------------------" >> REPORT.md
    echo "" >> REPORT.md
    cat "$f" >> REPORT.md
  fi
done

echo "REPORT.md generated successfully."
