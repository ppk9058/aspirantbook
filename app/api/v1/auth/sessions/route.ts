import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { listDeviceSessions } from "@/lib/services/auth-token.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    if (!viewer.userId) {
      return apiError("UNAUTHORIZED", "Authentication required to view active sessions", 401, undefined, reqId);
    }

    const sessions = await listDeviceSessions(viewer.userId, viewer.sessionId);
    return apiSuccess(sessions, 200, {}, reqId);
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
