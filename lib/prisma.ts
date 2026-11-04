import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
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
    log: process.env.PRISMA_LOG_QUERIES === '1' ? ['query', 'warn', 'error'] : [],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

