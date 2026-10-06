import { PrismaClient } from "@prisma/client";

const DOCKER_DB_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
const BASE_URL = "http://127.0.0.1:3045";

async function main() {
  console.log("================================================================================");
  console.log("PART 6: RATE LIMIT & SPOOFING DEFENSE REAL HTTP VERIFICATION");
  console.log("================================================================================");

  const prisma = new PrismaClient({ datasources: { db: { url: DOCKER_DB_URL } } });

  // 1. Clear existing rate limits
  await prisma.rateLimit.deleteMany({
    where: { key: { contains: "exec_" } }
  });

  console.log("\n--- SECTION 6.1: 11 SEQUENTIAL REQUESTS TO /api/execute ---");
  const payload = JSON.stringify({
    language: "python",
    code: "print('Hello Rate Limit')",
  });

  const statuses: number[] = [];
  for (let i = 1; i <= 11; i++) {
    const res = await fetch(`${BASE_URL}/api/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: payload,
    });
    statuses.push(res.status);
    console.log(`Request ${String(i).padStart(2, "0")}: HTTP ${res.status}`);
  }

  const first10 = statuses.slice(0, 10);
  const req11 = statuses[10];
  const seqPass = first10.every(s => s === 200) && req11 === 429;
  console.log(`Sequential 1-10 (200 OK) and 11th (429 Too Many Requests): ${seqPass ? "PASS" : "FAIL"}`);

  // 2. Window reset verification
  console.log("\n--- SECTION 6.2: RATE LIMIT WINDOW BEHAVIOR ---");
  const activeEntries = await prisma.rateLimit.findMany({
    where: { key: { contains: "exec_" } }
  });
  console.log(`Rate limit entry in database:`, activeEntries);
  console.log(`Count recorded: ${activeEntries[0]?.count} (Limit: 10, Window: 60s)`);

  // 3. Spoofed X-Forwarded-For test
  console.log("\n--- SECTION 6.3: SPOOFED X-FORWARDED-FOR HEADER ATTACK ---");
  console.log("Attempting request with spoofed IP (X-Forwarded-For: 203.0.113.195)...");
  const spoofedRes = await fetch(`${BASE_URL}/api/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": "203.0.113.195",
    },
    body: payload,
  });
  console.log(`Spoofed request HTTP status: ${spoofedRes.status}`);

  console.log("\n================================================================================");
  console.log("PART 6 VERIFICATION COMPLETE");
  console.log("================================================================================");

  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Error in Part 6:", err);
  process.exit(1);
});
