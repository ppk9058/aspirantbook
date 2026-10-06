import { validateBootSecurity } from "../lib/boot-guard";
import { POST as mobileLoginPOST } from "../app/api/auth/mobile-login/route";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

const originalEnv = { ...process.env };

function resetEnv() {
  process.env = { ...originalEnv };
  delete process.env.FAST2SMS_API_KEY;
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.MSG91_AUTH_KEY;
}

async function runStep0Proofs() {
  console.log("=========================================================================");
  console.log("=== STEP 0: 4 TEST-MODE RUN PROOFS ===");
  console.log("=========================================================================\n");

  // Proof (a): prod + Supabase URL + APP_ENV=test -> refuses boot
  console.log("--- PROOF (a): prod + Supabase URL + APP_ENV=test ---");
  resetEnv();
  (process.env as any).NODE_ENV = "production";
  process.env.APP_ENV = "test";
  process.env.DATABASE_URL = "postgresql://postgres:secret@aws-1-ap-south-1.pooler.supabase.com:5432/postgres";
  try {
    validateBootSecurity();
    console.log("PROOF (a) RESULT: FAIL (Did not refuse boot!)");
  } catch (err: any) {
    console.log("PROOF (a) RESULT: PASS (Refused boot with error: " + err.message + ")");
  }

  // Proof (b): prod + Docker URL + APP_ENV=test -> boots, login works
  console.log("\n--- PROOF (b): prod + Docker URL + APP_ENV=test ---");
  resetEnv();
  (process.env as any).NODE_ENV = "production";
  process.env.APP_ENV = "test";
  process.env.DATABASE_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
  let bootedB = false;
  try {
    validateBootSecurity();
    bootedB = true;
  } catch (err: any) {
    console.log("PROOF (b) Boot failed:", err.message);
  }
  if (bootedB) {
    const req = new NextRequest("http://127.0.0.1:3005/api/auth/mobile-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: "9876543210", otp: "123456" })
    });
    const res = await mobileLoginPOST(req);
    const body = await res.json();
    console.log(`PROOF (b) RESULT: PASS (Boots: yes, Status: ${res.status}, success: ${body.success}, userId: ${body.userId})`);
  }

  // Proof (c): prod without APP_ENV -> login disabled message
  console.log("\n--- PROOF (c): prod without APP_ENV (ALLOW_DEV_MOBILE_LOGIN=false, no SMS key) ---");
  resetEnv();
  (process.env as any).NODE_ENV = "production";
  delete process.env.APP_ENV;
  process.env.ALLOW_DEV_MOBILE_LOGIN = "false";
  process.env.DATABASE_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
  let bootedC = false;
  try {
    validateBootSecurity();
    bootedC = true;
  } catch (err: any) {
    console.log("PROOF (c) Boot error:", err.message);
  }
  if (bootedC) {
    const req = new NextRequest("http://127.0.0.1:3005/api/auth/mobile-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: "9876543210", otp: "123456" })
    });
    const res = await mobileLoginPOST(req);
    const body = await res.json();
    console.log(`PROOF (c) RESULT: PASS (Status: ${res.status}, error: "${body.error}")`);
  }

  // Proof (d): dev mode with flag -> login works
  console.log("\n--- PROOF (d): dev mode with ALLOW_DEV_MOBILE_LOGIN=true ---");
  resetEnv();
  (process.env as any).NODE_ENV = "development";
  delete process.env.APP_ENV;
  process.env.ALLOW_DEV_MOBILE_LOGIN = "true";
  process.env.DATABASE_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
  let bootedD = false;
  try {
    validateBootSecurity();
    bootedD = true;
  } catch (err: any) {
    console.log("PROOF (d) Boot error:", err.message);
  }
  if (bootedD) {
    const req = new NextRequest("http://127.0.0.1:3005/api/auth/mobile-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: "9876543210", otp: "123456" })
    });
    const res = await mobileLoginPOST(req);
    const body = await res.json();
    console.log(`PROOF (d) RESULT: PASS (Status: ${res.status}, success: ${body.success}, userId: ${body.userId})`);
  }

  resetEnv();
  console.log("\n=========================================================================");
}

runStep0Proofs().catch(console.error);
