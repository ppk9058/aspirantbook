import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import { getClientIp } from "@/lib/rate-limit";

const BASE_URL = "http://127.0.0.1:3045";
const TEST_DB_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";

async function makePostRequest(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
      code: 'print("Rate limit test")',
      language: "python",
    }),
  });
  return {
    status: res.status,
    retryAfter: res.headers.get("retry-after"),
    data: await res.json().catch(() => null),
  };
}

async function makeGetRequest(url: string) {
  const res = await fetch(url);
  return {
    status: res.status,
    data: await res.json().catch(() => null),
  };
}

async function main() {
  const commit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const timestamp = new Date().toISOString();

  console.log("================================================================================");
  console.log("PART H: RATE LIMITING & TRUST_PROXY VERIFICATION");
  console.log(`Commit: ${commit}`);
  console.log(`Timestamp: ${timestamp}`);
  console.log("Database: postgresql://***@127.0.0.1:54329/trillionskill_test");
  console.log("File & Line: lib/rate-limit.ts:14-26 (getClientIp)");
  console.log("Env Flag Name: TRUST_PROXY");
  console.log("================================================================================");

  const prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });

  try {
    // 0. Ensure server is up
    const healthCheck = await makeGetRequest(`${BASE_URL}/api/health`);
    console.log(`Server health check on port 3045: ${healthCheck.status === 200 ? "OK" : "FAILED"}`);

    // Clean up rate limit table
    await prisma.$executeRawUnsafe(`DELETE FROM "RateLimit" WHERE key LIKE 'exec_%'`);

    console.log("\n--- TEST H.1: 10 allowed requests (200), 11th blocked (429) ---");
    let passedH1 = true;
    for (let i = 1; i <= 10; i++) {
      const res = await makePostRequest(`${BASE_URL}/api/execute`);
      console.log(`Request #${i.toString().padStart(2, " ")}: status=${res.status}`);
      if (res.status !== 200) passedH1 = false;
    }

    const res11 = await makePostRequest(`${BASE_URL}/api/execute`);
    console.log(`Request #11: status=${res11.status}, Retry-After=${res11.retryAfter}`);
    if (res11.status !== 429 || !res11.retryAfter) passedH1 = false;
    console.log(`Test H.1 Result: ${passedH1 ? "PASS" : "FAIL"}`);

    console.log("\n--- TEST H.2: Unblocked request to another route (/api/health) returns 200 ---");
    const healthRes = await makeGetRequest(`${BASE_URL}/api/health`);
    console.log(`Health check status: ${healthRes.status}`);
    const passedH2 = healthRes.status === 200;
    console.log(`Test H.2 Result: ${passedH2 ? "PASS" : "FAIL"}`);

    console.log("\n--- TEST H.3: Reset window and show rate limit resets to 200 ---");
    await prisma.$executeRawUnsafe(`DELETE FROM "RateLimit" WHERE key LIKE 'exec_%'`);
    const resetRes = await makePostRequest(`${BASE_URL}/api/execute`);
    console.log(`Post-reset request: status=${resetRes.status}`);
    const passedH3 = resetRes.status === 200;
    console.log(`Test H.3 Result: ${passedH3 ? "PASS" : "FAIL"}`);

    console.log("\n--- TEST H.4: Spoofed X-Forwarded-For with TRUST_PROXY=false does NOT bypass ---");
    // Saturate the bucket
    for (let i = 1; i <= 15; i++) {
      const res = await makePostRequest(`${BASE_URL}/api/execute`);
      if (res.status === 429) break;
    }
    // Attempt request with spoofed IP
    const spoofRes = await makePostRequest(`${BASE_URL}/api/execute`, {
      "X-Forwarded-For": "203.0.113.195",
      "X-Real-IP": "203.0.113.195",
    });
    console.log(`Spoofed IP request (TRUST_PROXY unset/false): status=${spoofRes.status}, Retry-After=${spoofRes.retryAfter}`);
    const passedH4 = spoofRes.status === 429;
    console.log(`Test H.4 Result: ${passedH4 ? "PASS" : "FAIL"} (Spoofing rejected as expected)`);

    console.log("\n--- TEST H.5: Verify getClientIp honors X-Forwarded-For ONLY when TRUST_PROXY=true ---");
    // Verify getClientIp contract directly with simulated request objects
    const mockHeaders = new Headers({
      "x-forwarded-for": "203.0.113.195, 10.0.0.1",
      "x-real-ip": "198.51.100.42",
    });
    const mockReq = { headers: mockHeaders };

    // With TRUST_PROXY false/unset:
    delete process.env.TRUST_PROXY;
    const ipUntrusted = getClientIp(mockReq);
    console.log(`getClientIp with TRUST_PROXY unset: resolved IP = "${ipUntrusted}" (expected "127.0.0.1")`);

    process.env.TRUST_PROXY = "false";
    const ipExplicitFalse = getClientIp(mockReq);
    console.log(`getClientIp with TRUST_PROXY=false: resolved IP = "${ipExplicitFalse}" (expected "127.0.0.1")`);

    // With TRUST_PROXY=true:
    process.env.TRUST_PROXY = "true";
    const ipTrusted = getClientIp(mockReq);
    console.log(`getClientIp with TRUST_PROXY=true: resolved IP = "${ipTrusted}" (expected "203.0.113.195")`);

    // With X-Real-IP only and TRUST_PROXY=true:
    const mockRealOnly = { headers: new Headers({ "x-real-ip": "198.51.100.42" }) };
    const ipRealOnly = getClientIp(mockRealOnly);
    console.log(`getClientIp with TRUST_PROXY=true (X-Real-IP only): resolved IP = "${ipRealOnly}" (expected "198.51.100.42")`);

    delete process.env.TRUST_PROXY;

    const passedH5 = ipUntrusted === "127.0.0.1" && ipExplicitFalse === "127.0.0.1" && ipTrusted === "203.0.113.195" && ipRealOnly === "198.51.100.42";
    console.log(`Test H.5 Result: ${passedH5 ? "PASS" : "FAIL"}`);

    // Clean up test rows
    await prisma.$executeRawUnsafe(`DELETE FROM "RateLimit" WHERE key LIKE 'exec_%'`);

    console.log("\n================================================================================");
    console.log("PART H SUMMARY");
    console.log(`H.1 10x200 then 11th 429 with Retry-After: ${passedH1 ? "PASS" : "FAIL"}`);
    console.log(`H.2 Other route unblocked (200): ${passedH2 ? "PASS" : "FAIL"}`);
    console.log(`H.3 Window reset restores 200: ${passedH3 ? "PASS" : "FAIL"}`);
    console.log(`H.4 Spoofed X-Forwarded-For rejected when TRUST_PROXY=false: ${passedH4 ? "PASS" : "FAIL"}`);
    console.log(`H.5 X-Forwarded-For honored strictly when TRUST_PROXY=true: ${passedH5 ? "PASS" : "FAIL"}`);
    console.log("================================================================================");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Error in Part H:", err);
  process.exit(1);
});
