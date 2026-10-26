import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { updateCourseLessonProgress } from "@/lib/services/courses.service";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    if (!viewer.userId) {
      return apiError("UNAUTHORIZED", "Please log in to record progress", 401, undefined, reqId);
    }

    const { lessonId } = await params;
    const body = await req.json().catch(() => ({}));
    const completed = Boolean(body.completed);
    const timeSpent = typeof body.timeSpent === "number" ? body.timeSpent : undefined;

    const res = await updateCourseLessonProgress(viewer, lessonId, completed, timeSpent);
    return apiSuccess(res, 200, {}, reqId);
  } catch (err: any) {
    if (err?.message?.startsWith("UNAUTHORIZED:")) {
      return apiError("UNAUTHORIZED", err.message.replace("UNAUTHORIZED:", "").trim(), 401, undefined, reqId);
    }
    return handleApiError(err, reqId);
  }
}
