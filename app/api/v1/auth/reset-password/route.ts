import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { ResetPasswordRequestSchema } from "@aspirantbook/shared";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { checkV1RateLimit } from "@/lib/api/v1/rate-limit";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const rl = await checkV1RateLimit(req, "auth_reset_pwd", 10, 3600, undefined, { failClosed: true });
    if (!rl.allowed) return rl.response!;

    const body = await req.json().catch(() => ({}));
    const parsed = ResetPasswordRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid payload",
        400,
        parsed.error.format(),
        reqId
      );
    }

    const tokenHash = crypto.createHash("sha256").update(parsed.data.token).digest("hex");
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.used || record.expiresAt < new Date()) {
      return apiError(
        "INVALID_TOKEN",
        "The password reset token is invalid, used, or expired.",
        400,
        undefined,
        reqId
      );
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { email: record.email },
        data: {
          password: hashedPassword,
          sessionVersion: { increment: 1 },
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { used: true },
      }),
      prisma.deviceSession.updateMany({
        where: { user: { email: record.email }, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return apiSuccess({ success: true, message: "Password updated successfully" }, 200, {}, reqId);
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
