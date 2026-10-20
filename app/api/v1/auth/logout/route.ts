import { NextRequest } from "next/server";
import { apiSuccess, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { logoutSession } from "@/lib/services/auth-token.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const body = await req.json().catch(() => ({}));
    if (body.refreshToken && typeof body.refreshToken === "string") {
      await logoutSession(body.refreshToken);
    }
    return apiSuccess({ success: true, message: "Logged out successfully" }, 200, {}, reqId);
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
