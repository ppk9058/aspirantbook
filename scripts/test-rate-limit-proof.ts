import { spawn, ChildProcess } from "child_process";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

const DOCKER_DB_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
const TEST_PORT = 3046;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const SECRET = "test-secret-test-secret-test-secret-32-chars!!";

async function createCookie(userId: string) {
  const token = await encode({
    token: { id: userId, sub: userId, role: "FREE", email: `${userId}@test.local` },
    secret: SECRET,
    salt: "authjs.session-token"
  });
  return `authjs.session-token=${token}`;
}

async function run() {
  console.log("=========================================================================");
  console.log("=== RATE LIMITER PROOF: app/api/checkout/coupon/preview ===");
  console.log("=========================================================================");

  const prisma = new PrismaClient({ datasources: { db: { url: DOCKER_DB_URL } } });
  
  // Clear rate limits for clean test run
  await prisma.rateLimit.deleteMany({
    where: { key: { contains: "coupon_preview" } }
  });

  console.log(`Starting isolated Next.js server on port ${TEST_PORT}...`);
  const serverProc: ChildProcess = spawn("npx", ["next", "start", "-p", String(TEST_PORT)], {
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      NEXT_DIST_DIR: ".next-test",
      DATABASE_URL: DOCKER_DB_URL,
      DIRECT_URL: DOCKER_DB_URL,
      NEXTAUTH_URL: BASE_URL,
      AUTH_URL: BASE_URL,
      APP_ENV: "test",
      NODE_ENV: "production",
      AUTH_SECRET: SECRET,
      NEXTAUTH_SECRET: SECRET,
    },
    stdio: "pipe"
  });

  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${BASE_URL}/login`, { redirect: "manual" });
      if (res.status === 200 || res.status === 404 || res.status === 307) break;
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log(`Server ready on port ${TEST_PORT}.\n`);

  try {
    const userA = "u_ratelimit_user_A";
    const userB = "u_ratelimit_user_B";
    const cookieA = await createCookie(userA);
    const cookieB = await createCookie(userB);

    const payload = JSON.stringify({
      courseId: "72nd-bpsc-prelims-current-affairs",
      code: "STEP5_PERC20"
    });

    console.log("--- TEST 1: 11 Sequential Requests with User A ---");
    const seqStatuses: number[] = [];
    for (let i = 1; i <= 11; i++) {
      const res = await fetch(`${BASE_URL}/api/checkout/coupon/preview`, {
        method: "POST",
        headers: {
          "Host": `127.0.0.1:${TEST_PORT}`,
          "Content-Type": "application/json",
          "Cookie": cookieA
        },
        body: payload
      });
      seqStatuses.push(res.status);
      console.log(`Seq req ${i.toString().padStart(2, "0")}: HTTP ${res.status}`);
    }

    const first10 = seqStatuses.slice(0, 10);
    const req11 = seqStatuses[10];
    const seqPass = first10.every(s => s === 200) && req11 === 429;
    console.log(`Sequential result: 10x200 then 1x429 => ${seqPass ? "PASS" : "FAIL"}\n`);

    console.log("--- TEST 2: User B Isolation Check (Different User) ---");
    const resB = await fetch(`${BASE_URL}/api/checkout/coupon/preview`, {
      method: "POST",
      headers: {
        "Host": `127.0.0.1:${TEST_PORT}`,
        "Content-Type": "application/json",
        "Cookie": cookieB
      },
      body: payload
    });
    console.log(`User B req 01: HTTP ${resB.status}`);
    const userBPass = resB.status === 200;
    console.log(`User isolation result: User B gets 200 while User A is blocked => ${userBPass ? "PASS" : "FAIL"}\n`);

    console.log("--- TEST 3: 30 Parallel Requests with User C ---");
    const userC = "u_ratelimit_user_C";
    const cookieC = await createCookie(userC);

    const parallelReqs = Array.from({ length: 30 }, (_, i) =>
      fetch(`${BASE_URL}/api/checkout/coupon/preview`, {
        method: "POST",
        headers: {
          "Host": `127.0.0.1:${TEST_PORT}`,
          "Content-Type": "application/json",
          "Cookie": cookieC
        },
        body: payload
      }).then(r => r.status)
    );

    const parResults = await Promise.all(parallelReqs);
    const count200 = parResults.filter(s => s === 200).length;
    const count429 = parResults.filter(s => s === 429).length;
    console.log(`Parallel Results (total 30):`);
    console.log(`  200 OK: ${count200}`);
    console.log(`  429 Too Many Requests: ${count429}`);
    const parPass = count200 === 10 && count429 === 20;
    console.log(`Parallel result: Exactly 10x200 and 20x429 => ${parPass ? "PASS" : "FAIL"}\n`);

    if (seqPass && userBPass && parPass) {
      console.log("=== ALL RATE LIMITER TESTS PASSED SUCCESSFULLY ===");
    } else {
      console.error("=== RATE LIMITER TESTS FAILED ===");
      process.exitCode = 1;
    }

  } finally {
    serverProc.kill("SIGTERM");
    await prisma.$disconnect();
  }
}

run().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
