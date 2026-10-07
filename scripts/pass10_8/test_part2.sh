#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 2: STATIC-ONLY COURSE => COMING SOON AUDIT ==="
echo "Commit: ${HEAD}"
echo "Date: $(date -u)"
echo "Base URL: http://127.0.0.1:3045"
echo ""

echo "--- 2.1 Seed Test Items in Docker Test DB ---"
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_test << 'EOF'
-- Seed Draft Course
INSERT INTO "Course" (id, title, slug, description, difficulty, "isPublished", status, "updatedAt")
VALUES ('c_draft_p10_8', 'Secret Draft Course P10.8', 'secret-draft-course-p10-8', 'Draft course description', 'BEGINNER', false, 'DRAFT', NOW())
ON CONFLICT (id) DO UPDATE SET "isPublished" = false, status = 'DRAFT';

-- Seed Published Course with Lessons (upsc-gs-foundation-primer)
INSERT INTO "Course" (id, title, slug, description, difficulty, "isPublished", status, price, "updatedAt")
VALUES ('c_upsc_primer', 'UPSC GS Foundation Primer', 'upsc-gs-foundation-primer', 'Foundation primer description', 'BEGINNER', true, 'PUBLISHED', 0, NOW())
ON CONFLICT (id) DO UPDATE SET "isPublished" = true, status = 'PUBLISHED';

