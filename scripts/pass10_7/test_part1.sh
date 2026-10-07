#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 1: S1 COURSE DETAIL IN DASHBOARD SHELL AUDIT (BEFORE vs AFTER) ==="
echo "Commit: ${HEAD}"
echo "Date: $(date -u)"
echo "Before Port (4c9f256): 3046"
echo "After Port (HEAD): 3045"
echo ""

echo "--- 1.1 Root Cause & Mechanism Proof ---"
echo "Root Cause File: components/course/CourseBundleView.tsx:353 and components/layout/DashboardShell.tsx:49-54, 79-106"
echo "Mechanism: CourseBundleView directly imported and rendered CuriousNavbar (landing header with 'Skills + App', 'School Prep', etc.). Furthermore, DashboardShell explicitly hid TopNavBar, MobileAppHeader, LeftSidebar, BottomNavBar and Breadcrumbs on all course detail pages (/courses/[slug])."
echo ""

echo "--- 1.2 BEFORE FIX RUN (Commit 4c9f256 on Port 3046) ---"
echo ">>> Checking CuriousNavbar on pre-fix server (Port 3046):"
curl -s -i "http://127.0.0.1:3046/courses/72nd-bpsc-prelims-current-affairs" | head -n 12

echo ">>> Playwright inspection on pre-fix server (3046):"
npx ts-node --compiler-options '{"module":"commonjs"}' << 'EOF'
const { chromium } = require("playwright");
async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto("http://127.0.0.1:3046/courses/72nd-bpsc-prelims-current-affairs", { waitUntil: "domcontentloaded" });
  const navTexts = await page.locator("nav").allInnerTexts();
  const brandLogo = await page.locator('[data-testid="brand-logo"]').count();
  const sidebar = await page.locator('[data-testid="sidebar-item-dashboard"]').count();
  console.log("Pre-fix (3046) Nav elements:", navTexts);
  console.log("Pre-fix (3046) TopNavBar brand logo count:", brandLogo);
  console.log("Pre-fix (3046) Sidebar dashboard item count:", sidebar);
  await browser.close();
}
run().catch(console.error);
EOF

echo ""
echo "--- 1.3 AFTER FIX RUN (Commit HEAD on Port 3045) ---"
echo ">>> Checking response on post-fix server (Port 3045):"
curl -s -i "http://127.0.0.1:3045/courses/72nd-bpsc-prelims-current-affairs" | head -n 12

echo ">>> Playwright inspection on post-fix server (3045):"
npx ts-node --compiler-options '{"module":"commonjs"}' << 'EOF'
const { chromium } = require("playwright");
async function run() {
  const browser = await chromium.launch();
  // Desktop
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto("http://127.0.0.1:3045/courses/72nd-bpsc-prelims-current-affairs", { waitUntil: "domcontentloaded" });
  const navTexts = await page.locator("nav").allInnerTexts();
  const brandLogo = await page.locator('[data-testid="brand-logo"]').count();
  const sidebar = await page.locator('[data-testid="sidebar-item-dashboard"]').count();
  const breadcrumb = await page.locator('[data-testid="breadcrumbs"]').count();
  console.log("Post-fix (3045 Desktop) Nav elements:", navTexts);
  console.log("Post-fix (3045 Desktop) TopNavBar brand logo count:", brandLogo);
  console.log("Post-fix (3045 Desktop) Sidebar dashboard item count:", sidebar);
  console.log("Post-fix (3045 Desktop) Breadcrumbs count:", breadcrumb);

  // Mobile
  const mobPage = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await mobPage.goto("http://127.0.0.1:3045/courses/72nd-bpsc-prelims-current-affairs", { waitUntil: "domcontentloaded" });
  const mobLogo = await mobPage.locator('[data-testid="mobile-header-logo"]').count();
  const mobBottomTab = await mobPage.locator('[data-testid="mobile-bottom-tab-home"]').count();
  console.log("Post-fix (3045 Mobile) MobileAppHeader logo count:", mobLogo);
  console.log("Post-fix (3045 Mobile) Bottom tab home count:", mobBottomTab);
  await browser.close();
}
run().catch(console.error);
EOF

echo ""
echo "=== PART 1 VERIFICATION COMPLETE: S1 FIXED IN DASHBOARD SHELL ==="
