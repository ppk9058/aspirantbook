import { encode } from "next-auth/jwt";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { guardTestDatabase } from "../../scripts/guard-test-db";

const testDbUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:testpassword123@127.0.0.1:54335/trillionskill_perf_v2_test";
guardTestDatabase(testDbUrl);

const prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
const BASE_URL = "http://127.0.0.1:3055";
const AUTH_SECRET = "dGhpcy1pcy1hLXRlc3Qtc2VjcmV0LWZvci1wZXJmCg==";

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

export async function runSmokeTest() {
  console.log(`\n======================================================`);
  console.log(`Phase 5: 10-Request Smoke Test Against Docker App Container`);
  console.log(`App URL: ${BASE_URL} | DB: ${testDbUrl}`);
  console.log(`======================================================\n`);

  // 1. Ensure user exists
  const user = await prisma.user.upsert({
    where: { email: "smoke_user@trillionskill.test" },
    update: {},
    create: {
      id: "u_smoke_test_user",
      name: "Smoke Student",
      email: "smoke_user@trillionskill.test",
      role: "FREE",
    },
  });

  const cookie = await mintCookie(user.id, user.email!);
  const headers = {
    "Content-Type": "application/json",
    Cookie: cookie,
  };

  const testRecord = await prisma.examTest.findFirst({
    where: { id: "et_perf_100q" },
    include: { sections: { include: { questions: { take: 10 } } } },
  });
  assert.ok(testRecord, "et_perf_100q must exist in loadtest DB");
  const sampleQuestions = testRecord.sections.flatMap((s) => s.questions.map((q) => q.id));

  // Request 1: Healthcheck
  console.log(`[Req 1] GET /api/health`);
  const r1 = await fetch(`${BASE_URL}/api/health`);
  assert.equal(r1.status, 200, "Health endpoint must return 200");
  const b1 = await r1.json();
  assert.equal(b1.database, "healthy");
  console.log(`  ✓ 200 OK - database healthy`);

  // Request 2: Start exam attempt
  console.log(`[Req 2] POST /api/exam/attempt/start`);
  const r2 = await fetch(`${BASE_URL}/api/exam/attempt/start`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      testId: testRecord.id,
      language: "English",
      retake: true,
    }),
  });
  if (r2.status !== 200 && r2.status !== 201) {
    const errText = await r2.text();
    console.error(`[Req 2 Error] Status ${r2.status}:`, errText);
  }
  assert.ok(r2.status === 200 || r2.status === 201, `Exam start must return 200 or 201, got ${r2.status}`);
  const b2 = await r2.json();
  const attemptId = b2?.data?.attemptId || b2?.attemptId;
  assert.ok(attemptId, "Must return valid attemptId");
  console.log(`  ✓ ${r2.status} OK - attempt created: ${attemptId}`);

  // Requests 3 - 7: Sync 5 batches of answers
  for (let b = 1; b <= 5; b++) {
    console.log(`[Req ${2 + b}] POST /api/exam/attempt/${attemptId}/sync (Batch ${b})`);
    const qId = sampleQuestions[b - 1];
    const rSync = await fetch(`${BASE_URL}/api/exam/attempt/${attemptId}/sync`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        answers: [
          {
            questionId: qId,
            selectedOption: "A",
            isMarked: false,
            timeSpentSecs: 15,
          },
        ],
        sequence: b,
      }),
    });
    assert.equal(rSync.status, 200, `Sync batch ${b} must return 200, got ${rSync.status}`);
    const bSync = await rSync.json();
    assert.ok(bSync?.data?.synced === true || bSync?.synced === true);
    console.log(`  ✓ 200 OK - batch ${b} synced cleanly`);
  }

  // Request 8: Submit attempt
  console.log(`[Req 8] POST /api/exam/attempt/${attemptId}/submit`);
  const r8 = await fetch(`${BASE_URL}/api/exam/attempt/${attemptId}/submit`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      answers: [],
    }),
  });
  assert.equal(r8.status, 200, `Submit must return 200, got ${r8.status}`);
  const b8 = await r8.json();
  const submitData = b8?.data || b8;
  assert.ok(submitData.score !== undefined);
  console.log(`  ✓ 200 OK - exam submitted and graded`);

  // Request 9: Fetch Attempt Result
  console.log(`[Req 9] GET /api/exam/attempt/${attemptId}/result`);
  const r9 = await fetch(`${BASE_URL}/api/exam/attempt/${attemptId}/result`, {
    headers,
  });
  assert.equal(r9.status, 200, `Result must return 200, got ${r9.status}`);
  const b9 = await r9.json();
  const resData = b9?.data || b9;
  assert.ok(resData.score !== undefined);
  assert.ok(resData.allIndiaRank !== null && resData.allIndiaRank >= 1);
  console.log(`  ✓ 200 OK - result retrieved (Rank: ${resData.allIndiaRank}, Score: ${resData.score})`);

  // Request 10: Fetch Test Leaderboard
  console.log(`[Req 10] GET /api/exam/${testRecord.id}/leaderboard`);
  const r10 = await fetch(`${BASE_URL}/api/exam/${testRecord.id}/leaderboard`, {
    headers,
  });
  assert.equal(r10.status, 200, `Leaderboard must return 200, got ${r10.status}`);
  const b10 = await r10.json();
  console.log("[Req 10 Leaderboard response]:", JSON.stringify(b10).slice(0, 200));
  const lbData = b10?.data || b10;
  const totalCount = lbData.totalCandidates || lbData.totalParticipants;
  assert.ok(totalCount >= 1);
  console.log(`  ✓ 200 OK - leaderboard retrieved (${totalCount} candidates, toppers count: ${lbData.toppers?.length})`);

  console.log(`\n🎉 All 10 smoke requests returned 200 OK with zero errors!`);
  await prisma.$disconnect();
}

if (require.main === module) {
  runSmokeTest().catch((err) => {
    console.error("SMOKE TEST FAILED:", err);
    process.exit(1);
  });
}
