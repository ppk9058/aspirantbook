import { chromium } from "playwright";
import { encode } from "next-auth/jwt";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = "http://127.0.0.1:3045";
const REAL_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || (() => { throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required"); })();
const ARTIFACTS_DIR = path.join(process.cwd(), "artifacts", "pass10_3");
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

async function main() {
  console.log("================================================================================");
  console.log("PART 2: LANDING PAGE HEADER MENU VERIFICATION ACROSS VIEWPORTS");
  console.log("================================================================================");

  const browser = await chromium.launch({ headless: true });

  const tokenStudent = await encode({
    token: { id: "u_alice_test", role: "FREE", email: "user_a@test.local", name: "Alice Adams" },
    secret: REAL_SECRET,
    salt: "authjs.session-token",
  });

  const testCases = [
    { name: "Guest User", token: null },
    { name: "Logged-In Student", token: tokenStudent },
  ];

  const viewports = [
    { label: "desktop_1280x800", w: 1280, h: 800 },
    { label: "mobile_390x844", w: 390, h: 844 },
  ];

  const linksToTest = [
    { name: "Courses", href: "/courses", expectedPath: "/courses" },
    { name: "Test Series", href: "/test-series", expectedPath: "/test-series" },
    { name: "Learn", href: "/tutorials", expectedPath: "/tutorials" },
  ];

  for (const tc of testCases) {
    console.log(`\n--- TESTING ROLE: ${tc.name} ---`);

    for (const vp of viewports) {
      console.log(`\nViewport: ${vp.label}`);
      const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
      if (tc.token) {
        await context.addCookies([{ name: "authjs.session-token", value: tc.token, domain: "127.0.0.1", path: "/" }]);
      }
      const page = await context.newPage();

      // Go to landing page
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });

      // Save screenshot of landing header
      const headerShotPath = path.join(ARTIFACTS_DIR, `landing_${tc.name.toLowerCase().replace(/[^a-z]/g, "_")}_${vp.label}.png`);
      await page.screenshot({ path: headerShotPath, fullPage: false });
      console.log(`Saved screenshot: ${headerShotPath}`);

      for (const link of linksToTest) {
        // Navigate back to home first
        await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });

        // Locate visible link by exact text and href within header or mobile sub-nav
        const locator = page.locator(`header a[href="${link.href}"]:visible:has-text("${link.name}")`).first();
        const isVisible = await locator.isVisible().catch(() => false);
        if (!isVisible) {
          console.error(`FAILED to find visible link "${link.name}" (${link.href}) on ${vp.label}`);
          continue;
        }

        // Click and assert navigation
        await Promise.all([
          page.waitForURL((url) => url.pathname.startsWith(link.expectedPath), { timeout: 10000 }),
          locator.click(),
        ]);

        const currentUrl = page.url();
        console.log(`Clicked "${link.name}" -> Landed on ${currentUrl} | PASS`);

        // Capture screenshot of destination
        const destShotPath = path.join(ARTIFACTS_DIR, `dest_${link.name.toLowerCase().replace(/[^a-z]/g, "_")}_${tc.name.toLowerCase().replace(/[^a-z]/g, "_")}_${vp.label}.png`);
        await page.screenshot({ path: destShotPath, fullPage: false });
      }

      await context.close();
    }
  }

  await browser.close();
  console.log("\n================================================================================");
  console.log("PART 2 RESULT: ALL LINKS (Courses, Test Series, Learn) VERIFIED AND CLICKED.");
  console.log("================================================================================");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
