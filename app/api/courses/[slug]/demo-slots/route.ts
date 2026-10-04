import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { formatUtcToIst, isSlotExpired } from "@/lib/demo/slot-utils"

interface Params {
  params: Promise<{ slug: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { slug } = await params

    const course = await prisma.course.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        metadataJson: true,
      },
    })

    if (!course) {
      return NextResponse.json({ enabled: false, slots: [], hasUpcomingSlots: false }, { status: 404 })
    }

    let meta: any = {}
    if (course.metadataJson) {
      try {
        meta = JSON.parse(course.metadataJson)
      } catch {}
    }

    const isEnabled = meta.demoSettings?.enabled === true

    // Fetch active & scheduled slots from real database table
    const dbSlots = await prisma.demoSlot.findMany({
      where: {
        courseId: course.id,
        status: { in: ["SCHEDULED", "LIVE"] },
      },
      orderBy: { startTime: "asc" },
      include: {
        _count: { select: { bookings: true } },
      },
    })

    const validDbSlots = dbSlots
      .filter((s) => !isSlotExpired(s.startTime, s.durationMinutes))
      .map((s) => {
        const ist = formatUtcToIst(s.startTime)
        return {
          id: s.id,
          startTimeUtc: s.startTime.toISOString(),
          dateLabel: ist.dateLabel,
          timeLabel: ist.timeLabel,
          fullLabel: ist.fullLabel,
          topic: s.topic,
          facultyName: s.facultyName,
          maxAudience: s.maxAudience,
          bookingCount: s._count.bookings,
          isLive: s.status === "LIVE",
          tag: s.status === "LIVE" ? "🔴 LIVE NOW" : ist.isToday ? "Fastest / In Demand" : "Upcoming Slot",
        }
      })

    const hasUpcomingSlots = isEnabled && validDbSlots.length > 0

    return NextResponse.json({
      success: true,
      enabled: isEnabled,
      hasUpcomingSlots,
      slots: validDbSlots,
      courseTitle: course.title,
      courseSlug: course.slug,
    })
  } catch (error: any) {
    console.error("Error fetching course demo slots:", error)
    return NextResponse.json({ enabled: false, slots: [], hasUpcomingSlots: false, error: String(error?.message || error) }, { status: 500 })
  }
}
