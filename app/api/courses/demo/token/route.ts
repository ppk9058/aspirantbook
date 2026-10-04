import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generateAgoraRtcToken } from "@/lib/agora/token-service"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const { searchParams } = new URL(req.url)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required. Please log in with your mobile number." },
        { status: 401 }
      )
    }

    const slotId = searchParams.get("slotId")
    if (!slotId) {
      return NextResponse.json({ error: "slotId is required." }, { status: 400 })
    }

    const isTeacher = session.user.role === "TEACHER" || session.user.role === "ADMIN"
    const testMode = searchParams.get("testMode") === "true" && isTeacher
    const requestedUid = searchParams.get("uid")
    const requestedRole = searchParams.get("role")

    if ((requestedUid === "888888" || requestedRole === "publisher") && !isTeacher) {
      return NextResponse.json(
        { error: "Forbidden: Only teachers and admins can request screen share or publisher tokens." },
        { status: 403 }
      )
    }

    // 1. Resolve DemoSlot
    const slot = await prisma.demoSlot.findUnique({
      where: { id: slotId },
      include: {
        course: { select: { id: true, slug: true, title: true } },
        _count: { select: { bookings: true } },
      },
    })

    if (!slot) {
      return NextResponse.json({ error: "Demo slot not found." }, { status: 404 })
    }

    // 2. Host Token Generation (Teachers / Admins only)
    if (isTeacher) {
      const hostToken = generateAgoraRtcToken({
        channelName: slot.agoraChannelName,
        role: "publisher",
      })

      if (!hostToken) {
        return NextResponse.json({ error: "Failed to generate Agora host token." }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        role: "host",
        appId: process.env.NEXT_PUBLIC_AGORA_APP_ID || "",
        channelName: slot.agoraChannelName,
        token: hostToken,
        slotId: slot.id,
        courseSlug: slot.course?.slug,
        status: slot.status,
      })
    }

    // 3. Student / Audience Verification
    if (testMode) {
      // Test preview mode allowed for verification
      const previewToken = generateAgoraRtcToken({
        channelName: slot.agoraChannelName,
        role: "subscriber",
      })

      return NextResponse.json({
        success: true,
        role: "audience",
        testMode: true,
        appId: process.env.NEXT_PUBLIC_AGORA_APP_ID || "",
        channelName: slot.agoraChannelName,
        token: previewToken,
        slotId: slot.id,
        status: slot.status,
      })
    }

    // A. Check student booking for this slot
    const booking = await prisma.demoBooking.findUnique({
      where: {
        studentId_slotId: {
          studentId: session.user.id,
          slotId: slot.id,
        },
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: "You must have a scheduled booking for this slot to access the live stream." },
        { status: 403 }
      )
    }

    // B. Check slot status and 10-minute entry window
    if (slot.status === "ENDED" || slot.status === "CANCELLED") {
      return NextResponse.json(
        { error: `This demo session has ended. Check upcoming batches.` },
        { status: 400 }
      )
    }

    const now = Date.now()
    const startTimeMs = slot.startTime.getTime()
    const tenMinutesBeforeMs = startTimeMs - 10 * 60 * 1000

    if (slot.status === "SCHEDULED" && now < tenMinutesBeforeMs) {
      return NextResponse.json(
        { error: "Live classroom opens 10 minutes before the scheduled start time." },
        { status: 400 }
      )
    }

    // C. Check Audience Capacity Limit
    if (slot._count.bookings > slot.maxAudience) {
      return NextResponse.json(
        { error: "This slot has reached maximum audience capacity." },
        { status: 403 }
      )
    }

    // D. Generate Audience / Subscriber token for slot's channel
    const audienceToken = generateAgoraRtcToken({
      channelName: slot.agoraChannelName,
      role: "subscriber",
    })

    if (!audienceToken) {
      return NextResponse.json({ error: "Failed to generate Agora token." }, { status: 500 })
    }

    // E. Mark booking as JOINED, update presence timestamps
    await prisma.demoBooking.update({
      where: { id: booking.id },
      data: {
        status: "JOINED",
        joinedAt: booking.joinedAt || new Date(),
        lastSeenAt: new Date(),
        leftAt: null,
      },
    })

    return NextResponse.json({
      success: true,
      role: "audience",
      bookingId: booking.id,
      appId: process.env.NEXT_PUBLIC_AGORA_APP_ID || "",
      channelName: slot.agoraChannelName,
      token: audienceToken,
      slotId: slot.id,
      status: slot.status,
    })
  } catch (error) {
    console.error("Error generating demo token:", error)
    return NextResponse.json({ error: "Failed to generate Agora token." }, { status: 500 })
  }
}
