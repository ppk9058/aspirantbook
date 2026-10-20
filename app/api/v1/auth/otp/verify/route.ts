import { NextRequest } from "next/server";
import crypto from "crypto";
import { OtpVerifySchema } from "@aspirantbook/shared";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { checkV1RateLimit } from "@/lib/api/v1/rate-limit";
import { getClientIp } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import {
  createAccessToken,
  generateOpaqueRefreshToken,
  hashRefreshToken,
} from "@/lib/api/v1/tokens";
import { logAuditEvent } from "@/lib/api/v1/audit";

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
    const rl = await checkV1RateLimit(req, "auth_otp_verify", 10, 60);
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
    const parsed = OtpVerifySchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid OTP payload",
        400,
        parsed.error.format(),
        reqId
      );
    }

    // In dev bypass, code "123456" is accepted
    if (devBypass && parsed.data.code !== "123456") {
      return apiError("UNAUTHORIZED", "Invalid verification code", 401, undefined, reqId);
    }

    const phoneNumber = parsed.data.phoneNumber;
    const syntheticEmail = `mobile_${phoneNumber}@aspirantbook.local`;

    let user = await prisma.user.findUnique({
      where: { phoneNumber },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        phoneNumber: true,
        goal: true,
        emailVerified: true,
        isActive: true,
        sessionVersion: true,
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phoneNumber,
          email: syntheticEmail,
          name: "Student",
          role: "FREE",
          isActive: true,
          sessionVersion: 1,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          phoneNumber: true,
          goal: true,
          emailVerified: true,
          isActive: true,
          sessionVersion: true,
        },
      });
    }

    if (!user.isActive) {
      return apiError("FORBIDDEN", "Account suspended or deactivated", 403, undefined, reqId);
    }

    const familyId = crypto.randomUUID();
    const rawRefreshToken = generateOpaqueRefreshToken();
    const refreshTokenHash = hashRefreshToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent");

    const session = await prisma.deviceSession.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        familyId,
        deviceName: parsed.data.deviceName || null,
        platform: parsed.data.platform || "android",
        appVersion: parsed.data.appVersion || null,
        ip,
        userAgent,
        expiresAt,
      },
    });

    const accessToken = await createAccessToken({
      sub: user.id,
      email: user.email || "",
      role: user.role,
      sessionVersion: user.sessionVersion,
      familyId,
      sessionId: session.id,
    });

    await logAuditEvent({
      actorId: user.id,
      action: "USER_LOGIN_OTP_MOBILE",
      targetId: session.id,
      ip,
    });

    return apiSuccess(
      {
        tokens: {
          accessToken,
          refreshToken: rawRefreshToken,
          expiresIn: 15 * 60,
          tokenType: "Bearer",
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
          phoneNumber: user.phoneNumber,
          goal: user.goal,
          emailVerified: user.emailVerified,
          isActive: user.isActive,
        },
      },
      200,
      {},
      reqId
    );
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
