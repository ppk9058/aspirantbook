import { NextRequest } from "next/server";
import { GoogleAuthRequestSchema } from "@aspirantbook/shared";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getClientIp } from "@/lib/rate-limit";
import { checkV1RateLimit } from "@/lib/api/v1/rate-limit";
import { verifyGoogleIdToken } from "@/lib/auth/google-token-verifier";
import { loginOrRegisterWithGoogle } from "@/lib/services/auth-token.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const rl = await checkV1RateLimit(req, "auth_google", 10, 60, undefined, { failClosed: true });
    if (!rl.allowed) return rl.response!;

    const body = await req.json().catch(() => ({}));
    const parsed = GoogleAuthRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid Google auth payload",
        400,
        parsed.error.format(),
        reqId
      );
    }

    const verification = await verifyGoogleIdToken(parsed.data.idToken);
    if (!verification.valid || !verification.payload) {
      if (verification.errorCode === "NOT_CONFIGURED") {
        return apiError(
          "NOT_IMPLEMENTED",
          verification.error || "Google Sign-In is not currently enabled. Server requires GOOGLE_CLIENT_IDS environment variable.",
          501,
          undefined,
          reqId
        );
      }
      if (verification.errorCode === "EMAIL_NOT_VERIFIED") {
        return apiError(
          "FORBIDDEN",
          verification.error || "Google account email is not verified.",
          403,
          undefined,
          reqId
        );
      }
      return apiError(
        "UNAUTHORIZED",
        verification.error || "Invalid Google ID token.",
        401,
        undefined,
        reqId
      );
    }

    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent");

    const result = await loginOrRegisterWithGoogle(verification.payload, parsed.data, ip, userAgent);

    return apiSuccess(result, 200, {}, reqId);
  } catch (err: any) {
    if (err?.message?.startsWith("FORBIDDEN:")) {
      return apiError("FORBIDDEN", err.message.replace("FORBIDDEN:", "").trim(), 403, undefined, reqId);
    }
    if (err?.message?.startsWith("UNAUTHORIZED:")) {
      return apiError("UNAUTHORIZED", err.message.replace("UNAUTHORIZED:", "").trim(), 401, undefined, reqId);
    }
    return handleApiError(err, reqId);
  }
}
