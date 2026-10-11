import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { formatUtcToIst } from "@/lib/demo/slot-utils"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Teacher or Admin required" }, { status: 403 })
    }
    const isAdmin = session.user.role === "ADMIN"

    // Query demo slots from PostgreSQL: SCHEDULED, LIVE, ENDED, CANCELLED
    // Legacy rows with createdById NULL are visible to ADMIN only.
    // Teachers see only their own slots.
    const whereClause: any = {
      status: { in: ["SCHEDULED", "LIVE", "ENDED", "CANCELLED"] },
    }
    if (!isAdmin) {
      whereClause.createdById = session.user.id
    }

    const demoSlots = await prisma.demoSlot.findMany({
      where: whereClause,
      include: {
        course: { select: { id: true, slug: true, title: true } },
        _count: { select: { bookings: true } },
      },
    })

    // Sort: LIVE first, SCHEDULED by startTime asc, ENDED by startTime desc, then CANCELLED by startTime desc
    const statusPriority = (status: string) => {
      switch (status) {
        case "LIVE":
          return 0
        case "SCHEDULED":
          return 1
        case "ENDED":
          return 2
        case "CANCELLED":
          return 3
        default:
          return 4
      }
    }

    demoSlots.sort((a, b) => {
      const pA = statusPriority(a.status)
      const pB = statusPriority(b.status)
      if (pA !== pB) return pA - pB

      const timeA = new Date(a.startTime).getTime()
      const timeB = new Date(b.startTime).getTime()

      if (a.status === "SCHEDULED") {
        return timeA - timeB // asc
      }
      if (a.status === "ENDED" || a.status === "CANCELLED") {
        return timeB - timeA // desc
      }
      return timeA - timeB
    })

    const transformedDemoClasses = demoSlots.map((s) => {
      const ist = formatUtcToIst(s.startTime)
      return {
        id: s.id,
        title: `🔴 Live Demo: ${s.topic}`,
        topic: s.topic,
        batch: s.course?.title || "Demo Batch",
        courseSlug: s.course?.slug,
        time: ist.fullLabel,
        startTimeUtc: s.startTime.toISOString(),
        status: s.status === "LIVE" ? "LIVE NOW" : s.status,
        rawStatus: s.status,
        durationMinutes: s.durationMinutes,
        startedAt: s.startedAt ? s.startedAt.toISOString() : null,
        endedAt: s.endedAt ? s.endedAt.toISOString() : null,
        studentsCount: s._count.bookings,
        bookingsCount: s._count.bookings,
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
        createdById: session.user.id,
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
