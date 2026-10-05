import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { notFound } from "next/navigation"
import { CoursePlayerClient } from "@/components/course/CoursePlayerClient"
import { toSafeCourseDto } from "@/lib/courses/course-dto"
import { isCourseVisibleToUser } from "@/lib/courses/visibility"

export const dynamic = "force-dynamic"

export default async function CourseLearnPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>
}) {
  const { slug, lessonId } = await params
  const session = await auth()
  const userRole = session?.user?.role

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

  if (!course || !isCourseVisibleToUser(course, userRole)) {
    notFound()
  }

  // Load real database progress for all lessons in this course
  const allLessonIds = course.chapters.flatMap((ch) => ch.lessons.map((l) => l.id))
  const initialCompletedIds: { [id: string]: boolean } = {}
  const initialProgressTimes: { [id: string]: number } = {}

  let isEnrolled = false
  const isFreeCourse = !course.isPremium && (!course.price || course.price === 0)
  const isEditor = userRole === "ADMIN" || userRole === "TEACHER"

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

  const hasAccess = isEditor || isEnrolled || isFreeCourse
  const safeCourse = toSafeCourseDto(course, hasAccess)

  return (
    <CoursePlayerClient
      course={safeCourse as any}
      initialLessonId={lessonId}
      userRole={userRole}
      userName={session?.user?.name || "Student"}
      isEnrolled={isEnrolled}
      initialCompletedIds={initialCompletedIds}
      initialProgressTimes={initialProgressTimes}
    />
  )
}
