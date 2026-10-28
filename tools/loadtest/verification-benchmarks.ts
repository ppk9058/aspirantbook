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

interface RunStats {
  vuCount: number;
  label: string;
  flags: Record<string, boolean>;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  durationSec: number;
  reqPerSec: number;
  peakDbConnections: number;
}

function log(msg: string) {
  process.stdout.write(msg + "\n");
  try {
    fs.appendFileSync(path.join(EVIDENCE_DIR, "task-a-benchmarks.txt"), msg + "\n");
  } catch {}
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

async function getDbConnections(): Promise<number> {
  try {
    const res: any[] = await prisma.$queryRawUnsafe(`
      SELECT count(*)::int as count
      FROM pg_stat_activity
      WHERE datname = 'trillionskill_test' AND state = 'active';
    `);
    return Number(res[0]?.count ?? 1);
  } catch {
    return 1;
  }
}

async function setToxiproxyLatency(latencyMs: number) {
  try {
    // Delete existing latency toxic if any
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

async function stopServer(proc?: ChildProcess) {
  try {
    const { execSync } = require("child_process");
    execSync("lsof -ti :3045 -sTCP:LISTEN | xargs kill -9 2>/dev/null || true");
  } catch {}
  await new Promise((r) => setTimeout(r, 800));
}

// Start test-server with specific env flags
async function startServer(
  envFlags: Record<string, string>,
  dbPort: number = 54329
): Promise<ChildProcess> {
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

  // Wait for server health
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) {
        return proc;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("Server failed to become healthy on port 3045");
}

// Workload simulator: start -> 2 syncs -> submit -> result -> leaderboard
async function executeWorkload(
  vuCount: number,
  label: string,
  flags: Record<string, boolean>
): Promise<RunStats> {
  // Clean prior attempts for this test candidate pool to ensure consistent benchmark baseline
  await prisma.examAttemptAnswer.deleteMany({ where: { attempt: { userId: { startsWith: "u_vu_bench_" } } } });
  await prisma.examAttempt.deleteMany({ where: { userId: { startsWith: "u_vu_bench_" } } });

  const testRecord = await prisma.examTest.findFirst({
    where: { id: "et_perf_100q" },
    select: { id: true, sections: { select: { questions: { select: { id: true }, take: 10 } } } },
  });
  if (!testRecord) throw new Error("et_perf_100q test fixture missing");
  const sampleQuestionIds = testRecord.sections.flatMap((s) => s.questions.map((q) => q.id));

  // Pre-seed users
  const vuEmails: string[] = [];
  for (let i = 1; i <= vuCount; i++) vuEmails.push(`vu_bench_${i}`);
  await prisma.user.createMany({
    data: vuEmails.map((name) => ({
      id: `u_${name}`,
      email: `${name}@trillionskill.test`,
      name: `VU Candidate ${name}`,
      role: "FREE",
    })),
    skipDuplicates: true,
  });

  const latencies: number[] = [];
  let successfulRequests = 0;
  let failedRequests = 0;
  let peakDbConnections = 0;

  // DB monitor
  let stopMonitor = false;
  const monitorPromise = (async () => {
    while (!stopMonitor) {
      const conns = await getDbConnections();
      if (conns > peakDbConnections) peakDbConnections = conns;
      await new Promise((r) => setTimeout(r, 250));
    }
  })();

  const startTime = Date.now();
  const concurrency = Math.min(vuCount, 30);
  let currentIndex = 0;

  async function worker() {
    while (true) {
      const idx = currentIndex++;
      if (idx >= vuEmails.length) break;

      const email = vuEmails[idx];
      const headers = {
        "Content-Type": "application/json",
        "x-user-id": `u_${email}`,
      };

      // 1. Start
      let attemptId: string | null = null;
      const t0 = Date.now();
      try {
        const res = await fetch(`${BASE_URL}/api/exam/attempt/start`, {
          method: "POST",
          headers,
          body: JSON.stringify({ testId: testRecord!.id, language: "English", retake: true }),
        });
        latencies.push(Date.now() - t0);
        if (res.ok) {
          successfulRequests++;
          const json = await res.json();
          attemptId = json?.data?.attemptId ?? null;
        } else {
          failedRequests++;
        }
      } catch {
        latencies.push(Date.now() - t0);
        failedRequests++;
      }

      if (!attemptId) continue;

      // 2. Answer syncs (2 cycles)
      for (let s = 1; s <= 2; s++) {
        const tSync = Date.now();
        try {
          const qId = sampleQuestionIds[(idx + s) % sampleQuestionIds.length];
          const res = await fetch(`${BASE_URL}/api/exam/attempt/${attemptId}/sync`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              answers: [
                {
                  questionId: qId,
                  selectedOption: (["A", "B", "C", "D"])[s % 4],
                  isMarked: s % 2 === 0,
                  timeSpentSecs: 30,
                },
              ],
              sequence: s,
            }),
          });
          latencies.push(Date.now() - tSync);
          if (res.ok) successfulRequests++; else failedRequests++;
        } catch {
          latencies.push(Date.now() - tSync);
          failedRequests++;
        }
      }

      // 3. Submit
      const tSub = Date.now();
      try {
        const res = await fetch(`${BASE_URL}/api/exam/attempt/${attemptId}/submit`, {
          method: "POST",
          headers,
          body: JSON.stringify({ autoSubmitted: false }),
        });
        latencies.push(Date.now() - tSub);
        if (res.ok) successfulRequests++; else failedRequests++;
      } catch {
        latencies.push(Date.now() - tSub);
        failedRequests++;
      }

      // 4. Result
      const tRes = Date.now();
      try {
        const res = await fetch(`${BASE_URL}/api/exam/attempt/${attemptId}/result`, { headers });
        latencies.push(Date.now() - tRes);
        if (res.ok) successfulRequests++; else failedRequests++;
      } catch {
        latencies.push(Date.now() - tRes);
        failedRequests++;
      }

      // 5. Leaderboard
      const tLb = Date.now();
      try {
        const res = await fetch(`${BASE_URL}/api/exam/${testRecord!.id}/leaderboard`, { headers });
        latencies.push(Date.now() - tLb);
        if (res.ok) successfulRequests++; else failedRequests++;
      } catch {
        latencies.push(Date.now() - tLb);
        failedRequests++;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  stopMonitor = true;
  await monitorPromise;

  const durationSec = (Date.now() - startTime) / 1000;
  const totalRequests = latencies.length;
  const reqPerSec = Math.round((totalRequests / durationSec) * 10) / 10;

  return {
    vuCount,
    label,
    flags,
    totalRequests,
    successfulRequests,
    failedRequests,
    p50Ms: percentile(latencies, 50),
    p95Ms: percentile(latencies, 95),
    p99Ms: percentile(latencies, 99),
    maxMs: Math.max(...latencies, 0),
    durationSec: Math.round(durationSec * 100) / 100,
    reqPerSec,
    peakDbConnections,
  };
}

async function runBenchmarkSuite() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  log("\n=== STARTING FULL INDEPENDENT VERIFICATION BENCHMARK SUITE ===");

  const flagsAllOff: Record<string, string> = {
    EXAM_RUNTIME_BATCH_SYNC: "0",
    EXAM_RUNTIME_FAST_GRADING: "0",
    EXAM_RUNTIME_CACHE_QUESTIONS: "0",
    EXAM_RUNTIME_CACHE_LEADERBOARD: "0",
    EXAM_RUNTIME_REDIS_RATELIMIT: "0",
  };

  const flagsAllOn: Record<string, string> = {
    EXAM_RUNTIME_BATCH_SYNC: "1",
    EXAM_RUNTIME_FAST_GRADING: "1",
    EXAM_RUNTIME_CACHE_QUESTIONS: "1",
    EXAM_RUNTIME_CACHE_LEADERBOARD: "1",
    EXAM_RUNTIME_REDIS_RATELIMIT: "1",
  };

  // --------------------------------------------------------------------------
  // TASK A: REPRODUCIBILITY (5 runs alternating at 300 VUs and 1000 VUs)
  // --------------------------------------------------------------------------
  log("\n--- Task A: 300 VUs Alternating Runs (5 OFF vs 5 ON) ---");
  const runs300Off: RunStats[] = [];
  const runs300On: RunStats[] = [];

  for (let round = 1; round <= 5; round++) {
    log(`[Task A 300 VU] Round ${round}: Running flags OFF...`);
    let server = await startServer(flagsAllOff);
    const statOff = await executeWorkload(300, `300vu_off_r${round}`, { allFlags: false });
    await stopServer(server);
    runs300Off.push(statOff);
    log(`  OFF r${round}: p50=${statOff.p50Ms}ms, p95=${statOff.p95Ms}ms, p99=${statOff.p99Ms}ms, dur=${statOff.durationSec}s`);

    log(`[Task A 300 VU] Round ${round}: Running flags ON...`);
    server = await startServer(flagsAllOn);
    const statOn = await executeWorkload(300, `300vu_on_r${round}`, { allFlags: true });
    await stopServer(server);
    runs300On.push(statOn);
    log(`  ON  r${round}: p50=${statOn.p50Ms}ms, p95=${statOn.p95Ms}ms, p99=${statOn.p99Ms}ms, dur=${statOn.durationSec}s`);
  }

  log("\n--- Task A: 1000 VUs Alternating Runs (5 OFF vs 5 ON) ---");
  const runs1000Off: RunStats[] = [];
  const runs1000On: RunStats[] = [];

  for (let round = 1; round <= 5; round++) {
    log(`[Task A 1000 VU] Round ${round}: Running flags OFF...`);
    let server = await startServer(flagsAllOff);
    const statOff = await executeWorkload(1000, `1000vu_off_r${round}`, { allFlags: false });
    await stopServer(server);
    runs1000Off.push(statOff);
    log(`  OFF r${round}: p50=${statOff.p50Ms}ms, p95=${statOff.p95Ms}ms, p99=${statOff.p99Ms}ms, dur=${statOff.durationSec}s`);

    log(`[Task A 1000 VU] Round ${round}: Running flags ON...`);
    server = await startServer(flagsAllOn);
    const statOn = await executeWorkload(1000, `1000vu_on_r${round}`, { allFlags: true });
    await stopServer(server);
    runs1000On.push(statOn);
    log(`  ON  r${round}: p50=${statOn.p50Ms}ms, p95=${statOn.p95Ms}ms, p99=${statOn.p99Ms}ms, dur=${statOn.durationSec}s`);
  }

  log("\n--- Task A: Flag Ablation (300 VUs, one flag enabled alone) ---");
  const ablationFlags: Record<string, string>[] = [
    { EXAM_RUNTIME_BATCH_SYNC: "1" },
    { EXAM_RUNTIME_FAST_GRADING: "1" },
    { EXAM_RUNTIME_CACHE_QUESTIONS: "1" },
    { EXAM_RUNTIME_CACHE_LEADERBOARD: "1" },
    { EXAM_RUNTIME_REDIS_RATELIMIT: "1" },
  ];
  const ablationResults: RunStats[] = [];

  for (const flagObj of ablationFlags) {
    const flagName = Object.keys(flagObj)[0];
    const envConfig = { ...flagsAllOff, [flagName]: "1" };
    log(`[Ablation] Testing ${flagName}=1 alone...`);
    const server = await startServer(envConfig);
    const stat = await executeWorkload(300, `ablation_${flagName}`, { [flagName]: true });
    await stopServer(server);
    ablationResults.push(stat);
    log(`  ${flagName}=1: p50=${stat.p50Ms}ms, p95=${stat.p95Ms}ms, p99=${stat.p99Ms}ms, dur=${stat.durationSec}s`);
  }

  log("\n--- Task C: Remote-DB Latency via Toxiproxy (Port 54330) ---");
  const latenciesToTest = [0, 20, 40];
  const toxiproxyResults: Array<{
    latencyMs: number;
    flagsOffSubmitP50: number;
    flagsOffSubmitP95: number;
    flagsOnSubmitP50: number;
    flagsOnSubmitP95: number;
  }> = [];

  for (const lat of latenciesToTest) {
    log(`[Task C] Setting Toxiproxy added latency to ${lat}ms...`);
    await setToxiproxyLatency(lat);

    log(`[Task C ${lat}ms] Running submit herd Flags OFF...`);
    let server = await startServer(flagsAllOff, 54330);
    const submitsOff: number[] = [];
    for (let i = 1; i <= 20; i++) {
      const att = await prisma.examAttempt.create({
        data: { userId: `u_vu_bench_${i}`, testId: "et_perf_100q", status: "IN_PROGRESS", startedAt: new Date() },
      });
      for (let q = 1; q <= 20; q++) {
        await prisma.examAttemptAnswer.create({
          data: { attemptId: att.id, questionId: `q_p0_${q}`, selectedOption: "A", clientSeq: 1 },
        });
      }
      const t0 = Date.now();
      await fetch(`${BASE_URL}/api/exam/attempt/${att.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": `u_vu_bench_${i}` },
        body: JSON.stringify({ autoSubmitted: false }),
      });
      submitsOff.push(Date.now() - t0);
    }
    await stopServer(server);

    log(`[Task C ${lat}ms] Running submit herd Flags ON...`);
    server = await startServer(flagsAllOn, 54330);
    const submitsOn: number[] = [];
    for (let i = 1; i <= 20; i++) {
      const att = await prisma.examAttempt.create({
        data: { userId: `u_vu_bench_${i}`, testId: "et_perf_100q", status: "IN_PROGRESS", startedAt: new Date() },
      });
      for (let q = 1; q <= 20; q++) {
        await prisma.examAttemptAnswer.create({
          data: { attemptId: att.id, questionId: `q_p0_${q}`, selectedOption: "A", clientSeq: 1 },
        });
      }
      const t0 = Date.now();
      await fetch(`${BASE_URL}/api/exam/attempt/${att.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": `u_vu_bench_${i}` },
        body: JSON.stringify({ autoSubmitted: false }),
      });
      submitsOn.push(Date.now() - t0);
    }
    await stopServer(server);

    toxiproxyResults.push({
      latencyMs: lat,
      flagsOffSubmitP50: percentile(submitsOff, 50),
      flagsOffSubmitP95: percentile(submitsOff, 95),
      flagsOnSubmitP50: percentile(submitsOn, 50),
      flagsOnSubmitP95: percentile(submitsOn, 95),
    });
    log(`  ${lat}ms Added Latency -> Submit Latency (Flags OFF vs ON): p50=${percentile(submitsOff, 50)}ms vs ${percentile(submitsOn, 50)}ms; p95=${percentile(submitsOff, 95)}ms vs ${percentile(submitsOn, 95)}ms`);
  }

  await setToxiproxyLatency(0);

  const finalReport = {
    runs300Off,
    runs300On,
    runs1000Off,
    runs1000On,
    ablationResults,
    toxiproxyResults,
  };

  fs.writeFileSync(
    path.join(EVIDENCE_DIR, "task-a-reproducibility-and-ablation.json"),
    JSON.stringify(finalReport, null, 2)
  );

  log("\n=== BENCHMARK SUITE COMPLETE! Raw evidence written to task-a-reproducibility-and-ablation.json ===");
  await prisma.$disconnect();
}

runBenchmarkSuite().catch((err) => {
  console.error("FATAL ERROR in benchmark runner:", err);
  fs.writeFileSync(path.join(EVIDENCE_DIR, "task-a-fatal-error.txt"), err?.stack || String(err));
  process.exit(1);
});
