import { NextRequest } from "next/server";
import { MarkNotificationsReadSchema } from "@aspirantbook/shared";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { markNotificationsRead } from "@/lib/services/notification.service";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    if (!viewer.userId) {
      return apiError("UNAUTHORIZED", "Authentication required to mark notifications as read", 401, undefined, reqId);
    }

    const body = await req.json().catch(() => ({}));
    const parsed = MarkNotificationsReadSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid notifications payload",
        400,
        parsed.error.format(),
        reqId
      );
    }

    await markNotificationsRead(viewer, parsed.data.notificationIds);
    return apiSuccess({ success: true, message: "Notifications marked as read" }, 200, {}, reqId);
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
