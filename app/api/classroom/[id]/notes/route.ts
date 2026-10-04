import { NextResponse } from "next/server"
import { addStudentNote } from "@/lib/classroom-service"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    if (!body.noteText) {
      return NextResponse.json({ error: "Note text is required" }, { status: 400 })
    }
    const created = await addStudentNote(id, body.noteText, body.seconds || 0)
    return NextResponse.json(created)
  } catch (error: any) {
    console.error("POST /api/classroom/[id]/notes error:", error)
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 })
  }
}
