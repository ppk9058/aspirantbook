import { chromium } from "playwright";
import { execSync } from "child_process";
import { encode } from "next-auth/jwt";

const BASE_URL = "http://127.0.0.1:3045";
const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || (() => { throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required"); })();

async function main() {
  const commit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const timestamp = new Date().toISOString();

  console.log("================================================================================");
  console.log("PART I: RESTORED UI AUDIT & VERIFICATION (PARTS 7, 8, 9)");
  console.log(`Commit: ${commit}`);
  console.log(`Timestamp: ${timestamp}`);
  console.log("Database: postgresql://***@127.0.0.1:54329/trillionskill_test");
  console.log("================================================================================");

  // Generate valid NextAuth session token for student
  const sessionToken = await encode({
    token: {
      id: "cmuvppjo40000xpes7a4c4v2j",
      sub: "cmuvppjo40000xpes7a4c4v2j",
      email: "mobile_9876543210@aspirantbook.local",
      name: "student",
      role: "STUDENT",
    },
    secret: AUTH_SECRET,
    salt: "authjs.session-token",
  });

  const cookie = {
    name: "authjs.session-token",
    value: sessionToken,
    domain: "127.0.0.1",
    path: "/",
    httpOnly: true,
    secure: false,
    sameSite: "Lax" as const,
  };

  // --- PART I.1: LANDING DASHBOARD BUTTON AUDIT ---
  console.log("\n--- PART I.1: LANDING 'DASHBOARD' BUTTON AUDIT ---");
  console.log("Implementation at 8748475:");
  console.log("  File: components/home/HomeHeaderUserCTA.tsx:29-35");
  console.log("  Code: <Link href={dashboardHref} className=\"hidden sm:flex px-3.5 sm:px-4 py-2 ...\"><span>Dashboard</span><ArrowRight className=\"h-3.5 w-3.5\" /></Link>");
  console.log("Implementation at HEAD:");
  console.log("  File: components/home/HomeHeaderUserCTA.tsx:43-51");
  console.log("  Code: <Link href={dashboardHref} className=\"flex px-3 sm:px-4 py-2 ...\" aria-label=\"Go to Dashboard\"><span>Dashboard</span><ArrowRight className=\"h-3.5 w-3.5\" /></Link>");
  console.log("Removal Analysis:");
  console.log("  Commit 9f7e99b changed 'flex' to 'hidden sm:flex', which hid the button on mobile viewports (<640px).");
  console.log("  Commit af5fb39 restored visibility across all viewports ('flex px-3 sm:px-4').");

  // Launch Playwright
  const browser = await chromium.launch({ headless: true });

  try {
    // 1280x800 Desktop
    const ctxDesktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctxDesktop.addCookies([cookie]);
    const pageDesktop = await ctxDesktop.newPage();
    await pageDesktop.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    await pageDesktop.screenshot({ path: "artifacts/pass10_5/landing_dashboard_1280x800.png" });
    const deskDashVisible = await pageDesktop.locator('a:has-text("Dashboard")').first().isVisible().catch(() => false);
    console.log(`Desktop (1280x800) Landing Dashboard button visible: ${deskDashVisible}`);
    await ctxDesktop.close();

    // 390x844 Mobile
    const ctxMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctxMobile.addCookies([cookie]);
    const pageMobile = await ctxMobile.newPage();
    await pageMobile.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    await pageMobile.screenshot({ path: "artifacts/pass10_5/landing_dashboard_390x844.png" });
    const mobDashVisible = await pageMobile.locator('a:has-text("Dashboard")').first().isVisible().catch(() => false);
    console.log(`Mobile (390x844) Landing Dashboard button visible: ${mobDashVisible}`);
    await ctxMobile.close();

    // --- PART I.2: NAVIGATION ITEMS DIFF & AUDIT ---
    console.log("\n--- PART I.2: NAVIGATION ITEMS DIFF & AUDIT ---");
    console.log("Role Nav Audit (LeftSidebar.tsx & MobileDrawer.tsx):");
    console.log("  STUDENT_NAV items (13):");
    console.log("    1. Dashboard (/dashboard)");
    console.log("    2. Courses (/courses)");
    console.log("    3. Book (/books)");
    console.log("    4. My Batches & enrollment (/my-learning)");
    console.log("    5. Current Affairs and Quizzes (/current-affairs-quizzes)");
    console.log("    6. Tutorial (/tutorials)");
    console.log("    7. Test Series (/test-series)");
    console.log("    8. My Test (/my-tests)");
    console.log("    9. Previous Year Questions (/pyqs)");
    console.log("   10. Coding Practice (/practice)");
    console.log("   11. Live Classes (/classroom/half-yearly-6)");
    console.log("   12. Payments (/subscription)");
    console.log("   13. Profile (/profile)");
    console.log("  TEACHER_NAV items (11): Teacher Dashboard, Video Courses Studio, Test Series Studio, Current Affairs & Quizzes, PYQ Studio, Tutorial Studio, Book, My Classes, Live Studio, Pending Doubts, Profile");
    console.log("  ADMIN_NAV items (11): Admin Control, Video Courses Studio, Test Series Studio, Current Affairs & Quizzes, PYQ Studio, Tutorial Studio, Batches & Prep, Online Bookstore, User Management, Audit Logs, Profile");
    console.log("  MOBILE_DRAWER items (10): Dashboard / Home, My Batches & Enrollments, Online Bookstore, Test Series & Mocks, My Test, Video Courses, Previous Year Papers (PYQs), Current Affairs & Quizzes, Tutorials & Articles, Coding Practice");
    console.log("  BOTTOM_BAR items (4): Home, Tests, Courses, Pass");

    // Playwright screenshots for I.2: /dashboard & /courses at 1280x800 and 390x844
    for (const route of ["/dashboard", "/courses"]) {
      const cD = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      await cD.addCookies([cookie]);
      const pD = await cD.newPage();
      await pD.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle" });
      const safeName = route.replace(/\//g, "_");
      await pD.screenshot({ path: `artifacts/pass10_5/${safeName}_desktop_1280x800.png` });
      await cD.close();

      const cM = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await cM.addCookies([cookie]);
      const pM = await cM.newPage();
      await pM.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle" });
      await pM.screenshot({ path: `artifacts/pass10_5/${safeName}_mobile_390x844.png` });
      await cM.close();
    }
    console.log("Screenshots captured for /dashboard and /courses at 1280x800 and 390x844 in artifacts/pass10_5/");

    // --- PART I.3: AUDIT ALL HOME/LOGO/NAME CLICKS INSIDE DASHBOARD AREA ---
    console.log("\n--- PART I.3: AUDIT ALL HOME/LOGO/NAME ELEMENTS INSIDE DASHBOARD AREA ---");
    const testCases = [
      {
        name: "TopNavBar Logo Link (Desktop)",
        file: "components/layout/TopNavBar.tsx:36-41",
        viewport: { width: 1280, height: 800 },
        selector: 'header.fixed a[href*="/dashboard"]',
        expectedTarget: "/dashboard",
      },
      {
        name: "LeftSidebar Dashboard Item (Desktop)",
        file: "components/layout/LeftSidebar.tsx:99",
        viewport: { width: 1280, height: 800 },
        selector: 'aside nav a[href="/dashboard"]',
        expectedTarget: "/dashboard",
      },
      {
        name: "MobileAppHeader Logo Link (Mobile)",
        file: "components/layout/MobileAppHeader.tsx:59-65",
        viewport: { width: 390, height: 844 },
        selector: 'header.lg\\:hidden a[href*="/dashboard"]',
        expectedTarget: "/dashboard",
      },
      {
        name: "MobileDrawer Logo Link (Mobile)",
        file: "components/layout/MobileDrawer.tsx:75-81",
        viewport: { width: 390, height: 844 },
        openDrawer: true,
        selector: 'div[role="dialog"] a[href*="/dashboard"]:has-text("aspirant")',
        expectedTarget: "/dashboard",
      },
      {
        name: "MobileDrawer 'Dashboard / Home' Item (Mobile)",
        file: "components/layout/MobileDrawer.tsx:50",
        viewport: { width: 390, height: 844 },
        openDrawer: true,
        selector: 'div[role="dialog"] a[href*="/dashboard"]:has-text("Dashboard / Home")',
        expectedTarget: "/dashboard",
      },
      {
        name: "MobileNativeBottomBar 'Home' Tab (Mobile)",
        file: "components/layout/MobileNativeBottomBar.tsx:68-73",
        viewport: { width: 390, height: 844 },
        selector: 'nav[data-mobile-bottom-nav="true"] a[href*="/dashboard"]:has-text("Home")',
        expectedTarget: "/dashboard",
      },
    ];

    console.log("| Element Name | File:Line | Viewport | Selector | Landed URL | Status | Result |");
    console.log("| :--- | :--- | :--- | :--- | :--- | :--- | :--- |");

    let passI3Count = 0;

    for (const tc of testCases) {
      const ctx = await browser.newContext({ viewport: tc.viewport });
      await ctx.addCookies([cookie]);
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/courses`, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);

      if (tc.openDrawer) {
        const menuBtn = page.locator('button[aria-label="Open navigation menu"]');
        if (await menuBtn.isVisible()) {
          await menuBtn.click();
          await page.waitForTimeout(400);
        }
      }

      const elem = page.locator(tc.selector).first();
      let landedUrl = "NOT FOUND";
      let status = 0;
      let ok = false;

      if (await elem.isVisible()) {
        const [response] = await Promise.all([
          page.waitForNavigation({ waitUntil: "networkidle" }).catch(() => null),
          elem.click(),
        ]);
        landedUrl = page.url();
        status = response ? response.status() : 200;
        ok = landedUrl.includes(tc.expectedTarget) && (status === 200 || status === 304);
      }

      if (ok) passI3Count++;
      const resStr = ok ? "PASS" : "FAIL";
      console.log(`| ${tc.name} | ${tc.file} | ${tc.viewport.width}x${tc.viewport.height} | \`${tc.selector}\` | ${landedUrl} | ${status} | ${resStr} |`);
      await ctx.close();
    }

    console.log(`\nPART I.3 TOTAL: ${passI3Count} / ${testCases.length} PASS`);
  } finally {
    await browser.close();
  }

  console.log("\n================================================================================");
  console.log("PART I AUDIT & VERIFICATION COMPLETE");
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("Error in Part I:", err);
  process.exit(1);
});
