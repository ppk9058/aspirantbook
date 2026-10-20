import { NextRequest } from "next/server";
import { apiSuccess, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { getCurrentAffairsList } from "@/lib/services/current-affairs.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    const list = await getCurrentAffairsList(viewer);
    return apiSuccess(
      list,
      200,
      {
        "Cache-Control": "public, max-age=120, stale-while-revalidate=300",
      },
      reqId
    );
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
