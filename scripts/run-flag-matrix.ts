import { execSync } from "child_process";
import { guardTestDatabase } from "./guard-test-db";

const testDbUrl =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_perf_v2_test";
guardTestDatabase(testDbUrl);

interface MatrixConfig {
  name: string;
  env: Record<string, string>;
}

const matrix: MatrixConfig[] = [
  {
    name: "1. All Flags OFF (Legacy baseline)",
    env: {
      EXAM_RUNTIME_FAST_GRADING: "false",
      EXAM_RUNTIME_BATCH_SYNC: "false",
      EXAM_RUNTIME_CACHE_QUESTIONS: "false",
      EXAM_RUNTIME_CACHE_LEADERBOARD: "false",
      EXAM_RUNTIME_REDIS_RATELIMIT: "false",
      EXAM_RATE_LIMIT_ENABLED: "false",
    },
  },
  {
    name: "2. Single Flag: FAST_GRADING ON",
    env: {
      EXAM_RUNTIME_FAST_GRADING: "true",
      EXAM_RUNTIME_BATCH_SYNC: "false",
      EXAM_RUNTIME_CACHE_QUESTIONS: "false",
      EXAM_RUNTIME_CACHE_LEADERBOARD: "false",
      EXAM_RUNTIME_REDIS_RATELIMIT: "false",
      EXAM_RATE_LIMIT_ENABLED: "false",
    },
  },
  {
    name: "3. Single Flag: BATCH_SYNC ON",
    env: {
      EXAM_RUNTIME_FAST_GRADING: "false",
      EXAM_RUNTIME_BATCH_SYNC: "true",
      EXAM_RUNTIME_CACHE_QUESTIONS: "false",
      EXAM_RUNTIME_CACHE_LEADERBOARD: "false",
      EXAM_RUNTIME_REDIS_RATELIMIT: "false",
      EXAM_RATE_LIMIT_ENABLED: "false",
    },
  },
  {
    name: "4. Single Flag: CACHE_QUESTIONS ON",
    env: {
      EXAM_RUNTIME_FAST_GRADING: "false",
      EXAM_RUNTIME_BATCH_SYNC: "false",
      EXAM_RUNTIME_CACHE_QUESTIONS: "true",
      EXAM_RUNTIME_CACHE_LEADERBOARD: "false",
      EXAM_RUNTIME_REDIS_RATELIMIT: "false",
      EXAM_RATE_LIMIT_ENABLED: "false",
    },
  },
  {
    name: "5. Single Flag: CACHE_LEADERBOARD ON",
    env: {
      EXAM_RUNTIME_FAST_GRADING: "false",
      EXAM_RUNTIME_BATCH_SYNC: "false",
      EXAM_RUNTIME_CACHE_QUESTIONS: "false",
      EXAM_RUNTIME_CACHE_LEADERBOARD: "true",
      EXAM_RUNTIME_REDIS_RATELIMIT: "false",
      EXAM_RATE_LIMIT_ENABLED: "false",
    },
  },
  {
    name: "6. Single Flag: REDIS_RATELIMIT ON",
    env: {
      EXAM_RUNTIME_FAST_GRADING: "false",
      EXAM_RUNTIME_BATCH_SYNC: "false",
      EXAM_RUNTIME_CACHE_QUESTIONS: "false",
      EXAM_RUNTIME_CACHE_LEADERBOARD: "false",
      EXAM_RUNTIME_REDIS_RATELIMIT: "true",
      EXAM_RATE_LIMIT_ENABLED: "false",
    },
  },
  {
    name: "7. Single Flag: RATE_LIMIT_ENABLED ON",
    env: {
      EXAM_RUNTIME_FAST_GRADING: "false",
      EXAM_RUNTIME_BATCH_SYNC: "false",
      EXAM_RUNTIME_CACHE_QUESTIONS: "false",
      EXAM_RUNTIME_CACHE_LEADERBOARD: "false",
      EXAM_RUNTIME_REDIS_RATELIMIT: "false",
      EXAM_RATE_LIMIT_ENABLED: "true",
    },
  },
  {
    name: "8. All Flags ON (Hardened performance runtime)",
    env: {
      EXAM_RUNTIME_FAST_GRADING: "true",
      EXAM_RUNTIME_BATCH_SYNC: "true",
      EXAM_RUNTIME_CACHE_QUESTIONS: "true",
      EXAM_RUNTIME_CACHE_LEADERBOARD: "true",
      EXAM_RUNTIME_REDIS_RATELIMIT: "true",
      EXAM_RATE_LIMIT_ENABLED: "true",
    },
  },
];

async function main() {
  console.log(`\n======================================================`);
  console.log(`Phase 4: Matrix Parity Run Across 8 Configurations`);
  console.log(`Target Test DB: ${testDbUrl}`);
  console.log(`======================================================\n`);

  let allPassed = true;
  for (const cell of matrix) {
    const envVars = {
      ...process.env,
      APP_ENV: "test",
      DATABASE_URL: testDbUrl,
      DIRECT_URL: testDbUrl,
      ...cell.env,
    };

    const cmd = "npx tsx --test tests/unit/exam-runtime-verification-review.test.ts";
    try {
      const stdout = execSync(cmd, { env: envVars, encoding: "utf-8" });
      const passMatch = stdout.match(/pass\s+(\d+)/);
      const failMatch = stdout.match(/fail\s+(\d+)/);
      const passCount = passMatch ? passMatch[1] : "0";
      const failCount = failMatch ? failMatch[1] : "0";

      if (failCount === "0" && passCount === "7") {
        console.log(`✅ [PASS] ${cell.name} (${passCount} passed, ${failCount} failed)`);
      } else {
        console.error(`❌ [FAIL] ${cell.name} (${passCount} passed, ${failCount} failed)`);
        allPassed = false;
      }
    } catch (err: any) {
      console.error(`❌ [FAIL] ${cell.name} - Exception: ${err.message}`);
      if (err.stdout) console.log("STDOUT:", err.stdout);
      if (err.stderr) console.error("STDERR:", err.stderr);
      allPassed = false;
    }
  }

  if (!allPassed) {
    process.exit(1);
  }
  console.log(`\n🎉 All 8 matrix configurations passed with 100% parity!`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
