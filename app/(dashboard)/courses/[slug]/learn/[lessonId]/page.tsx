import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { notFound } from "next/navigation"
import { CoursePlayerClient } from "@/components/course/CoursePlayerClient"

export const dynamic = "force-dynamic"

export default async function CourseLearnPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>
}) {
  const { slug, lessonId } = await params
  const session = await auth()

  const course = await prisma.course.findUnique({
    where: { slug },
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
    notFound()
  }

  // Load real database progress for all lessons in this course
  const allLessonIds = course.chapters.flatMap((ch) => ch.lessons.map((l) => l.id))
  const initialCompletedIds: { [id: string]: boolean } = {}

  if (session?.user?.id) {
    try {
      // Auto-enroll user if they are watching this course so it appears in My Batches
      await prisma.enrollment.upsert({
        where: {
          userId_courseId: {
            userId: session.user.id,
            courseId: course.id,
          },
        },
        update: {},
        create: {
          userId: session.user.id,
          courseId: course.id,
        },
      })

      const records = await prisma.progress.findMany({
        where: {
          userId: session.user.id,
          lessonId: { in: allLessonIds },
          completed: true,
        },
        select: { lessonId: true },
      })
      records.forEach((r) => {
        initialCompletedIds[r.lessonId] = true
      })
    } catch (err) {
      console.error("Error loading progress or enrolling in CourseLearnPage:", err)
    }
  }

  return (
    <CoursePlayerClient
      course={course as any}
      initialLessonId={lessonId}
      userRole={session?.user?.role}
      userName={session?.user?.name || "Student"}
      initialCompletedIds={initialCompletedIds}
    />
  )
}
