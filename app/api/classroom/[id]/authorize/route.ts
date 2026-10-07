import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getClassroomData, generateClassSessionToken } from "@/lib/classroom-service"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionAuth = await auth()
    if (!sessionAuth?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const classroom = await getClassroomData(id)

    if (!classroom) {
      return NextResponse.json({ error: "Classroom not found" }, { status: 404 })
    }

    const userId = sessionAuth.user.id
    const userRole = (sessionAuth.user as any).role
    const role = (userRole === "TEACHER" || userRole === "ADMIN") ? "teacher" : "student"

    // Verify enrollment entitlement (for public/enrolled classrooms)
    if (!classroom.isEnrolled && role === "student") {
      return NextResponse.json(
        { error: "Purchase or enrollment required to join this classroom" },
        { status: 403 }
      )
    }

    const session = generateClassSessionToken(id, userId, role)

    return NextResponse.json({
      authorized: true,
      classId: classroom.id,
      batchSlug: classroom.batchSlug,
      topicTitle: classroom.topicTitle,
      userId,
      role,
      token: session.token,
      expiresAt: session.expiresAt,
      sfuEndpoint: "wss://sfu.aspirantbook.com/livekit/v1",
      adaptiveQuality: ["1080p", "720p", "480p", "360p", "audio-only"],
    })
  } catch (error: any) {
    console.error("POST /api/classroom/[id]/authorize error:", error)
    return NextResponse.json({ error: "Authorization failed" }, { status: 500 })
  }
}
