import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { enrollFreeCourse } from "@/lib/services/courses.service";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    if (!viewer.userId) {
      return apiError("UNAUTHORIZED", "Please log in to enroll in course", 401, undefined, reqId);
    }
    const { id } = await params;
    const res = await enrollFreeCourse(viewer, id);
    return apiSuccess(res, 201, {}, reqId);
  } catch (err: any) {
    if (err?.message?.startsWith("UNAUTHORIZED:")) {
      return apiError("UNAUTHORIZED", err.message.replace("UNAUTHORIZED:", "").trim(), 401, undefined, reqId);
    }
    if (err?.message?.startsWith("NOT_FOUND:")) {
      return apiError("NOT_FOUND", err.message.replace("NOT_FOUND:", "").trim(), 404, undefined, reqId);
    }
    if (err?.message?.startsWith("FORBIDDEN:")) {
      return apiError("FORBIDDEN", err.message.replace("FORBIDDEN:", "").trim(), 403, undefined, reqId);
    }
    return handleApiError(err, reqId);
  }
}
