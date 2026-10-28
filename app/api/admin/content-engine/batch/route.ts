import { NextResponse } from "next/server"
import { requireContentEngineAdmin } from "@/lib/modules/content-engine/auth"
import { AddBatchSchema } from "@/lib/modules/content-engine/schemas"
import { addBatch } from "@/lib/modules/content-engine/db-service"

export async function POST(req: Request) {
  try {
    const { user, response } = await requireContentEngineAdmin()
    if (response) return response

    const json = await req.json()
    const parsed = AddBatchSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await addBatch({
      ...parsed.data,
      createdById: user?.userId,
    })

    return NextResponse.json({ success: true, ...result }, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/admin/content-engine/batch error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to add batch" },
      { status: 500 }
    )
  }
}
