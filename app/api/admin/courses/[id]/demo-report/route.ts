import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "TEACHER"
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Admin or Teacher only." }, { status: 403 })
    }

    const { id } = await params

    const [course, bookings, stageSessions, slots] = await Promise.all([
      prisma.course.findUnique({
        where: { id },
        select: { id: true, title: true, slug: true },
      }),
      prisma.demoBooking.findMany({
        where: { courseId: id },
        include: {
          student: { select: { id: true, name: true, phoneNumber: true } },
          slot: { select: { id: true, topic: true, startTime: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.demoStageSession.findMany({
        where: { slot: { courseId: id } },
        include: {
          user: { select: { id: true, name: true, phoneNumber: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.demoSlot.findMany({
        where: { courseId: id },
        select: {
          id: true,
          totalScreenMinutes: true,
          screenShareActive: true,
          screenStartedAt: true,
        },
      }),
    ])

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    const totalBookings = bookings.length
    const attendedBookings = bookings.filter((b) => b.status === "ATTENDED" || (b.watchSeconds || 0) >= 30)
    const totalAttended = attendedBookings.length
    const noShows = bookings.filter((b) => (b.slot.status === "ENDED" || b.status === "MISSED") && (b.watchSeconds || 0) < 30)
    const totalNoShows = noShows.length
    const attendanceRate = totalBookings > 0 ? Math.round((totalAttended / totalBookings) * 100) : 0

    // UTM Breakdown
    const utmSourceCounts: Record<string, number> = {}
    const utmCampaignCounts: Record<string, number> = {}

    bookings.forEach((b) => {
      const src = b.utmSource?.trim().toLowerCase() || "direct"
      const cmp = b.utmCampaign?.trim().toLowerCase() || "none"
      utmSourceCounts[src] = (utmSourceCounts[src] || 0) + 1
      utmCampaignCounts[cmp] = (utmCampaignCounts[cmp] || 0) + 1
    })

    const utmSourceBreakdown = Object.entries(utmSourceCounts).map(([source, count]) => ({
      source,
      count,
      percentage: totalBookings > 0 ? Math.round((count / totalBookings) * 100) : 0,
    }))

    const utmCampaignBreakdown = Object.entries(utmCampaignCounts).map(([campaign, count]) => ({
      campaign,
      count,
      percentage: totalBookings > 0 ? Math.round((count / totalBookings) * 100) : 0,
    }))

    // Stage sessions statistics
    const totalStageSessions = stageSessions.length
    const completedStageSessions = stageSessions.filter((s) => s.startedAt)
    const totalStageMinutes = Math.round(
      completedStageSessions.reduce((acc, s) => {
        if (!s.startedAt) return acc
        const end = s.endedAt ? s.endedAt.getTime() : Date.now()
        return acc + Math.max(0, (end - s.startedAt.getTime()) / 60000)
      }, 0)
    )

    const totalScreenMinutes = Math.round(
      slots.reduce((acc, s) => {
        let activeSec = 0
        if (s.screenShareActive && s.screenStartedAt) {
          activeSec = Math.max(0, (Date.now() - s.screenStartedAt.getTime()) / 1000)
        }
        return acc + (s.totalScreenMinutes || 0) + activeSec / 60
      }, 0)
    )

    return NextResponse.json({
      success: true,
      course: { id: course.id, title: course.title, slug: course.slug },
      summary: {
        totalBookings,
        totalAttended,
        totalNoShows,
        attendanceRate,
        totalStageSessions,
        totalStageMinutes,
        totalScreenMinutes,
      },
      utmSourceBreakdown,
      utmCampaignBreakdown,
      stageSessions: stageSessions.map((s) => ({
        id: s.id,
        userName: s.user.name || "Student",
        userPhone: s.user.phoneNumber || "",
        mode: s.mode,
        status: s.status,
        startedAt: s.startedAt?.toISOString() || null,
        endedAt: s.endedAt?.toISOString() || null,
        invitedAt: s.invitedAt.toISOString(),
      })),
      bookings: bookings.map((b) => ({
        id: b.id,
        studentName: b.student.name || "Student",
        studentPhone: b.student.phoneNumber || b.mobile,
        slotTopic: b.slot.topic,
        slotStartTime: b.slot.startTime.toISOString(),
        slotStatus: b.slot.status,
        status: b.status,
        joinedAt: b.joinedAt?.toISOString() || null,
        leftAt: b.leftAt?.toISOString() || null,
        watchSeconds: b.watchSeconds,
        watchMinutes: Math.round((b.watchSeconds || 0) / 60),
        utmSource: b.utmSource || "direct",
        utmCampaign: b.utmCampaign || "none",
        createdAt: b.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error("Error generating admin demo report:", error)
    return NextResponse.json({ error: "Failed to generate demo report" }, { status: 500 })
  }
}
