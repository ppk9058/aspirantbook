import { NextRequest } from "next/server";
import { RefreshTokenRequestSchema } from "@aspirantbook/shared";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { checkV1RateLimit } from "@/lib/api/v1/rate-limit";
import { getClientIp } from "@/lib/rate-limit";
import { refreshSession } from "@/lib/services/auth-token.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    // 1. Rate limiting: 30 refreshes per minute per IP
    const rl = await checkV1RateLimit(req, "auth_refresh", 30, 60);
    if (!rl.allowed) return rl.response!;

    // 2. Parse & validate body
    const body = await req.json().catch(() => ({}));
    const parsed = RefreshTokenRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid refresh token payload",
        400,
        parsed.error.format(),
        reqId
      );
    }

    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent");

    const result = await refreshSession(parsed.data.refreshToken, ip, userAgent);

    return apiSuccess(result, 200, {}, reqId);
  } catch (err: any) {
    if (err?.message?.startsWith("UNAUTHORIZED:")) {
      return apiError("UNAUTHORIZED", err.message.replace("UNAUTHORIZED:", "").trim(), 401, undefined, reqId);
    }
    if (err?.message?.startsWith("FORBIDDEN:")) {
      return apiError("FORBIDDEN", err.message.replace("FORBIDDEN:", "").trim(), 403, undefined, reqId);
    }
    return handleApiError(err, reqId);
  }
}
