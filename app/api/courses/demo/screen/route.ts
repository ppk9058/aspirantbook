import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generateAgoraRtcToken } from "@/lib/agora/token-service"

import { SCREEN_SHARE_UID } from "@/lib/constants/agora"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isTeacher = session.user.role === "TEACHER" || session.user.role === "ADMIN"
    if (!isTeacher) {
      return NextResponse.json(
        { error: "Forbidden: Only teachers and admins can manage screen sharing." },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { action, slotId, layout, facePosition } = body

    if (!slotId) {
      return NextResponse.json({ error: "slotId is required" }, { status: 400 })
    }

    const slot = await prisma.demoSlot.findUnique({
      where: { id: slotId },
      select: {
        id: true,
        agoraChannelName: true,
        status: true,
        screenShareActive: true,
        screenStartedAt: true,
        teacherLayout: true,
        facePosition: true,
        totalScreenMinutes: true,
      },
    })

    if (!slot) {
      return NextResponse.json({ error: "Demo slot not found" }, { status: 404 })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Action: START Screen Share
    // ─────────────────────────────────────────────────────────────────────────
    if (action === "start") {
      const screenToken = generateAgoraRtcToken({
        channelName: slot.agoraChannelName,
        uid: SCREEN_SHARE_UID,
        role: "publisher",
        expireSeconds: 3600 * 2, // 2 hours
      })

      if (!screenToken) {
        return NextResponse.json({ error: "Failed to generate Agora screen token" }, { status: 500 })
      }

      const validLayout =
        layout === "SCREEN_ONLY" || layout === "SCREEN_WITH_FACE_CORNER"
          ? layout
          : "SCREEN_WITH_FACE_CORNER"
      const validFacePos =
        facePosition === "top-left" ||
        facePosition === "bottom-left" ||
        facePosition === "bottom-right"
          ? facePosition
          : "top-right"

      const updated = await prisma.demoSlot.update({
        where: { id: slotId },
        data: {
          screenShareActive: true,
          teacherLayout: validLayout,
          facePosition: validFacePos,
          screenStartedAt: new Date(),
          screenEndedAt: null,
        },
      })

      return NextResponse.json({
        success: true,
        token: screenToken,
        uid: SCREEN_SHARE_UID,
        appId: process.env.NEXT_PUBLIC_AGORA_APP_ID || "",
        channelName: slot.agoraChannelName,
        teacherLayout: updated.teacherLayout,
        facePosition: updated.facePosition,
        screenShareActive: true,
      })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Action: STOP Screen Share
    // ─────────────────────────────────────────────────────────────────────────
    if (action === "stop") {
      const now = new Date()
      let durationMinutes = 0
      if (slot.screenStartedAt) {
        durationMinutes = Math.max(
          1,
          Math.round((now.getTime() - slot.screenStartedAt.getTime()) / 60000)
        )
      }

      const updated = await prisma.demoSlot.update({
        where: { id: slotId },
        data: {
          screenShareActive: false,
          teacherLayout: "FACE_ONLY",
          screenEndedAt: now,
          totalScreenMinutes: { increment: durationMinutes },
        },
      })

      return NextResponse.json({
        success: true,
        screenShareActive: false,
        teacherLayout: updated.teacherLayout,
        totalScreenMinutes: updated.totalScreenMinutes,
      })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Action: UPDATE LAYOUT
    // ─────────────────────────────────────────────────────────────────────────
    if (action === "layout") {
      const validLayout =
        layout === "SCREEN_ONLY" || layout === "SCREEN_WITH_FACE_CORNER" || layout === "FACE_ONLY"
          ? layout
          : slot.teacherLayout
      const validFacePos =
        facePosition === "top-left" ||
        facePosition === "bottom-left" ||
        facePosition === "bottom-right" ||
        facePosition === "top-right"
          ? facePosition
          : slot.facePosition

      const updated = await prisma.demoSlot.update({
        where: { id: slotId },
        data: {
          teacherLayout: validLayout,
          facePosition: validFacePos,
        },
      })

      return NextResponse.json({
        success: true,
        teacherLayout: updated.teacherLayout,
        facePosition: updated.facePosition,
      })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Action: RENEW TOKEN
    // ─────────────────────────────────────────────────────────────────────────
    if (action === "token") {
      const screenToken = generateAgoraRtcToken({
        channelName: slot.agoraChannelName,
        uid: SCREEN_SHARE_UID,
        role: "publisher",
        expireSeconds: 3600 * 2,
      })

      return NextResponse.json({
        success: true,
        token: screenToken,
        uid: SCREEN_SHARE_UID,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error in demo screen route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
