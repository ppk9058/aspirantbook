import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { encode } from "next-auth/jwt";
import { PrismaClient } from "@prisma/client";
import { guardTestDatabase } from "../../scripts/guard-test-db";

const testDbUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:testpassword123@127.0.0.1:54335/trillionskill_perf_v2_test";
guardTestDatabase(testDbUrl);

const prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
const BASE_URL = "http://127.0.0.1:3055";
const TOXIPROXY_API = "http://127.0.0.1:8484";
const AUTH_SECRET = "dGhpcy1pcy1hLXRlc3Qtc2VjcmV0LWZvci1wZXJmCg==";
const RESULTS_DIR = path.resolve(__dirname, "results");

interface RunMetrics {
  throughputRps: number;
  syncP50: number;
  syncP95: number;
  syncP99: number;
  submitP50: number;
  submitP95: number;
  submitP99: number;
  maxDbConns: number;
  avgDbConns: number;
  cpuPercent: number;
  memoryMb: number;
}

interface CellResult {
  configName: string;
  latencyMs: number;
  iterations: RunMetrics[];
  mean: RunMetrics;
  stddev: RunMetrics;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function calcMean(vals: number[]): number {
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function calcStdDev(vals: number[], mean: number): number {
  if (vals.length <= 1) return 0;
  const variance = vals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (vals.length - 1);
  return Math.sqrt(variance);
}

async function setToxiproxyLatency(latencyMs: number) {
  try {
    await fetch(`${TOXIPROXY_API}/proxies/postgres_proxy/toxics/latency_downstream`, {
      method: "DELETE",
    });
  } catch {}

  if (latencyMs > 0) {
    const half = Math.round(latencyMs / 2);
    await fetch(`${TOXIPROXY_API}/proxies/postgres_proxy/toxics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "latency_downstream",
        type: "latency",
        stream: "downstream",
        attributes: { latency: half, jitter: 0 },
      }),
    });
  }
}

async function mintCookie(userId: string, email: string): Promise<string> {
  const token = await encode({
    token: {
      id: userId,
      sub: userId,
      email,
      role: "FREE",
      sessionVersion: 1,
    },
    secret: AUTH_SECRET,
    salt: "authjs.session-token",
  });
  return `authjs.session-token=${token}`;
}

async function restartAppContainer(flags: Record<string, string>) {
  const envPairs = Object.entries(flags)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");

  const cmd = `docker compose -f docker-compose.loadtest.yml up -d --no-deps --force-recreate app`;
  execSync(`${envPairs} ${cmd}`, { cwd: path.resolve(__dirname, "../.."), stdio: "ignore" });

  // Wait for health endpoint
  let healthy = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) {
        healthy = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!healthy) throw new Error("App failed to become healthy after container restart");
}

async function getDbConnections(): Promise<number> {
  try {
    const res = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*)::bigint AS count
      FROM pg_stat_activity
      WHERE datname = 'trillionskill_perf_v2_test'
    `;
    return Number(res[0]?.count ?? 0);
  } catch {
    return 0;
  }
}

function getContainerStats(): { cpu: number; memory: number } {
  try {
    const stdout = execSync(
      `docker stats --no-stream --format "{{.CPUPerc}},{{.MemUsage}}" trillionskill-loadtest-app`,
      { encoding: "utf-8" }
    );
    const parts = stdout.trim().split(",");
    const cpu = parseFloat(parts[0]?.replace("%", "") || "0");
    const memStr = parts[1]?.split("/")[0]?.trim() || "0MiB";
    let mem = parseFloat(memStr);
    if (memStr.includes("GiB")) mem *= 1024;
    return { cpu: isNaN(cpu) ? 0 : cpu, memory: isNaN(mem) ? 0 : mem };
  } catch {
    return { cpu: 0, memory: 0 };
  }
}

async function executeWorkload(vuCount: number = 10): Promise<RunMetrics> {
  const testRecord = await prisma.examTest.findFirst({
    where: { id: "et_perf_100q" },
    include: { sections: { include: { questions: { take: 10 } } } },
  });
  if (!testRecord) throw new Error("et_perf_100q test not found");

  const sampleQuestions = testRecord.sections.flatMap((s) => s.questions.map((q) => q.id));

  // Pre-seed VUs
  const candidates: Array<{ id: string; email: string; cookie: string }> = [];
  for (let i = 1; i <= vuCount; i++) {
    const id = `u_ablation_${i}_${Date.now()}`;
    const email = `ablation_vu_${i}_${Date.now()}@trillionskill.test`;
    await prisma.user.create({
      data: { id, email, name: `Ablation VU ${i}`, role: "FREE" },
    });
    const cookie = await mintCookie(id, email);
    candidates.push({ id, email, cookie });
  }

  const syncLatencies: number[] = [];
  const submitLatencies: number[] = [];
  const dbConnsSamples: number[] = [];
  let totalRequests = 0;

  // Monitor DB connections in background
  let stopMonitoring = false;
  const monitorPromise = (async () => {
    while (!stopMonitoring) {
      const conns = await getDbConnections();
      dbConnsSamples.push(conns);
      await new Promise((r) => setTimeout(r, 100));
    }
  })();

  const startTime = Date.now();

  // Run VUs in parallel
  await Promise.all(
    candidates.map(async (c, vuIdx) => {
      const headers = { "Content-Type": "application/json", Cookie: c.cookie };

      // 1. Start Exam
      const startRes = await fetch(`${BASE_URL}/api/exam/attempt/start`, {
        method: "POST",
        headers,
        body: JSON.stringify({ testId: testRecord.id, language: "English", retake: true }),
      });
      totalRequests++;
      if (!startRes.ok) return;

      const startBody = await startRes.json();
      const attemptId = startBody?.data?.attemptId || startBody?.attemptId;
      if (!attemptId) return;

      // 2. Answer syncs (5 batches of questions per VU)
      for (let b = 0; b < Math.min(sampleQuestions.length, 5); b++) {
        const qId = sampleQuestions[b];
        const t0 = Date.now();
        const syncRes = await fetch(`${BASE_URL}/api/exam/attempt/${attemptId}/sync`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            answers: [{ questionId: qId, selectedOption: "B", isMarked: false, timeSpentSecs: 10 }],
            sequence: b + 1,
          }),
        });
        const elapsed = Date.now() - t0;
        syncLatencies.push(elapsed);
        totalRequests++;
      }

      // 3. Submit Exam
      const tSub0 = Date.now();
      const subRes = await fetch(`${BASE_URL}/api/exam/attempt/${attemptId}/submit`, {
        method: "POST",
        headers,
        body: JSON.stringify({ answers: [] }),
      });
      const subElapsed = Date.now() - tSub0;
      submitLatencies.push(subElapsed);
      totalRequests++;

      // 4. Result & Leaderboard
      await Promise.all([
        fetch(`${BASE_URL}/api/exam/attempt/${attemptId}/result`, { headers }),
        fetch(`${BASE_URL}/api/exam/${testRecord.id}/leaderboard`, { headers }),
      ]);
      totalRequests += 2;
    })
  );

