import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { isCourseVisibleToUser } from "@/lib/courses/visibility"
import { evaluateLessonAccess, isFreeCourseForAccess, isStaffRole } from "@/lib/courses/lesson-access"

export const dynamic = "force-dynamic"

/**
 * "Start learning" entry point for a course.
 *
 * Resumes the learner's last-watched lesson, else the first lesson. Non-enrolled
 * visitors of a paid course are sent to the trial lesson when one exists, and
 * otherwise to the course page with the locked flag: the same access decision the
 * lesson page applies is reused here (lib/courses/lesson-access.ts).
 */
export default async function CourseLearnIndexPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const [session, course] = await Promise.all([
    auth(),
    prisma.course.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      select: {
        id: true,
        slug: true,
        isPremium: true,
        price: true,
        status: true,
        isPublished: true,
        createdById: true,
        chapters: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            order: true,
            lessons: {
              orderBy: { order: "asc" },
              select: { id: true, isTrial: true, order: true },
            },
          },
        },
      },
    }),
  ])

  const userRole = session?.user?.role
  const userId = session?.user?.id

  if (!course || !isCourseVisibleToUser(course, userRole, userId)) {
    notFound()
  }

  const lessons = course.chapters.flatMap((chapter) => chapter.lessons)
  const canonicalSlug = course.slug || slug
  const courseHref = `/courses/${canonicalSlug}`

  if (lessons.length === 0) {
    redirect(courseHref)
  }

  let isEnrolled = false
  if (userId) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
      select: { id: true },
    })
    isEnrolled = Boolean(enrollment)
  }

  const hasCourseAccess =
    isStaffRole(userRole) || isFreeCourseForAccess(course) || isEnrolled

  if (!hasCourseAccess) {
    // Only trial lessons are open to non-enrolled visitors.
    const trialLesson = lessons.find((lesson) =>
      evaluateLessonAccess({ lesson, course, role: userRole, isEnrolled: false }).allowed
    )
    if (!trialLesson) {
      redirect(`${courseHref}?locked=true`)
    }
    redirect(`/courses/${canonicalSlug}/learn/${trialLesson.id}`)
  }

  let targetLessonId: string | null = null

  if (userId) {
    const lastWatched = await prisma.progress.findFirst({
      where: {
        userId,
        lessonId: { in: lessons.map((lesson) => lesson.id) },
        timeSpent: { gt: 0 },
      },
      orderBy: { lastAccessed: "desc" },
      select: { lessonId: true },
    })
    if (lastWatched?.lessonId) {
      targetLessonId = lastWatched.lessonId
    }
  }

  if (!targetLessonId) {
    targetLessonId = lessons[0]?.id || null
  }

  if (!targetLessonId) {
    redirect(courseHref)
  }

  redirect(`/courses/${canonicalSlug}/learn/${targetLessonId}`)
}
