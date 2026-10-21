import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { createReauthToken } from "@/lib/api/v1/tokens";
import { checkV1RateLimit } from "@/lib/api/v1/rate-limit";
import { getClientIp } from "@/lib/rate-limit";
import { isDevBypassAllowed } from "@/lib/api/v1/dev-bypass";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    if (!viewer.userId) {
      return apiError("UNAUTHORIZED", "Authentication required to request re-auth token", 401, undefined, reqId);
    }

    const ip = getClientIp(req);
    // Tightened rate limit: 5 attempts per 15 min (900 seconds) per user+IP
    const rl = await checkV1RateLimit(req, "auth_reauth", 5, 900, `${viewer.userId}:${ip}`);
    if (!rl.allowed) return rl.response!;

    const body = await req.json().catch(() => ({}));
    const purpose = typeof body.purpose === "string" ? body.purpose : "delete_account";

    const user = await prisma.user.findUnique({
      where: { id: viewer.userId },
      select: { id: true, password: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return apiError("NOT_FOUND", "User not found or inactive", 404, undefined, reqId);
    }

    // If user has password, require password to issue reauth token
    if (user.password) {
      if (!body.password || typeof body.password !== "string") {
        return apiError("UNAUTHORIZED", "Password confirmation required", 401, undefined, reqId);
      }
      const isPasswordValid = await bcrypt.compare(body.password, user.password);
      if (!isPasswordValid) {
        return apiError("UNAUTHORIZED", "Incorrect password confirmation", 401, undefined, reqId);
      }
    } else {
      // Passwordless users (OTP or OAuth):
      if (!isDevBypassAllowed()) {
        return apiError(
          "REAUTH_UNAVAILABLE",
          "Automated re-authentication is not available for passwordless accounts without SMS. Please contact support to request account deletion.",
          501,
          undefined,
          reqId
        );
      }

      const otpCode = body.otp;
      if (!otpCode || typeof otpCode !== "string") {
        return apiError("UNAUTHORIZED", "Valid OTP verification required for passwordless re-authentication", 401, undefined, reqId);
      }

      if (otpCode !== "123456") {
        return apiError("UNAUTHORIZED", "Invalid verification code", 401, undefined, reqId);
      }
    }

    // Issue purpose-bound token tied to user and current session, <= 5 min expiry
    const reauthToken = await createReauthToken(user.id, purpose, "5m", viewer.sessionId);

    return apiSuccess(
      {
        reauthToken,
        purpose,
        expiresIn: 300, // 5 minutes
      },
      200,
      {},
      reqId
    );
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
