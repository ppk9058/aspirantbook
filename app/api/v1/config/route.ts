import { NextRequest } from "next/server";
import { apiCachedSuccess, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getAppConfig } from "@/lib/services/config.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const config = getAppConfig(req);
    return apiCachedSuccess(
      req,
      config,
      "public, max-age=60, stale-while-revalidate=120",
      reqId
    );
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
