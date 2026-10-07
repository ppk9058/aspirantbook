import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { addChatMessage } from "@/lib/classroom-service"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    if (!body.text || !body.text.trim()) {
      return NextResponse.json({ error: "Message text is required" }, { status: 400 })
    }
    const created = await addChatMessage(id, {
      userId: session.user.id,
      userName: session.user.name || "Student",
      text: body.text,
      role: (session.user as any).role || "student",
      attachment: body.attachment,
    })
    return NextResponse.json(created)
  } catch (error: any) {
    console.error("POST /api/classroom/[id]/chat error:", error)
    return NextResponse.json({ error: "Failed to post message" }, { status: 500 })
  }
}

