import { NextResponse } from "next/server"
import { requireContentEngineAdmin } from "@/lib/modules/content-engine/auth"
import { HindiReviewToggleSchema } from "@/lib/modules/content-engine/schemas"
import { toggleTranslationReview } from "@/lib/modules/content-engine/db-service"

export async function PATCH(req: Request) {
  try {
    const { user, response } = await requireContentEngineAdmin()
    if (response) return response

    const json = await req.json()
    const parsed = HindiReviewToggleSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    await toggleTranslationReview(
      parsed.data.questionId,
      parsed.data.isReviewed,
      user?.userId
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("PATCH /api/admin/content-engine/hindi/review error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update Hindi review status" },
      { status: 500 }
    )
  }
}
