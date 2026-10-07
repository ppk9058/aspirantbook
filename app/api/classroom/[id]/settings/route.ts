import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  getClassroomData,
  updateClassroomSettings,
  scheduleClass,
  setTeacherClassStatus,
  sendResourceViaChat,
  deletePoll,
  deleteQuestion,
  deleteResource,
  updatePresentationMode,
} from "@/lib/classroom-service"

interface RouteProps {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, { params }: RouteProps) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const classroom = await getClassroomData(id)
    return NextResponse.json({
      classroomSettings: classroom.classroomSettings,
      status: classroom.status,
      topicTitle: classroom.topicTitle,
      subject: classroom.subject,
      scheduledStartTime: classroom.scheduledStartTime,
      durationMinutes: classroom.durationMinutes,
      presentationMode: classroom.presentationMode,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: RouteProps) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role !== "ADMIN" && session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Forbidden: Admin or Teacher required" }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { action } = body

    if (action === "updateSettings") {
      const updatedSettings = await updateClassroomSettings(id, body.settings)
      return NextResponse.json({ success: true, settings: updatedSettings })
    }

    if (action === "scheduleClass") {
      const updatedClassroom = await scheduleClass(id, body.schedule)
      return NextResponse.json({ success: true, classroom: updatedClassroom })
    }

    if (action === "setStatus") {
      const updatedClassroom = await setTeacherClassStatus(id, body.status)
      return NextResponse.json({ success: true, classroom: updatedClassroom })
    }

    if (action === "sendResourceInChat") {
      const chatMessage = await sendResourceViaChat(id, body.resource)
      return NextResponse.json({ success: true, message: chatMessage })
    }

    if (action === "setMode") {
      const mode = await updatePresentationMode(id, body.mode)
      return NextResponse.json({ success: true, mode })
    }

    if (action === "deletePoll") {
      const polls = await deletePoll(id, body.pollId)
      return NextResponse.json({ success: true, polls })
    }

    if (action === "deleteQuestion") {
      const questions = await deleteQuestion(id, body.questionId)
      return NextResponse.json({ success: true, questions })
    }

    if (action === "deleteResource") {
      const resources = await deleteResource(id, body.resourceId)
      return NextResponse.json({ success: true, resources })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Settings API error:", error)
    return NextResponse.json({ error: "Operation failed" }, { status: 500 })
  }
}
