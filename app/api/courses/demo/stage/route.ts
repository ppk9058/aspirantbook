import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { kickUserFromAgoraChannel } from "@/lib/agora/kick-service"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isTeacher = session.user.role === "TEACHER" || session.user.role === "ADMIN"
    const body = await req.json()
    const { action, slotId, studentId, sessionId, mode, micMuted, videoOff, stageLayout } = body

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Action: INVITE STUDENT (Teacher/Admin only)
    // ─────────────────────────────────────────────────────────────────────────
    if (action === "invite") {
      if (!isTeacher) {
        return NextResponse.json({ error: "Only teachers or admins can invite students to stage." }, { status: 403 })
      }

      if (!slotId || !studentId) {
        return NextResponse.json({ error: "slotId and studentId are required" }, { status: 400 })
      }

      const slot = await prisma.demoSlot.findUnique({
        where: { id: slotId },
        select: { id: true, maxOnStage: true, agoraChannelName: true },
      })

      if (!slot) {
        return NextResponse.json({ error: "Demo slot not found" }, { status: 404 })
      }

      // Check student booking
      const booking = await prisma.demoBooking.findUnique({
        where: {
          studentId_slotId: {
            studentId,
            slotId,
          },
        },
      })

      if (!booking) {
        return NextResponse.json({ error: "Student does not have a booking for this slot" }, { status: 404 })
      }

      // Enforce maxOnStage server-side
      const activeStageSessions = await prisma.demoStageSession.count({
        where: {
          slotId,
          status: { in: ["INVITED", "ACCEPTED", "ON_STAGE"] },
          userId: { not: studentId },
        },
      })

      if (activeStageSessions >= slot.maxOnStage) {
        return NextResponse.json(
          { error: `Stage is currently at maximum capacity (${slot.maxOnStage} on stage). Remove current speaker first.` },
          { status: 409 }
        )
      }

      // Expire any older active sessions for this student on this slot
      await prisma.demoStageSession.updateMany({
        where: {
          slotId,
          userId: studentId,
          status: { in: ["INVITED", "ACCEPTED"] },
        },
        data: { status: "EXPIRED", endedAt: new Date() },
      })

      const newSession = await prisma.demoStageSession.create({
        data: {
          slotId,
          userId: studentId,
          bookingId: booking.id,
          mode: mode === "AUDIO_ONLY" ? "AUDIO_ONLY" : "VIDEO_AUDIO",
          status: "INVITED",
          invitedAt: new Date(),
        },
        include: {
          user: { select: { id: true, name: true, phoneNumber: true } },
        },
      })

      return NextResponse.json({ success: true, session: newSession })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Action: ACCEPT INVITATION (Student only)
    // ─────────────────────────────────────────────────────────────────────────
    if (action === "accept") {
      if (!sessionId) {
        return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
      }

      const stageSession = await prisma.demoStageSession.findUnique({
        where: { id: sessionId },
      })

      if (!stageSession) {
        return NextResponse.json({ error: "Stage session not found" }, { status: 404 })
      }

      if (stageSession.userId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden. Not your invitation." }, { status: 403 })
      }

      const updated = await prisma.demoStageSession.update({
        where: { id: sessionId },
        data: { status: "ACCEPTED" },
      })

      return NextResponse.json({ success: true, session: updated })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Action: DECLINE INVITATION (Student only)
    // ─────────────────────────────────────────────────────────────────────────
    if (action === "decline") {
      if (!sessionId) {
        return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
      }

      const stageSession = await prisma.demoStageSession.findUnique({
        where: { id: sessionId },
      })

      if (!stageSession) {
        return NextResponse.json({ error: "Stage session not found" }, { status: 404 })
      }

      if (stageSession.userId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden. Not your invitation." }, { status: 403 })
      }

      const updated = await prisma.demoStageSession.update({
        where: { id: sessionId },
        data: { status: "DECLINED", endedAt: new Date() },
      })

      return NextResponse.json({ success: true, session: updated })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Action: JOIN STAGE (Student goes live with tracks)
    // ─────────────────────────────────────────────────────────────────────────
    if (action === "join-stage") {
      if (!sessionId) {
        return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
      }

      const stageSession = await prisma.demoStageSession.findUnique({
        where: { id: sessionId },
      })

      if (!stageSession) {
        return NextResponse.json({ error: "Stage session not found" }, { status: 404 })
      }

      if (stageSession.userId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      const updated = await prisma.demoStageSession.update({
        where: { id: sessionId },
        data: { status: "ON_STAGE", startedAt: new Date() },
      })

      return NextResponse.json({ success: true, session: updated })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Action: LEAVE / REMOVE FROM STAGE (Student leaves or Teacher removes)
    // ─────────────────────────────────────────────────────────────────────────
    if (action === "leave-stage" || action === "remove") {
      if (!sessionId) {
        return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
      }

      const stageSession = await prisma.demoStageSession.findUnique({
        where: { id: sessionId },
      })

      if (!stageSession) {
        return NextResponse.json({ error: "Stage session not found" }, { status: 404 })
      }

      // Check permission: either the teacher/admin or the student themselves
      if (!isTeacher && stageSession.userId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden. Cannot remove another student." }, { status: 403 })
      }

      const updated = await prisma.demoStageSession.update({
        where: { id: sessionId },
        data: { status: "REMOVED", endedAt: new Date() },
      })

      if (action === "remove") {
        const slot = await prisma.demoSlot.findUnique({
          where: { id: stageSession.slotId },
          select: { agoraChannelName: true },
        })
        if (slot) {
          kickUserFromAgoraChannel({
            channelName: slot.agoraChannelName,
            uid: stageSession.userId,
            timeMinutes: 60,
          }).catch(() => {})
        }
      }

      return NextResponse.json({ success: true, session: updated })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Action: TEACHER CONTROLS (Mute / Video Off)
    // ─────────────────────────────────────────────────────────────────────────
    if (action === "control") {
      if (!isTeacher) {
        return NextResponse.json({ error: "Only teachers or admins can control student streams." }, { status: 403 })
      }

      if (!sessionId) {
        return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
      }

      const dataToUpdate: any = {}
      if (typeof micMuted === "boolean") dataToUpdate.micMuted = micMuted
      if (typeof videoOff === "boolean") dataToUpdate.videoOff = videoOff

      const updated = await prisma.demoStageSession.update({
        where: { id: sessionId },
        data: dataToUpdate,
      })

      return NextResponse.json({ success: true, session: updated })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. Action: LAYOUT TOGGLE (Corner vs Split 50/50)
    // ─────────────────────────────────────────────────────────────────────────
    if (action === "layout") {
      if (!isTeacher) {
        return NextResponse.json({ error: "Only teachers or admins can change stage layout." }, { status: 403 })
      }

      if (!slotId || (stageLayout !== "CORNER" && stageLayout !== "SPLIT")) {
        return NextResponse.json({ error: "Invalid slotId or stageLayout (must be 'CORNER' or 'SPLIT')" }, { status: 400 })
      }

      const updated = await prisma.demoSlot.update({
        where: { id: slotId },
        data: { stageLayout },
      })

      return NextResponse.json({ success: true, stageLayout: updated.stageLayout })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8. Action: EXPIRE / TIMEOUT FALLBACK
    // ─────────────────────────────────────────────────────────────────────────
    if (action === "expire") {
      if (!sessionId) {
        return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
      }

      const stageSession = await prisma.demoStageSession.findUnique({
        where: { id: sessionId },
      })

      if (!stageSession) {
        return NextResponse.json({ error: "Stage session not found" }, { status: 404 })
      }

      const updated = await prisma.demoStageSession.update({
        where: { id: sessionId },
        data: { status: "EXPIRED", endedAt: new Date() },
      })

      return NextResponse.json({ success: true, session: updated })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error in demo stage API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
