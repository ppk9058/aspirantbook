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
  const initialProgressTimes: { [id: string]: number } = {}

  let isEnrolled = false
  const isFreeCourse = !course.isPremium && (!course.price || course.price === 0)

  if (session?.user?.id) {
    try {
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: session.user.id,
            courseId: course.id,
          },
        },
      })

      if (existingEnrollment) {
        isEnrolled = true
      } else if (isFreeCourse) {
        // Auto-enroll free courses so they appear in My Batches
        await prisma.enrollment.create({
          data: {
            userId: session.user.id,
            courseId: course.id,
          },
        })
        isEnrolled = true
      }

      const records = await prisma.progress.findMany({
        where: {
          userId: session.user.id,
          lessonId: { in: allLessonIds },
        },
        select: { lessonId: true, completed: true, timeSpent: true },
      })
      records.forEach((r) => {
        if (r.completed) initialCompletedIds[r.lessonId] = true
        if (r.timeSpent) initialProgressTimes[r.lessonId] = r.timeSpent
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
      isEnrolled={isEnrolled}
      initialCompletedIds={initialCompletedIds}
      initialProgressTimes={initialProgressTimes}
    />
  )
}
