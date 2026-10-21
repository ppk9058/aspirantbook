import { NextRequest } from "next/server";
import { apiSuccess, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { getCareerTracks } from "@/lib/services/courses.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    const tracks = await getCareerTracks(viewer);
    return apiSuccess(tracks, 200, {}, reqId);
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
