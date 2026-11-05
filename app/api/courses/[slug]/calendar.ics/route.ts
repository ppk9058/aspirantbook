import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { buildCourseIcs, icsFileName } from "@/lib/calendar/ics"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const course = await prisma.course.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    include: {
      chapters: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
          },
        },
      },
    },
  })

  if (!course) {
    return new NextResponse("Course not found", { status: 404 })
  }

  const lectures = course.chapters.flatMap((chapter) =>
    chapter.lessons
      .filter((lesson) => lesson.scheduledAt)
      .map((lesson) => ({
        uid: lesson.id,
        title: lesson.title,
        description: `${course.title} — ${chapter.title}`,
        start: lesson.scheduledAt,
        durationMinutes: lesson.duration || 90,
      }))
  )

  const ics = buildCourseIcs({
    courseTitle: course.title,
    courseUid: course.id,
    lectures,
  })

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${icsFileName(course.title)}"`,
      "Cache-Control": "public, max-age=3600",
    },
  })
}
