import { spawn } from "child_process";
import * as path from "path";
import { assertTestDb } from "../lib/testing/assert-test-db";
import { PrismaClient } from "@prisma/client";

const TEST_PORT = 3045;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const DOCKER_DB_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";

process.env.TEST_DATABASE_URL = DOCKER_DB_URL;
process.env.DATABASE_URL = DOCKER_DB_URL;
process.env.DIRECT_URL = DOCKER_DB_URL;
process.env.APP_ENV = "test";
process.env.NODE_ENV = "production";
process.env.NEXTAUTH_URL = BASE_URL;
process.env.AUTH_URL = BASE_URL;

assertTestDb();

async function run() {
  const runStartTime = new Date();
  console.log(`=== STARTING PASS 9.3 COMPREHENSIVE SUITE AT ${runStartTime.toISOString()} ===`);

  // Start test server on port 3045
  console.log(`Starting Next.js production test server on port ${TEST_PORT}...`);
  const serverProc = spawn("npx", ["next", "start", "-p", String(TEST_PORT)], {
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      DATABASE_URL: DOCKER_DB_URL,
      DIRECT_URL: DOCKER_DB_URL,
      APP_ENV: "test",
      NODE_ENV: "production",
      NEXTAUTH_URL: BASE_URL,
      AUTH_URL: BASE_URL,
      NEXT_DIST_DIR: ".next-test"
    },
    stdio: "pipe"
  });

  serverProc.stdout.on("data", (d) => {
    // console.log(`[server stdout] ${d.toString()}`);
  });
  serverProc.stderr.on("data", (d) => {
    // console.error(`[server stderr] ${d.toString()}`);
  });

  // Wait for server ready
  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${BASE_URL}/login`);
      if (res.status === 200) {
        serverReady = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (!serverReady) {
    console.error("Failed to start server on port 3045");
    serverProc.kill("SIGTERM");
    process.exit(1);
  }
  console.log("Server ready on port 3045.\n");

  try {
    // Step 1: Open redirect test
    console.log("=========================================================================");
    console.log("RUNNING STEP 3: OPEN REDIRECT TEST SUITE");
    console.log("=========================================================================");
    const { execSync } = require("child_process");
    execSync("npx tsx scripts/test-pass9-openredirect.ts", { stdio: "inherit", env: process.env });

    // Step 2: Playwright crawl
    console.log("\n=========================================================================");
    console.log("RUNNING STEP 4: PLAYWRIGHT CRAWL & SCREENSHOT SUITE");
    console.log("=========================================================================");
    execSync("npx tsx scripts/test-pass9-playwright-crawl.ts", { stdio: "inherit", env: process.env });

  } finally {
    serverProc.kill("SIGTERM");
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
