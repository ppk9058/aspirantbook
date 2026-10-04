import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { slotId, raised } = body

    if (!slotId) {
      return NextResponse.json({ error: "slotId is required" }, { status: 400 })
    }

    const booking = await prisma.demoBooking.findUnique({
      where: {
        studentId_slotId: {
          studentId: session.user.id,
          slotId,
        },
      },
    })

    if (!booking) {
      return NextResponse.json({ error: "No booking found for this slot" }, { status: 404 })
    }

    const handRaisedAt = raised ? new Date() : null

    const updated = await prisma.demoBooking.update({
      where: { id: booking.id },
      data: { handRaisedAt },
    })

    return NextResponse.json({
      success: true,
      slotId,
      bookingId: updated.id,
      handRaised: Boolean(updated.handRaisedAt),
      handRaisedAt: updated.handRaisedAt,
    })
  } catch (error) {
    console.error("Error toggling hand raise:", error)
    return NextResponse.json({ error: "Failed to update hand raise status" }, { status: 500 })
  }
}
