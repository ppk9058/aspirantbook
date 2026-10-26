import { NextRequest } from "next/server";
import { OtpRequestSchema } from "@aspirantbook/shared";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { checkV1RateLimit } from "@/lib/api/v1/rate-limit";
import { isDevBypassAllowed } from "@/lib/api/v1/dev-bypass";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const rl = await checkV1RateLimit(req, "auth_otp_req", 5, 60);
    if (!rl.allowed) return rl.response!;

    const devBypass = isDevBypassAllowed();

    // When devBypass is off => ALWAYS 501, even if SMS_API_KEY is set.
    // Zero-cost rule: no real SMS is sent.
    if (!devBypass) {
      return apiError(
        "NOT_IMPLEMENTED",
        "SMS OTP service is currently disabled. Please use email & password sign-in.",
        501,
        undefined,
        reqId
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = OtpRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid phone number payload",
        400,
        parsed.error.format(),
        reqId
      );
    }

    // In dev bypass mode, return explicit dev bypass notice (never claim "OTP sent" unless generated)
    return apiSuccess(
      {
        message: "Dev OTP bypass active. Use verification code 123456.",
        phoneNumber: parsed.data.phoneNumber,
        devBypass: true,
      },
      200,
      {},
      reqId
    );
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
