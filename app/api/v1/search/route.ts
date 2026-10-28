import { NextRequest } from "next/server";
import { apiSuccess, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { performGlobalSearch } from "@/lib/services/search.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const q = req.nextUrl.searchParams.get("q") || "";
    const searchData = await performGlobalSearch(q);

    return apiSuccess(
      searchData,
      200,
      {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
      reqId
    );
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
