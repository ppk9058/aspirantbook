import { NextRequest } from "next/server";
import { apiSuccess, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { getTutorialsList } from "@/lib/services/tutorial.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    const tutorials = await getTutorialsList(viewer);
    return apiSuccess(
      tutorials,
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
