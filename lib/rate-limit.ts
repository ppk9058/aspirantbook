import { prisma } from "./prisma";
import crypto from "crypto";

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  windowSeconds: number;
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
  let value = raw.trim().replace(/^"(.*)"$/, "$1").trim();
  if (!value) return null;

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

  if (IPV4_RE.test(value)) return value;
  if (IPV6_RE.test(value)) return value.toLowerCase();
  return null;
}

/**
 * Safely extract the client IP.
 *
 * Forwarded headers are only read when TRUST_PROXY=true, and the value is taken
 * from the right of the X-Forwarded-For chain based on TRUST_PROXY_HOPS (the
 * number of proxies we control, default 1). Taking the right-most trusted hop
 * rather than the left-most entry means a client cannot spoof its address by
 * sending its own X-Forwarded-For: the trusted proxy appends the real peer and
 * our read position excludes the client-supplied prefix.
 */
export function getClientIp(req: Request | { headers: Headers }): string {
  const isTrustedProxy = process.env.TRUST_PROXY === "true";

  if (process.env.NODE_ENV === "production" && !isTrustedProxy && !hasWarnedProxy) {
    console.warn(
      "[RateLimit] TRUST_PROXY is not set to 'true'. Client IP will default to 127.0.0.1. Set TRUST_PROXY=true (and TRUST_PROXY_HOPS) when running behind Nginx/Cloudflare/AWS ALB."
    );
    hasWarnedProxy = true;
  }

  if (isTrustedProxy) {
    const hops = Math.max(
      1,
      Number.parseInt(process.env.TRUST_PROXY_HOPS ?? "1", 10) || 1
    );

    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
      const chain = forwarded
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
      // chain[len - hops]: the address the outermost trusted proxy saw.
      const candidate = normalizeIp(chain[chain.length - hops]);
      if (candidate) return candidate;
    }

    const realIp = normalizeIp(req.headers.get("x-real-ip"));
    if (realIp) return realIp;

    // Cloudflare keeps the original client in its own header; only meaningful
    // when the operator explicitly trusts the proxy chain above.
    const cfIp = normalizeIp(req.headers.get("cf-connecting-ip"));
    if (cfIp) return cfIp;
  }

  return "127.0.0.1";
}

/**
 * DB-Backed Rate Limiter
 * Atomic check and increment using Prisma & PostgreSQL:
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
      };
    }
    console.error("[RateLimit] Database error while checking rate limit (failing OPEN):", error);
    return {
      allowed: true,
      count: 0,
      limit,
      windowSeconds,
    };
  }
}
