import { prisma } from "@/lib/prisma";
import { isStripeConfigured } from "@/lib/payments/stripe";
import { getPaymentMode } from "@/lib/payments/razorpay-config";
import { getPersistBackend } from "@/lib/storage/persist-backend";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

function getGitCommitSha(): string {
  if (process.env.GIT_COMMIT) return process.env.GIT_COMMIT.trim();
  if (process.env.NEXT_PUBLIC_GIT_COMMIT) return process.env.NEXT_PUBLIC_GIT_COMMIT.trim();
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.trim();
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf-8", timeout: 1000 }).trim();
  } catch {
    return "unknown";
  }
}

// 60-second in-memory cache for migration status
let cachedMigrationStatus: { applied: number; pending: number; cachedAt: number } | null = null;

export function resetMigrationHealthCache(): void {
  cachedMigrationStatus = null;
}

export async function getMigrationStatus(): Promise<{ applied: number; pending: number }> {
  const now = Date.now();
  if (cachedMigrationStatus && now - cachedMigrationStatus.cachedAt < 60_000) {
    return { applied: cachedMigrationStatus.applied, pending: cachedMigrationStatus.pending };
  }

  let onDisk = 0;
  try {
    const migrationsDir = path.join(process.cwd(), "prisma/migrations");
    if (fs.existsSync(migrationsDir)) {
      onDisk = fs.readdirSync(migrationsDir).filter((f) => {
        try {
          return fs.existsSync(path.join(migrationsDir, f, "migration.sql"));
        } catch {
          return false;
        }
      }).length;
    }
  } catch {
    onDisk = 0;
  }

  try {
    const appliedRes: any[] = await prisma.$queryRaw`
      SELECT count(*)::int as count FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL
    `;
    const applied = Number(appliedRes[0]?.count ?? 0);
    const pending = Math.max(0, onDisk - applied);

    cachedMigrationStatus = { applied, pending, cachedAt: now };
    return { applied, pending };
  } catch (err) {
    return cachedMigrationStatus
      ? { applied: cachedMigrationStatus.applied, pending: cachedMigrationStatus.pending }
      : { applied: 0, pending: onDisk };
  }
}

export async function getHealthPayload(reqHeaders?: Headers | null): Promise<Record<string, any>> {
  const start = Date.now();
  let dbStatus = "healthy";
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
  } catch {
    dbStatus = "unreachable";
  }

  const stripeOk = isStripeConfigured();
  const razorpayOk = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  const paymentsConfigured = stripeOk || razorpayOk;
  const commit = getGitCommitSha();

  const requiredToken = process.env.HEALTH_DETAILS_TOKEN;
  let includeDetails = true;

  if (requiredToken) {
    const headerToken =
      reqHeaders?.get("x-health-details-token") ||
      reqHeaders?.get("health-details-token") ||
      "";
    includeDetails = headerToken === requiredToken;
  }

  const responsePayload: Record<string, any> = {
    status: dbStatus === "healthy" ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    commit,
    uptime: Math.round(process.uptime()),
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
    },
    payments: paymentsConfigured ? "configured" : "not configured",
    paymentMode: getPaymentMode(),
    totalLatencyMs: Date.now() - start,
  };

  if (includeDetails) {
    const migrationStatus = await getMigrationStatus();
    responsePayload.migrations = {
      applied: migrationStatus.applied,
      pending: migrationStatus.pending,
    };
    responsePayload.paymentsConfigured = paymentsConfigured;
    responsePayload.storageBackend = getPersistBackend();
    responsePayload.emailProviders = {
      brevo: Boolean(process.env.BREVO_API_KEY),
      resend: Boolean(process.env.RESEND_API_KEY),
    };
  }

  return responsePayload;
}
