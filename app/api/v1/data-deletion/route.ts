import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateDeletionRequestSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
});

export async function GET(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    if (!viewer.userId) {
      return apiError("UNAUTHORIZED", "Authentication required to view deletion status", 401, undefined, reqId);
    }

    const request = await prisma.dataDeletionRequest.findFirst({
      where: {
        OR: [
          { userId: viewer.userId },
          viewer.email ? { email: viewer.email } : {},
        ],
      },
      orderBy: { requestedAt: "desc" },
    });

    return apiSuccess({ request: request || null }, 200, {}, reqId);
  } catch (err) {
    return handleApiError(err, reqId);
  }
}

export async function POST(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    if (!viewer.userId) {
      return apiError("UNAUTHORIZED", "Authentication required to submit data deletion request", 401, undefined, reqId);
    }

    // Resolve user email
    let userEmail = viewer.email;
    if (!userEmail) {
      const dbUser = await prisma.user.findUnique({
        where: { id: viewer.userId },
        select: { email: true },
      });
      userEmail = dbUser?.email || null;
    }

    if (!userEmail) {
      return apiError("BAD_REQUEST", "Unable to resolve email for this account", 400, undefined, reqId);
    }

    const body = await req.json().catch(() => ({}));
    const parsed = CreateDeletionRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid payload",
        400,
        parsed.error.format(),
        reqId
      );
    }

    const normalizedEmail = userEmail.toLowerCase().trim();

    // Idempotency: Check if an active request already exists for this user/email
    const existingActive = await prisma.dataDeletionRequest.findFirst({
      where: {
        OR: [
          { userId: viewer.userId },
          { email: normalizedEmail },
        ],
        status: { in: ["PENDING", "IN_REVIEW"] },
      },
      orderBy: { requestedAt: "desc" },
    });

    if (existingActive) {
      return apiSuccess(
        {
          id: existingActive.id,
          userId: existingActive.userId,
          email: existingActive.email,
          status: existingActive.status,
          requestedAt: existingActive.requestedAt,
          processedAt: existingActive.processedAt,
          adminNotes: existingActive.adminNotes,
          isExisting: true,
        },
        200,
        {},
        reqId
      );
    }

    // Create a new deletion request
    const newRequest = await prisma.dataDeletionRequest.create({
      data: {
        userId: viewer.userId,
        email: normalizedEmail,
        reason: parsed.data.reason || null,
        status: "PENDING",
      },
    });

    return apiSuccess(
      {
        id: newRequest.id,
        userId: newRequest.userId,
        email: newRequest.email,
        status: newRequest.status,
        requestedAt: newRequest.requestedAt,
        processedAt: newRequest.processedAt,
        adminNotes: newRequest.adminNotes,
        isExisting: false,
      },
      200,
      {},
      reqId
    );
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
