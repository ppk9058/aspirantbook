import { NextRequest } from "next/server";
import { apiSuccess, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getGoalsList } from "@/lib/services/goal.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const goals = await getGoalsList();
    return apiSuccess(
      goals,
      200,
      {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
      reqId
    );
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
