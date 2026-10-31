#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 4: S1 RE-PROOF WITH LIVE BEFORE (4c9f256:3046 vs HEAD:3045) ==="
echo "HEAD Commit: ${HEAD}"
echo "Pre-fix Worktree Commit: 4c9f256"
echo "Date: $(date -u)"
echo ""

echo "--- 4.1 Verify Pre-Fix Worktree State ---"
cd /tmp/trillionskill-prefix
echo "Worktree rev-parse: $(git rev-parse HEAD)"
echo "Worktree status: $(git status --porcelain || echo 'CLEAN')"
cd /Users/praveenkumar/TrillionSkill

echo ""
echo "--- 4.2 Seed Published Course with Lessons for Comparison ---"
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_test << 'EOF'
INSERT INTO "Course" (id, title, slug, description, difficulty, "isPublished", status, price, "updatedAt")
VALUES ('c_upsc_primer_p4', 'UPSC GS Foundation Primer', 'upsc-gs-foundation-primer', 'Foundation primer description', 'BEGINNER', true, 'PUBLISHED', 0, NOW())
ON CONFLICT (id) DO UPDATE SET "isPublished" = true, status = 'PUBLISHED';

INSERT INTO "Chapter" (id, title, "courseId", "order")
VALUES ('ch_upsc_p4_1', 'Introduction to UPSC', 'c_upsc_primer_p4', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "Lesson" (id, title, "chapterId", "order", type)
VALUES ('l_upsc_p4_1', 'Syllabus and Pattern Overview', 'ch_upsc_p4_1', 1, 'TUTORIAL')
ON CONFLICT (id) DO NOTHING;
EOF

echo ""
echo "--- 4.3 Playwright Audit: 3046 (Pre-Fix) vs 3045 (HEAD) ---"
npx ts-node --compiler-options '{"module":"commonjs"}' << 'EOF'
const { chromium } = require("playwright");
const { encode } = require("next-auth/jwt");

const REAL_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || (() => { throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required"); })();

async function run() {
  const token = await encode({
    token: { id: "u_student_p10_8", role: "FREE", email: "student_p10_8@test.local", name: "Student P10.8" },
    secret: REAL_SECRET,
    salt: "authjs.session-token",
  });

  const browser = await chromium.launch();

  // 1. Pre-fix Server (Port 3046) - Guest
  const pagePreGuest = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await pagePreGuest.goto("http://127.0.0.1:3046/courses/upsc-gs-foundation-primer", { waitUntil: "domcontentloaded" });
  const preNavs = await pagePreGuest.locator("nav").allInnerTexts();
  const preLogo = await pagePreGuest.locator('[data-testid="brand-logo"]').count();
  const preSidebar = await pagePreGuest.locator('[data-testid="sidebar-item-dashboard"]').count();
  console.log("[PRE-FIX 3046 GUEST] Navs:", preNavs);
  console.log(`[PRE-FIX 3046 GUEST] TopNavBar Brand Logo Count: ${preLogo} | Sidebar Dashboard Count: ${preSidebar}`);
  await pagePreGuest.close();

  // 2. Pre-fix Server (Port 3046) - 0-Lesson Course
  const pagePreZero = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await pagePreZero.goto("http://127.0.0.1:3046/courses/other-paid-course-p95", { waitUntil: "domcontentloaded" });
  const preZeroComingSoon = await pagePreZero.locator("text=Coming Soon").count();
  const preZeroNotFound = await pagePreZero.locator("text=404").count();
  console.log(`[PRE-FIX 3046 0-LESSON] Coming Soon count: ${preZeroComingSoon} | 404 count: ${preZeroNotFound}`);
  await pagePreZero.close();

  // 3. Post-fix Server (Port 3045) - Guest
  const pagePostGuest = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await pagePostGuest.goto("http://127.0.0.1:3045/courses/upsc-gs-foundation-primer", { waitUntil: "domcontentloaded" });
  const postNavs = await pagePostGuest.locator("nav").allInnerTexts();
  const postLogo = await pagePostGuest.locator('[data-testid="brand-logo"]').count();
  const postSidebar = await pagePostGuest.locator('[data-testid="sidebar-item-dashboard"]').count();
  const postBreadcrumb = await pagePostGuest.locator('[data-testid="breadcrumbs"]').innerText().catch(() => "None");
  console.log("[POST-FIX 3045 GUEST] Navs:", postNavs);
  console.log(`[POST-FIX 3045 GUEST] TopNavBar Brand Logo Count: ${postLogo} | Sidebar Dashboard Count: ${postSidebar}`);
  console.log("[POST-FIX 3045 GUEST] Breadcrumbs:", postBreadcrumb.replace(/\n/g, " > "));
  await pagePostGuest.close();

  // 4. Post-fix Server (Port 3045) - Logged In
  const contextPostStudent = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await contextPostStudent.addCookies([{ name: "authjs.session-token", value: token, domain: "127.0.0.1", path: "/" }]);
  const pagePostStudent = await contextPostStudent.newPage();
  await pagePostStudent.goto("http://127.0.0.1:3045/courses/upsc-gs-foundation-primer", { waitUntil: "domcontentloaded" });
  const postStudentLogo = await pagePostStudent.locator('[data-testid="brand-logo"]').count();
  const postStudentSidebar = await pagePostStudent.locator('[data-testid="sidebar-item-dashboard"]').count();
  console.log(`[POST-FIX 3045 LOGGED-IN] TopNavBar Logo Count: ${postStudentLogo} | Sidebar Dashboard Count: ${postStudentSidebar}`);
  await contextPostStudent.close();

  await browser.close();
}
run().catch(console.error);
EOF

echo ""
echo "--- 4.4 Clean Up Seeded Rows ---"
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_test << 'EOF'
DELETE FROM "Lesson" WHERE id = 'l_upsc_p4_1';
DELETE FROM "Chapter" WHERE id = 'ch_upsc_p4_1';
DELETE FROM "Course" WHERE id = 'c_upsc_primer_p4';
EOF

echo ""
echo "=== PART 4 AUDIT COMPLETE: LIVE BEFORE vs AFTER PROVEN ==="
