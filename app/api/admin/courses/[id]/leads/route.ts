import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { requireManagedCourse } from "@/lib/auth/course-access-server"
import { leadsToCsv } from "@/lib/courses/callback"

export const dynamic = "force-dynamic"

const VALID_STATUS = new Set(["NEW", "CONTACTED", "CLOSED"])

/**
 * Callback leads for one course.
 *
 * PII: full mobile numbers are only returned to ADMIN or the TEACHER who owns the
 * course — requireManagedCourse already enforces that. Nothing is logged here.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserContext()
  if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
    return NextResponse.json({ error: "Access Denied" }, { status: 403 })
  }

  const { id } = await params
  const access = await requireManagedCourse(user, id)
  if (access.response) return access.response

  const url = new URL(req.url)
  const format = url.searchParams.get("format")
  const status = url.searchParams.get("status")

  const leads = await prisma.courseCallbackLead.findMany({
    where: { courseId: id, ...(status && VALID_STATUS.has(status) ? { status: status as any } : {}) },
    orderBy: { createdAt: "desc" },
    take: 1000,
    select: {
      id: true,
      name: true,
      mobile: true,
      status: true,
      note: true,
      source: true,
      utm: true,
      createdAt: true,
      handledBy: { select: { id: true, name: true } },
    },
  })

  if (format === "csv") {
    const csv = leadsToCsv(leads, { maskMobile: false })
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="course-${id}-callback-leads.csv"`,
        "Cache-Control": "private, no-store",
      },
    })
  }

  return NextResponse.json({ leads, count: leads.length })
}

/** Status update (NEW → CONTACTED → CLOSED). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserContext()
  if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
    return NextResponse.json({ error: "Access Denied" }, { status: 403 })
  }

  const { id } = await params
  const access = await requireManagedCourse(user, id)
  if (access.response) return access.response

  let body: any = null
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const leadId = typeof body?.leadId === "string" ? body.leadId : null
  const status = typeof body?.status === "string" ? body.status : null
  if (!leadId || !status || !VALID_STATUS.has(status)) {
    return NextResponse.json({ error: "leadId and a valid status are required" }, { status: 400 })
  }

  const lead = await prisma.courseCallbackLead.findFirst({
    where: { id: leadId, courseId: id },
    select: { id: true },
  })
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 })

  const updated = await prisma.courseCallbackLead.update({
    where: { id: leadId },
    data: {
      status: status as any,
      note: typeof body?.note === "string" ? body.note.slice(0, 500) : undefined,
      handledById: user.userId ?? null,
    },
    select: { id: true, status: true, note: true, handledById: true },
  })

  return NextResponse.json({ lead: updated })
}