  const durationSec = Math.max(0.1, (Date.now() - startTime) / 1000);
  stopMonitoring = true;
  await monitorPromise;

  const stats = getContainerStats();
  const maxDb = dbConnsSamples.length > 0 ? Math.max(...dbConnsSamples) : 0;
  const avgDb = dbConnsSamples.length > 0 ? calcMean(dbConnsSamples) : 0;

  return {
    throughputRps: Math.round((totalRequests / durationSec) * 10) / 10,
    syncP50: percentile(syncLatencies, 50),
    syncP95: percentile(syncLatencies, 95),
    syncP99: percentile(syncLatencies, 99),
    submitP50: percentile(submitLatencies, 50),
    submitP95: percentile(submitLatencies, 95),
    submitP99: percentile(submitLatencies, 99),
    maxDbConns: maxDb,
    avgDbConns: Math.round(avgDb * 10) / 10,
    cpuPercent: Math.round(stats.cpu * 10) / 10,
    memoryMb: Math.round(stats.memory * 10) / 10,
  };
}

const configurations = [
  {
    name: "Baseline (All Flags OFF)",
    flags: {
      EXAM_RUNTIME_FAST_GRADING: "false",
      EXAM_RUNTIME_BATCH_SYNC: "false",
      EXAM_RUNTIME_CACHE_QUESTIONS: "false",
      EXAM_RUNTIME_CACHE_LEADERBOARD: "false",
      EXAM_RUNTIME_REDIS_RATELIMIT: "false",
    },
  },
  {
    name: "Single Flag: FAST_GRADING ON",
    flags: {
      EXAM_RUNTIME_FAST_GRADING: "true",
      EXAM_RUNTIME_BATCH_SYNC: "false",
      EXAM_RUNTIME_CACHE_QUESTIONS: "false",
      EXAM_RUNTIME_CACHE_LEADERBOARD: "false",
      EXAM_RUNTIME_REDIS_RATELIMIT: "false",
    },
  },
  {
    name: "Single Flag: BATCH_SYNC ON",
    flags: {
      EXAM_RUNTIME_FAST_GRADING: "false",
      EXAM_RUNTIME_BATCH_SYNC: "true",
      EXAM_RUNTIME_CACHE_QUESTIONS: "false",
      EXAM_RUNTIME_CACHE_LEADERBOARD: "false",
      EXAM_RUNTIME_REDIS_RATELIMIT: "false",
    },
  },
  {
    name: "Single Flag: CACHE_QUESTIONS ON",
    flags: {
      EXAM_RUNTIME_FAST_GRADING: "false",
      EXAM_RUNTIME_BATCH_SYNC: "false",
      EXAM_RUNTIME_CACHE_QUESTIONS: "true",
      EXAM_RUNTIME_CACHE_LEADERBOARD: "false",
      EXAM_RUNTIME_REDIS_RATELIMIT: "false",
    },
  },
  {
    name: "Single Flag: CACHE_LEADERBOARD ON",
    flags: {
      EXAM_RUNTIME_FAST_GRADING: "false",
      EXAM_RUNTIME_BATCH_SYNC: "false",
      EXAM_RUNTIME_CACHE_QUESTIONS: "false",
      EXAM_RUNTIME_CACHE_LEADERBOARD: "true",
      EXAM_RUNTIME_REDIS_RATELIMIT: "false",
    },
  },
  {
    name: "All Flags ON",
    flags: {
      EXAM_RUNTIME_FAST_GRADING: "true",
      EXAM_RUNTIME_BATCH_SYNC: "true",
      EXAM_RUNTIME_CACHE_QUESTIONS: "true",
      EXAM_RUNTIME_CACHE_LEADERBOARD: "true",
      EXAM_RUNTIME_REDIS_RATELIMIT: "true",
    },
  },
];

