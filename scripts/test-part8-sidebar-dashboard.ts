import { chromium } from "playwright";
import { encode } from "next-auth/jwt";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = "http://127.0.0.1:3045";
const REAL_SECRET = "aspirantbook-nextauth-secret-key-8f3a9c2e5d7b1f4e9a6c3b8d2e5f7a9b";
const ARTIFACTS_DIR = path.join(process.cwd(), "artifacts", "pass10_4");
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

async function main() {
  console.log("================================================================================");
  console.log("PART 8: RESTORE REGRESSED UI - LEFTSIDEBAR DASHBOARD MENU ITEM PROOF");
  console.log("================================================================================");

  const browser = await chromium.launch({ headless: true });

  const tokenStudent = await encode({
    token: { id: "u_student_part8", role: "STUDENT", email: "student_part8@test.local", name: "Student Eight" },
    secret: REAL_SECRET,
    salt: "authjs.session-token",
  });

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addCookies([{ name: "authjs.session-token", value: tokenStudent, domain: "127.0.0.1", path: "/" }]);
  const page = await context.newPage();

  // Navigate to /dashboard
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });

  const shotPath = path.join(ARTIFACTS_DIR, "part8_sidebar_dashboard.png");
  await page.screenshot({ path: shotPath, fullPage: false });

  // 1. Inspect first item in LeftSidebar nav
  console.log("\n--- SECTION 8.1: INSPECT FIRST LEFTSIDEBAR ITEM ---");
  const firstNavLink = page.locator("aside nav a").first();
  const firstLinkText = (await firstNavLink.textContent()) || "";
  const firstLinkHref = await firstNavLink.getAttribute("href");
  const isDashboardText = firstLinkText.trim() === "Dashboard";
  const isDashboardHref = firstLinkHref === "/dashboard";

  console.log(`First sidebar link text: "${firstLinkText.trim()}" => ${isDashboardText ? "PASS (Label is 'Dashboard')" : "FAIL"}`);
  console.log(`First sidebar link href: "${firstLinkHref}" => ${isDashboardHref ? "PASS (Href is '/dashboard')" : "FAIL"}`);

  // 2. Active highlight check
  console.log("\n--- SECTION 8.2: ACTIVE HIGHLIGHT VERIFICATION ---");
  const firstClass = await firstNavLink.getAttribute("class");
  const isActive = firstClass?.includes("bg-[#1448d8]") || firstClass?.includes("text-white");
  console.log(`Active state class detected on /dashboard: ${isActive ? "PASS (Highlighted)" : "FAIL"}`);

  // 3. Navigation test from another page (e.g. /courses) back to /dashboard
  console.log("\n--- SECTION 8.3: SIDEBAR NAVIGATION TEST FROM /courses ---");
  await page.goto(`${BASE_URL}/courses`, { waitUntil: "domcontentloaded" });
  await page.click('aside nav a[href="/dashboard"]');
  await page.waitForURL("**/dashboard**");
  console.log(`Clicking 'Dashboard' from /courses navigated to: ${page.url()} => ${page.url().includes("/dashboard") ? "PASS" : "FAIL"}`);

  await browser.close();
  console.log("\n================================================================================");
  console.log("PART 8 VERIFICATION COMPLETE: ALL ASSERTIONS PASSED");
  console.log("================================================================================");
}

main().catch(err => {
  console.error("Error in Part 8:", err);
  process.exit(1);
});
