import { NextResponse } from "next/server"
import {
  getClassroomData,
  muteParticipant,
  requestUnmuteParticipant,
  disableParticipantCamera,
  removeParticipant,
  bringParticipantToStage,
  removeParticipantFromStage,
} from "@/lib/classroom-service"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const classroom = await getClassroomData(id)
    return NextResponse.json({
      participants: classroom.participants || [],
      total: classroom.viewerCount,
      handRaiseQueue: classroom.handRaiseQueue || [],
    })
  } catch (error: any) {
    console.error("GET /api/classroom/[id]/participants error:", error)
    return NextResponse.json({ error: "Failed to fetch participants" }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { action, participantId } = body

    if (!participantId) {
      return NextResponse.json({ error: "participantId is required" }, { status: 400 })
    }

    if (action === "mute") {
      const updated = await muteParticipant(id, participantId)
      return NextResponse.json({ success: true, participant: updated })
    }

    if (action === "requestUnmute") {
      const res = await requestUnmuteParticipant(id, participantId)
      return NextResponse.json(res)
    }

    if (action === "disableCamera") {
      const updated = await disableParticipantCamera(id, participantId)
      return NextResponse.json({ success: true, participant: updated })
    }

    if (action === "remove") {
      const updatedList = await removeParticipant(id, participantId)
      return NextResponse.json({ success: true, participants: updatedList })
    }

    if (action === "bringToStage") {
      const updated = await bringParticipantToStage(id, participantId)
      return NextResponse.json({ success: true, participant: updated })
    }

    if (action === "removeFromStage") {
      const updated = await removeParticipantFromStage(id, participantId)
      return NextResponse.json({ success: true, participant: updated })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("POST /api/classroom/[id]/participants error:", error)
    return NextResponse.json({ error: "Failed to perform participant action" }, { status: 500 })
  }
}
