import { NextRequest } from "next/server";
import { SubmitAnswersRequestSchema } from "@aspirantbook/shared";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { checkV1RateLimit } from "@/lib/api/v1/rate-limit";
import { syncAttemptAnswers } from "@/lib/services/exam.service";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    if (!viewer.userId) {
      return apiError("UNAUTHORIZED", "Authentication required to sync answers", 401, undefined, reqId);
    }

    // High frequency sync: 120 syncs per minute
    const rl = await checkV1RateLimit(req, "attempt_answers_sync", 120, 60, viewer.userId);
    if (!rl.allowed) return rl.response!;

    const body = await req.json().catch(() => ({}));
    const parsed = SubmitAnswersRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid answers sync batch",
        400,
        parsed.error.format(),
        reqId
      );
    }

    const { id } = await params;
    const res = await syncAttemptAnswers(
      viewer,
      id,
      parsed.data.answers,
      parsed.data.lastSequenceNumber
    );

    return apiSuccess(res, 200, {}, reqId);
  } catch (err: any) {
    if (err?.message?.startsWith("FORBIDDEN:")) {
      return apiError("FORBIDDEN", err.message.replace("FORBIDDEN:", "").trim(), 403, undefined, reqId);
    }
    if (err?.message?.startsWith("BAD_REQUEST:")) {
      return apiError("BAD_REQUEST", err.message.replace("BAD_REQUEST:", "").trim(), 400, undefined, reqId);
    }
    return handleApiError(err, reqId);
  }
}
