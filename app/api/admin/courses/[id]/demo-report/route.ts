import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { requireManagedCourse } from "@/lib/auth/course-access-server"

interface Params {
  params: Promise<{ id: string }>
}

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

/** Masks a phone number so a report never exposes full contact data. */
function maskPhone(value: string | null | undefined): string {
  if (!value) return ""
  const digits = value.replace(/[^\d+]/g, "")
  if (digits.length <= 4) return "••••"
  return `${digits.slice(0, digits.length - 4).replace(/\d/g, "•")}${digits.slice(-4)}`
}

function parsePageParam(raw: string | null, fallback: number, max: number): number {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return Math.min(Math.floor(parsed), max)
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Unauthorized. Admin or Teacher only." }, { status: 403 })
    }

    const { id } = await params

    // A8: a teacher may only read the report of a course they own.
    const access = await requireManagedCourse(user, id)
    if (access.response) return access.response
    const course = access.course

    // A8: bounded page size, so one request can never dump the whole table.
    const { searchParams } = new URL(req.url)
    const limit = Math.max(
      1,
      parsePageParam(searchParams.get("limit"), DEFAULT_LIMIT, MAX_LIMIT) || DEFAULT_LIMIT
    )
    const offset = parsePageParam(searchParams.get("offset"), 0, Number.MAX_SAFE_INTEGER)

    const attendedWhere = {
      courseId: id,
      OR: [{ status: "ATTENDED" as const }, { watchSeconds: { gte: 30 } }],
    }
    const noShowWhere = {
      courseId: id,
      AND: [
        { OR: [{ slot: { status: "ENDED" as const } }, { status: "MISSED" as const }] },
        { watchSeconds: { lt: 30 } },
      ],
    }

    const [
      totalBookings,
      totalAttended,
      totalNoShows,
      bookingRows,
      stageSessionRows,
      stageMinuteRows,
      sourceGroups,
      campaignGroups,
      slots,
    ] = await Promise.all([
      prisma.demoBooking.count({ where: { courseId: id } }),
      prisma.demoBooking.count({ where: attendedWhere }),
      prisma.demoBooking.count({ where: noShowWhere }),
      prisma.demoBooking.findMany({
        where: { courseId: id },
        select: {
          id: true,
          mobile: true,
          status: true,
          joinedAt: true,
          leftAt: true,
          watchSeconds: true,
          utmSource: true,
          utmCampaign: true,
          createdAt: true,
          student: { select: { name: true, phoneNumber: true } },
          slot: { select: { topic: true, startTime: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.demoStageSession.findMany({
        where: { slot: { courseId: id } },
        select: {
          id: true,
          mode: true,
          status: true,
          startedAt: true,
          endedAt: true,
          invitedAt: true,
          user: { select: { name: true, phoneNumber: true } },
        },
        orderBy: { invitedAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.demoStageSession.findMany({
        where: { slot: { courseId: id }, startedAt: { not: null } },
        select: { startedAt: true, endedAt: true },
      }),
      prisma.demoBooking.groupBy({
        by: ["utmSource"],
        where: { courseId: id },
        _count: { _all: true },
      }),
      prisma.demoBooking.groupBy({
        by: ["utmCampaign"],
        where: { courseId: id },
        _count: { _all: true },
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

    const attendanceRate = totalBookings > 0 ? Math.round((totalAttended / totalBookings) * 100) : 0

    const utmSourceBreakdown = sourceGroups
      .map((g) => ({
        source: (g.utmSource || "direct").trim().toLowerCase() || "direct",
        count: g._count._all,
      }))
      .reduce<{ source: string; count: number; percentage: number }[]>((acc, item) => {
        const existing = acc.find((a) => a.source === item.source)
        if (existing) existing.count += item.count
        else acc.push({ source: item.source, count: item.count, percentage: 0 })
        return acc
      }, [])
      .map((item) => ({
        ...item,
        percentage: totalBookings > 0 ? Math.round((item.count / totalBookings) * 100) : 0,
      }))

    const utmCampaignBreakdown = campaignGroups
      .map((g) => ({
        campaign: (g.utmCampaign || "none").trim().toLowerCase() || "none",
        count: g._count._all,
      }))
      .reduce<{ campaign: string; count: number; percentage: number }[]>((acc, item) => {
        const existing = acc.find((a) => a.campaign === item.campaign)
        if (existing) existing.count += item.count
        else acc.push({ campaign: item.campaign, count: item.count, percentage: 0 })
        return acc
      }, [])
      .map((item) => ({
        ...item,
        percentage: totalBookings > 0 ? Math.round((item.count / totalBookings) * 100) : 0,
      }))

    const totalStageSessions = stageMinuteRows.length
    const totalStageMinutes = Math.round(
      stageMinuteRows.reduce((acc, s) => {
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

    // A8: phone numbers are masked for teachers. Only an ADMIN sees them whole.
    const canSeeFullPhone = user.role === "ADMIN"

    return NextResponse.json({
      success: true,
      course: { id: course.id, title: course.title, slug: course.slug },
      pagination: {
        limit,
        offset,
        bookingsReturned: bookingRows.length,
        stageSessionsReturned: stageSessionRows.length,
      },
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
      stageSessions: stageSessionRows.map((s) => ({
        id: s.id,
        userName: s.user.name || "Student",
        userPhone: canSeeFullPhone ? s.user.phoneNumber || "" : maskPhone(s.user.phoneNumber),
        mode: s.mode,
        status: s.status,
        startedAt: s.startedAt?.toISOString() || null,
        endedAt: s.endedAt?.toISOString() || null,
        invitedAt: s.invitedAt.toISOString(),
      })),
      bookings: bookingRows.map((b) => {
        const phone = b.student.phoneNumber || b.mobile
        return {
          id: b.id,
          studentName: b.student.name || "Student",
          studentPhone: canSeeFullPhone ? phone : maskPhone(phone),
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
        }
      }),
    })
  } catch (error) {
    console.error("Error generating admin demo report:", error)
    return NextResponse.json({ error: "Failed to generate demo report" }, { status: 500 })
  }
}
