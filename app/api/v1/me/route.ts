import { NextRequest } from "next/server";
import { UpdateProfileRequestSchema, DeleteAccountRequestSchema } from "@aspirantbook/shared";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { getViewerProfile, updateViewerProfile, deleteViewerAccount } from "@/lib/services/user.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    if (!viewer.userId) {
      return apiError("UNAUTHORIZED", "Authentication required to view profile", 401, undefined, reqId);
    }

    const profile = await getViewerProfile(viewer.userId);
    return apiSuccess(profile, 200, {}, reqId);
  } catch (err) {
    return handleApiError(err, reqId);
  }
}

export async function PATCH(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    if (!viewer.userId) {
      return apiError("UNAUTHORIZED", "Authentication required to update profile", 401, undefined, reqId);
    }

    const body = await req.json().catch(() => ({}));
    const parsed = UpdateProfileRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid profile update payload",
        400,
        parsed.error.format(),
        reqId
      );
    }

    const updated = await updateViewerProfile(viewer.userId, parsed.data);
    return apiSuccess(updated, 200, {}, reqId);
  } catch (err) {
    return handleApiError(err, reqId);
  }
}

export async function DELETE(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    if (!viewer.userId) {
      return apiError("UNAUTHORIZED", "Authentication required to delete account", 401, undefined, reqId);
    }

    const body = await req.json().catch(() => ({}));
    const parsed = DeleteAccountRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid account deletion payload",
        400,
        parsed.error.format(),
        reqId
      );
    }

    const result = await deleteViewerAccount(viewer.userId, parsed.data);
    return apiSuccess(result, 200, {}, reqId);
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
