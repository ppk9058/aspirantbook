#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 10: REGRESSION AUDIT FOR COMMIT 77bbb33 & /profile ==="
echo "HEAD Commit: ${HEAD}"
echo "Pre-Fix Target: 8748475"
echo "Date: $(date -u)"
echo ""

echo "--- 10.1 Show Commit 77bbb33 Stat ---"
git show --stat 77bbb33

echo ""
echo "--- 10.2 Regression Check for /profile ---"
echo "1. Guest request to /profile (Redirect to /login with callbackUrl):"
curl -s -i "http://127.0.0.1:3045/profile" | head -n 10

echo ""
echo "2. Guest follow redirect to /login:"
curl -s -L -i -o /dev/null -w "FINAL_URL: %{url_effective} | HTTP_CODE: %{http_code}\n" "http://127.0.0.1:3045/profile"

echo ""
echo "3. Logged-in User Missing in DB (Handled gracefully, redirects to /login safely without loop):"
npx ts-node --compiler-options '{"module":"commonjs"}' << 'EOF'
const { chromium } = require("playwright");
const { encode } = require("next-auth/jwt");

const REAL_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || (() => { throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required"); })();

async function run() {
  const missingUserToken = await encode({
    token: { id: "u_non_existent_in_db_xyz", role: "FREE", email: "non_existent@test.local", name: "Ghost User" },
    secret: REAL_SECRET,
    salt: "authjs.session-token",
  });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addCookies([{ name: "authjs.session-token", value: missingUserToken, domain: "127.0.0.1", path: "/" }]);
  const page = await context.newPage();

  console.log("Requesting /profile with token for non-existent user in DB...");
  const res = await page.goto("http://127.0.0.1:3045/profile", { waitUntil: "domcontentloaded" });
  console.log(`Final URL: ${page.url()} | Response Status: ${res.status()}`);
  const pageContent = await page.content();
  const hasUserNotFound = pageContent.includes("User Account Not Found") || pageContent.includes("Sign Out & Log In Again");
  console.log(`Handled gracefully with account resolution state without crash: ${hasUserNotFound ? "PASS" : "FAIL"}`);

  await browser.close();
}
run().catch(console.error);
EOF

echo ""
echo "=== PART 10 AUDIT COMPLETE ==="
