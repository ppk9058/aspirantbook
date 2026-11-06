import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { requireManagedCourse } from "@/lib/auth/course-access-server"

export const dynamic = "force-dynamic"

/**
 * Exam syllabus authoring (optional per course).
 *
 * Papers → sections. A section can link to a unit, a chapter and the real PYQ
 * taxonomy (`pyqSubject` → ContentEngineQuestion.sub, `pyqTopic` → .top) so the
 * public page can show real per-year question counts instead of invented ones.
 */

const VALID_INCLUDE = ["paper", "section"] as const

function str(value: unknown, max = 160): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

function strList(value: unknown, maxItems = 20, maxLen = 120): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value
    .map((entry) => str(entry, maxLen))
    .filter((entry): entry is string => Boolean(entry))
    .slice(0, maxItems)
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
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

  const papers = await prisma.courseSyllabusPaper.findMany({
    where: { courseId: id },
    orderBy: { order: "asc" },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: { unit: { select: { id: true, title: true } } },
      },
    },
  })
  return NextResponse.json({ papers })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await guard(id)
  if (g.response) return g.response

  const body = await req.json().catch(() => null)
  const kind = body?.kind

  if (!VALID_INCLUDE.includes(kind)) {
    return NextResponse.json({ error: "kind must be 'paper' or 'section'" }, { status: 400 })
  }

  if (kind === "paper") {
    const title = str(body?.title)
    const key = str(body?.key, 60)
    if (!title || !key) return NextResponse.json({ error: "Paper title and key are required" }, { status: 400 })

    const duplicate = await prisma.courseSyllabusPaper.findFirst({
      where: { courseId: id, key },
      select: { id: true },
    })
    if (duplicate) return NextResponse.json({ error: "That paper key already exists" }, { status: 409 })

    const highest = await prisma.courseSyllabusPaper.findFirst({
      where: { courseId: id },
      orderBy: { order: "desc" },
      select: { order: true },
    })

    const paper = await prisma.courseSyllabusPaper.create({
      data: {
        courseId: id,
        key,
        title,
        titleHi: str(body?.titleHi),
        marks: num(body?.marks),
        durationMinutes: num(body?.durationMinutes),
        introText: str(body?.introText, 2000),
        introTextHi: str(body?.introTextHi, 2000),
        order: (highest?.order || 0) + 1,
      },
    })
    return NextResponse.json(paper, { status: 201 })
  }

  const paperId = str(body?.paperId)
  const title = str(body?.title)
  if (!paperId || !title) return NextResponse.json({ error: "paperId and title are required" }, { status: 400 })

  const paper = await prisma.courseSyllabusPaper.findFirst({
    where: { id: paperId, courseId: id },
    select: { id: true },
  })
  if (!paper) return NextResponse.json({ error: "Paper not found" }, { status: 404 })

  const highest = await prisma.courseSyllabusSection.findFirst({
    where: { paperId },
    orderBy: { order: "desc" },
    select: { order: true },
  })

  const section = await prisma.courseSyllabusSection.create({
    data: {
      paperId,
      title,
      titleHi: str(body?.titleHi),
      subtopics: strList(body?.subtopics) || [],
      subtopicsHi: strList(body?.subtopicsHi) || [],
      unitId: str(body?.unitId),
      chapterId: str(body?.chapterId),
      pyqSubject: str(body?.pyqSubject),
      pyqTopic: str(body?.pyqTopic),
      order: (highest?.order || 0) + 1,
    },
  })
  return NextResponse.json(section, { status: 201 })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await guard(id)
  if (g.response) return g.response

  const body = await req.json().catch(() => null)
  const kind = body?.kind

  if (kind === "paper") {
    const paperId = str(body?.paperId)
    if (!paperId) return NextResponse.json({ error: "paperId is required" }, { status: 400 })
    const existing = await prisma.courseSyllabusPaper.findFirst({ where: { id: paperId, courseId: id } })
    if (!existing) return NextResponse.json({ error: "Paper not found" }, { status: 404 })

    const paper = await prisma.courseSyllabusPaper.update({
      where: { id: paperId },
      data: {
        ...(str(body?.title) ? { title: str(body?.title) as string } : {}),
        ...(body?.titleHi !== undefined ? { titleHi: str(body?.titleHi) } : {}),
        ...(body?.marks !== undefined ? { marks: num(body?.marks) } : {}),
        ...(body?.durationMinutes !== undefined ? { durationMinutes: num(body?.durationMinutes) } : {}),
        ...(body?.introText !== undefined ? { introText: str(body?.introText, 2000) } : {}),
        ...(body?.introTextHi !== undefined ? { introTextHi: str(body?.introTextHi, 2000) } : {}),
        ...(body?.order !== undefined ? { order: Number(body.order) } : {}),
      },
    })
    return NextResponse.json(paper)
  }

  const sectionId = str(body?.sectionId)
  if (!sectionId) return NextResponse.json({ error: "sectionId is required" }, { status: 400 })

  const existing = await prisma.courseSyllabusSection.findFirst({
    where: { id: sectionId, paper: { courseId: id } },
  })
  if (!existing) return NextResponse.json({ error: "Section not found" }, { status: 404 })

  const section = await prisma.courseSyllabusSection.update({
    where: { id: sectionId },
    data: {
      ...(str(body?.title) ? { title: str(body?.title) as string } : {}),
      ...(body?.titleHi !== undefined ? { titleHi: str(body?.titleHi) } : {}),
      ...(strList(body?.subtopics) ? { subtopics: strList(body?.subtopics) as string[] } : {}),
      ...(strList(body?.subtopicsHi) ? { subtopicsHi: strList(body?.subtopicsHi) as string[] } : {}),
      ...(body?.unitId !== undefined ? { unitId: str(body?.unitId) } : {}),
      ...(body?.chapterId !== undefined ? { chapterId: str(body?.chapterId) } : {}),
      ...(body?.pyqSubject !== undefined ? { pyqSubject: str(body?.pyqSubject) } : {}),
      ...(body?.pyqTopic !== undefined ? { pyqTopic: str(body?.pyqTopic) } : {}),
      ...(body?.order !== undefined ? { order: Number(body.order) } : {}),
    },
  })
  return NextResponse.json(section)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await guard(id)
  if (g.response) return g.response

  const url = new URL(req.url)
  const paperId = url.searchParams.get("paperId")
  const sectionId = url.searchParams.get("sectionId")

  if (sectionId) {
    const existing = await prisma.courseSyllabusSection.findFirst({
      where: { id: sectionId, paper: { courseId: id } },
      select: { id: true },
    })
    if (!existing) return NextResponse.json({ error: "Section not found" }, { status: 404 })
    await prisma.courseSyllabusSection.delete({ where: { id: sectionId } })
    return NextResponse.json({ success: true })
  }

  if (paperId) {
    const existing = await prisma.courseSyllabusPaper.findFirst({ where: { id: paperId, courseId: id }, select: { id: true } })
    if (!existing) return NextResponse.json({ error: "Paper not found" }, { status: 404 })
    await prisma.courseSyllabusPaper.delete({ where: { id: paperId } })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "paperId or sectionId is required" }, { status: 400 })
}
