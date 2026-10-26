import { NextRequest } from "next/server";
import { GoogleAuthRequestSchema } from "@aspirantbook/shared";
import { apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const googleClientIds = process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID;

    // Strict safety rule: DISABLED with a clear 501 until GOOGLE_CLIENT_IDS is set. Do not add any fake flow.
    if (!googleClientIds) {
      return apiError(
        "NOT_IMPLEMENTED",
        "Google Sign-In is not currently enabled. Server requires GOOGLE_CLIENT_IDS environment variable.",
        501,
        undefined,
        reqId
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = GoogleAuthRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid Google auth payload",
        400,
        parsed.error.format(),
        reqId
      );
    }

    // When configured, token verification would verify against GOOGLE_CLIENT_IDS
    return apiError(
      "SERVICE_UNAVAILABLE",
      "Google authentication verification service is offline.",
      503,
      undefined,
      reqId
    );
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
