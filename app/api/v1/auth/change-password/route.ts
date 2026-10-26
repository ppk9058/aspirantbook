import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { checkV1RateLimit } from "@/lib/api/v1/rate-limit";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters long"),
});

export async function POST(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    if (!viewer.userId) {
      return apiError("UNAUTHORIZED", "Authentication required to change password", 401, undefined, reqId);
    }

    const rl = await checkV1RateLimit(req, `auth_change_pwd_${viewer.userId}`, 15, 60);
    if (!rl.allowed) return rl.response!;

    const body = await req.json().catch(() => ({}));
    const parsed = ChangePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid payload",
        400,
        parsed.error.format(),
        reqId
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: viewer.userId },
      select: { id: true, password: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return apiError("UNAUTHORIZED", "User account not found or deactivated", 401, undefined, reqId);
    }

    if (!user.password) {
      return apiError("BAD_REQUEST", "Account has no password set (OTP/OAuth account). Please set a password first.", 400, undefined, reqId);
    }

    const isMatch = await bcrypt.compare(parsed.data.currentPassword, user.password);
    if (!isMatch) {
      return apiError("UNAUTHORIZED", "Current password is incorrect", 401, undefined, reqId);
    }

    const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          sessionVersion: { increment: 1 },
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      prisma.deviceSession.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return apiSuccess({ success: true, message: "Password updated successfully" }, 200, {}, reqId);
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
