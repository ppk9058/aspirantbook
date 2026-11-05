import { NextRequest } from "next/server"
import { getViewer } from "@/lib/api/v1/viewer"
import { getCourseDetail } from "@/lib/services/courses.service"
import { apiSuccess, apiError, getRequestId } from "@/lib/api/v1/response"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const reqId = getRequestId(req)
  const { id } = await params

  try {
    const viewer = await getViewer(req)
    const detail = await getCourseDetail(viewer, id)
    return apiSuccess(detail, 200, {}, reqId)
  } catch (err: any) {
    if (err?.message?.includes("NOT_FOUND")) {
      return apiError("NOT_FOUND", "Course not found", 404, {}, reqId)
    }
    console.error("[api/v1/courses/[id]] Error:", err)
    return apiError("INTERNAL_ERROR", "Failed to fetch course details", 500, {}, reqId)
  }
}
