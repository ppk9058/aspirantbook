import fs from "node:fs";
import path from "node:path";

const HOST_PORTS: Record<string, string[]> = {
  "127.0.0.1": ["54329", "54330"],
  "localhost": ["54329", "54330"],
  "test-db": ["5432", "54330"],
  "postgres": ["5432", "54330"],
  "trillionskill-test-db": ["5432", "54330"],
};

export function assertNoEnvLocal(baseDir: string = process.cwd()): void {
  const envLocalPath = path.resolve(baseDir, ".env.local");
  if (fs.existsSync(envLocalPath)) {
    throw new Error(
      `[GUARD_ABORT] .env.local exists at ${envLocalPath}. Test environment must not access or load .env.local!`
    );
  }
}

export function assertNoSupabaseEnv(): void {
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string" && value.toLowerCase().includes("supabase.co")) {
      throw new Error(
        `[GUARD_ABORT] Unsafe environment variable "${key}" contains "supabase.co". Remote Supabase database is strictly forbidden!`
      );
    }
  }
}

export function guardTestDatabase(databaseUrl?: string): boolean {
  const targetUrl = databaseUrl || process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;

  if (!targetUrl) {
    throw new Error(
      "[GUARD_ABORT] No DATABASE_URL or TEST_DATABASE_URL provided to guardTestDatabase!"
    );
  }

  if (targetUrl.toLowerCase().includes("supabase.co")) {
    throw new Error(
      `[GUARD_ABORT] DATABASE_URL references remote Supabase ("supabase.co"). Only local Docker test DB is permitted!`
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`[GUARD_ABORT] Invalid database URL format: ${message}`);
  }

  const hostname = parsed.hostname.toLowerCase();
  const port = parsed.port || "5432";

  const allowedPorts = HOST_PORTS[hostname];
  if (!allowedPorts) {
    throw new Error(
      `[GUARD_ABORT] Disallowed database host: "${hostname}". Allowed hosts: ${Object.keys(HOST_PORTS).join(", ")}`
    );
  }

  if (!allowedPorts.includes(port)) {
    throw new Error(
      `[GUARD_ABORT] Disallowed database port "${port}" for host "${hostname}". Allowed ports for ${hostname}: ${allowedPorts.join(", ")}`
    );
  }

  return true;
}

export function runAllGuards(baseDir: string = process.cwd()): void {
  assertNoEnvLocal(baseDir);
  assertNoSupabaseEnv();
  const url = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;
  if (url) {
    guardTestDatabase(url);
  }
}

// Auto-run if run directly via CLI (tsx scripts/guard-test-db.ts)
if (process.argv[1] && (process.argv[1].endsWith("guard-test-db.ts") || process.argv[1].endsWith("guard-test-db.mjs"))) {
  runAllGuards();
  console.log("✓ Test DB & environment guards passed successfully.");
}
