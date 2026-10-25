import { NextResponse } from "next/server"
import { requireContentEngineAdmin } from "@/lib/modules/content-engine/auth"
import { BulkAssignSchema } from "@/lib/modules/content-engine/schemas"
import { bulkAssignQuestions } from "@/lib/modules/content-engine/db-service"

export async function POST(req: Request) {
  try {
    const { response } = await requireContentEngineAdmin()
    if (response) return response

    const json = await req.json()
    const parsed = BulkAssignSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const count = await bulkAssignQuestions(parsed.data)

    return NextResponse.json({ success: true, count })
  } catch (error: any) {
    console.error("POST /api/admin/content-engine/assign error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to bulk assign questions" },
      { status: 500 }
    )
  }
}
