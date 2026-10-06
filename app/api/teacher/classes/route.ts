import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { formatUtcToIst } from "@/lib/demo/slot-utils"

export async function GET() {
  try {
    const session = await auth()
    const isTeacher = session?.user?.role === "TEACHER" || session?.user?.role === "ADMIN"

    // Query real scheduled & live demo slots from PostgreSQL
    const demoSlots = await prisma.demoSlot.findMany({
      where: {
        status: { in: ["SCHEDULED", "LIVE"] },
      },
      include: {
        course: { select: { id: true, slug: true, title: true } },
        _count: { select: { bookings: true } },
      },
      orderBy: [
        { status: "desc" },
        { startTime: "asc" },
      ],
    })

    const transformedDemoClasses = demoSlots.map((s) => {
      const ist = formatUtcToIst(s.startTime)
      return {
        id: s.id,
        title: `🔴 Live Demo: ${s.topic}`,
        batch: s.course?.title || "Demo Batch",
        time: ist.fullLabel,
        status: s.status === "LIVE" ? "LIVE NOW" : "SCHEDULED",
        studentsCount: s._count.bookings,
        demoLink: `/courses/${s.course?.slug}/demo?slot=${s.id}`,
      }
    })

    return NextResponse.json({
      success: true,
      classes: transformedDemoClasses,
    })
  } catch (error) {
    console.error("Error fetching teacher classes:", error)
    return NextResponse.json({ success: false, classes: [] }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized. Login required." }, { status: 401 })
    }

    const isTeacher = session.user.role === "TEACHER" || session.user.role === "ADMIN"
    if (!isTeacher) {
      return NextResponse.json({ error: "Forbidden. Teacher only." }, { status: 403 })
    }

    const body = await req.json()
    const { topic, courseId, startTimeUtc, durationMinutes = 60, maxAudience = 100 } = body

    if (!topic || !courseId || !startTimeUtc) {
      return NextResponse.json({ error: "Topic, courseId and startTimeUtc are required." }, { status: 400 })
    }

    const channelName = `demo_${courseId.slice(-6)}_${Date.now()}`
    const newSlot = await prisma.demoSlot.create({
      data: {
        courseId,
        topic,
        facultyName: session?.user?.name || "Senior Faculty",
        startTime: new Date(startTimeUtc),
        durationMinutes: Number(durationMinutes),
        maxAudience: Number(maxAudience),
        agoraChannelName: channelName,
        status: "SCHEDULED",
      },
      include: { course: true },
    })

    return NextResponse.json({
      success: true,
      slot: newSlot,
    })
  } catch (error) {
    console.error("Error creating lecture:", error)
    return NextResponse.json({ error: "Failed to schedule lecture." }, { status: 500 })
  }
}