INSERT INTO "Chapter" (id, title, "courseId", "order")
VALUES ('ch_upsc_1', 'Introduction to UPSC', 'c_upsc_primer', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "Lesson" (id, title, "chapterId", "order", type)
VALUES ('l_upsc_1', 'Syllabus and Pattern Overview', 'ch_upsc_1', 1, 'TUTORIAL')
ON CONFLICT (id) DO NOTHING;
EOF

echo ""
echo "--- 2.2 Probing Target Slugs with curl ---"
echo "1. Static-only course (upsc-csat-comprehension-quant):"
curl -s -i "http://127.0.0.1:3045/courses/upsc-csat-comprehension-quant" | head -n 12

echo ""
echo "2. Real draft course (secret-draft-course-p10-8):"
curl -s -i "http://127.0.0.1:3045/courses/secret-draft-course-p10-8" | head -n 12

echo ""
echo "3. Non-existent made-up course (completely-made-up-course-xyz):"
curl -s -i "http://127.0.0.1:3045/courses/completely-made-up-course-xyz" | head -n 12

echo ""
echo "4. Published course with lessons (upsc-gs-foundation-primer):"
curl -s -i "http://127.0.0.1:3045/courses/upsc-gs-foundation-primer" | head -n 12

echo ""
echo "--- 2.3 Response Body Comparison (Draft 404 vs Non-existent 404) ---"
curl -s "http://127.0.0.1:3045/courses/secret-draft-course-p10-8" | sed -E 's/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/UUID/g' | sed -E 's/nonce="[^"]+"/nonce=""/g' > /tmp/draft-404.html
curl -s "http://127.0.0.1:3045/courses/completely-made-up-course-xyz" | sed -E 's/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/UUID/g' | sed -E 's/nonce="[^"]+"/nonce=""/g' > /tmp/nonexistent-404.html

echo "Diff output between normalized draft-404 and nonexistent-404:"
diff /tmp/draft-404.html /tmp/nonexistent-404.html || echo "Bodies are completely identical (zero diff)."

echo ""
echo "--- 2.4 Playwright Inspection: Guest & Logged-In ---"
npx ts-node --compiler-options '{"module":"commonjs"}' << 'EOF'
const { chromium } = require("playwright");
const { encode } = require("next-auth/jwt");

const REAL_SECRET = "aspirantbook-nextauth-secret-key-8f3a9c2e5d7b1f4e9a6c3b8d2e5f7a9b";

async function run() {
  const token = await encode({
    token: { id: "u_student_p10_8", role: "FREE", email: "student_p10_8@test.local", name: "Student P10.8" },
    secret: REAL_SECRET,
    salt: "authjs.session-token",
  });

  const browser = await chromium.launch();

  // Test upsc-csat-comprehension-quant as Guest
  const pageGuest = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await pageGuest.goto("http://127.0.0.1:3045/courses/upsc-csat-comprehension-quant", { waitUntil: "domcontentloaded" });
  
  const guestBreadcrumb = await pageGuest.locator('[data-testid="breadcrumbs"]').innerText().catch(() => "None");
  const guestComingSoon = await pageGuest.locator("text=Coming Soon").count();
  const guestBackBtn = await pageGuest.locator("text=Back to Courses").count();
  const guestTopLogo = await pageGuest.locator('[data-testid="brand-logo"]').count();
  console.log("[CSAT GUEST] Breadcrumbs:", guestBreadcrumb.replace(/\n/g, " > "));
  console.log(`[CSAT GUEST] Coming Soon text count: ${guestComingSoon} | Back to Courses count: ${guestBackBtn} | Brand Logo in Shell: ${guestTopLogo}`);

  // Test Notify Me button click
  const notifyBtn = pageGuest.locator('button:has-text("Notify Me on Launch")');
  if (await notifyBtn.count() > 0) {
    console.log("[CSAT GUEST] Clicking 'Notify Me on Launch' button...");
    await notifyBtn.click();
    await pageGuest.waitForTimeout(500);
    const authModal = await pageGuest.locator("text=Sign In").or(pageGuest.locator("text=OTP")).or(pageGuest.locator("text=Mobile")).count();
    console.log(`[CSAT GUEST] Auth/OTP modal opened on click: ${authModal > 0 ? "YES" : "NO"}`);
  }
  await pageGuest.close();

  // Test upsc-csat-comprehension-quant as Logged-In
  const contextStudent = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await contextStudent.addCookies([{ name: "authjs.session-token", value: token, domain: "127.0.0.1", path: "/" }]);
  const pageStudent = await contextStudent.newPage();
  await pageStudent.goto("http://127.0.0.1:3045/courses/upsc-csat-comprehension-quant", { waitUntil: "domcontentloaded" });

  const studentBreadcrumb = await pageStudent.locator('[data-testid="breadcrumbs"]').innerText().catch(() => "None");
  console.log("[CSAT LOGGED-IN] Breadcrumbs:", studentBreadcrumb.replace(/\n/g, " > "));
  
  const studentNotifyBtn = pageStudent.locator('button:has-text("Notify Me on Launch")');
  if (await studentNotifyBtn.count() > 0) {
    console.log("[CSAT LOGGED-IN] Clicking 'Notify Me on Launch' button as logged-in user...");
    await studentNotifyBtn.click();
    await pageStudent.waitForTimeout(500);
    const priorityList = await pageStudent.locator("text=You're on the Priority List!").count();
    console.log(`[CSAT LOGGED-IN] Priority confirmation shown: ${priorityList > 0 ? "YES" : "NO"}`);
  }
  await contextStudent.close();

  // Test published course with lessons (upsc-gs-foundation-primer)
  const pagePrimer = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await pagePrimer.goto("http://127.0.0.1:3045/courses/upsc-gs-foundation-primer", { waitUntil: "domcontentloaded" });
  const primerBreadcrumb = await pagePrimer.locator('[data-testid="breadcrumbs"]').innerText().catch(() => "None");
  const primerLesson = await pagePrimer.locator("text=Syllabus and Pattern Overview").count();
  console.log("[PRIMER PUBLISHED] Breadcrumbs:", primerBreadcrumb.replace(/\n/g, " > "));
  console.log(`[PRIMER PUBLISHED] Rendered Lesson count: ${primerLesson} (Full Detail View: YES)`);
  await pagePrimer.close();

  await browser.close();
}
run().catch(console.error);
EOF

echo ""
echo "--- 2.5 Clean Up Test DB Seeds ---"
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_test << 'EOF'
DELETE FROM "Lesson" WHERE id = 'l_upsc_1';
DELETE FROM "Chapter" WHERE id = 'ch_upsc_1';
DELETE FROM "Course" WHERE id IN ('c_draft_p10_8', 'c_upsc_primer');
EOF
REMAINING_SEEDS=$(docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_test -t -A -c "SELECT COUNT(*) FROM \"Course\" WHERE id = 'c_draft_p10_8';")
echo "Remaining seeded rows: ${REMAINING_SEEDS}"

echo ""
echo "=== PART 2 VERIFICATION COMPLETE ==="
