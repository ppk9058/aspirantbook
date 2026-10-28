import { NextRequest } from "next/server";
import { apiSuccess, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getPyqExams } from "@/lib/services/pyq.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const exams = await getPyqExams();
    return apiSuccess(
      exams,
      200,
      {
        "Cache-Control": "public, max-age=120, stale-while-revalidate=300",
      },
      reqId
    );
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
