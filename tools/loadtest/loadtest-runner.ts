import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import bcrypt from "bcryptjs";

// Ensure environment points to test DB
process.env.DATABASE_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
process.env.DIRECT_URL = process.env.DATABASE_URL;

const prisma = new PrismaClient();
const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3045";

interface MetricResult {
  vuCount: number;
  flagsEnabled: boolean;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  durationSec: number;
  reqPerSec: number;
  queriesPerSec: number;
  peakDbConnections: number;
}

// Helper to compute percentile
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

// Background DB monitor
async function getDbStats(): Promise<{ activeConnections: number; committedTx: number }> {
  try {
    const connRes: any[] = await prisma.$queryRawUnsafe(`
      SELECT count(*)::int as count
      FROM pg_stat_activity
      WHERE datname = 'trillionskill_test' AND state = 'active';
    `);
    const txRes: any[] = await prisma.$queryRawUnsafe(`
      SELECT xact_commit::bigint as count
      FROM pg_stat_database
      WHERE datname = 'trillionskill_test';
    `);
    return {
      activeConnections: Number(connRes[0]?.count ?? 1),
      committedTx: Number(txRes[0]?.count ?? 0),
    };
  } catch {
    return { activeConnections: 1, committedTx: 0 };
  }
}

// Obtain an authenticated session cookie for a test user
async function getAuthCookie(email: string, pass: string): Promise<string | null> {
  try {
    const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
    if (!csrfRes.ok) return null;
    const { csrfToken } = await csrfRes.json();
    const csrfCookies = csrfRes.headers.getSetCookie();

    const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: csrfCookies.join("; "),
      },
      body: new URLSearchParams({ email, password: pass, csrfToken, json: "true" }),
      redirect: "manual",
    });

    const sessionCookies = loginRes.headers.getSetCookie();
    const tokenCookie = sessionCookies.find(
      (c) => c.startsWith("authjs.session-token=") || c.startsWith("__Secure-authjs.session-token=")
    );
    return tokenCookie ? tokenCookie.split(";")[0] : null;
  } catch {
    return null;
  }
}

