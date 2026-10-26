import { NextRequest } from "next/server";
import { apiSuccess, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { getPyqPapers } from "@/lib/services/pyq.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    const { searchParams } = new URL(req.url);

    const examId = searchParams.get("examId") || undefined;
    const yearStr = searchParams.get("year");
    const year = yearStr ? parseInt(yearStr, 10) : undefined;
    const search = searchParams.get("search") || undefined;

    const papers = await getPyqPapers(viewer, { examId, year, search });
    return apiSuccess(papers, 200, {}, reqId);
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
