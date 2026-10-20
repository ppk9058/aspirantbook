import { NextRequest } from "next/server";
import { OtpRequestSchema } from "@aspirantbook/shared";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { checkV1RateLimit } from "@/lib/api/v1/rate-limit";

export const dynamic = "force-dynamic";

function isDevBypassAllowed(): boolean {
  if (process.env.NODE_ENV === "production" && process.env.APP_ENV !== "test") {
    return false;
  }
  let isLocalTestDb = false;
  try {
    const dbUrl = process.env.DATABASE_URL || "";
    const parsed = new URL(dbUrl);
    isLocalTestDb =
      (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") &&
      parsed.pathname.endsWith("_test");
  } catch {
    isLocalTestDb = false;
  }
  return (
    process.env.ALLOW_DEV_MOBILE_LOGIN === "true" ||
    (process.env.APP_ENV === "test" && isLocalTestDb)
  );
}

export async function POST(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const rl = await checkV1RateLimit(req, "auth_otp_req", 5, 60);
    if (!rl.allowed) return rl.response!;

    const hasSmsGateway = Boolean(process.env.SMS_API_KEY);
    const devBypass = isDevBypassAllowed();

    if (!hasSmsGateway && !devBypass) {
      return apiError(
        "NOT_IMPLEMENTED",
        "SMS OTP service is currently being configured. Please use email & password sign-in.",
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
        parsed.error.errors[0]?.message || "Invalid phone number",
        400,
        parsed.error.format(),
        reqId
      );
    }

    return apiSuccess(
      {
        success: true,
        message: devBypass
          ? "OTP generated (dev bypass code: 123456)"
          : "OTP sent to your mobile phone number.",
      },
      200,
      {},
      reqId
    );
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
