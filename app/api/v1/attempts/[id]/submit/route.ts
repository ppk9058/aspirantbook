import { NextRequest } from "next/server";
import { SubmitAttemptRequestSchema } from "@aspirantbook/shared";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { checkExamV1RateLimit } from "@/lib/exam-runtime/exam-rate-limit";
import { submitTestAttempt } from "@/lib/services/exam.service";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    if (!viewer.userId) {
      return apiError("UNAUTHORIZED", "Authentication required to submit attempt", 401, undefined, reqId);
    }

    const rl = await checkExamV1RateLimit(req, "submit", viewer.userId);
    if (!rl.allowed) return rl.response!;

    const body = await req.json().catch(() => ({}));
    const parsed = SubmitAttemptRequestSchema.safeParse(body);
    const finalAnswers = parsed.success ? parsed.data.finalAnswers : undefined;

    const { id } = await params;
    const result = await submitTestAttempt(viewer, id, finalAnswers);

    return apiSuccess(result, 200, {}, reqId);
  } catch (err: any) {
    if (err?.message?.startsWith("FORBIDDEN:")) {
      return apiError("FORBIDDEN", err.message.replace("FORBIDDEN:", "").trim(), 403, undefined, reqId);
    }
    return handleApiError(err, reqId);
  }
}
