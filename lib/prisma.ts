import { PrismaClient } from '@prisma/client'

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

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: getPrismaLogConfig(),
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
