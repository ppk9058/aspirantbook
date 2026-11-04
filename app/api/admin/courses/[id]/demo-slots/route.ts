import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { requireManagedCourse } from "@/lib/auth/course-access-server"
import { formatUtcToIst, isSlotExpired } from "@/lib/demo/slot-utils"

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (user.role !== "ADMIN" && user.role !== "TEACHER") {
      return NextResponse.json({ error: "Forbidden: Admin or Teacher required" }, { status: 403 })
    }

    const { id } = await params

    // A8: teachers may only view demo slots of courses they own.
    const access = await requireManagedCourse(user, id)
    if (access.response) return access.response

    const slots = await prisma.demoSlot.findMany({
      where: { courseId: id },
      orderBy: { startTime: "asc" },
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    })

    const transformed = slots.map((s) => {
      const ist = formatUtcToIst(s.startTime)
      const expired = isSlotExpired(s.startTime, s.durationMinutes)
      return {
        id: s.id,
        courseId: s.courseId,
        startTime: s.startTime.toISOString(),
        durationMinutes: s.durationMinutes,
        topic: s.topic,
        facultyName: s.facultyName,
        agoraChannelName: s.agoraChannelName,
        maxAudience: s.maxAudience,
        status: s.status,
        startedAt: s.startedAt?.toISOString() || null,
        endedAt: s.endedAt?.toISOString() || null,
        bookingCount: s._count.bookings,
        isExpired: expired,
        dateLabel: ist.dateLabel,
        timeLabel: ist.timeLabel,
        fullLabel: ist.fullLabel,
      }
    })

    // Calculate audience & host minutes used this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [monthBookings, monthSlots, monthStageSessions] = await Promise.all([
      prisma.demoBooking.findMany({
        where: {
          courseId: id,
          createdAt: { gte: startOfMonth },
        },
        select: { watchSeconds: true },
      }),
      prisma.demoSlot.findMany({
        where: {
          courseId: id,
          startedAt: { gte: startOfMonth },
        },
        select: {
          startedAt: true,
          endedAt: true,
          status: true,
          totalScreenMinutes: true,
          screenShareActive: true,
          screenStartedAt: true,
        },
      }),
      prisma.demoStageSession.findMany({
        where: {
          slot: { courseId: id },
          startedAt: { gte: startOfMonth },
        },
        select: { startedAt: true, endedAt: true, status: true },
      }),
    ])

    const audienceMinutesUsed = Math.round(
      monthBookings.reduce((sum, b) => sum + (b.watchSeconds || 0), 0) / 60
    )

    const hostMinutesUsed = Math.round(
      monthSlots.reduce((sum, s) => {
        if (!s.startedAt) return sum
        const end = s.endedAt ? s.endedAt.getTime() : s.status === "LIVE" ? Date.now() : s.startedAt.getTime()
        const durationSec = Math.max(0, (end - s.startedAt.getTime()) / 1000)
        return sum + durationSec / 60
      }, 0)
    )

    const stageMinutesUsed = Math.round(
      monthStageSessions.reduce((sum, s) => {
        if (!s.startedAt) return sum
        const end = s.endedAt ? s.endedAt.getTime() : s.status === "ON_STAGE" ? Date.now() : s.startedAt.getTime()
        const durationSec = Math.max(0, (end - s.startedAt.getTime()) / 1000)
        return sum + durationSec / 60
      }, 0)
    )

    const screenShareMinutesUsed = Math.round(
      monthSlots.reduce((sum, s) => {
        let activeSec = 0
        if (s.screenShareActive && s.screenStartedAt) {
          activeSec = Math.max(0, (Date.now() - s.screenStartedAt.getTime()) / 1000)
        }
        return sum + (s.totalScreenMinutes || 0) + activeSec / 60
      }, 0)
    )

    const totalEstimatedMinutes =
      audienceMinutesUsed + hostMinutesUsed + stageMinutesUsed + screenShareMinutesUsed

    return NextResponse.json({
      success: true,
      slots: transformed,
      activeSlots: transformed.filter((s) => !s.isExpired && s.status !== "CANCELLED" && s.status !== "ENDED"),
      totalEstimatedMinutes,
      totalAudienceMinutesUsed: audienceMinutesUsed,
      hostMinutesUsed,
      stageMinutesUsed,
      screenShareMinutesUsed,
      freeTierMinutesLimit: 10000,
    })
  } catch (error) {
    console.error("Error fetching demo slots:", error)
    return NextResponse.json({ error: "Failed to fetch demo slots." }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUserContext()
    const isTeacher = user.isAuthenticated && (user.role === "TEACHER" || user.role === "ADMIN")

    if (!isTeacher) {
      return NextResponse.json({ error: "Unauthorized. Admin or Teacher only." }, { status: 403 })
    }

    const { id } = await params

    // A8: teachers may only add demo slots to courses they own.
    const access = await requireManagedCourse(user, id)
    if (access.response) return access.response

    const body = await req.json()
    const { startTimeUtc, durationMinutes = 60, topic, facultyName, maxAudience = 100 } = body

    if (!startTimeUtc) {
      return NextResponse.json({ error: "Start time (UTC datetime) is required." }, { status: 400 })
    }

    const parsedStart = new Date(startTimeUtc)
    if (isNaN(parsedStart.getTime())) {
      return NextResponse.json({ error: "Invalid date format for startTimeUtc." }, { status: 400 })
    }

    const channelName = `demo_slot_${id.slice(-6)}_${Date.now()}`

    const newSlot = await prisma.demoSlot.create({
      data: {
        courseId: id,
        startTime: parsedStart,
        durationMinutes: Number(durationMinutes) || 60,
        topic: topic || "Live Demo Class & Syllabus Breakdown",
        facultyName: facultyName || user.name || "Senior Faculty",
        maxAudience: Number(maxAudience) || 100,
        agoraChannelName: channelName,
        status: "SCHEDULED",
      },
    })

    return NextResponse.json({
      success: true,
      slot: newSlot,
    })
  } catch (error) {
    console.error("Error creating demo slot:", error)
    return NextResponse.json({ error: "Failed to create demo slot." }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUserContext()
    const isTeacher = user.isAuthenticated && (user.role === "TEACHER" || user.role === "ADMIN")

    if (!isTeacher) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const slotId = searchParams.get("slotId")

    if (!slotId) {
      return NextResponse.json({ error: "slotId is required." }, { status: 400 })
    }

    // A8: resolve the slot's course and enforce ownership before deleting.
    const slot = await prisma.demoSlot.findUnique({
      where: { id: slotId },
      select: { courseId: true },
    })
    if (!slot) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 })
    }
    const access = await requireManagedCourse(user, slot.courseId)
    if (access.response) return access.response

    await prisma.demoSlot.delete({
      where: { id: slotId },
    })

    return NextResponse.json({ success: true, message: "Slot deleted." })
  } catch (error) {
    console.error("Error deleting demo slot:", error)
    return NextResponse.json({ error: "Failed to delete demo slot." }, { status: 500 })
  }
}
