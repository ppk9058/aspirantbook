import { NextResponse } from "next/server"
import { toggleHandRaise } from "@/lib/classroom-service"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const result = await toggleHandRaise(
      id,
      body.userId || "student-current",
      body.userName || "You (Student)"
    )
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("POST /api/classroom/[id]/hand-raise error:", error)
    return NextResponse.json({ error: "Failed to toggle hand raise" }, { status: 500 })
  }
}
