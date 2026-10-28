import { PrismaClient } from "@prisma/client";
import { spawn, ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";

process.env.DATABASE_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
process.env.DIRECT_URL = process.env.DATABASE_URL;

const prisma = new PrismaClient();
const BASE_URL = "http://127.0.0.1:3045";
const TOXIPROXY_API = "http://127.0.0.1:8474";
const EVIDENCE_DIR = path.resolve(__dirname, "../../evidence/verify");

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

async function setToxiproxyLatency(latencyMs: number) {
  try {
    await fetch(`${TOXIPROXY_API}/proxies/postgres_test/toxics/latency_downstream`, {
      method: "DELETE",
    });
  } catch {}

  if (latencyMs > 0) {
    await fetch(`${TOXIPROXY_API}/proxies/postgres_test/toxics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "latency_downstream",
        type: "latency",
        stream: "downstream",
        attributes: { latency: latencyMs, jitter: 0 },
      }),
    });
  }
}

async function stopServer() {
  try {
    const { execSync } = require("child_process");
    execSync("lsof -ti :3045 -sTCP:LISTEN | xargs kill -9 2>/dev/null || true");
  } catch {}
  await new Promise((r) => setTimeout(r, 600));
}

async function startServer(envFlags: Record<string, string>, dbPort: number = 54330): Promise<ChildProcess> {
  await stopServer();
  const env = {
    ...process.env,
    PORT: "3045",
    DATABASE_URL: `postgresql://postgres:testpassword123@127.0.0.1:${dbPort}/trillionskill_test`,
    DIRECT_URL: `postgresql://postgres:testpassword123@127.0.0.1:${dbPort}/trillionskill_test`,
    ...envFlags,
  };

  const proc = spawn("node", [
    "--require",
    path.resolve(__dirname, "../../node_modules/tsx/dist/preflight.cjs"),
    "--import",
    `file://${path.resolve(__dirname, "../../node_modules/tsx/dist/loader.mjs")}`,
    path.resolve(__dirname, "test-server.ts"),
  ], {
    env,
    stdio: "ignore",
  });

  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return proc;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("Server failed to start on port 3045");
}

async function runTaskC() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const logFile = path.join(EVIDENCE_DIR, "task-c-toxiproxy.txt");
  function log(msg: string) {
    console.log(msg);
    fs.appendFileSync(logFile, msg + "\n");
  }

  log("\n=== TASK C: REMOTE-DB LATENCY BENCHMARKS VIA TOXIPROXY ===");

  const testRecord = await prisma.examTest.findFirst({
    where: { id: "et_perf_100q" },
    include: {
      sections: {
        include: {
          questions: { select: { id: true } },
        },
      },
    },
  });

  if (!testRecord) throw new Error("et_perf_100q test record not found");
  const questionIds = testRecord.sections.flatMap((s) => s.questions.map((q) => q.id));
  log(`Loaded ${questionIds.length} question IDs from test fixture.`);

  // Ensure test candidates exist
  for (let i = 1; i <= 20; i++) {
    await prisma.user.upsert({
      where: { id: `u_toxi_cand_${i}` },
      update: {},
      create: {
        id: `u_toxi_cand_${i}`,
        email: `toxi_cand_${i}@trillionskill.test`,
        name: `Toxi Candidate ${i}`,
        role: "FREE",
      },
    });
  }

  const latenciesToTest = [0, 20, 40];
  const results: Array<{
    latencyMs: number;
    flagsOffP50: number;
    flagsOffP95: number;
    flagsOnP50: number;
    flagsOnP95: number;
    speedupP50: string;
  }> = [];

  const flagsOff = {
    EXAM_RUNTIME_BATCH_SYNC: "0",
    EXAM_RUNTIME_FAST_GRADING: "0",
    EXAM_RUNTIME_CACHE_QUESTIONS: "0",
    EXAM_RUNTIME_CACHE_LEADERBOARD: "0",
    EXAM_RUNTIME_REDIS_RATELIMIT: "0",
  };

  const flagsOn = {
    EXAM_RUNTIME_BATCH_SYNC: "1",
    EXAM_RUNTIME_FAST_GRADING: "1",
    EXAM_RUNTIME_CACHE_QUESTIONS: "1",
    EXAM_RUNTIME_CACHE_LEADERBOARD: "1",
    EXAM_RUNTIME_REDIS_RATELIMIT: "1",
  };

  for (const lat of latenciesToTest) {
    log(`\n--- Testing with ${lat}ms Added Network Latency (Round-Trip Delay: ~${lat * 2}ms) ---`);
    await setToxiproxyLatency(lat);

    // 1. Submit Herd with Flags OFF (Sequential 100-UPDATE loop)
    log(`[${lat}ms] Running submit requests with Flags OFF (Sequential Loop)...`);
    let server = await startServer(flagsOff, 54330);
    const submitsOff: number[] = [];

    for (let i = 1; i <= 15; i++) {
      const att = await prisma.examAttempt.create({
        data: {
          userId: `u_toxi_cand_${i}`,
          testId: testRecord.id,
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
      });

      // Populate 100 answers for this attempt
      await prisma.examAttemptAnswer.createMany({
        data: questionIds.map((qId, idx) => ({
          attemptId: att.id,
          questionId: qId,
          selectedOption: (["A", "B", "C", "D"])[idx % 4],
          clientSeq: 1,
        })),
      });

      const t0 = Date.now();
      const res = await fetch(`${BASE_URL}/api/exam/attempt/${att.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": `u_toxi_cand_${i}`,
        },
        body: JSON.stringify({ autoSubmitted: false }),
      });
      const elapsed = Date.now() - t0;
      submitsOff.push(elapsed);
    }
    await stopServer();

    const offP50 = percentile(submitsOff, 50);
    const offP95 = percentile(submitsOff, 95);
    log(`  [${lat}ms Flags OFF] Submit p50 = ${offP50} ms, p95 = ${offP95} ms`);

    // 2. Submit Herd with Flags ON (Atomic PostgreSQL UNNEST)
    log(`[${lat}ms] Running submit requests with Flags ON (Atomic UNNEST)...`);
    server = await startServer(flagsOn, 54330);
    const submitsOn: number[] = [];

    for (let i = 1; i <= 15; i++) {
      const att = await prisma.examAttempt.create({
        data: {
          userId: `u_toxi_cand_${i}`,
          testId: testRecord.id,
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
      });

      await prisma.examAttemptAnswer.createMany({
        data: questionIds.map((qId, idx) => ({
          attemptId: att.id,
          questionId: qId,
          selectedOption: (["A", "B", "C", "D"])[idx % 4],
          clientSeq: 1,
        })),
      });

      const t0 = Date.now();
      const res = await fetch(`${BASE_URL}/api/exam/attempt/${att.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": `u_toxi_cand_${i}`,
        },
        body: JSON.stringify({ autoSubmitted: false }),
      });
      const elapsed = Date.now() - t0;
      submitsOn.push(elapsed);
    }
    await stopServer();

    const onP50 = percentile(submitsOn, 50);
    const onP95 = percentile(submitsOn, 95);
    const speedup = (offP50 / Math.max(onP50, 1)).toFixed(1);
    log(`  [${lat}ms Flags ON]  Submit p50 = ${onP50} ms, p95 = ${onP95} ms (${speedup}x speedup)`);

    results.push({
      latencyMs: lat,
      flagsOffP50: offP50,
      flagsOffP95: offP95,
      flagsOnP50: onP50,
      flagsOnP95: onP95,
      speedupP50: `${speedup}x`,
    });
  }

  // Reset toxiproxy
  await setToxiproxyLatency(0);

  const report = { results };
  fs.writeFileSync(
    path.join(EVIDENCE_DIR, "task-c-toxiproxy-results.json"),
    JSON.stringify(report, null, 2)
  );

  log("\n=== TASK C COMPLETED SUCCESSFULLY! ===");
  log(JSON.stringify(results, null, 2));

  await prisma.$disconnect();
}

runTaskC().catch((err) => {
  console.error("FATAL ERROR in Task C:", err);
  process.exit(1);
});