const latencies = [0, 20, 40];
const ITERATIONS = 5;

export async function runAblationMatrix() {
  console.log(`\n======================================================`);
  console.log(`Phase 5: Real-Build Load Test Ablation Matrix`);
  console.log(`Configs: ${configurations.length} | Latencies: ${latencies.join(", ")} ms | Repetitions: ${ITERATIONS}`);
  console.log(`======================================================\n`);

  const results: CellResult[] = [];

  for (const config of configurations) {
    console.log(`\n------------------------------------------------------`);
    console.log(`Applying Configuration: ${config.name}`);
    await restartAppContainer(config.flags);

    for (const lat of latencies) {
      console.log(`[Ablation] Testing ${config.name} @ Latency ${lat}ms (${ITERATIONS} iterations)...`);
      await setToxiproxyLatency(lat);

      const cellRuns: RunMetrics[] = [];
      for (let i = 1; i <= ITERATIONS; i++) {
        const run = await executeWorkload(8); // 8 concurrent candidates
        cellRuns.push(run);
        process.stdout.write(`  Run ${i}/${ITERATIONS}: sync_p95=${run.syncP95}ms, submit_p95=${run.submitP95}ms, ${run.throughputRps} rps\n`);
      }

      // Compute mean and stddev across iterations
      const mean: RunMetrics = {
        throughputRps: Math.round(calcMean(cellRuns.map((r) => r.throughputRps)) * 10) / 10,
        syncP50: Math.round(calcMean(cellRuns.map((r) => r.syncP50))),
        syncP95: Math.round(calcMean(cellRuns.map((r) => r.syncP95))),
        syncP99: Math.round(calcMean(cellRuns.map((r) => r.syncP99))),
        submitP50: Math.round(calcMean(cellRuns.map((r) => r.submitP50))),
        submitP95: Math.round(calcMean(cellRuns.map((r) => r.submitP95))),
        submitP99: Math.round(calcMean(cellRuns.map((r) => r.submitP99))),
        maxDbConns: Math.max(...cellRuns.map((r) => r.maxDbConns)),
        avgDbConns: Math.round(calcMean(cellRuns.map((r) => r.avgDbConns)) * 10) / 10,
        cpuPercent: Math.round(calcMean(cellRuns.map((r) => r.cpuPercent)) * 10) / 10,
        memoryMb: Math.round(calcMean(cellRuns.map((r) => r.memoryMb)) * 10) / 10,
      };

      const stddev: RunMetrics = {
        throughputRps: Math.round(calcStdDev(cellRuns.map((r) => r.throughputRps), mean.throughputRps) * 10) / 10,
        syncP50: Math.round(calcStdDev(cellRuns.map((r) => r.syncP50), mean.syncP50)),
        syncP95: Math.round(calcStdDev(cellRuns.map((r) => r.syncP95), mean.syncP95)),
        syncP99: Math.round(calcStdDev(cellRuns.map((r) => r.syncP99), mean.syncP99)),
        submitP50: Math.round(calcStdDev(cellRuns.map((r) => r.submitP50), mean.submitP50)),
        submitP95: Math.round(calcStdDev(cellRuns.map((r) => r.submitP95), mean.submitP95)),
        submitP99: Math.round(calcStdDev(cellRuns.map((r) => r.submitP99), mean.submitP99)),
        maxDbConns: Math.round(calcStdDev(cellRuns.map((r) => r.maxDbConns), mean.maxDbConns) * 10) / 10,
        avgDbConns: Math.round(calcStdDev(cellRuns.map((r) => r.avgDbConns), mean.avgDbConns) * 10) / 10,
        cpuPercent: Math.round(calcStdDev(cellRuns.map((r) => r.cpuPercent), mean.cpuPercent) * 10) / 10,
        memoryMb: Math.round(calcStdDev(cellRuns.map((r) => r.memoryMb), mean.memoryMb) * 10) / 10,
      };

      results.push({
        configName: config.name,
        latencyMs: lat,
        iterations: cellRuns,
        mean,
        stddev,
      });

      console.log(`  => SUMMARY: Throughput: ${mean.throughputRps} ± ${stddev.throughputRps} rps | Sync P95: ${mean.syncP95} ± ${stddev.syncP95} ms | Submit P95: ${mean.submitP95} ± ${stddev.submitP95} ms | Max DB: ${mean.maxDbConns}`);
    }
  }

  // Save summary JSON
  const summaryPath = path.join(RESULTS_DIR, "ablation-summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2), "utf-8");
  console.log(`\n✅ Ablation matrix results written to ${summaryPath}`);

  // Reset toxiproxy latency
  await setToxiproxyLatency(0);
  await prisma.$disconnect();
}

if (require.main === module) {
  runAblationMatrix().catch((err) => {
    console.error("Ablation matrix run failed:", err);
    process.exit(1);
  });
}
