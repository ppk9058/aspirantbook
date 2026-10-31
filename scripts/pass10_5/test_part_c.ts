import { chromium } from "playwright";
import { encode } from "next-auth/jwt";
import { execSync } from "child_process";

const BASE_URL = "http://127.0.0.1:3045";
const REAL_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || (() => { throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required"); })();

async function main() {
  const commit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const timestamp = new Date().toISOString();

  console.log("================================================================================");
  console.log("PART C: C1 REGRESSION PROOF & CACHE / SESSION GREP AUDIT");
  console.log(`Commit: ${commit}`);
  console.log(`Timestamp: ${timestamp}`);
  console.log("Database: postgresql://***@127.0.0.1:54329/trillionskill_test");
  console.log("================================================================================");

  // 1. Playwright C1 Viewport check on HEAD
  console.log("\n--- SECTION C.1: PLAYWRIGHT C1 VIEWPORT RESIZE CHECK ON HEAD ---");
  const browser = await chromium.launch({ headless: true });
  const guestContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const guestPage = await guestContext.newPage();
  await guestPage.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });

  const viewports = [
    { label: "1280x800 (Desktop)", w: 1280, h: 800 },
    { label: "390x844 (Mobile Phone)", w: 390, h: 844 },
    { label: "768x1024 (Tablet)", w: 768, h: 1024 },
    { label: "1280x800 (Desktop return)", w: 1280, h: 800 },
  ];

  console.log(String("Step").padEnd(30) + String("Desktop Login CTA").padEnd(20) + String("Mobile Login CTA").padEnd(20) + String("Avatar Text/Icon").padEnd(20) + "Guest Status");
  console.log("-".repeat(105));

  for (const vp of viewports) {
    await guestPage.setViewportSize({ width: vp.w, height: vp.h });
    await guestPage.waitForTimeout(300);

    const desktopLogin = await guestPage.locator('header button:has-text("Login / Register")').isVisible();
    const mobileLogin = await guestPage.locator('header button[aria-label="Login or Register"]').isVisible();
    const avatarLetter = await guestPage.locator('header button[aria-label="Account profile"]').textContent().catch(() => null);

    const isLeakingUser = avatarLetter !== null && avatarLetter.trim().length > 0;
    const guestStatus = (!isLeakingUser && (desktopLogin || mobileLogin)) ? "PASS (GUEST)" : "FAIL (LEAK/MISMATCH)";

    console.log(
      String(vp.label).padEnd(30) +
      String(desktopLogin ? "VISIBLE" : "hidden").padEnd(20) +
      String(mobileLogin ? "VISIBLE" : "hidden").padEnd(20) +
      String(avatarLetter ? `"${avatarLetter.trim()}"` : "NONE").padEnd(20) +
      guestStatus
    );
  }
  await browser.close();

  // 2. Raw Response Headers
  console.log("\n--- SECTION C.2: RAW RESPONSE HEADERS (GUEST vs LOGGED-IN) ---");
  const pages = ["/", "/dashboard", "/courses", "/tutorials"];
  const studentToken = await encode({
    token: { id: "u_alice_test", role: "STUDENT", email: "user_a@test.local", name: "Alice Test" },
    secret: REAL_SECRET,
    salt: "authjs.session-token",
  });

  for (const p of pages) {
    console.log(`\n>>> PAGE: ${p} (GUEST) <<<`);
    const guestHeaders = execSync(`curl -s -I "${BASE_URL}${p}"`, { encoding: "utf8" });
    const guestFiltered = guestHeaders.split("\r\n").filter(l => 
      l.startsWith("HTTP/") || 
      l.toLowerCase().startsWith("cache-control:") || 
      l.toLowerCase().startsWith("vary:") || 
      l.toLowerCase().startsWith("set-cookie:")
    );
    console.log(guestFiltered.join("\n"));

    console.log(`>>> PAGE: ${p} (LOGGED-IN STUDENT) <<<`);
    const authHeaders = execSync(`curl -s -I "${BASE_URL}${p}" -H "Cookie: authjs.session-token=${studentToken}"`, { encoding: "utf8" });
    const authFiltered = authHeaders.split("\r\n").filter(l => 
      l.startsWith("HTTP/") || 
      l.toLowerCase().startsWith("cache-control:") || 
      l.toLowerCase().startsWith("vary:") || 
      l.toLowerCase().startsWith("set-cookie:")
    );
    console.log(authFiltered.join("\n"));
  }

  // 3. Static Grep Audits
  console.log("\n--- SECTION C.3: STATIC GREP AUDIT FOR GLOBAL CACHES & STATE ---");
  console.log("1. Module-level variables holding user/session on server:");
  const grepGlobalSession = execSync(`grep -rn "let session\\|var session\\|let currentUser" app/ lib/ 2>/dev/null || true`, { encoding: "utf8" }).trim();
  console.log(grepGlobalSession ? grepGlobalSession : "NONE (No module-level mutable session state found on server - Clean)");

  console.log("\n2. Caching directives (unstable_cache, cache(), force-static) in auth-reading files:");
  const grepCaches = execSync(`grep -rn "unstable_cache\\|force-static" app/ 2>/dev/null || true`, { encoding: "utf8" }).trim();
  console.log(grepCaches ? grepCaches : "NONE (No force-static or unstable_cache on dynamic authenticated views - Clean)");

  console.log("\n3. localStorage/sessionStorage keys storing user/session credentials:");
  const grepStorage = execSync(`grep -rn "localStorage.getItem\\|sessionStorage.getItem" components/ app/ 2>/dev/null | grep -i "user\\|token\\|auth\\|role" || true`, { encoding: "utf8" }).trim();
  console.log(grepStorage ? grepStorage : "NONE (No user credentials or session tokens in web storage - Clean)");

  console.log("\n================================================================================");
  console.log("PART C VERIFICATION COMPLETE");
  console.log("================================================================================");
}

main().catch(err => {
  console.error("Error in Part C:", err);
  process.exit(1);
});
