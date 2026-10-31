#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 1: LANDING DASHBOARD BUTTON ON MOBILE AUDIT ==="
echo "Commit: ${HEAD}"
echo "Date: $(date -u)"
echo "Base URL: http://127.0.0.1:3045"
echo ""

echo "--- 1.1 Changed Lines Inspection (git diff) ---"
echo "Showing HomeHeaderUserCTA.tsx diff where hidden sm:flex was removed:"
git show HEAD:components/home/HomeHeaderUserCTA.tsx | grep -n -C 5 "aria-label=\"Go to Dashboard\""

echo ""
echo "--- 1.2 Playwright Run: Logged-in User at 390x844 & 1280x800 ---"
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

  // 1. Mobile (390x844) - Logged In
  const mobContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  await mobContext.addCookies([{ name: "authjs.session-token", value: token, domain: "127.0.0.1", path: "/" }]);
  const mobPage = await mobContext.newPage();
  await mobPage.goto("http://127.0.0.1:3045/", { waitUntil: "domcontentloaded" });
  
  const mobDashBtn = mobPage.locator('a[aria-label="Go to Dashboard"]');
  const mobVisible = await mobDashBtn.isVisible();
  const mobHref = await mobDashBtn.getAttribute("href");
  console.log(`[LOGGED-IN MOBILE 390x844] Dashboard Button Visible: ${mobVisible} | Href: ${mobHref}`);
  await mobDashBtn.click();
  await mobPage.waitForTimeout(500);
  console.log(`[LOGGED-IN MOBILE 390x844] URL after click: ${mobPage.url()}`);
  await mobContext.close();

  // 2. Desktop (1280x800) - Logged In
  const deskContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await deskContext.addCookies([{ name: "authjs.session-token", value: token, domain: "127.0.0.1", path: "/" }]);
  const deskPage = await deskContext.newPage();
  await deskPage.goto("http://127.0.0.1:3045/", { waitUntil: "domcontentloaded" });

  const deskDashBtn = deskPage.locator('a[aria-label="Go to Dashboard"]');
  const deskVisible = await deskDashBtn.isVisible();
  const deskHref = await deskDashBtn.getAttribute("href");
  console.log(`[LOGGED-IN DESKTOP 1280x800] Dashboard Button Visible: ${deskVisible} | Href: ${deskHref}`);
  await deskDashBtn.click();
  await deskPage.waitForTimeout(500);
  console.log(`[LOGGED-IN DESKTOP 1280x800] URL after click: ${deskPage.url()}`);
  await deskContext.close();

  // 3. Guest (Mobile & Desktop)
  const guestMobContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const guestMobPage = await guestMobContext.newPage();
  await guestMobPage.goto("http://127.0.0.1:3045/", { waitUntil: "domcontentloaded" });
  const guestMobDash = await guestMobPage.locator('a[aria-label="Go to Dashboard"]').count();
  const guestMobLogin = await guestMobPage.locator('a[href="/login"]').count();
  console.log(`[GUEST MOBILE 390x844] Dashboard Button Count: ${guestMobDash} | Login Button Count: ${guestMobLogin}`);
  await guestMobContext.close();

  const guestDeskContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const guestDeskPage = await guestDeskContext.newPage();
  await guestDeskPage.goto("http://127.0.0.1:3045/", { waitUntil: "domcontentloaded" });
  const guestDeskDash = await guestDeskPage.locator('a[aria-label="Go to Dashboard"]').count();
  const guestDeskLogin = await guestDeskPage.locator('a[href="/login"]').count();
  console.log(`[GUEST DESKTOP 1280x800] Dashboard Button Count: ${guestDeskDash} | Login Button Count: ${guestDeskLogin}`);
  await guestDeskContext.close();

  await browser.close();
}
run().catch(console.error);
EOF

echo ""
echo "=== PART 1 VERIFICATION COMPLETE ==="
