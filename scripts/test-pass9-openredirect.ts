import { assertTestDb } from "../lib/testing/assert-test-db";

const TEST_PORT = 3045;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

const VECTORS = [
  "https://evil.com",
  "//evil.com",
  "javascript:alert(1)",
  "/\\evil.com",
  "https:%2f%2fevil.com"
];

async function run() {
  console.log("=== OPEN REDIRECT REGRESSION TEST ON TEST SERVER ===");
  console.log(`Target Base URL: ${BASE_URL}`);

  let allSafe = true;

  for (const v of VECTORS) {
    const encoded = encodeURIComponent(v);
    const targetUrl = `${BASE_URL}/login?callbackUrl=${encoded}`;
    const res = await fetch(targetUrl, { redirect: "manual" });
    const location = res.headers.get("location");

    // Also test POST /api/auth/signin/credentials or callback
    console.log(`Vector: ${v}`);
    console.log(`  Target: ${targetUrl}`);
    console.log(`  HTTP Status: ${res.status}`);
    console.log(`  Location Header: ${location || "none"}`);

    if (location && (location.includes("evil.com") || location.startsWith("//") || location.startsWith("javascript:"))) {
      console.error(`  FAIL: Detected potential open redirect to: ${location}`);
      allSafe = false;
    } else {
      console.log(`  PASS: Safe (no external redirect)`);
    }
  }

  // Also test mobile login callback redirection
  for (const v of VECTORS) {
    const res = await fetch(`${BASE_URL}/api/auth/mobile-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: "9876543210", otp: "123456", callbackUrl: v }),
      redirect: "manual"
    });
    const data = await res.json().catch(() => ({}));
    console.log(`Mobile login with callbackUrl=${v}: status=${res.status}, body redirect=${data.redirect || data.url || "none"}`);
    if (data.redirect && (data.redirect.includes("evil.com") || data.redirect.startsWith("//"))) {
      console.error("  FAIL: Mobile login leaked external callbackUrl!");
      allSafe = false;
    }
  }

  if (allSafe) {
    console.log("\nALL OPEN REDIRECT VECTORS BLOCKED AND SAFE.");
  } else {
    console.error("\nOPEN REDIRECT VULNERABILITY DETECTED!");
    process.exit(1);
  }
}

run().catch(console.error);
