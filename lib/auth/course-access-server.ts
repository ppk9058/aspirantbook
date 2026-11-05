import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  type CourseAccessUser,
  canManageCourse,
} from "./course-access"

/**
 * A8: shared server-side ownership lookups.
 *
 * Every mutation route/action goes through these helpers so the 403/404 rules
 * live in one place. They deliberately return NextResponse for route handlers
 * and a nullable course for server actions.
 */

export interface ManagedCourse {
  id: string
  title: string
  slug: string
  status: string
  isPublished: boolean
  enrollmentCount: number
  /** Real enrollment rows (the scalar counter can lag behind). */
  enrollmentRowCount: number
  createdById: string | null
  thumbnailUrl: string | null
  metadataJson: string | null
}

const MANAGED_COURSE_SELECT = {
  id: true,
  title: true,
  slug: true,
  status: true,
  isPublished: true,
  enrollmentCount: true,
  createdById: true,
  thumbnailUrl: true,
  metadataJson: true,
  _count: { select: { enrollments: true } },
} as const

/** Loads the course and returns it only when the caller may manage it. */
export async function loadManagedCourse(
  user: CourseAccessUser,
  courseId: string
): Promise<{ course: ManagedCourse } | { status: 403 | 404; error: string }> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: MANAGED_COURSE_SELECT,
  })
  if (!course) return { status: 404, error: "Course not found" }
  if (!canManageCourse(user, course)) {
    return { status: 403, error: "Access Denied: you can only manage courses you created" }
  }
  const { _count, ...rest } = course
  return { course: { ...rest, enrollmentRowCount: _count.enrollments } as ManagedCourse }
}

/** Route-handler flavour: returns `{ course }` or `{ response }`. */
export async function requireManagedCourse(
  user: CourseAccessUser,
  courseId: string
): Promise<{ course: ManagedCourse; response?: never } | { course?: never; response: NextResponse }> {
  const result = await loadManagedCourse(user, courseId)
  if ("error" in result) {
    return { response: NextResponse.json({ error: result.error }, { status: result.status }) }
  }
  return { course: result.course }
}

/** Resolves the owning course of a chapter and checks permission. */
export async function requireManagedChapter(
  user: CourseAccessUser,
  chapterId: string
): Promise<{ chapterId: string; course: ManagedCourse; response?: never } | { response: NextResponse }> {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { id: true, courseId: true },
  })
  if (!chapter) {
    return { response: NextResponse.json({ error: "Chapter not found" }, { status: 404 }) }
  }
  const access = await requireManagedCourse(user, chapter.courseId)
  if (access.response) return { response: access.response }
  return { chapterId: chapter.id, course: access.course }
}

/** Resolves the owning course of a lesson and checks permission. */
export async function requireManagedLesson(
  user: CourseAccessUser,
  lessonId: string
): Promise<{ lessonId: string; chapterId: string; course: ManagedCourse; response?: never } | { response: NextResponse }> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, chapterId: true, chapter: { select: { courseId: true } } },
  })
  if (!lesson) {
    return { response: NextResponse.json({ error: "Lesson not found" }, { status: 404 }) }
  }
  const access = await requireManagedCourse(user, lesson.chapter.courseId)
  if (access.response) return { response: access.response }
  return { lessonId: lesson.id, chapterId: lesson.chapterId, course: access.course }
}

/**
 * Server-action flavour used by `lib/actions/admin/*`: throws the same
 * UNAUTHORIZED/FORBIDDEN strings as `assertRole`.
 */
export async function assertManagedCourseForAction(
  user: CourseAccessUser,
  courseId: string,
  action = "manage"
): Promise<ManagedCourse> {
  if (!user.isAuthenticated) {
    throw new Error("UNAUTHORIZED: Authentication required")
  }
  const result = await loadManagedCourse(user, courseId)
  if ("error" in result) {
    if (result.status === 404) throw new Error("NOT_FOUND: Course not found")
    throw new Error(`FORBIDDEN: You cannot ${action} this course`)
  }
  return result.course
}

export async function assertManagedChapterForAction(
  user: CourseAccessUser,
  chapterId: string,
  action = "manage"
): Promise<{ chapterId: string; course: ManagedCourse }> {
  if (!user.isAuthenticated) {
    throw new Error("UNAUTHORIZED: Authentication required")
  }
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { id: true, courseId: true },
  })
  if (!chapter) throw new Error("NOT_FOUND: Chapter not found")
  const course = await assertManagedCourseForAction(user, chapter.courseId, action)
  return { chapterId: chapter.id, course }
}

export async function assertManagedLessonForAction(
  user: CourseAccessUser,
  lessonId: string,
  action = "manage"
): Promise<{ lessonId: string; chapterId: string; course: ManagedCourse }> {
  if (!user.isAuthenticated) {
    throw new Error("UNAUTHORIZED: Authentication required")
  }
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, chapterId: true, chapter: { select: { courseId: true } } },
  })
  if (!lesson) throw new Error("NOT_FOUND: Lesson not found")
  const course = await assertManagedCourseForAction(user, lesson.chapter.courseId, action)
  return { lessonId: lesson.id, chapterId: lesson.chapterId, course }
}
