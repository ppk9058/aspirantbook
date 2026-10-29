import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { setMockSessionProvider } from "../../auth";
import { GET } from "../../app/api/exam/attempt/[attemptId]/result/route";

const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres_password@127.0.0.1:54345/trillionskill_compact?connection_limit=10";
process.env.DATABASE_URL = dbUrl;
process.env.DIRECT_URL = dbUrl;

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

describe("Task C5c: End-to-End API Parity (Compacted vs Legacy Review)", () => {
  after(() => {
    setMockSessionProvider(null);
  });

  test("1. 20 attempts produce 100% byte-identical JSON responses between legacy and archive paths", async () => {
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

    assert.equal(attempts.length, 20);

    for (const attempt of attempts) {
      setMockSessionProvider(() => ({
        user: { id: attempt.userId, role: "USER" },
      }));

      const req = new NextRequest(`http://127.0.0.1:3045/api/exam/attempt/${attempt.id}/result`);

      // Legacy path
      process.env.EXAM_ATTEMPT_COMPACTION_ENABLED = "false";
      const resLegacy = await GET(req, { params: Promise.resolve({ attemptId: attempt.id }) });
      assert.equal(resLegacy.status, 200);
      const jsonLegacy = await resLegacy.json();
      const strLegacy = JSON.stringify(jsonLegacy);

      // Compact path
      process.env.EXAM_ATTEMPT_COMPACTION_ENABLED = "true";
      const resCompact = await GET(req, { params: Promise.resolve({ attemptId: attempt.id }) });
      assert.equal(resCompact.status, 200);
      const jsonCompact = await resCompact.json();
      const strCompact = JSON.stringify(jsonCompact);

      assert.equal(strLegacy, strCompact, `Byte mismatch for attempt ${attempt.id}`);
    }
  });
});
