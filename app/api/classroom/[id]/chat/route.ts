import { NextResponse } from "next/server"
import { addChatMessage } from "@/lib/classroom-service"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    if (!body.text || !body.text.trim()) {
      return NextResponse.json({ error: "Message text is required" }, { status: 400 })
    }
    const created = await addChatMessage(id, {
      userId: body.userId || "student-current",
      userName: body.userName || "Student",
      text: body.text,
      role: body.role || "student",
      attachment: body.attachment,
    })
    return NextResponse.json(created)
  } catch (error: any) {
    console.error("POST /api/classroom/[id]/chat error:", error)
    return NextResponse.json({ error: "Failed to post message" }, { status: 500 })
  }
}
