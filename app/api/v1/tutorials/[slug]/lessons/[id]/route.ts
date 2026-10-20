import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { getLessonDetail } from "@/lib/services/tutorial.service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    const { slug, id } = await params;
    const lesson = await getLessonDetail(viewer, slug, id);
    return apiSuccess(lesson, 200, {}, reqId);
  } catch (err: any) {
    if (err?.message?.startsWith("NOT_FOUND:")) {
      return apiError("NOT_FOUND", err.message.replace("NOT_FOUND:", "").trim(), 404, undefined, reqId);
    }
    return handleApiError(err, reqId);
  }
}
