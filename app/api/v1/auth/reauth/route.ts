import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { createReauthToken } from "@/lib/api/v1/tokens";
import { checkV1RateLimit } from "@/lib/api/v1/rate-limit";
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

    const rl = await checkV1RateLimit(req, "auth_reauth", 10, 60, viewer.userId);
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
      // OTP or OAuth user: require valid OTP code
      // If dev/test or valid OTP verification:
      const otpCode = body.otp;
      if (!otpCode || typeof otpCode !== "string") {
        return apiError("UNAUTHORIZED", "Valid OTP verification required for passwordless re-authentication", 401, undefined, reqId);
      }
      // Verify OTP in DB if not test bypass
      if (process.env.APP_ENV === "test" && otpCode === "123456") {
        // Valid test OTP
      } else {
        const storedOtp = await prisma.otpCode.findFirst({
          where: {
            userId: user.id,
            code: otpCode,
            used: false,
            expiresAt: { gt: new Date() },
          },
        });
        if (!storedOtp) {
          return apiError("UNAUTHORIZED", "Invalid or expired OTP code", 401, undefined, reqId);
        }
        await prisma.otpCode.update({
          where: { id: storedOtp.id },
          data: { used: true },
        });
      }
    }

    const reauthToken = await createReauthToken(user.id, purpose, "5m");

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
