import { NextRequest } from "next/server";
import { ForgotPasswordRequestSchema } from "@aspirantbook/shared";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { checkV1RateLimit } from "@/lib/api/v1/rate-limit";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    // 1. Rate limiting: 5 forgot-password requests per hour per IP
    const rl = await checkV1RateLimit(req, "auth_forgot_pwd", 5, 3600);
    if (!rl.allowed) return rl.response!;

    const body = await req.json().catch(() => ({}));
    const parsed = ForgotPasswordRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid payload",
        400,
        parsed.error.format(),
        reqId
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (user && user.email) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          email: user.email,
          tokenHash,
          expiresAt,
        },
      });

      // Generic response: Never disclose whether an email exists in the system
    }

    return apiSuccess(
      {
        success: true,
        message: "If an account exists with this email, a password reset link has been dispatched.",
      },
      200,
      {},
      reqId
    );
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
