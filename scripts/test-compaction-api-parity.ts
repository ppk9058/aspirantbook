/**
 * scripts/test-compaction-api-parity.ts
 *
 * Verifies end-to-end byte-identical parity for GET /api/exam/attempt/[attemptId]/result
 * between EXAM_ATTEMPT_COMPACTION_ENABLED=false (legacy N-row query) and
 * EXAM_ATTEMPT_COMPACTION_ENABLED=true (compacted archive query) across 20 attempts.
 */

import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { setMockSessionProvider } from "../auth";
import { GET } from "../app/api/exam/attempt/[attemptId]/result/route";

const prisma = new PrismaClient();

async function run() {
  console.log("[API-PARITY] Selecting 20 attempts for byte-identical parity check...");

  const attempts = await prisma.examAttempt.findMany({
    where: {
      testId: "bench_test_10k",
      archive: { isNot: null },
      answers: { some: {} },
    },
    take: 20,
    select: {
      id: true,
      userId: true,
    },
  });

  if (attempts.length < 20) {
    throw new Error(`Insufficient attempts found: expected 20, found ${attempts.length}`);
  }

  let matched = 0;

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];

    // Set mock authenticated user matching attempt owner
    setMockSessionProvider(() => ({
      user: { id: attempt.userId, role: "USER" },
    }));

    const req = new NextRequest(`http://127.0.0.1:3045/api/exam/attempt/${attempt.id}/result`);

    // 1. Fetch under legacy path (EXAM_ATTEMPT_COMPACTION_ENABLED=false)
    process.env.EXAM_ATTEMPT_COMPACTION_ENABLED = "false";
    const resLegacy = await GET(req, { params: Promise.resolve({ attemptId: attempt.id }) });
    if (resLegacy.status !== 200) {
      throw new Error(`Legacy path returned status ${resLegacy.status} for attempt ${attempt.id}`);
    }
    const jsonLegacy = await resLegacy.json();
    const strLegacy = JSON.stringify(jsonLegacy);

    // 2. Fetch under compaction path (EXAM_ATTEMPT_COMPACTION_ENABLED=true)
    process.env.EXAM_ATTEMPT_COMPACTION_ENABLED = "true";
    const resCompact = await GET(req, { params: Promise.resolve({ attemptId: attempt.id }) });
    if (resCompact.status !== 200) {
      throw new Error(`Compact path returned status ${resCompact.status} for attempt ${attempt.id}`);
    }
    const jsonCompact = await resCompact.json();
    const strCompact = JSON.stringify(jsonCompact);

    // 3. Strict byte-by-byte comparison
    if (strLegacy !== strCompact) {
      console.error(`[MISMATCH] Attempt ${attempt.id} responses differ!`);
      console.error(`Legacy length: ${strLegacy.length}, Compact length: ${strCompact.length}`);
      console.error("Last 200 chars legacy:", strLegacy.slice(-200));
      console.error("Last 200 chars compact:", strCompact.slice(-200));
      throw new Error(`Byte parity failure on attempt ${attempt.id}`);
    }

    matched++;
  }

  console.log(`[API-PARITY] SUCCESS: All 20/20 attempts produced 100% byte-identical JSON responses.`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[API-PARITY FAILED]", err);
    process.exit(1);
  })
  .finally(() => {
    setMockSessionProvider(null);
    prisma.$disconnect();
  });
