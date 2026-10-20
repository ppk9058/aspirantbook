import { NextRequest } from "next/server";
import { TestListQuerySchema } from "@aspirantbook/shared";
import { apiSuccess, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { getTestsList } from "@/lib/services/exam.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    const { searchParams } = new URL(req.url);

    const parsedQuery = TestListQuerySchema.safeParse({
      seriesId: searchParams.get("seriesId") || undefined,
      goal: searchParams.get("goal") || undefined,
      cursor: searchParams.get("cursor") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    const query = parsedQuery.success ? parsedQuery.data : {};
    const result = await getTestsList(viewer, query);

    return apiSuccess(result, 200, {}, reqId);
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
