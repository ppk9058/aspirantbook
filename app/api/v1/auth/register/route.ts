import { NextRequest } from "next/server";
import { RegisterRequestSchema } from "@aspirantbook/shared";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { checkV1RateLimit } from "@/lib/api/v1/rate-limit";
import { getClientIp } from "@/lib/rate-limit";
import { registerUser } from "@/lib/services/auth-token.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    // 1. Rate limiting: 5 registrations per hour per IP
    const rl = await checkV1RateLimit(req, "auth_register", 5, 3600);
    if (!rl.allowed) return rl.response!;

    // 2. Parse & validate body
    const body = await req.json().catch(() => ({}));
    const parsed = RegisterRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid registration payload",
        400,
        parsed.error.format(),
        reqId
      );
    }

    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent");

    const result = await registerUser(parsed.data, ip, userAgent);

    return apiSuccess(result, 201, {}, reqId);
  } catch (err: any) {
    if (err?.message?.startsWith("CONFLICT:")) {
      return apiError("CONFLICT", err.message.replace("CONFLICT:", "").trim(), 409, undefined, reqId);
    }
    return handleApiError(err, reqId);
  }
}
