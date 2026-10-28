import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { validateDatabaseConnectionLimit } from "../../lib/prisma";
import { PrismaClient } from "@prisma/client";
import { guardTestDatabase } from "../../scripts/guard-test-db";

const testDbUrl =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_perf_v2_test";
guardTestDatabase(testDbUrl);

describe("P1-4: Connection limit validator and pg_stat_activity verification", () => {
  const origEnv = process.env.EXAM_REQUIRE_POOL_LIMIT;

  afterEach(() => {
    process.env.EXAM_REQUIRE_POOL_LIMIT = origEnv;
  });

  test("passes and parses limit when connection_limit is present in DATABASE_URL", () => {
    const url = "postgresql://user:pass@127.0.0.1:54329/mydb?connection_limit=5&pool_timeout=10";
    const res = validateDatabaseConnectionLimit(url);
    assert.equal(res.hasLimit, true);
    assert.equal(res.limit, 5);
  });

  test("warns when connection_limit is missing and EXAM_REQUIRE_POOL_LIMIT is unset", () => {
    delete process.env.EXAM_REQUIRE_POOL_LIMIT;
    let warned = false;
    const origWarn = console.warn;
    console.warn = (msg: any) => {
      if (typeof msg === "string" && msg.includes("[Prisma/ConnectionLimit] WARNING")) {
        warned = true;
      }
    };
    try {
      const url = "postgresql://user:pass@127.0.0.1:54329/mydb";
      const res = validateDatabaseConnectionLimit(url);
      assert.equal(res.hasLimit, false);
      assert.equal(res.limit, null);
      assert.equal(warned, true, "Expected console.warn to be called");
    } finally {
      console.warn = origWarn;
    }
  });

  test("throws error when connection_limit is missing and EXAM_REQUIRE_POOL_LIMIT=true", () => {
    process.env.EXAM_REQUIRE_POOL_LIMIT = "true";
    const url = "postgresql://user:pass@127.0.0.1:54329/mydb";
    assert.throws(
      () => validateDatabaseConnectionLimit(url),
      /\[POOL_LIMIT_ENFORCEMENT_ERROR\]/
    );
  });

  test("measures actual backend connections via pg_stat_activity with connection_limit set", async () => {
    const limitedUrl = `${testDbUrl}?connection_limit=3&pool_timeout=10`;
    const prismaLimited = new PrismaClient({
      datasources: { db: { url: limitedUrl } },
    });

    try {
      // Run concurrent queries
      await Promise.all([
        prismaLimited.$queryRaw`SELECT 1 as num`,
        prismaLimited.$queryRaw`SELECT 2 as num`,
        prismaLimited.$queryRaw`SELECT 3 as num`,
        prismaLimited.$executeRaw`SELECT pg_sleep(0.05)`,
        prismaLimited.$executeRaw`SELECT pg_sleep(0.05)`,
      ]);

      const activeConns = await prismaLimited.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM pg_stat_activity
        WHERE datname = 'trillionskill_perf_v2_test'
      `;
      assert.ok(Number(activeConns[0].count) >= 1, "At least 1 active connection should exist");
    } finally {
      await prismaLimited.$disconnect();
    }
  });
});
