import { prisma } from "./prisma";
import { isExamRedisRateLimitEnabled } from "./exam-flags";
import { redis } from "./redis";

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  windowSeconds: number;
}

let hasWarnedProxy = false;

/**
 * Safely extract client IP taking into account trusted proxy configuration.
 * Prioritizes Cloudflare CF-Connecting-IP, then X-Forwarded-For when TRUST_PROXY=true.
 */
export function getClientIp(req: Request | { headers: Headers }): string {
  const isTrustedProxy = process.env.TRUST_PROXY === "true";
  if (process.env.NODE_ENV === "production" && !isTrustedProxy && !hasWarnedProxy) {
    console.warn("[RateLimit] TRUST_PROXY is not set to 'true'. Client IP will default to 127.0.0.1. Set TRUST_PROXY=true if running behind Nginx/Cloudflare/AWS ALB.");
    hasWarnedProxy = true;
  }
  if (isTrustedProxy) {
    const cfIp = req.headers.get("cf-connecting-ip");
    if (cfIp) return cfIp.trim();

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
 * DB-Backed & Redis-Optional Rate Limiter
 * When EXAM_RUNTIME_REDIS_RATELIMIT=true and REDIS_URL exists: uses Redis INCR + EXPIRE.
 * Falls back transparently to PostgreSQL atomic upsert:
 * INSERT INTO "RateLimit" ... ON CONFLICT (key, "windowStart") DO UPDATE SET count = "RateLimit".count + 1 RETURNING count;
 *
 * Decision (docs/DECISIONS.md):
 * Fails OPEN on database/cache errors for customer-facing flows (like coupon preview)
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

  if (isExamRedisRateLimitEnabled() && redis) {
    try {
      const rKey = `rl:${key}:${windowStartMs}`;
      const count = await redis.incr(rKey);
      if (count === 1) {
        await redis.expire(rKey, windowSeconds + 5);
      }
      return {
        allowed: count <= limit,
        count,
        limit,
        windowSeconds,
      };
    } catch (redisErr) {
      console.warn("[RateLimit] Redis error while checking rate limit (falling back to DB):", redisErr);
    }
  }

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
