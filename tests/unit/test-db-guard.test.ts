import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import path from "node:path"

import {
  assertTestDatabase,
  describeDatabaseTarget,
  TestDatabaseGuardError,
  TEST_DB_HOST,
  TEST_DB_NAME,
  TEST_DB_PORT,
} from "@/lib/test-db-guard"

/**
 * S0 regression: every automated entry point must refuse to run against any
 * database other than the Docker test DB (127.0.0.1:54329/trillionskill_test),
 * and must do so before Prisma opens a connection.
 */

const ROOT = process.cwd()
const GOOD_URL = `postgresql://postgres:secret@${TEST_DB_HOST}:${TEST_DB_PORT}/${TEST_DB_NAME}`
const REMOTE_URL = `postgresql://postgres:secret@db.example.com:5432/${TEST_DB_NAME}`
const WRONG_PORT_URL = `postgresql://postgres:secret@${TEST_DB_HOST}:5432/${TEST_DB_NAME}`
const WRONG_DB_URL = `postgresql://postgres:secret@${TEST_DB_HOST}:${TEST_DB_PORT}/trillionskill`

function runEntryPoint(args: string[], env: Record<string, string>) {
  // A node:test child inherits NODE_TEST_CONTEXT, which makes any nested
  // `--test` invocation a no-op (exit 0, no output). Strip it so the spawned
  // entry point behaves exactly like a normal CLI run.
  const baseEnv: NodeJS.ProcessEnv = { ...process.env }
  delete baseEnv.NODE_TEST_CONTEXT
  delete baseEnv.NODE_TEST_REPORTER

  try {
    const stdout = execFileSync("npx", args, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: "pipe",
      timeout: 120_000,
      env: { ...baseEnv, ...env },
    })
    return { status: 0, output: stdout }
  } catch (error: any) {
    return {
      status: typeof error.status === "number" ? error.status : 1,
      output: `${error.stdout ?? ""}${error.stderr ?? ""}${error.message ?? ""}`,
    }
  }
}

describe("S0: test-database guard", () => {
  it("accepts only the Docker test database", () => {
    assert.equal(assertTestDatabase({ databaseUrl: GOOD_URL, directUrl: undefined, appEnv: "test" }), GOOD_URL)
  })

  it("rejects a remote host", () => {
    assert.throws(
      () => assertTestDatabase({ databaseUrl: REMOTE_URL, directUrl: undefined, appEnv: "test" }),
      (error: unknown) =>
        error instanceof TestDatabaseGuardError && /host is "db\.example\.com"/.test((error as Error).message)
    )
  })

  it("rejects the right host on the wrong port", () => {
    assert.throws(
      () => assertTestDatabase({ databaseUrl: WRONG_PORT_URL, directUrl: undefined, appEnv: "test" }),
      (error: unknown) => error instanceof TestDatabaseGuardError && /port is "5432"/.test((error as Error).message)
    )
  })

  it("rejects a non-test database name", () => {
    assert.throws(
      () => assertTestDatabase({ databaseUrl: WRONG_DB_URL, directUrl: undefined, appEnv: "test" }),
      (error: unknown) => error instanceof TestDatabaseGuardError && /database is "\/trillionskill"/.test((error as Error).message)
    )
  })

  it("rejects APP_ENV other than test", () => {
    assert.throws(
      () => assertTestDatabase({ databaseUrl: GOOD_URL, directUrl: undefined, appEnv: "production" }),
      (error: unknown) => error instanceof TestDatabaseGuardError && /APP_ENV is "production"/.test((error as Error).message)
    )
  })

  it("rejects a mismatched DIRECT_URL", () => {
    assert.throws(
      () =>
        assertTestDatabase({
          databaseUrl: GOOD_URL,
          directUrl: REMOTE_URL,
          appEnv: "test",
        }),
      (error: unknown) => error instanceof TestDatabaseGuardError && /DIRECT_URL points at/.test((error as Error).message)
    )
  })

  it("never leaks the password into the description", () => {
    assert.equal(describeDatabaseTarget(GOOD_URL), `${TEST_DB_HOST}:${TEST_DB_PORT}/${TEST_DB_NAME}`)
    assert.ok(!describeDatabaseTarget(GOOD_URL).includes("secret"))
  })

  it("aborts the Prisma entry point before connecting", () => {
    const result = runEntryPoint(["tsx", "tests/support/import-prisma.ts"], {
      DATABASE_URL: REMOTE_URL,
      DIRECT_URL: REMOTE_URL,
      APP_ENV: "test",
    })
    assert.notEqual(result.status, 0, "the entry point should exit non-zero")
    assert.match(result.output, /Refusing to run/)
    assert.match(result.output, /expected 127\.0\.0\.1/)
  })

  it("aborts the api-v1/contract test entry point before connecting", () => {
    const result = runEntryPoint(["tsx", "--test", "tests/contract-v1.test.ts"], {
      DATABASE_URL: REMOTE_URL,
      DIRECT_URL: REMOTE_URL,
      APP_ENV: "test",
    })
    assert.notEqual(result.status, 0, "the test entry point should exit non-zero")
    assert.match(result.output, /Refusing to run/)
  })

  it("aborts the Playwright entry point before starting the webServer", () => {
    const result = runEntryPoint(["playwright", "test", "--list"], {
      DATABASE_URL: REMOTE_URL,
      DIRECT_URL: REMOTE_URL,
      APP_ENV: "test",
    })
    assert.notEqual(result.status, 0, "playwright should exit non-zero")
    assert.match(result.output, /Refusing to run/)
  })
})
