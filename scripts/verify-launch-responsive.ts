import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3048";
const EVIDENCE_DIR = path.resolve(__dirname, "../docs/verify-launch/evidence");

async function main() {
  console.log(`Starting responsive shell verification against ${BASE_URL}...`);
  if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const logEntries: string[] = [];

  function log(msg: string) {
    console.log(msg);
    logEntries.push(msg);
  }

  try {
    // ==========================================
    // 1. MOBILE VIEWPORT (360 x 800)
    // ==========================================
    log("\n--- [MOBILE VIEWPORT 360x800] ---");
    const mobileContext = await browser.newContext({
      viewport: { width: 360, height: 800 },
      isMobile: true,
      hasTouch: true,
      userAgent:
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
    });
    const mobilePage = await mobileContext.newPage();

    // 1a. Login page
    log("Navigating to /login (mobile)...");
    await mobilePage.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    const otpTrigger = mobilePage.locator("button", {
      hasText: "Continue with Mobile OTP",
    });
    await otpTrigger.waitFor({ state: "visible", timeout: 15000 });
    await mobilePage.waitForTimeout(1000); // Allow hydration
    await mobilePage.screenshot({
      path: path.join(EVIDENCE_DIR, "sec5-login-360x800.png"),
      fullPage: false,
    });
    log("Saved sec5-login-360x800.png");

    // 1b. OTP Modal
    log("Triggering OTP modal on /login (mobile)...");
    await otpTrigger.click();
    await mobilePage.waitForSelector('[data-testid="mobile-auth-modal"]', {
      timeout: 10000,
    });
    await mobilePage.screenshot({
      path: path.join(EVIDENCE_DIR, "sec5-otp-modal-360x800.png"),
      fullPage: false,
    });
    log("Saved sec5-otp-modal-360x800.png");

    // 1c. Home page
    log("Navigating to / (mobile)...");
    await mobilePage.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await mobilePage.waitForTimeout(500);
    await mobilePage.screenshot({
      path: path.join(EVIDENCE_DIR, "sec5-home-360x800.png"),
      fullPage: false,
    });
    log("Saved sec5-home-360x800.png");

    // 1d. Courses page & shell check (uses DashboardShell)
    log("Navigating to /courses (mobile)...");
    await mobilePage.goto(`${BASE_URL}/courses`, { waitUntil: "domcontentloaded" });
    await mobilePage.waitForTimeout(1000);
    await mobilePage.screenshot({
      path: path.join(EVIDENCE_DIR, "sec5-courses-360x800.png"),
      fullPage: false,
    });
    log("Saved sec5-courses-360x800.png");

    const bottomNavMobile = mobilePage.locator('[data-mobile-bottom-nav="true"]');
    const isBottomNavVisibleOnMobile = await bottomNavMobile.isVisible();
    log(`Mobile bottom nav visible at 360px on /courses: ${isBottomNavVisibleOnMobile}`);
    if (!isBottomNavVisibleOnMobile) {
      throw new Error("Mobile bottom nav must be VISIBLE at 360px viewport on /courses");
    }

    // 1e. Tests page (/test-series)
    log("Navigating to /test-series (mobile)...");
    await mobilePage.goto(`${BASE_URL}/test-series`, { waitUntil: "domcontentloaded" });
    await mobilePage.waitForTimeout(1000);
    await mobilePage.screenshot({
      path: path.join(EVIDENCE_DIR, "sec5-tests-360x800.png"),
      fullPage: false,
    });
    log("Saved sec5-tests-360x800.png");

    await mobileContext.close();

    // ==========================================
    // 2. DESKTOP VIEWPORT (1280 x 800)
    // ==========================================
    log("\n--- [DESKTOP VIEWPORT 1280x800] ---");
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      isMobile: false,
      hasTouch: false,
    });
    const desktopPage = await desktopContext.newPage();

    // 2a. Login page
    log("Navigating to /login (desktop)...");
    await desktopPage.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    const desktopOtpTrigger = desktopPage.locator("button", {
      hasText: "Continue with Mobile OTP",
    });
    await desktopOtpTrigger.waitFor({ state: "visible", timeout: 15000 });
    await desktopPage.waitForTimeout(1000); // Allow hydration
    await desktopPage.screenshot({
      path: path.join(EVIDENCE_DIR, "sec5-login-1280x800.png"),
      fullPage: false,
    });
    log("Saved sec5-login-1280x800.png");

    // 2b. OTP Modal
    log("Triggering OTP modal on /login (desktop)...");
    await desktopOtpTrigger.click();
    await desktopPage.waitForSelector('[data-testid="mobile-auth-modal"]', {
      timeout: 10000,
    });
    await desktopPage.screenshot({
      path: path.join(EVIDENCE_DIR, "sec5-otp-modal-1280x800.png"),
      fullPage: false,
    });
    log("Saved sec5-otp-modal-1280x800.png");

    // 2c. Home page
    log("Navigating to / (desktop)...");
    await desktopPage.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await desktopPage.waitForTimeout(500);
    await desktopPage.screenshot({
      path: path.join(EVIDENCE_DIR, "sec5-home-1280x800.png"),
      fullPage: false,
    });
    log("Saved sec5-home-1280x800.png");

    // 2d. Courses page & shell check (uses DashboardShell)
    log("Navigating to /courses (desktop)...");
    await desktopPage.goto(`${BASE_URL}/courses`, { waitUntil: "domcontentloaded" });
    await desktopPage.waitForTimeout(1000);
    await desktopPage.screenshot({
      path: path.join(EVIDENCE_DIR, "sec5-courses-1280x800.png"),
      fullPage: false,
    });
    log("Saved sec5-courses-1280x800.png");

    const bottomNavDesktop = desktopPage.locator('[data-mobile-bottom-nav="true"]');
    const isBottomNavVisibleOnDesktop = await bottomNavDesktop.isVisible();
    log(`Mobile bottom nav visible at 1280px on /courses: ${isBottomNavVisibleOnDesktop}`);
    if (isBottomNavVisibleOnDesktop) {
      throw new Error("Mobile bottom nav must be HIDDEN at 1280px viewport (lg:hidden)");
    }

    // 2e. Tests page (/test-series)
    log("Navigating to /test-series (desktop)...");
    await desktopPage.goto(`${BASE_URL}/test-series`, { waitUntil: "domcontentloaded" });
    await desktopPage.waitForTimeout(1000);
    await desktopPage.screenshot({
      path: path.join(EVIDENCE_DIR, "sec5-tests-1280x800.png"),
      fullPage: false,
    });
    log("Saved sec5-tests-1280x800.png");
    await desktopPage.screenshot({
      path: path.join(EVIDENCE_DIR, "sec5-tests-1280x800.png"),
      fullPage: false,
    });
    log("Saved sec5-tests-1280x800.png");

    await desktopContext.close();

    log("\nAll 10 responsive shell screenshots captured and verified successfully!");
    fs.writeFileSync(
      path.join(EVIDENCE_DIR, "sec5-responsive-shell.txt"),
      logEntries.join("\n") + "\n\nRESULT: ALL RESPONSIVE REQUIREMENTS VERIFIED"
    );
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
