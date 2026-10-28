import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import * as fs from "fs";
import * as path from "path";

process.env.DATABASE_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
process.env.DIRECT_URL = process.env.DATABASE_URL;

const prisma = new PrismaClient();
const BASE_URL = "http://127.0.0.1:3045";
const AUTH_SECRET = process.env.AUTH_SECRET || "dGhpcy1pcy1hLXRlc3Qtc2VjcmV0LWZvci1wZXJmCg==";
const EVIDENCE_DIR = path.resolve(__dirname, "../../evidence/verify");

interface ScenarioResult {
  vuCount: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  startHerdP50: number;
  startHerdP95: number;
  syncP50: number;
  syncP95: number;
  submitHerdP50: number;
  submitHerdP95: number;
  overallDurationSec: number;
  requestsPerSec: number;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

async function mintSessionCookie(userId: string, email: string): Promise<string> {
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

export async function runRealismScenario(
  vuCount: number = 50,
  thinkTimeMs: number = 10
): Promise<ScenarioResult> {
  console.log(`\n======================================================`);
  console.log(`[Task B: Realism] Starting Real Next.js Scenario (${vuCount} VUs, 100Q per user)`);
  console.log(`======================================================`);

  // 1. Fetch target 100Q test
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
  if (!testRecord) throw new Error("et_perf_100q test not found");

  const allQuestions = testRecord.sections.flatMap((s) => s.questions.map((q) => q.id));
  console.log(`[Task B] Target test "${testRecord.title}" has ${allQuestions.length} questions.`);

  // 2. Setup VUs and Mint Auth Cookies
  console.log(`[Task B] Pre-seeding ${vuCount} user accounts and minting session cookies...`);
  const candidates: Array<{ id: string; email: string; cookie: string }> = [];
  for (let i = 1; i <= vuCount; i++) {
    const id = `u_realism_${i}`;
    const email = `realism_student_${i}@trillionskill.test`;
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        id,
        email,
        name: `Realism Candidate ${i}`,
        role: "FREE",
      },
    });
    const cookie = await mintSessionCookie(id, email);
    candidates.push({ id, email, cookie });
  }

  const startHerdLatencies: number[] = [];
  const syncLatencies: number[] = [];
  const submitHerdLatencies: number[] = [];
  let successfulRequests = 0;
  let failedRequests = 0;

  const tOverallStart = Date.now();

  // --------------------------------------------------------------------------
  // Phase 1: START THUNDERING HERD (all VUs burst at once)
  // --------------------------------------------------------------------------
  console.log(`[Task B] Phase 1: Executing START THUNDERING HERD with ${vuCount} concurrent requests...`);
  const attemptMap = new Map<string, string>(); // userId -> attemptId

  const startPromises = candidates.map(async (c) => {
    const t0 = Date.now();
    try {
      const res = await fetch(`${BASE_URL}/api/exam/attempt/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: c.cookie,
        },
        body: JSON.stringify({
          testId: testRecord.id,
          language: "English",
          retake: true,
        }),
      });
      const elapsed = Date.now() - t0;
      startHerdLatencies.push(elapsed);

      if (res.ok) {
        successfulRequests++;
        const json = await res.json();
        const attemptId = json?.data?.attemptId;
        if (attemptId) attemptMap.set(c.id, attemptId);
      } else {
        failedRequests++;
        const txt = await res.text();
        console.error(`[Start Herd Fail] User ${c.id}: status ${res.status} - ${txt.slice(0, 100)}`);
      }
    } catch (err: any) {
      startHerdLatencies.push(Date.now() - t0);
      failedRequests++;
      console.error(`[Start Herd Err] User ${c.id}: ${err?.message}`);
    }
  });

  await Promise.all(startPromises);
  console.log(`[Task B] Start Herd complete: ${attemptMap.size}/${vuCount} attempts started successfully.`);

  // --------------------------------------------------------------------------
  // Phase 2: FULL 100-QUESTION ATTEMPT PER USER (100 answer sync cycles)
  // --------------------------------------------------------------------------
  console.log(`[Task B] Phase 2: Simulating 100 questions answer sync per candidate...`);
  const activeCandidates = candidates.filter((c) => attemptMap.has(c.id));

  // Run with concurrency pool across active candidates
  const concurrency = Math.min(activeCandidates.length, 25);
  let candidateIdx = 0;

  async function candidateSyncWorker() {
    while (true) {
      const idx = candidateIdx++;
      if (idx >= activeCandidates.length) break;

      const c = activeCandidates[idx];
      const attemptId = attemptMap.get(c.id)!;

      for (let qIdx = 0; qIdx < allQuestions.length; qIdx++) {
        const questionId = allQuestions[qIdx];
        const selectedOption = (["A", "B", "C", "D"])[(qIdx + idx) % 4] as "A" | "B" | "C" | "D";
        const isMarked = qIdx % 5 === 0;

        if (thinkTimeMs > 0) {
          await new Promise((r) => setTimeout(r, thinkTimeMs));
        }

        const tSync0 = Date.now();
        try {
          const res = await fetch(`${BASE_URL}/api/exam/attempt/${attemptId}/sync`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: c.cookie,
            },
            body: JSON.stringify({
              answers: [
                {
                  questionId,
                  selectedOption,
                  isMarked,
                  timeSpentSecs: 30,
                },
              ],
              sequence: qIdx + 1,
            }),
          });
          syncLatencies.push(Date.now() - tSync0);
          if (res.ok) successfulRequests++; else failedRequests++;
        } catch {
          syncLatencies.push(Date.now() - tSync0);
          failedRequests++;
        }
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => candidateSyncWorker()));
  console.log(`[Task B] Answer syncs complete. Recorded ${syncLatencies.length} sync requests.`);

  // --------------------------------------------------------------------------
  // Phase 3: SUBMIT THUNDERING HERD (all VUs submit simultaneously)
  // --------------------------------------------------------------------------
  console.log(`[Task B] Phase 3: Executing SUBMIT THUNDERING HERD with ${activeCandidates.length} requests...`);
  const submitPromises = activeCandidates.map(async (c) => {
    const attemptId = attemptMap.get(c.id)!;
    const t0 = Date.now();
    try {
      const res = await fetch(`${BASE_URL}/api/exam/attempt/${attemptId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: c.cookie,
        },
        body: JSON.stringify({ autoSubmitted: false }),
      });
      const elapsed = Date.now() - t0;
      submitHerdLatencies.push(elapsed);
      if (res.ok) successfulRequests++; else failedRequests++;
    } catch {
      submitHerdLatencies.push(Date.now() - t0);
      failedRequests++;
    }
  });

  await Promise.all(submitPromises);
  console.log(`[Task B] Submit Herd complete.`);

  // --------------------------------------------------------------------------
  // Phase 4: RESULT & LEADERBOARD FETCH
  // --------------------------------------------------------------------------
  console.log(`[Task B] Phase 4: Fetching Results and Leaderboard...`);
  const fetchPromises = activeCandidates.map(async (c) => {
    const attemptId = attemptMap.get(c.id)!;
    try {
      const [resResult, resLb] = await Promise.all([
        fetch(`${BASE_URL}/api/exam/attempt/${attemptId}/result`, { headers: { Cookie: c.cookie } }),
        fetch(`${BASE_URL}/api/exam/test/${testRecord.id}/leaderboard`, { headers: { Cookie: c.cookie } }),
      ]);
      if (resResult.ok) successfulRequests++; else failedRequests++;
      if (resLb.ok) successfulRequests++; else failedRequests++;
    } catch {
      failedRequests += 2;
    }
  });

  await Promise.all(fetchPromises);

  const overallDurationSec = (Date.now() - tOverallStart) / 1000;
  const totalRequests = startHerdLatencies.length + syncLatencies.length + submitHerdLatencies.length + (activeCandidates.length * 2);
  const requestsPerSec = Math.round((totalRequests / overallDurationSec) * 10) / 10;

  const result: ScenarioResult = {
    vuCount,
    totalRequests,
    successfulRequests,
    failedRequests,
    startHerdP50: percentile(startHerdLatencies, 50),
    startHerdP95: percentile(startHerdLatencies, 95),
    syncP50: percentile(syncLatencies, 50),
    syncP95: percentile(syncLatencies, 95),
    submitHerdP50: percentile(submitHerdLatencies, 50),
    submitHerdP95: percentile(submitHerdLatencies, 95),
    overallDurationSec: Math.round(overallDurationSec * 100) / 100,
    requestsPerSec,
  };

  fs.writeFileSync(
    path.join(EVIDENCE_DIR, "task-b-realism-results.json"),
    JSON.stringify(result, null, 2)
  );

  console.log(`\n--- Task B Execution Summary ---`);
  console.log(`Total Requests: ${totalRequests} (Success: ${successfulRequests}, Fail: ${failedRequests})`);
  console.log(`Duration: ${result.overallDurationSec}s (${result.requestsPerSec} req/s)`);
  console.log(`Start Herd: p50=${result.startHerdP50}ms, p95=${result.startHerdP95}ms`);
  console.log(`Answer Sync (100Q): p50=${result.syncP50}ms, p95=${result.syncP95}ms`);
  console.log(`Submit Herd: p50=${result.submitHerdP50}ms, p95=${result.submitHerdP95}ms`);

  await prisma.$disconnect();
  return result;
}

if (require.main === module) {
  const vuArg = process.argv[2] ? parseInt(process.argv[2], 10) : 50;
  runRealismScenario(vuArg).catch((err) => {
    console.error("FATAL in Task B runner:", err);
    process.exit(1);
  });
}
