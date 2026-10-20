import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { CoursePlayerClient } from "@/components/course/CoursePlayerClient"
import { toSafeCourseDto } from "@/lib/courses/course-dto"
import { isCourseVisibleToUser } from "@/lib/courses/visibility"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ slug: string; lessonId: string }> }) {
  const { slug, lessonId } = await params
  const [session, course] = await Promise.all([
    auth(),
    prisma.course.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      select: { id: true, title: true, status: true, isPublished: true }
    }),
  ])
  const userRole = session?.user?.role

  if (!course || !isCourseVisibleToUser(course, userRole)) {
    notFound()
  }

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, chapter: { courseId: course.id } },
    select: { id: true, title: true }
  })

  if (!lesson) {
    notFound()
  }

  return { title: lesson.title }
}

export default async function CourseLearnPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>
}) {
  const { slug, lessonId } = await params
  const [session, course] = await Promise.all([
    auth(),
    prisma.course.findUnique({
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
    }),
  ])
  const userRole = session?.user?.role

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
      const [existingEnrollment, records] = await Promise.all([
        prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: session.user.id,
              courseId: course.id,
            },
          },
        }),
        prisma.progress.findMany({
          where: {
            userId: session.user.id,
            lessonId: { in: allLessonIds },
          },
          select: { lessonId: true, completed: true, timeSpent: true },
        }),
      ])

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

      records.forEach((r) => {
        if (r.completed) initialCompletedIds[r.lessonId] = true
        if (r.timeSpent) initialProgressTimes[r.lessonId] = r.timeSpent
      })
    } catch (err) {
      console.error("Error loading progress or enrolling in CourseLearnPage:", err)
    }
  }

  const hasAccess = isEditor || isEnrolled || isFreeCourse

  // Find requested lesson to check if it's a trial lesson
  const currentLesson = course.chapters.flatMap((ch) => ch.lessons).find((l) => l.id === lessonId)
  if (!currentLesson) {
    notFound()
  }

  if (!hasAccess && !currentLesson.isTrial) {
    redirect(`/courses/${slug}?locked=true`)
  }

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
