import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { checkV1RateLimit } from "@/lib/api/v1/rate-limit";
import { startTestAttempt } from "@/lib/services/exam.service";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    if (!viewer.userId) {
      return apiError("UNAUTHORIZED", "Please log in to start or resume a test attempt", 401, undefined, reqId);
    }

    const rl = await checkV1RateLimit(req, "test_start", 20, 60, viewer.userId);
    if (!rl.allowed) return rl.response!;

    const { id } = await params;
    const attempt = await startTestAttempt(viewer, id);
    return apiSuccess(attempt, 201, {}, reqId);
  } catch (err: any) {
    if (err?.message?.startsWith("UNAUTHORIZED:")) {
      return apiError("UNAUTHORIZED", err.message.replace("UNAUTHORIZED:", "").trim(), 401, undefined, reqId);
    }
    if (err?.message?.startsWith("NOT_FOUND:")) {
      return apiError("NOT_FOUND", err.message.replace("NOT_FOUND:", "").trim(), 404, undefined, reqId);
    }
    return handleApiError(err, reqId);
  }
}
