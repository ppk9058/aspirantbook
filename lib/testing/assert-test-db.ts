import dotenv from "dotenv"
import { guardTestDatabase, assertNoEnvLocal, assertNoSupabaseEnv } from "../../scripts/guard-test-db"

// Enforce Phase 0 guards: Never allow .env.local or remote Supabase in test runs
assertNoEnvLocal()
assertNoSupabaseEnv()

dotenv.config({ path: ".env.test" })

export function assertTestDb() {
    assertNoEnvLocal()
    assertNoSupabaseEnv()

    const currentDb = process.env.DATABASE_URL
    const testDb = process.env.TEST_DATABASE_URL
    const devDb = process.env.DEV_DIRECT_URL || process.env.DEV_DATABASE_URL || "aws-1-ap-south-1.pooler.supabase.com"

    if (!testDb) {
        throw new Error(
            `[DB GUARD VIOLATION] TEST_DATABASE_URL is not set! Writes to dev database are strictly prohibited.`
        )
    }

    guardTestDatabase(testDb)

    let parsedTest: URL
    try {
        parsedTest = new URL(testDb)
    } catch {
        throw new Error(`[DB GUARD VIOLATION] TEST_DATABASE_URL is not a valid URL: ${testDb}`)
    }

    const host = parsedTest.hostname
    if (host !== "localhost" && host !== "127.0.0.1" && host !== "test-db" && host !== "postgres" && host !== "trillionskill-test-db") {
        throw new Error(
            `[DB GUARD VIOLATION] TEST_DATABASE_URL host must be localhost or 127.0.0.1 or test-db (got: ${host})`
        )
    }

    if (host.includes("supabase")) {
        throw new Error(
            `[DB GUARD VIOLATION] TEST_DATABASE_URL must not point to Supabase (got: ${host})`
        )
    }

    const port = parsedTest.port || "5432"

    const pathname = parsedTest.pathname.replace(/^\//, "")
    if (!pathname.endsWith("_test")) {
        throw new Error(
            `[DB GUARD VIOLATION] TEST_DATABASE_URL database name must end with '_test' (got: ${pathname})`
        )
    }

    // Check against devDb
    if (devDb.includes(host) && devDb.includes(pathname)) {
        throw new Error(
            `[DB GUARD VIOLATION] TEST_DATABASE_URL matches dev database configuration!`
        )
    }

    // Check process DATABASE_URL
    if (!currentDb) {
        throw new Error(`[DB GUARD VIOLATION] DATABASE_URL is not set!`)
    }

    guardTestDatabase(currentDb)

    if (currentDb !== testDb) {
        throw new Error(
            `[DB GUARD VIOLATION] Process DATABASE_URL does not match TEST_DATABASE_URL! Process was started with dev DATABASE_URL while TEST_DATABASE_URL was set.`
        )
    }

    return {
        isTestDb: true,
        host,
        port,
        database: pathname,
    }
}
