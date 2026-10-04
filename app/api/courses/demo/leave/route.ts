import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let slotId: string | undefined
    let bookingId: string | undefined

    try {
      const text = await req.text()
      if (text) {
        const body = JSON.parse(text)
        slotId = body.slotId
        bookingId = body.bookingId
      }
    } catch {
      // Beacon may send text/plain or empty
    }

    const now = new Date()

    // 1. Mark DemoBooking as left
    const booking = await prisma.demoBooking.findFirst({
      where: {
        studentId: session.user.id,
        ...(bookingId ? { id: bookingId } : slotId ? { slotId } : {}),
      },
    })

    if (booking) {
      await prisma.demoBooking.update({
        where: { id: booking.id },
        data: { leftAt: now },
      })

      // 2. If student had an active stage session, end it
      await prisma.demoStageSession.updateMany({
        where: {
          bookingId: booking.id,
          status: { in: ["INVITED", "ACCEPTED", "ON_STAGE"] },
        },
        data: {
          status: "REMOVED",
          endedAt: now,
        },
      })
    }

    return NextResponse.json({ success: true, leftAt: now.toISOString() })
  } catch (error) {
    console.error("Error in demo leave route:", error)
    return NextResponse.json({ error: "Failed to mark departure" }, { status: 500 })
  }
}
