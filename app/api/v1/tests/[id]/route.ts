import { NextRequest } from "next/server";
import { apiSuccess, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { getTestDetail } from "@/lib/services/exam.service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    const { id } = await params;
    const test = await getTestDetail(viewer, id);
    return apiSuccess(test, 200, {}, reqId);
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
