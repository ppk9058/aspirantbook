import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body: any = {}
    try {
      body = await req.json()
    } catch {
      // empty body
    }
    const { slotId, bookingId, deltaSeconds = 30 } = body

    if (!slotId && !bookingId) {
      return NextResponse.json({ error: "slotId or bookingId required" }, { status: 400 })
    }

    const booking = await prisma.demoBooking.findFirst({
      where: {
        studentId: session.user.id,
        ...(bookingId ? { id: bookingId } : { slotId }),
      },
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const now = new Date()
    const increment = Math.min(120, Number(deltaSeconds) || 30)
    const newWatchSeconds = (booking.watchSeconds || 0) + increment

    // Status becomes ATTENDED once watched >= 30 seconds
    const newStatus =
      booking.status === "BOOKED" || booking.status === "JOINED"
        ? newWatchSeconds >= 30
          ? "ATTENDED"
          : "JOINED"
        : booking.status

    const updated = await prisma.demoBooking.update({
      where: { id: booking.id },
      data: {
        status: newStatus,
        watchSeconds: { increment },
        lastSeenAt: now,
        leftAt: null, // Clear any previous leave flag since student is actively pinging
        joinedAt: booking.joinedAt || now,
      },
    })

    // Check for any pending stage invitation for this student
    const pendingStage = await prisma.demoStageSession.findFirst({
      where: {
        bookingId: booking.id,
        status: "INVITED",
      },
      select: {
        id: true,
        slotId: true,
        mode: true,
        status: true,
        invitedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      bookingId: updated.id,
      watchSeconds: updated.watchSeconds,
      status: updated.status,
      lastSeenAt: updated.lastSeenAt,
      pendingStageSession: pendingStage || null,
    })
  } catch (error) {
    console.error("Error tracking demo watch seconds:", error)
    return NextResponse.json({ error: "Failed to track watch time" }, { status: 500 })
  }
}
