import { PrismaClient } from '@prisma/client'
import { assertTestDatabase } from './test-db-guard'

export function validateDatabaseConnectionLimit(url = process.env.DATABASE_URL): {
  hasLimit: boolean;
  limit: number | null;
} {
  if (!url) return { hasLimit: false, limit: null };
  try {
    const parsed = new URL(url);
    const limitStr = parsed.searchParams.get("connection_limit");
    if (!limitStr) {
      const msg =
        "[Prisma/ConnectionLimit] WARNING: DATABASE_URL lacks ?connection_limit. Each Next.js server instance may open uncontrolled connections, exhausting pool capacity. Formula: (instances * connection_limit <= pooler capacity). Add ?connection_limit=5&pool_timeout=10 to DATABASE_URL.";
      if (
        process.env.EXAM_REQUIRE_POOL_LIMIT === "true" ||
        process.env.EXAM_REQUIRE_POOL_LIMIT === "1"
      ) {
        throw new Error(`[POOL_LIMIT_ENFORCEMENT_ERROR] ${msg}`);
      }
      console.warn(msg);
      return { hasLimit: false, limit: null };
    }
    const limit = parseInt(limitStr, 10);
    return { hasLimit: true, limit: isNaN(limit) ? null : limit };
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.includes("[POOL_LIMIT_ENFORCEMENT_ERROR]")
    ) {
      throw err;
    }
    return { hasLimit: false, limit: null };
  }
}

// Enforce connection limits check
validateDatabaseConnectionLimit();

// Fail closed before Prisma opens a connection: whenever the process declares
// itself a test process (APP_ENV=test, the pinned prefix for every test and DB
// script) the target must be the Docker test database.
if (process.env.APP_ENV === 'test') {
  assertTestDatabase({ context: 'lib/prisma.ts' })
}

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

export function getPrismaLogConfig(
  nodeEnv = process.env.NODE_ENV,
  logQueries = process.env.PRISMA_LOG_QUERIES
): ("query" | "warn" | "error")[] {
  // In production, query logging is strictly forbidden to prevent credential/data leaks and perf degradation
  if (nodeEnv === "production") {
    return []
  }
  return logQueries === "1" ? ["query", "warn", "error"] : []
}

const isTestEnv =
    process.env.APP_ENV === 'test' ||
    process.env.PORT === '3045' ||
    process.env.NEXTAUTH_URL?.includes('3045') ||
    process.env.NEXT_DIST_DIR === '.next-test' ||
    Boolean(process.env.TEST_DATABASE_URL)

const testDbUrl = isTestEnv
    ? (process.env.TEST_DATABASE_URL || 'postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test')
    : undefined

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    datasources: testDbUrl ? { db: { url: testDbUrl } } : undefined,
    log: getPrismaLogConfig(),
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
