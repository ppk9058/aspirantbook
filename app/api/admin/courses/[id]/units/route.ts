import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { requireManagedCourse } from "@/lib/auth/course-access-server"

export const dynamic = "force-dynamic"

/**
 * Course units (the "Course plan" tab).
 * Units are real rows (not metadata) so chapters can be linked to them and the
 * plan timeline can show real date ranges.
 */

const MAX_TITLE = 120
const MAX_TAGS = 8
const MAX_TAG = 40

function str(value: unknown, max = MAX_TITLE): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

function tags(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value
    .map((entry) => str(entry, MAX_TAG))
    .filter((entry): entry is string => Boolean(entry))
    .slice(0, MAX_TAGS)
}

async function guard(courseId: string) {
  const user = await getCurrentUserContext()
  if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
    return { response: NextResponse.json({ error: "Access Denied" }, { status: 403 }) }
  }
  const access = await requireManagedCourse(user, courseId)
  if (access.response) return { response: access.response }
  return { response: null }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await guard(id)
  if (g.response) return g.response

  const units = await prisma.courseUnit.findMany({
    where: { courseId: id },
    orderBy: { order: "asc" },
    include: { _count: { select: { chapters: true } } },
  })
  return NextResponse.json({ units })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await guard(id)
  if (g.response) return g.response

  const body = await req.json().catch(() => null)
  const title = str(body?.title)
  if (!title) return NextResponse.json({ error: "Unit title is required" }, { status: 400 })

  const highest = await prisma.courseUnit.findFirst({
    where: { courseId: id },
    orderBy: { order: "desc" },
    select: { order: true },
  })

  const unit = await prisma.courseUnit.create({
    data: {
      courseId: id,
      title,
      titleHi: str(body?.titleHi),
      tags: tags(body?.tags) || [],
      order: (highest?.order || 0) + 1,
    },
  })
  return NextResponse.json(unit, { status: 201 })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await guard(id)
  if (g.response) return g.response

  const body = await req.json().catch(() => null)
  const unitId = str(body?.unitId)
  if (!unitId) return NextResponse.json({ error: "unitId is required" }, { status: 400 })

  const existing = await prisma.courseUnit.findFirst({ where: { id: unitId, courseId: id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: "Unit not found" }, { status: 404 })

  const unit = await prisma.courseUnit.update({
    where: { id: unitId },
    data: {
      ...(str(body?.title) ? { title: str(body?.title) as string } : {}),
      ...(body?.titleHi !== undefined ? { titleHi: str(body?.titleHi) } : {}),
      ...(tags(body?.tags) ? { tags: tags(body?.tags) as string[] } : {}),
      ...(body?.order !== undefined ? { order: Number(body.order) } : {}),
    },
  })
  return NextResponse.json(unit)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await guard(id)
  if (g.response) return g.response

  const unitId = new URL(req.url).searchParams.get("unitId")
  if (!unitId) return NextResponse.json({ error: "unitId is required" }, { status: 400 })

  const existing = await prisma.courseUnit.findFirst({ where: { id: unitId, courseId: id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: "Unit not found" }, { status: 404 })

  // Chapters and syllabus sections fall back to "unassigned" via onDelete: SetNull.
  await prisma.courseUnit.delete({ where: { id: unitId } })
  return NextResponse.json({ success: true })
}
