import { prisma } from "./prisma";

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  windowSeconds: number;
}

let hasWarnedProxy = false;

/**
 * Safely extract client IP taking into account trusted proxy configuration.
 * Ignores client-supplied X-Forwarded-For unless TRUST_PROXY=true (or running behind trusted reverse proxy).
 */
export function getClientIp(req: Request | { headers: Headers }): string {
  const isTrustedProxy = process.env.TRUST_PROXY === "true";
  if (process.env.NODE_ENV === "production" && !isTrustedProxy && !hasWarnedProxy) {
    console.warn("[RateLimit] TRUST_PROXY is not set to 'true'. Client IP will default to 127.0.0.1. Set TRUST_PROXY=true if running behind Nginx/Cloudflare/AWS ALB.");
    hasWarnedProxy = true;
  }
  if (isTrustedProxy) {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
      const firstIp = forwarded.split(",")[0]?.trim();
      if (firstIp) return firstIp;
    }
    const realIp = req.headers.get("x-real-ip");
    if (realIp) return realIp.trim();
  }
  return "127.0.0.1";
}

/**
 * DB-Backed Rate Limiter
 * Atomic check and increment using Prisma & PostgreSQL:
 * INSERT INTO "RateLimit" ... ON CONFLICT (key, "windowStart") DO UPDATE SET count = "RateLimit".count + 1 RETURNING count;
 *
 * Decision (docs/DECISIONS.md):
 * Fails OPEN on database errors for customer-facing flows (like coupon preview)
 * to avoid blocking genuine user checkouts when the DB encounters transient issues.
 */
export async function checkRateLimit(
  key: string,
  limit: number = 10,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const nowMs = Date.now();
  const windowMs = windowSeconds * 1000;
  // Compute discrete bucket start
  const windowStartMs = Math.floor(nowMs / windowMs) * windowMs;
  const windowStartDate = new Date(windowStartMs);

  try {
    // Opportunistic cleanup (~1% chance): delete windows older than 1 hour
    if (Math.random() < 0.01) {
      const oneHourAgo = new Date(nowMs - 3600 * 1000);
      prisma.$executeRawUnsafe(
        `DELETE FROM "RateLimit" WHERE "windowStart" < $1`,
        oneHourAgo
      ).catch((err) => {
        console.warn("[RateLimit] Opportunistic cleanup error (ignored):", err);
      });
    }

    const id = `${key}_${windowStartMs}`;

    const res: any[] = await prisma.$queryRawUnsafe(
      `
      INSERT INTO "RateLimit" (id, key, "windowStart", count)
      VALUES ($1, $2, $3, 1)
      ON CONFLICT (key, "windowStart")
      DO UPDATE SET count = "RateLimit".count + 1
      RETURNING count;
      `,
      id,
      key,
      windowStartDate
    );

    const count = Number(res[0]?.count ?? 1);
    const allowed = count <= limit;

    return {
      allowed,
      count,
      limit,
      windowSeconds,
    };
  } catch (error: any) {
    console.error("[RateLimit] Database error while checking rate limit (failing OPEN):", error);
    // Fail open as specified
    return {
      allowed: true,
      count: 0,
      limit,
      windowSeconds,
    };
  }
}
