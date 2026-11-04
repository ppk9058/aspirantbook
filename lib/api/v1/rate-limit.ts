import { NextRequest } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { apiError } from "./response";

export async function checkV1RateLimit(
  req: NextRequest,
  prefix: string,
  limit: number,
  windowSecs: number,
  userId?: string | null
) {
  const ip = getClientIp(req);
  const identifier = userId ? `u_${userId}` : `ip_${ip}`;
  const key = `v1:${prefix}:${identifier}`;

  const res = await checkRateLimit(key, limit, windowSecs);
  if (!res.allowed) {
    return {
      allowed: false,
      response: apiError(
        "TOO_MANY_REQUESTS",
        "Rate limit exceeded. Please wait before retrying.",
        429,
        { retryAfter: res.windowSeconds }
      ),
    };
  }

  return { allowed: true };
}
