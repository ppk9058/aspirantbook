import { NextRequest } from "next/server";
import { apiSuccess, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { getCoursesList } from "@/lib/services/courses.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    const { searchParams } = new URL(req.url);

    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;
    const cursor = searchParams.get("cursor") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;

    const courses = await getCoursesList(viewer, { category, search, cursor, limit });
    return apiSuccess(courses, 200, {}, reqId);
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
