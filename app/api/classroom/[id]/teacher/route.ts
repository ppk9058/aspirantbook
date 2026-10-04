import { NextResponse } from "next/server"
import { updatePresentationMode, endClassAndReleaseDpp, setTeacherClassStatus } from "@/lib/classroom-service"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    if (body.action === "switchMode") {
      const mode = await updatePresentationMode(id, body.mode)
      return NextResponse.json({ presentationMode: mode })
    }
    if (body.action === "goLive") {
      const updated = await setTeacherClassStatus(id, "LIVE")
      return NextResponse.json(updated)
    }
    if (body.action === "endClass") {
      const updated = await setTeacherClassStatus(id, "ENDED")
      return NextResponse.json(updated)
    }
    if (body.action === "setStatus") {
      const updated = await setTeacherClassStatus(id, body.status)
      return NextResponse.json(updated)
    }
    return NextResponse.json({ error: "Unknown teacher action" }, { status: 400 })
  } catch (error: any) {
    console.error("POST /api/classroom/[id]/teacher error:", error)
    return NextResponse.json({ error: "Teacher action failed" }, { status: 500 })
  }
}
