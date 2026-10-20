import { NextRequest } from "next/server";
import { RegisterPushTokenSchema } from "@aspirantbook/shared";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { checkV1RateLimit } from "@/lib/api/v1/rate-limit";
import { registerDeviceToken, unregisterDeviceToken } from "@/lib/services/device.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    if (!viewer.userId) {
      return apiError("UNAUTHORIZED", "Authentication required to register device token", 401, undefined, reqId);
    }

    const rl = await checkV1RateLimit(req, "device_push_token", 10, 60, viewer.userId);
    if (!rl.allowed) return rl.response!;

    const body = await req.json().catch(() => ({}));
    const parsed = RegisterPushTokenSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid push token registration payload",
        400,
        parsed.error.format(),
        reqId
      );
    }

    await registerDeviceToken(viewer, parsed.data);
    return apiSuccess({ success: true, message: "Push token registered successfully" }, 200, {}, reqId);
  } catch (err: any) {
    if (err?.message?.startsWith("UNAUTHORIZED:")) {
      return apiError("UNAUTHORIZED", err.message.replace("UNAUTHORIZED:", "").trim(), 401, undefined, reqId);
    }
    return handleApiError(err, reqId);
  }
}

export async function DELETE(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return apiError("VALIDATION_ERROR", "Token query parameter is required", 400, undefined, reqId);
    }

    await unregisterDeviceToken(viewer, token);
    return apiSuccess({ success: true, message: "Push token unregistered" }, 200, {}, reqId);
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
