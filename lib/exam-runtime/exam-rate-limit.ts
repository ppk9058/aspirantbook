import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isExamRateLimitEnabled } from "@/lib/exam-flags";

export type ExamRateLimitAction = "start" | "sync" | "submit" | "result" | "leaderboard";

/**
 * Cadence derivation from client inspection:
 * - Web runner (`AttemptClient.tsx:750`): syncs debounced to 2500ms with retries up to 2x (1000ms, 2000ms).
 *   Legitimate traffic: ~24 req/min base, bursts up to 30-40 req/min during rapid question navigation.
 * - Mobile runner (`cbt-sync.ts:501`): saveAnswer triggers background flush on answer change.
 *   Legitimate traffic: ~30-45 req/min during fast reading.
 * Derived thresholds:
 * - start: 10 req/min (starting an exam is an infrequent user action)
 * - sync: 60 req/min (allows up to 1 req/sec peak debounce/save burst without hitting 429)
 * - submit: 5 req/min (submitting an exam is done once at completion, plus retry)
 * - result: 30 req/min (viewing/refreshing results)
 * - leaderboard: 30 req/min (viewing/refreshing leaderboard)
 */
export const EXAM_RATE_LIMIT_CONFIG: Record<
  ExamRateLimitAction,
  { limit: number; windowSeconds: number }
> = {
  start: { limit: 10, windowSeconds: 60 },
  sync: { limit: 60, windowSeconds: 60 },
  submit: { limit: 5, windowSeconds: 60 },
  result: { limit: 30, windowSeconds: 60 },
  leaderboard: { limit: 30, windowSeconds: 60 },
};

export async function checkExamWebRateLimit(
  req: NextRequest | Request,
  action: ExamRateLimitAction,
  userId?: string | null
): Promise<{ allowed: boolean; response?: NextResponse }> {
  if (!isExamRateLimitEnabled()) {
    return { allowed: true };
  }

  const config = EXAM_RATE_LIMIT_CONFIG[action];
  const ip = getClientIp(req as any);
  const identifier = userId ? `u_${userId}` : `ip_${ip}`;
  const key = `exam:web:${action}:${identifier}`;

  const res = await checkRateLimit(key, config.limit, config.windowSeconds);
  if (!res.allowed) {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          retryAfter: res.remainingSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(res.remainingSeconds),
          },
        }
      ),
    };
  }

  return { allowed: true };
}

export async function checkExamV1RateLimit(
  req: NextRequest,
  action: ExamRateLimitAction,
  userId?: string | null
): Promise<{ allowed: boolean; response?: NextResponse }> {
  if (!isExamRateLimitEnabled()) {
    return { allowed: true };
  }

  const config = EXAM_RATE_LIMIT_CONFIG[action];
  const ip = getClientIp(req);
  const identifier = userId ? `u_${userId}` : `ip_${ip}`;
  const key = `exam:v1:${action}:${identifier}`;

  const res = await checkRateLimit(key, config.limit, config.windowSeconds);
  if (!res.allowed) {
    const headers = new Headers({
      "Content-Type": "application/json; charset=utf-8",
      "Retry-After": String(res.remainingSeconds),
      "Cache-Control": "no-store, max-age=0",
    });
    return {
      allowed: false,
      response: NextResponse.json(
        {
          ok: false,
          error: {
            code: "TOO_MANY_REQUESTS",
            message: "Rate limit exceeded. Please wait before retrying.",
            details: { retryAfter: res.remainingSeconds },
          },
        },
        {
          status: 429,
          headers,
        }
      ),
    };
  }

  return { allowed: true };
}
