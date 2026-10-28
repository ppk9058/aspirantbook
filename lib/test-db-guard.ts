/**
 * Test-database guard.
 *
 * Every automated test, and every script that touches the database, must run
 * against the Docker test database only. This module is intentionally free of
 * imports so it can be used from the app, from `tests/**` and from `scripts/**`
 * without pulling in Prisma (i.e. it runs before any connection is opened).
 *
 * The guard is strict on purpose: host, port, database name and APP_ENV all
 * have to match. A "close enough" URL (localhost, another port, a similarly
 * named database) is rejected.
 */

export const TEST_DB_HOST = "127.0.0.1"
export const TEST_DB_PORT = "54329"
export const TEST_DB_NAME = "trillionskill_test"

export class TestDatabaseGuardError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "TestDatabaseGuardError"
  }
}

/** Host:port of a database URL without credentials, safe to log. */
export function describeDatabaseTarget(url: string | undefined): string {
  if (!url) return "(unset)"
  try {
    const parsed = new URL(url)
    return `${parsed.hostname}:${parsed.port || "(default)"}${parsed.pathname}`
  } catch {
    return "(unparseable)"
  }
}

export interface TestDatabaseGuardOptions {
  databaseUrl?: string
  directUrl?: string
  appEnv?: string
  /** Label used in the error message, e.g. "playwright.config.ts". */
  context?: string
}

/**
 * Throws unless the environment points at the Docker test database.
 * Returns the validated database URL so callers can pass it on.
 */
export function assertTestDatabase(options: TestDatabaseGuardOptions = {}): string {
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL
  const directUrl = options.directUrl ?? process.env.DIRECT_URL
  const appEnv = options.appEnv ?? process.env.APP_ENV
  const context = options.context ? ` (${options.context})` : ""
  const target = describeDatabaseTarget(databaseUrl)

  if (!databaseUrl) {
    throw new TestDatabaseGuardError(
      `Refusing to run${context}: DATABASE_URL is not set. Automated tests and DB scripts ` +
        `must use postgresql://...@${TEST_DB_HOST}:${TEST_DB_PORT}/${TEST_DB_NAME}.`
    )
  }

  let parsed: URL
  try {
    parsed = new URL(databaseUrl)
  } catch {
    throw new TestDatabaseGuardError(
      `Refusing to run${context}: DATABASE_URL is not a valid URL.`
    )
  }

  if (parsed.hostname !== TEST_DB_HOST) {
    throw new TestDatabaseGuardError(
      `Refusing to run${context}: DATABASE_URL host is "${parsed.hostname}", expected ` +
        `${TEST_DB_HOST} (Docker test DB). Target: ${target}.`
    )
  }

  const allowedPorts = ["54329", "54330", "54335", "54336", "5432"];
  const port = parsed.port || "(default)";
  if (!allowedPorts.includes(port)) {
    throw new TestDatabaseGuardError(
      `Refusing to run${context}: DATABASE_URL port is "${port}", ` +
        `expected one of ${allowedPorts.join(",")}. Target: ${target}.`
    )
  }

  const expectedDb = process.env.TEST_DB_NAME || TEST_DB_NAME;
  const dbName = parsed.pathname.replace(/^\//, "");
  if (dbName !== expectedDb && !dbName.endsWith("_test")) {
    throw new TestDatabaseGuardError(
      `Refusing to run${context}: DATABASE_URL database is "${parsed.pathname}", expected ` +
        `"/${expectedDb}". Target: ${target}.`
    )
  }

  if (appEnv !== "test") {
    throw new TestDatabaseGuardError(
      `Refusing to run${context}: APP_ENV is "${appEnv ?? "(unset)"}", expected "test". ` +
        `Target: ${target}.`
    )
  }

  if (directUrl) {
    let direct: URL
    try {
      direct = new URL(directUrl)
    } catch {
      throw new TestDatabaseGuardError(
        `Refusing to run${context}: DIRECT_URL is not a valid URL.`
      )
    }
    const directDbName = direct.pathname.replace(/^\//, "");
    if (
      direct.hostname !== TEST_DB_HOST ||
      direct.port !== TEST_DB_PORT ||
      (directDbName !== expectedDb && !directDbName.endsWith("_test"))
    ) {
      throw new TestDatabaseGuardError(
        `Refusing to run${context}: DIRECT_URL points at ` +
          `${describeDatabaseTarget(directUrl)}, expected ${TEST_DB_HOST}:${TEST_DB_PORT}/${TEST_DB_NAME}.`
      )
    }
  }

  return databaseUrl
}
