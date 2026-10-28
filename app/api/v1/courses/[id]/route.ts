import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { getCourseDetail } from "@/lib/services/courses.service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    const { id } = await params;
    const detail = await getCourseDetail(viewer, id);
    return apiSuccess(detail, 200, {}, reqId);
  } catch (err: any) {
    if (err?.message?.startsWith("NOT_FOUND:")) {
      return apiError("NOT_FOUND", err.message.replace("NOT_FOUND:", "").trim(), 404, undefined, reqId);
    }
    return handleApiError(err, reqId);
  }
}
