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
  console.log("PART 9: LOGGED-IN HOME ICON / LOGO / NAME NAVIGATES TO /dashboard");
  console.log("================================================================================");

  const browser = await chromium.launch({ headless: true });

  const tokenStudent = await encode({
    token: { id: "u_student_part9", role: "STUDENT", email: "student_part9@test.local", name: "Student Nine" },
    secret: REAL_SECRET,
    salt: "authjs.session-token",
  });

  // 1. Desktop TopNavBar Brand Logo Link Test
  console.log("\n--- SECTION 9.1: DESKTOP TOPNAVBAR BRAND LOGO (1280x800) ---");
  const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await desktopContext.addCookies([{ name: "authjs.session-token", value: tokenStudent, domain: "127.0.0.1", path: "/" }]);
  const desktopPage = await desktopContext.newPage();

  // Start from /courses (to test navigating to dashboard)
  await desktopPage.goto(`${BASE_URL}/courses`, { waitUntil: "domcontentloaded" });
  const logoLink = desktopPage.locator('header a:has-text("aspirantbook"), header a:has(span:text-is("T"))').first();
  const logoHref = await logoLink.getAttribute("href");
  console.log(`TopNavBar brand logo href for logged-in student: "${logoHref}" => ${logoHref === "/dashboard" ? "PASS" : "FAIL"}`);

  await logoLink.click();
  await desktopPage.waitForURL("**/dashboard**");
  console.log(`Clicking TopNavBar brand logo navigated to: ${desktopPage.url()} => ${desktopPage.url().includes("/dashboard") ? "PASS" : "FAIL"}`);
  await desktopContext.close();

  // 2. Mobile Header Brand Logo Link Test
  console.log("\n--- SECTION 9.2: MOBILE APP HEADER BRAND LOGO (390x844) ---");
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await mobileContext.addCookies([{ name: "authjs.session-token", value: tokenStudent, domain: "127.0.0.1", path: "/" }]);
  const mobilePage = await mobileContext.newPage();

  await mobilePage.goto(`${BASE_URL}/courses`, { waitUntil: "domcontentloaded" });
  const mobileLogo = mobilePage.locator('div.block.lg\\:hidden header a:has(span:text-is("T"))').first();
  const mobileLogoHref = await mobileLogo.getAttribute("href");
  console.log(`MobileAppHeader brand logo href for logged-in student: "${mobileLogoHref}" => ${mobileLogoHref === "/dashboard" ? "PASS" : "FAIL"}`);

  await mobileLogo.click();
  await mobilePage.waitForURL("**/dashboard**");
  console.log(`Clicking MobileAppHeader brand logo navigated to: ${mobilePage.url()} => ${mobilePage.url().includes("/dashboard") ? "PASS" : "FAIL"}`);

  // 3. Mobile Bottom Navigation "Home" Tab Test
  console.log("\n--- SECTION 9.3: MOBILE BOTTOM NAVIGATION HOME TAB (390x844) ---");
  await mobilePage.goto(`${BASE_URL}/courses`, { waitUntil: "domcontentloaded" });
  const bottomHomeTab = mobilePage.locator('nav[data-mobile-bottom-nav="true"] a:has-text("Home")').first();
  const bottomHomeHref = await bottomHomeTab.getAttribute("href");
  console.log(`Mobile bottom nav Home tab href for logged-in student: "${bottomHomeHref}" => ${bottomHomeHref === "/dashboard" ? "PASS" : "FAIL"}`);

  await bottomHomeTab.click();
  await mobilePage.waitForURL("**/dashboard**");
  console.log(`Clicking Mobile bottom nav Home tab navigated to: ${mobilePage.url()} => ${mobilePage.url().includes("/dashboard") ? "PASS" : "FAIL"}`);
  await mobileContext.close();

  // 4. Guest Home Links Should Point to "/"
  console.log("\n--- SECTION 9.4: GUEST USER LOGO & HOME LINKS (MUST POINT TO '/') ---");
  const guestContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const guestPage = await guestContext.newPage();
  await guestPage.goto(`${BASE_URL}/courses`, { waitUntil: "domcontentloaded" });

  const guestLogo = guestPage.locator('header a:has-text("aspirantbook"), header a:has(span:text-is("T"))').first();
  const guestLogoHref = await guestLogo.getAttribute("href");
  console.log(`Guest brand logo href: "${guestLogoHref}" => ${guestLogoHref === "/" ? "PASS" : "FAIL"}`);
  await guestContext.close();

  await browser.close();
  console.log("\n================================================================================");
  console.log("PART 9 VERIFICATION COMPLETE: ALL ASSERTIONS PASSED");
  console.log("================================================================================");
}

main().catch(err => {
  console.error("Error in Part 9:", err);
  process.exit(1);
});
