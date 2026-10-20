import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { logoutAllSessions } from "@/lib/services/auth-token.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    if (!viewer.userId) {
      return apiError("UNAUTHORIZED", "Authentication required to revoke all sessions", 401, undefined, reqId);
    }

    await logoutAllSessions(viewer.userId);
    return apiSuccess({ success: true, message: "All device sessions revoked successfully" }, 200, {}, reqId);
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
