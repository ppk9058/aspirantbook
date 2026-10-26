import { NextRequest } from "next/server";
import { UpdateLessonProgressRequestSchema } from "@aspirantbook/shared";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { updateLessonProgress } from "@/lib/services/tutorial.service";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    if (!viewer.userId) {
      return apiError("UNAUTHORIZED", "Authentication required to update lesson progress", 401, undefined, reqId);
    }

    const body = await req.json().catch(() => ({}));
    const parsed = UpdateLessonProgressRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid progress payload",
        400,
        parsed.error.format(),
        reqId
      );
    }

    const { slug, id } = await params;
    await updateLessonProgress(viewer, slug, id, parsed.data);

    return apiSuccess({ success: true, message: "Progress updated" }, 200, {}, reqId);
  } catch (err: any) {
    if (err?.message?.startsWith("UNAUTHORIZED:")) {
      return apiError("UNAUTHORIZED", err.message.replace("UNAUTHORIZED:", "").trim(), 401, undefined, reqId);
    }
    return handleApiError(err, reqId);
  }
}