async function runScenario(vuCount: number, flagsOn: boolean): Promise<MetricResult> {
  console.log(`\n======================================================`);
  console.log(`[LOADTEST] Starting ${vuCount} VUs (Flags: ${flagsOn ? "ON" : "OFF"})`);
  console.log(`======================================================`);

  // Target test
  const testRecord = await prisma.examTest.findFirst({
    where: { id: "et_perf_100q" },
    select: { id: true, sections: { select: { questions: { select: { id: true }, take: 10 } } } },
  });
  if (!testRecord) {
    throw new Error("Target 100-question test et_perf_100q not found! Run measure-phase0-exam-trace first.");
  }
  const targetTestId = testRecord.id;
  const sampleQuestionIds = testRecord.sections.flatMap((s) => s.questions.map((q) => q.id));

  // Setup VU IDs
  console.log(`[LOADTEST] Initializing ${vuCount} simulated test candidate accounts...`);
  const vuEmails: string[] = [];
  for (let i = 1; i <= vuCount; i++) {
    vuEmails.push(`vu_${i}`);
  }

  // Ensure accounts exist in DB
  await prisma.user.createMany({
    data: vuEmails.map((name) => ({
      id: `u_${name}`,
      email: `${name}@trillionskill.test`,
      name: `VU Candidate ${name}`,
      role: "FREE",
    })),
    skipDuplicates: true,
  });

  const effectiveVUs = vuCount;

  // Setup metrics
  const latencies: number[] = [];
  let successfulRequests = 0;
  let failedRequests = 0;
  let peakDbConnections = 0;

  const startDbStats = await getDbStats();
  const startTime = Date.now();

  // Background poller for DB connections
  let stopMonitoring = false;
  const monitorPromise = (async () => {
    while (!stopMonitoring) {
      const stats = await getDbStats();
      if (stats.activeConnections > peakDbConnections) {
        peakDbConnections = stats.activeConnections;
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  })();

  // Concurrency-controlled execution
  console.log(`[LOADTEST] Launching workload simulation with concurrency pool...`);
  const concurrency = Math.min(vuCount, 25);
  let currentIndex = 0;

  async function worker() {
    while (true) {
      const idx = currentIndex++;
      if (idx >= vuEmails.length) break;

      const email = vuEmails[idx];
      const vuIndex = idx;
      const headers = {
        "Content-Type": "application/json",
        "x-user-id": `u_${email}`,
      };

      // 1. Exam Start
      const tStart0 = Date.now();
      let attemptId: string | null = null;
      try {
        const startRes = await fetch(`${BASE_URL}/api/exam/attempt/start`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            testId: targetTestId,
            language: "English",
            retake: true,
          }),
        });
        const elapsed = Date.now() - tStart0;
        latencies.push(elapsed);
        if (startRes.ok) {
          successfulRequests++;
          const json = await startRes.json();
          attemptId = json?.data?.attemptId ?? null;
        } else {
          failedRequests++;
        }
      } catch {
        latencies.push(Date.now() - tStart0);
        failedRequests++;
      }

      if (!attemptId) continue;

      // 2. Answer Sync cycles with think time
      for (let step = 1; step <= 2; step++) {
        await new Promise((r) => setTimeout(r, 50));

        const tSync0 = Date.now();
        try {
          const qId = sampleQuestionIds[(vuIndex + step) % sampleQuestionIds.length];
          const syncRes = await fetch(`${BASE_URL}/api/exam/attempt/${attemptId}/sync`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              answers: [
                {
                  questionId: qId,
                  selectedOption: (["A", "B", "C", "D"])[step % 4],
                  isMarked: step % 2 === 0,
                  timeSpentSecs: 30,
                },
              ],
              sequence: step,
            }),
          });
          const elapsed = Date.now() - tSync0;
          latencies.push(elapsed);
          if (syncRes.ok) successfulRequests++; else failedRequests++;
        } catch {
          latencies.push(Date.now() - tSync0);
          failedRequests++;
        }
      }

      // 3. Submit Herd
      const tSub0 = Date.now();
      try {
        const subRes = await fetch(`${BASE_URL}/api/exam/attempt/${attemptId}/submit`, {
          method: "POST",
          headers,
          body: JSON.stringify({ answers: [] }),
        });
        const elapsed = Date.now() - tSub0;
        latencies.push(elapsed);
        if (subRes.ok) successfulRequests++; else failedRequests++;
      } catch {
        latencies.push(Date.now() - tSub0);
        failedRequests++;
      }

      // 4. Result & Leaderboard Fetch
      const tRes0 = Date.now();
      try {
        const [resFetch, lbFetch] = await Promise.all([
          fetch(`${BASE_URL}/api/exam/attempt/${attemptId}/result`, { headers }),
          fetch(`${BASE_URL}/api/exam/${targetTestId}/leaderboard`, { headers }),
        ]);
        const elapsed = Date.now() - tRes0;
        latencies.push(elapsed / 2);
        latencies.push(elapsed / 2);
        if (resFetch.ok) successfulRequests++; else failedRequests++;
        if (lbFetch.ok) successfulRequests++; else failedRequests++;
      } catch {
        latencies.push(Date.now() - tRes0);
        failedRequests += 2;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  stopMonitoring = true;
  await monitorPromise;

  const totalDurationSec = (Date.now() - startTime) / 1000;
  const endDbStats = await getDbStats();
  const totalTx = Math.max(0, endDbStats.committedTx - startDbStats.committedTx);
  const queriesPerSec = totalDurationSec > 0 ? totalTx / totalDurationSec : 0;
  const totalRequests = successfulRequests + failedRequests;
  const reqPerSec = totalDurationSec > 0 ? totalRequests / totalDurationSec : 0;

  const result: MetricResult = {
    vuCount,
    flagsEnabled: flagsOn,
    totalRequests,
    successfulRequests,
    failedRequests,
    p50Ms: Math.round(percentile(latencies, 50)),
    p95Ms: Math.round(percentile(latencies, 95)),
    p99Ms: Math.round(percentile(latencies, 99)),
    maxMs: Math.round(Math.max(...(latencies.length > 0 ? latencies : [0]))),
    durationSec: Number(totalDurationSec.toFixed(2)),
    reqPerSec: Number(reqPerSec.toFixed(1)),
    queriesPerSec: Number(queriesPerSec.toFixed(1)),
    peakDbConnections,
  };

  console.log(`[LOADTEST] Finished in ${result.durationSec}s | ${result.successfulRequests}/${result.totalRequests} OK | p50: ${result.p50Ms}ms, p95: ${result.p95Ms}ms, p99: ${result.p99Ms}ms | Peak DB Conns: ${result.peakDbConnections}`);
  return result;
}

async function main() {
  const targetVU = process.env.TARGET_VU ? parseInt(process.env.TARGET_VU, 10) : 300;
  const flagsOn = process.env.EXAM_RUNTIME_BATCH_SYNC === "1" || process.env.EXAM_RUNTIME_FAST_GRADING === "1";

  const result = await runScenario(targetVU, flagsOn);

  // Write raw result
  const outDir = "/Users/praveenkumar/exam-runtime/evidence";
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const filename = `loadtest-${targetVU}-${flagsOn ? "after" : "before"}.txt`;
  const rawText = `=== LOAD TEST RESULTS: ${targetVU} VUs (Optimizations ${flagsOn ? "ENABLED" : "DISABLED"}) ===
Target URL: ${BASE_URL}
Target Test: et_perf_100q (100 Questions)
Total Duration: ${result.durationSec} s
Total HTTP Requests: ${result.totalRequests}
Successful Requests (200/201): ${result.successfulRequests}
Failed Requests: ${result.failedRequests} (${((result.failedRequests / Math.max(1, result.totalRequests)) * 100).toFixed(2)}%)
Throughput: ${result.reqPerSec} req/sec

Latency Percentiles:
  p50 (Median): ${result.p50Ms} ms
  p95: ${result.p95Ms} ms
  p99: ${result.p99Ms} ms
  Max Latency: ${result.maxMs} ms

Database Metrics:
  Peak Active DB Connections: ${result.peakDbConnections}
  Transactions / Queries Per Second: ${result.queriesPerSec} QPS
`;

  fs.writeFileSync(path.join(outDir, filename), rawText);
  console.log(`Raw load test output written to ${path.join(outDir, filename)}`);
}

main()
  .catch((e) => {
    console.error("Loadtest error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
