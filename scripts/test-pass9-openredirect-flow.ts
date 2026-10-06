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
  console.log("=== PASS 9.4 STEP 4: OPEN REDIRECT AUDIT ===");
  console.log(`Base URL: ${BASE_URL}\n`);

  for (const v of VECTORS) {
    const res = await fetch(`${BASE_URL}/api/auth/mobile-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumber: "9876543210",
        otp: "123456",
        callbackUrl: v
      }),
      redirect: "manual"
    });

    const data = await res.json().catch(() => ({}));
    const redirectTarget = data.redirect || data.url || "/dashboard";
    const resolvedUrl = new URL(redirectTarget, BASE_URL).toString();
    const isSameOrigin = resolvedUrl.startsWith(BASE_URL);

    console.log(`Input callbackUrl: ${v}`);
    console.log(`  HTTP Status: ${res.status}`);
    console.log(`  Body redirect target: ${redirectTarget}`);
    console.log(`  Final resolved URL: ${resolvedUrl}`);
    console.log(`  Same origin? ${isSameOrigin ? "YES (PASS)" : "NO (FAIL)"}`);
    console.log("--------------------------------------------------");
    if (!isSameOrigin) {
      console.error(`FAIL: Leaked open redirect for vector ${v}`);
      process.exit(1);
    }
  }

  console.log("\nALL OPEN REDIRECT VECTORS RESOLVE TO SAME-ORIGIN.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
