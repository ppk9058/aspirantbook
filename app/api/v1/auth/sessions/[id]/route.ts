import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { revokeDeviceSession } from "@/lib/services/auth-token.service";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    if (!viewer.userId) {
      return apiError("UNAUTHORIZED", "Authentication required to revoke session", 401, undefined, reqId);
    }

    const { id } = await params;
    const revoked = await revokeDeviceSession(viewer.userId, id);
    if (!revoked) {
      return apiError("NOT_FOUND", "Session not found or already revoked", 404, undefined, reqId);
    }

    return apiSuccess({ success: true, message: "Session revoked" }, 200, {}, reqId);
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
