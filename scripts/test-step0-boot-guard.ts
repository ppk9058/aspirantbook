import { validateBootSecurity } from "../lib/boot-guard";

async function run() {
  console.log("=== STEP 0: BOOT-TIME SECURITY GUARD PROOF ===");

  // Case 1: NODE_ENV=production with ALLOW_DEV_MOBILE_LOGIN=true and NO provider -> MUST THROW
  (process.env as any).NODE_ENV = "production";
  process.env.ALLOW_DEV_MOBILE_LOGIN = "true";
  delete process.env.FAST2SMS_API_KEY;
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.MSG91_AUTH_KEY;

  let threwInProd = false;
  let prodError = "";
  try {
    validateBootSecurity();
  } catch (err: any) {
    threwInProd = true;
    prodError = err.message;
  }

  console.log("Case 1 (Production with bypass on & no provider):");
  console.log(`  Threw at boot: ${threwInProd} (expect true)`);
  console.log(`  Error message: ${prodError.split("\n")[0]}`);

  // Case 2: NODE_ENV=development with ALLOW_DEV_MOBILE_LOGIN=true -> MUST NOT THROW
  (process.env as any).NODE_ENV = "development";
  let threwInDev = false;
  try {
    validateBootSecurity();
  } catch (err: any) {
    threwInDev = true;
  }
  console.log("\nCase 2 (Development with bypass on):");
  console.log(`  Threw at boot: ${threwInDev} (expect false)`);

  const passed = threwInProd && !threwInDev;
  console.log(`\nBoot-time guard verification: ${passed ? "PASS" : "FAIL"}`);
  if (!passed) {
    throw new Error("Boot-time guard verification failed!");
  }
}

run().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
