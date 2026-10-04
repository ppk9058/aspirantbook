import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { formatUtcToIst } from "@/lib/demo/slot-utils"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const slotId = searchParams.get("slotId")
    const slug = searchParams.get("slug")

    const session = await auth()
    const isTeacher = session?.user?.role === "TEACHER" || session?.user?.role === "ADMIN"

    // 1. Resolve DemoSlot from PostgreSQL
    let slot = null
    if (slotId) {
      slot = await prisma.demoSlot.findUnique({
        where: { id: slotId },
        include: {
          course: { select: { id: true, slug: true, title: true } },
          _count: { select: { bookings: true } },
        },
      })
    }

    if (!slot && slug) {
      const course = await prisma.course.findUnique({ where: { slug } })
      if (course) {
        slot = await prisma.demoSlot.findFirst({
          where: {
            courseId: course.id,
            status: { in: ["LIVE", "SCHEDULED"] },
          },
          orderBy: [
            { status: "desc" }, // LIVE comes before SCHEDULED
            { startTime: "asc" },
          ],
          include: {
            course: { select: { id: true, slug: true, title: true } },
            _count: { select: { bookings: true } },
          },
        })
      }
    }

    if (!slot) {
      return NextResponse.json({
        success: false,
        isLive: false,
        error: "No active or scheduled demo slot found.",
      })
    }

    // 2. Teacher Disconnect Fail-Safe (2-Minute Inactivity Window)
    let isReconnecting = false
    if (slot.status === "LIVE" && slot.hostHeartbeatAt) {
      const elapsedMs = Date.now() - slot.hostHeartbeatAt.getTime()

      if (elapsedMs > 120_000) {
        // Teacher has been disconnected for > 2 minutes: transition slot to ENDED in PostgreSQL
        slot = await prisma.demoSlot.update({
          where: { id: slot.id },
          data: {
            status: "ENDED",
            endedAt: new Date(),
          },
          include: {
            course: { select: { id: true, slug: true, title: true } },
            _count: { select: { bookings: true } },
          },
        })
      } else if (elapsedMs > 30_000) {
        // Teacher heartbeat missed for > 30s: flag reconnecting for students
        isReconnecting = true
      }
    }

    // 3. Online Presence & Stage Session Querying
    const sixtySecondsAgo = new Date(Date.now() - 60_000)

    const [recentBookings, activeStageSessions] = await Promise.all([
      prisma.demoBooking.findMany({
        where: {
          slotId: slot.id,
          lastSeenAt: { gte: sixtySecondsAgo },
        },
        include: {
          student: { select: { id: true, name: true, phoneNumber: true } },
        },
      }),
      prisma.demoStageSession.findMany({
        where: {
          slotId: slot.id,
          status: { in: ["INVITED", "ACCEPTED", "ON_STAGE"] },
        },
        include: {
          user: { select: { id: true, name: true, phoneNumber: true } },
          booking: { select: { lastSeenAt: true, leftAt: true } },
        },
      }),
    ])

    // 20-Second Stage Disconnect Safety Fallback:
    // If student on stage lost network or tab closed for > 20s, mark EXPIRED
    const twentySecondsAgo = new Date(Date.now() - 20_000)
    const validActiveStageSessions: typeof activeStageSessions = []

    for (const s of activeStageSessions) {
      const b = s.booking
      const isDisconnected =
        (b?.leftAt && b.leftAt >= (b.lastSeenAt || new Date(0))) ||
        (!b?.lastSeenAt || b.lastSeenAt < twentySecondsAgo)

      if ((s.status === "ON_STAGE" || s.status === "ACCEPTED") && isDisconnected) {
        await prisma.demoStageSession.update({
          where: { id: s.id },
          data: { status: "EXPIRED", endedAt: new Date() },
        })
      } else {
        validActiveStageSessions.push(s)
      }
    }

    // "Online now" = lastSeenAt within last 60s and (leftAt is null or leftAt < lastSeenAt)
    const activeOnlineBookings = recentBookings.filter((b) => {
      if (!b.lastSeenAt) return false
      if (!b.leftAt) return true
      return b.leftAt.getTime() < b.lastSeenAt.getTime()
    })

    const onlineCount = activeOnlineBookings.length
    const totalBooked = slot._count.bookings

    // Formatted list of students for teacher studio
    let students: any[] = []
    if (isTeacher) {
      students = activeOnlineBookings
        .map((b) => {
          let displayName = "Student"
          const rawName = b.student.name?.trim()
          const phone = b.student.phoneNumber || b.mobile || ""
          const lastDigits = phone.slice(-4) || "0000"
          if (rawName && rawName.toLowerCase() !== "student" && rawName.toLowerCase() !== "user") {
            displayName = rawName.split(" ")[0]
          } else {
            displayName = `Student (${lastDigits})`
          }

          const stageSession = validActiveStageSessions.find((s) => s.userId === b.studentId)

          return {
            id: b.studentId,
            bookingId: b.id,
            displayName,
            handRaisedAt: b.handRaisedAt?.toISOString() || null,
            isHandRaised: Boolean(b.handRaisedAt),
            joinedAt: b.joinedAt?.toISOString() || null,
            lastSeenAt: b.lastSeenAt?.toISOString() || null,
            stageSession: stageSession
              ? {
                  id: stageSession.id,
                  mode: stageSession.mode,
                  status: stageSession.status,
                  micMuted: stageSession.micMuted,
                  videoOff: stageSession.videoOff,
                  startedAt: stageSession.startedAt?.toISOString() || null,
                  invitedAt: stageSession.invitedAt?.toISOString() || null,
                }
              : null,
          }
        })
        .sort((a, b) => {
          // Hand raised first
          if (a.isHandRaised && !b.isHandRaised) return -1
          if (!a.isHandRaised && b.isHandRaised) return 1
          return new Date(b.lastSeenAt || 0).getTime() - new Date(a.lastSeenAt || 0).getTime()
        })
    }

    // Active stage sessions formatted for clients
    const formattedStageSessions = validActiveStageSessions.map((s) => {
      let displayName = "Student"
      const rawName = s.user.name?.trim()
      const phone = s.user.phoneNumber || ""
      const lastDigits = phone.slice(-4) || "0000"
      if (rawName && rawName.toLowerCase() !== "student" && rawName.toLowerCase() !== "user") {
        displayName = rawName.split(" ")[0]
      } else {
        displayName = `Student (${lastDigits})`
      }
      return {
        id: s.id,
        userId: s.userId,
        displayName,
        mode: s.mode,
        status: s.status,
        micMuted: s.micMuted,
        videoOff: s.videoOff,
        startedAt: s.startedAt?.toISOString() || null,
        invitedAt: s.invitedAt?.toISOString() || null,
      }
    })

    // Check if the current user has an active invitation or stage session
    const myStageSession = session?.user?.id
      ? formattedStageSessions.find((s) => s.userId === session.user.id) || null
      : null

    const ist = formatUtcToIst(slot.startTime)

    return NextResponse.json({
      success: true,
      slotId: slot.id,
      courseId: slot.courseId,
      courseSlug: slot.course?.slug || slug,
      courseTitle: slot.course?.title || "Demo Course",
      status: slot.status, // "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED"
      isLive: slot.status === "LIVE",
      isReconnecting,
      teacherName: slot.facultyName,
      topic: slot.topic,
      agoraChannel: slot.agoraChannelName,
      maxAudience: slot.maxAudience,
      bookingCount: totalBooked,
      onlineCount,
      stageLayout: slot.stageLayout || "CORNER",
      maxOnStage: slot.maxOnStage || 1,
      teacherLayout: slot.teacherLayout || "FACE_ONLY",
      screenShareActive: Boolean(slot.screenShareActive),
      facePosition: slot.facePosition || "top-right",
      screenUid: 888888,
      students,
      stageSessions: formattedStageSessions,
      myStageSession,
      startTimeUtc: slot.startTime.toISOString(),
      startedAt: slot.startedAt?.toISOString() || null,
      endedAt: slot.endedAt?.toISOString() || null,
      dateLabel: ist.dateLabel,
      timeLabel: ist.timeLabel,
      fullTimeLabel: ist.fullLabel,
      isTeacher,
    })
  } catch (error) {
    console.error("Error fetching demo status from PostgreSQL:", error)
    return NextResponse.json({ success: false, isLive: false }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const isTeacher = session?.user?.role === "TEACHER" || session?.user?.role === "ADMIN"

    if (!isTeacher) {
      return NextResponse.json({ error: "Unauthorized. Teacher or Admin only." }, { status: 403 })
    }

    const body = await req.json()
    const { slotId, slug, action, teacherName, topic } = body

    // Resolve slot
    let slot = null
    if (slotId) {
      slot = await prisma.demoSlot.findUnique({ where: { id: slotId } })
    } else if (slug) {
      const course = await prisma.course.findUnique({ where: { slug } })
      if (course) {
        slot = await prisma.demoSlot.findFirst({
          where: { courseId: course.id, status: { in: ["LIVE", "SCHEDULED"] } },
          orderBy: [{ status: "desc" }, { startTime: "asc" }],
        })
      }
    }

    if (!slot) {
      return NextResponse.json({ error: "Demo slot not found." }, { status: 404 })
    }

    const now = new Date()

    // Action 1: Host Heartbeat (keepalive sent by teacher studio every 15s)
    if (action === "heartbeat") {
      const updated = await prisma.demoSlot.update({
        where: { id: slot.id },
        data: { hostHeartbeatAt: now },
      })
      return NextResponse.json({ success: true, action: "heartbeat", hostHeartbeatAt: updated.hostHeartbeatAt })
    }

    // Action 2: Go Live
    if (action === "start") {
      const updated = await prisma.demoSlot.update({
        where: { id: slot.id },
        data: {
          status: "LIVE",
          startedAt: slot.startedAt || now,
          hostHeartbeatAt: now,
          ...(teacherName ? { facultyName: teacherName } : {}),
          ...(topic ? { topic } : {}),
        },
      })

      // Update bookings for this slot to JOINED
      await prisma.demoBooking.updateMany({
        where: { slotId: slot.id, status: "BOOKED" },
        data: { status: "JOINED", joinedAt: now },
      })

      return NextResponse.json({
        success: true,
        action: "started",
        slotId: updated.id,
        status: updated.status,
        isLive: true,
        agoraChannel: updated.agoraChannelName,
      })
    }

    // Action 3: End Demo Broadcast
    if (action === "end") {
      const updated = await prisma.demoSlot.update({
        where: { id: slot.id },
        data: {
          status: "ENDED",
          endedAt: now,
          screenShareActive: false,
          teacherLayout: "FACE_ONLY",
          screenEndedAt: now,
        },
      })

      // Mark joined bookings as ATTENDED and record leftAt
      await prisma.demoBooking.updateMany({
        where: { slotId: slot.id, status: { in: ["JOINED", "BOOKED"] } },
        data: { status: "ATTENDED", leftAt: now },
      })

      // End any active stage sessions
      await prisma.demoStageSession.updateMany({
        where: {
          slotId: slot.id,
          status: { in: ["INVITED", "ACCEPTED", "ON_STAGE"] },
        },
        data: {
          status: "REMOVED",
          endedAt: now,
        },
      })

      return NextResponse.json({
        success: true,
        action: "ended",
        slotId: updated.id,
        status: updated.status,
        isLive: false,
        endedAt: updated.endedAt,
      })
    }

    // Action 4: Stage Layout Toggle (CORNER vs SPLIT)
    if (action === "layout") {
      const { stageLayout } = body
      if (stageLayout !== "CORNER" && stageLayout !== "SPLIT") {
        return NextResponse.json({ error: "stageLayout must be 'CORNER' or 'SPLIT'" }, { status: 400 })
      }

      const updated = await prisma.demoSlot.update({
        where: { id: slot.id },
        data: { stageLayout },
      })

      return NextResponse.json({
        success: true,
        action: "layout",
        stageLayout: updated.stageLayout,
      })
    }

    return NextResponse.json({ error: "Invalid action. Use 'start', 'end', 'heartbeat', or 'layout'." }, { status: 400 })
  } catch (error) {
    console.error("Error updating demo live status in PostgreSQL:", error)
    return NextResponse.json({ error: "Failed to update demo status." }, { status: 500 })
  }
}
