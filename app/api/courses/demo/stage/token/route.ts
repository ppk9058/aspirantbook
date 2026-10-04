import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generateAgoraRtcToken } from "@/lib/agora/token-service"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    }

    const body = await req.json()
    const { slotId, sessionId } = body

    if (!slotId || !sessionId) {
      return NextResponse.json({ error: "slotId and sessionId are required" }, { status: 400 })
    }

    // 1. Resolve Slot
    const slot = await prisma.demoSlot.findUnique({
      where: { id: slotId },
      select: { id: true, agoraChannelName: true, status: true },
    })

    if (!slot) {
      return NextResponse.json({ error: "Demo slot not found" }, { status: 404 })
    }

    if (slot.status !== "LIVE") {
      return NextResponse.json({ error: "Slot is not currently live" }, { status: 400 })
    }

    // 2. Validate student booking for this slot
    const booking = await prisma.demoBooking.findUnique({
      where: {
        studentId_slotId: {
          studentId: session.user.id,
          slotId,
        },
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: "Forbidden: You must have a scheduled booking for this slot." },
        { status: 403 }
      )
    }

    // 3. Validate DemoStageSession
    const stageSession = await prisma.demoStageSession.findUnique({
      where: { id: sessionId },
    })

    if (!stageSession) {
      return NextResponse.json({ error: "Stage session not found" }, { status: 404 })
    }

    // Check slot match (student invited for slot X cannot get token for slot Y)
    if (stageSession.slotId !== slotId) {
      return NextResponse.json(
        { error: "Forbidden: Stage session does not belong to this slot." },
        { status: 403 }
      )
    }

    // Check user ownership
    if (stageSession.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: Stage invitation is not addressed to you." },
        { status: 403 }
      )
    }

    // Check status: MUST be in ACCEPTED or ON_STAGE
    // If REMOVED, DECLINED, or EXPIRED, refuse renewal with 403
    if (stageSession.status !== "ACCEPTED" && stageSession.status !== "ON_STAGE") {
      return NextResponse.json(
        {
          error: `Forbidden: Stage session is ${stageSession.status}. Access denied.`,
          sessionStatus: stageSession.status,
        },
        { status: 403 }
      )
    }

    // 4. Generate 3-minute Publisher RTC Token (180 seconds)
    // Renewal only permitted while ON_STAGE
    const publisherToken = generateAgoraRtcToken({
      channelName: slot.agoraChannelName,
      role: "publisher",
      expireSeconds: 180,
    })

    if (!publisherToken) {
      return NextResponse.json({ error: "Failed to generate stage publisher token" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      role: "publisher",
      mode: stageSession.mode, // "AUDIO_ONLY" | "VIDEO_AUDIO"
      token: publisherToken,
      channelName: slot.agoraChannelName,
      expiresIn: 180,
      sessionId: stageSession.id,
    })
  } catch (error) {
    console.error("Error generating stage publisher token:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
