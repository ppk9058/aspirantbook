import { NextResponse } from "next/server"
import { requireContentEngineAdmin } from "@/lib/modules/content-engine/auth"
import { reCategoriseAllQuestions } from "@/lib/modules/content-engine/db-service"

export async function POST() {
  try {
    const { response } = await requireContentEngineAdmin()
    if (response) return response

    const result = await reCategoriseAllQuestions()

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error("POST /api/admin/content-engine/recategorise error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to re-categorise questions" },
      { status: 500 }
    )
  }
}
