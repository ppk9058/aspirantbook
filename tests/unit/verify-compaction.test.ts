import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { verifyCompaction } from "../../scripts/verify-compaction";

const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres_password@127.0.0.1:54345/trillionskill_compact?connection_limit=10";
process.env.DATABASE_URL = dbUrl;
process.env.DIRECT_URL = dbUrl;

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

describe("Task C4: Compaction Verifier Test Suite", () => {
  test("1. Verifier confirms 100% field-by-field match across archived attempts", async () => {
    const res = await verifyCompaction({
      examId: "bench_test_10k",
      sampleSize: 1000,
    });

    assert.equal(res.sampledAttempts, 1000);
    assert.equal(res.totalAnswersVerified, 100000);
    assert.equal(res.mismatches.length, 0);
  });
});
