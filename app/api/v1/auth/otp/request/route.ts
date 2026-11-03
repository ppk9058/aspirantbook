import { NextRequest } from "next/server";
import { OtpRequestSchema } from "@aspirantbook/shared";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { checkV1RateLimit } from "@/lib/api/v1/rate-limit";
import { getClientIp } from "@/lib/rate-limit";
import { otpService } from "@/lib/services/sms-otp/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const rl = await checkV1RateLimit(req, "auth_otp_req", 5, 60, undefined, { failClosed: true });
    if (!rl.allowed) return rl.response!;

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

    const sent = await otpService.sendOtp({
      rawPhone: parsed.data.phoneNumber,
      ip: getClientIp(req),
    });

    if (!sent.ok) {
      switch (sent.code) {
        case "invalid_phone":
          return apiError("VALIDATION_ERROR", sent.message, 400, undefined, reqId);
        case "not_configured":
          return apiError(
            "NOT_IMPLEMENTED",
            "SMS OTP service is currently disabled. Please use email & password sign-in.",
            501,
            undefined,
            reqId
          );
        case "cooldown":
        case "rate_limited":
        case "provider_rate_limited":
          return apiError(
            "TOO_MANY_REQUESTS",
            sent.message,
            429,
            sent.retryAfterSeconds ? { retryAfter: sent.retryAfterSeconds } : undefined,
            reqId
          );
        default:
          return apiError("PROVIDER_ERROR", sent.message, 502, undefined, reqId);
      }
    }

    // Same shape whether or not an account exists: this endpoint never reads the
    // User table, so it cannot leak account existence.
    return apiSuccess(
      {
        message: sent.devBypass
          ? "Dev OTP bypass active. Use verification code 123456."
          : "Verification code sent.",
        phoneNumber: parsed.data.phoneNumber,
        verificationId: sent.verificationId,
        expiresIn: sent.expiresInSeconds,
        resendAfter: sent.resendAfterSeconds,
        devBypass: sent.devBypass,
      },
      200,
      {},
      reqId
    );
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
