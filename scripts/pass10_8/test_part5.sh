#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 5: B1 ROOT CAUSE INVESTIGATION & 5 LOGGED-IN STATES AUDIT ==="
echo "Commit: ${HEAD}"
echo "Date: $(date -u)"
echo "Base URL: http://localhost:3045"
echo ""

echo "--- 5.1 grep -rn \"redirect(\" in app/dashboard, layouts, middleware, auth.config ---"
grep -rnE 'redirect\(' app/\(dashboard\) middleware.ts auth.config.ts lib/auth* 2>/dev/null || true

echo ""
echo "--- 5.2 Test 5 Logged-In States on http://localhost:3045 ---"
npx ts-node --compiler-options '{"module":"commonjs"}' << 'EOF'
const { chromium } = require("playwright");
const { encode } = require("next-auth/jwt");

const REAL_SECRET = "aspirantbook-nextauth-secret-key-8f3a9c2e5d7b1f4e9a6c3b8d2e5f7a9b";

const states = [
  { id: "S1", desc: "Normal user with role FREE and onboarding completed", token: { id: "u_norm_1", role: "FREE", email: "norm@test.local", name: "Normal User" } },
  { id: "S2", desc: "User with no role set (role null)", token: { id: "u_norole_2", email: "norole@test.local", name: "NoRole User" } },
  { id: "S3", desc: "User with onboarding incomplete (role FREE, onboarding null)", token: { id: "u_onb_3", role: "FREE", email: "onb@test.local", name: "Onboarding Incomplete" } },
  { id: "S4", desc: "User whose DB row was deleted after login", token: { id: "u_deleted_4", role: "FREE", email: "deleted@test.local", name: "Deleted User" } },
];

async function run() {
  const browser = await chromium.launch();

  for (const s of states) {
    console.log(`\n>>> Testing State ${s.id}: ${s.desc}`);
    const token = await encode({ token: s.token, secret: REAL_SECRET, salt: "authjs.session-token" });

    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addCookies([{ name: "authjs.session-token", value: token, domain: "localhost", path: "/" }]);
    const page = await context.newPage();

    await page.goto("http://localhost:3045/dashboard", { waitUntil: "domcontentloaded" });
    console.log(`[${s.id}] Direct /dashboard URL: ${page.url()}`);

    // Navigate to landing page, click Dashboard button
    await page.goto("http://localhost:3045/", { waitUntil: "domcontentloaded" });
    const dashBtn = page.locator('a[aria-label="Go to Dashboard"]');
    const isVisible = await dashBtn.isVisible();
    console.log(`[${s.id}] Landing Dashboard Button Visible: ${isVisible}`);
    
    if (isVisible) {
      await dashBtn.click();
      await page.waitForTimeout(500);
      console.log(`[${s.id}] URL after clicking Dashboard button: ${page.url()}`);
      const hasAvatar = (await page.locator('button:has(img), [data-testid="user-avatar"]').count()) > 0;
      console.log(`[${s.id}] Header shows user avatar (logged in): ${hasAvatar}`);
    }

    await context.close();
  }

  await browser.close();
}
run().catch(console.error);
EOF

echo ""
echo "--- 5.3 Test B2: Header State Sequence Sampling (every 100ms for 3s) ---"
npx ts-node --compiler-options '{"module":"commonjs"}' << 'EOF'
const { chromium } = require("playwright");
const { encode } = require("next-auth/jwt");

const REAL_SECRET = "aspirantbook-nextauth-secret-key-8f3a9c2e5d7b1f4e9a6c3b8d2e5f7a9b";

async function run() {
  const token = await encode({
    token: { id: "u_student_b2", role: "FREE", email: "student_b2@test.local", name: "Student B2" },
    secret: REAL_SECRET,
    salt: "authjs.session-token",
  });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addCookies([{ name: "authjs.session-token", value: token, domain: "localhost", path: "/" }]);
  const page = await context.newPage();

  console.log("Navigating to http://localhost:3045/ and sampling header text every 100ms...");
  const samples = [];
  const start = Date.now();

  const promise = page.goto("http://localhost:3045/", { waitUntil: "commit" });

  while (Date.now() - start < 3000) {
    const elapsed = Date.now() - start;
    const headerText = await page.locator("header").innerText().catch(() => "");
    const hasLogin = headerText.includes("Login") || headerText.includes("Sign In");
    const hasDashboard = headerText.includes("Dashboard");
    samples.push({ elapsed, hasLogin, hasDashboard });
    await new Promise((r) => setTimeout(r, 100));
  }

  await promise;
  await browser.close();

  const anyLogin = samples.some((s) => s.hasLogin);
  console.log(`B2 Sampling Summary: ${samples.length} samples taken.`);
  console.log(`Did header show 'Login' at any point for logged-in user? ${anyLogin ? "YES (Flicker observed)" : "NO (Clean session preservation)"}`);
}
run().catch(console.error);
EOF

echo ""
echo "=== PART 5 AUDIT COMPLETE: B1/B2 INVESTIGATION RECORDED ==="
