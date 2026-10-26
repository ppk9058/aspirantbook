import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { getCourseLesson } from "@/lib/services/courses.service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    const { id, lessonId } = await params;
    const lesson = await getCourseLesson(viewer, id, lessonId);
    return apiSuccess(lesson, 200, {}, reqId);
  } catch (err: any) {
    if (err?.message?.startsWith("NOT_FOUND:")) {
      return apiError("NOT_FOUND", err.message.replace("NOT_FOUND:", "").trim(), 404, undefined, reqId);
    }
    if (err?.message?.startsWith("FORBIDDEN:")) {
      return apiError("FORBIDDEN", err.message.replace("FORBIDDEN:", "").trim(), 403, undefined, reqId);
    }
    return handleApiError(err, reqId);
  }
}
