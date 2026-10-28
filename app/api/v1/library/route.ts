import { NextRequest } from "next/server";
import { apiSuccess, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { getLibraryItems } from "@/lib/services/library.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    const items = await getLibraryItems(viewer);
    return apiSuccess(items, 200, {}, reqId);
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
