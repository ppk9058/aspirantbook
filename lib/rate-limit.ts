import { prisma } from "./prisma";
import { isExamRedisRateLimitEnabled } from "./exam-flags";
import { redis } from "./redis";
import crypto from "crypto";
import net from "net";

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  windowSeconds: number;
  remainingSeconds: number;
}

export interface RateLimitOptions {
  /**
   * A16: when true, a database failure rejects the request instead of allowing
   * it. Use for security-sensitive surfaces (login, OTP, registration, payment,
   * upload) where "fail open" would hand an attacker an unmetered endpoint.
   * Default false keeps the documented fail-open behaviour for customer-facing
   * flows such as coupon preview.
   */
  failClosed?: boolean;
}

let hasWarnedProxy = false;

const IPV4_RE =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV6_RE = /^(?=.*:)[0-9a-fA-F:]+$/;

/**
 * Normalise a single forwarded header value to a canonical IP, or null.
 * Rejects anything that is not a literal IPv4/IPv6 address so a malformed or
 * hostile header cannot become part of a rate-limit key.
 */
export function normalizeIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (typeof raw !== "string" || raw.length > 256) return null;
  let value = raw.trim().replace(/^"(.*)"$/, "$1").trim();
  if (!value || value.length > 256) return null;

  // [::1] or [::1]:443
  if (value.startsWith("[")) {
    const close = value.indexOf("]");
    if (close === -1) return null;
    value = value.slice(1, close);
  } else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(value)) {
    // 1.2.3.4:5678
    value = value.split(":")[0];
  }

  // IPv4-mapped IPv6 (::ffff:1.2.3.4) → plain IPv4
  const mapped = value.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mapped) value = mapped[1];

  const ipType = net.isIP(value);
  if (ipType === 4) return value;
  if (ipType === 6) return value.toLowerCase();
  return null;
}

function extractHeaders(req?: Request | { headers: Headers } | Headers): Headers | null {
  if (!req) return null;
  if ("get" in req && typeof (req as any).get === "function") {
    return req as Headers;
  }
  if ("headers" in req && req.headers && typeof (req.headers as any).get === "function") {
    return req.headers as Headers;
  }
  return null;
}

/**
 * Safely extract the client IP.
 *
 * Forwarded headers are only read when TRUST_PROXY=true, and the value is taken
 * from CF-Connecting-IP (validated) or the right of the X-Forwarded-For chain
 * based on TRUST_PROXY_HOPS. When TRUST_PROXY=false, all forwarding headers are
 * strictly ignored to prevent IP spoofing attacks.
 */
export function getClientIp(req?: Request | { headers: Headers } | Headers): string {
  const isTrustedProxy = process.env.TRUST_PROXY === "true";

  if (!isTrustedProxy) {
    // Hardening: strictly ignore all forwarding headers when TRUST_PROXY is false
    return "127.0.0.1";
  }

  const headers = extractHeaders(req);
  if (!headers) {
    return "127.0.0.1";
  }

  // 1. CF-Connecting-IP (strictly validated as an IP)
  const cfIp = normalizeIp(headers.get("cf-connecting-ip"));
  if (cfIp) return cfIp;

  // 2. Safe right-most trusted hop of X-Forwarded-For
  const hops = Math.max(
    1,
    Number.parseInt(process.env.TRUST_PROXY_HOPS ?? "1", 10) || 1
  );

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const chain = forwarded
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    const candidate = normalizeIp(chain[chain.length - hops]);
    if (candidate) return candidate;
  }

  // 3. X-Real-IP fallback
  const realIp = normalizeIp(headers.get("x-real-ip"));
  if (realIp) return realIp;

  return "127.0.0.1";
}

/**
 * DB-Backed & Redis-Optional Rate Limiter
 * When EXAM_RUNTIME_REDIS_RATELIMIT=true and REDIS_URL exists: uses Redis INCR + EXPIRE.
 * Falls back transparently to PostgreSQL atomic upsert:
 * INSERT INTO "RateLimit" ... ON CONFLICT (key, "windowStart") DO UPDATE SET count = "RateLimit".count + 1 RETURNING count;
 *
 * Fails OPEN by default on database errors for customer-facing flows (like
 * coupon preview) to avoid blocking genuine checkouts when the DB has a
 * transient blip. Pass `{ failClosed: true }` on security-sensitive surfaces.
 */
export async function checkRateLimit(
  key: string,
  limit: number = 10,
  windowSeconds: number = 60,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const failClosed = options.failClosed === true;
  const nowMs = Date.now();
  const windowMs = windowSeconds * 1000;
  // Compute discrete bucket start
  const windowStartMs = Math.floor(nowMs / windowMs) * windowMs;
  const windowStartDate = new Date(windowStartMs);
  const remainingSeconds = Math.max(1, Math.ceil((windowStartMs + windowMs - nowMs) / 1000));

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
        remainingSeconds,
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

    const id = crypto.randomUUID();

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
      remainingSeconds,
    };
  } catch (error: any) {
    if (failClosed) {
      console.error(
        "[RateLimit] Database error while checking a fail-closed limit (rejecting):",
        error
      );
      return {
        allowed: false,
        count: 0,
        limit,
        windowSeconds,
        remainingSeconds,
      };
    }
    console.error("[RateLimit] Database error while checking rate limit (failing OPEN):", error);
    return {
      allowed: true,
      count: 0,
      limit,
      windowSeconds,
      remainingSeconds,
    };
  }
}
