import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { getCurrentAffairsDetail } from "@/lib/services/current-affairs.service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    const { slug } = await params;
    const detail = await getCurrentAffairsDetail(viewer, slug);
    return apiSuccess(detail, 200, {}, reqId);
  } catch (err: any) {
    if (err?.message?.startsWith("NOT_FOUND:")) {
      return apiError("NOT_FOUND", err.message.replace("NOT_FOUND:", "").trim(), 404, undefined, reqId);
    }
    return handleApiError(err, reqId);
  }
}
