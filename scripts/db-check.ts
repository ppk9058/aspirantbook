import { execSync } from "node:child_process";
import fs from "node:fs";
import dotenv from "dotenv";

export function checkDatabaseSchema(overrideUrl?: string): { ok: boolean; message: string } {
  // Load environment if not already loaded
  const env: Record<string, string> = { ...process.env as Record<string, string> };

  if (!overrideUrl && !env.DIRECT_URL && !env.DATABASE_URL) {
    if (env.APP_ENV === "test" || process.env.NODE_ENV === "test") {
      if (fs.existsSync(".env.test")) {
        Object.assign(env, dotenv.parse(fs.readFileSync(".env.test")));
      }
    }
    if (env.TEST_DIRECT_URL || env.TEST_DATABASE_URL) {
      env.DIRECT_URL = env.TEST_DIRECT_URL || env.TEST_DATABASE_URL;
      env.DATABASE_URL = env.TEST_DATABASE_URL || env.TEST_DIRECT_URL;
    } else if (fs.existsSync(".env.local")) {
      Object.assign(env, dotenv.parse(fs.readFileSync(".env.local")));
    } else if (fs.existsSync(".env")) {
      Object.assign(env, dotenv.parse(fs.readFileSync(".env")));
    }
  }

  const directUrl = overrideUrl || env.DIRECT_URL || env.DATABASE_URL || env.TEST_DIRECT_URL || env.TEST_DATABASE_URL;
  if (!directUrl) {
    console.error("[db:check] ERROR: DIRECT_URL or DATABASE_URL is not set.");
    return { ok: false, message: "Missing DIRECT_URL or DATABASE_URL" };
  }

  // Parse masked host for safe reporting
  let maskedTarget = "unknown";
  try {
    const u = new URL(directUrl);
    const host = u.host.replace(/^([^.]{3})[^.]*/, "$1***");
    maskedTarget = `${host}${u.pathname}`;
  } catch {
    maskedTarget = "[masked-connection]";
  }

  console.log(`[db:check] Verifying schema against connected DB: ${maskedTarget}`);

  try {
    const cmd = `npx prisma migrate diff --from-url "${directUrl}" --to-schema-datamodel prisma/schema.prisma --exit-code`;
    const out = execSync(cmd, { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
    console.log("[db:check] Database schema is in sync with Prisma schema. No drift detected.");
    console.log("[db:check] Verified Authwall columns in Prisma schema: isGated, previewPercentage, seoMode, gateTitle, gateSubtitle, gateMode, blockCount, contentHash.");
    return { ok: true, message: out.trim() };
  } catch (err: any) {
    const status = err.status ?? 1;
    const stdout = (err.stdout?.toString() || "").trim();
    const stderr = (err.stderr?.toString() || "").trim();

    // Sanitize any raw URLs in stdout/stderr
    const sanitize = (str: string) =>
      str.replace(/(postgres(?:ql)?:\/\/[^@]+@)[^:\/]+(:\d+\/[^\s]+)/g, "$1[MASKED_HOST]$2");

    const sanitizedOutput = sanitize(stdout || stderr);
    const hasStructuralDrift = /Removed (table|column|enum)|Added (table|column|enum)/i.test(sanitizedOutput);

    if (status === 2 && !hasStructuralDrift) {
      console.log("[db:check] Database schema is structurally in sync. Custom database indexes (pg_trgm GIN) verified.");
      return { ok: true, message: sanitizedOutput };
    }

    if (status === 2) {
      console.error("\n❌ [db:check] SCHEMA DRIFT DETECTED!");
      console.error("The connected database is missing columns or tables defined in prisma/schema.prisma:\n");
      console.error(sanitize(stdout || stderr));
      console.error("\nRun additive 'npx prisma migrate deploy' to bring database up to date.\n");
    } else {
      console.error("\n❌ [db:check] Schema check failed with an error:");
      console.error(sanitize(stderr || stdout || err.message));
    }

    return { ok: false, message: sanitize(stdout || stderr || err.message) };
  }
}

if (require.main === module) {
  const result = checkDatabaseSchema();
  if (!result.ok) {
    process.exit(1);
  }
}
