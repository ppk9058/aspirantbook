/**
 * The ONE place that decides whether a viewer may open a lesson.
 *
 * It mirrors the rule the learn page has always applied:
 *   staff (ADMIN / TEACHER) > free course > trial lesson > enrolled > locked.
 *
 * The learn page (`app/(dashboard)/courses/[slug]/learn/[lessonId]/page.tsx`),
 * the /learn index page and the signed-URL route all import this, so the media
 * route can never be more permissive than the page that renders the lesson.
 */

export interface LessonAccessCourseLike {
  isPremium?: boolean | null
  price?: number | null
}

export interface LessonAccessLessonLike {
  isTrial?: boolean | null
}

export type LessonAccessReason = "staff" | "free" | "trial" | "enrolled" | "locked"

export interface LessonAccessResult {
  allowed: boolean
  reason: LessonAccessReason
}

/** A course is free when it is not premium and has no price. */
export function isFreeCourseForAccess(course: LessonAccessCourseLike | null | undefined): boolean {
  if (!course) return false
  return !course.isPremium && (!course.price || course.price === 0)
}

export function isStaffRole(role?: string | null): boolean {
  return role === "ADMIN" || role === "TEACHER"
}

/**
 * Pure access decision. No IO, so it is unit-testable and identical on the
 * server page and in the API route.
 */
export function evaluateLessonAccess(input: {
  lesson: LessonAccessLessonLike | null | undefined
  course: LessonAccessCourseLike | null | undefined
  role?: string | null
  isEnrolled?: boolean | null
}): LessonAccessResult {
  const { lesson, course, role, isEnrolled } = input
  if (!lesson || !course) return { allowed: false, reason: "locked" }
  if (isStaffRole(role)) return { allowed: true, reason: "staff" }
  if (isFreeCourseForAccess(course)) return { allowed: true, reason: "free" }
  if (lesson.isTrial) return { allowed: true, reason: "trial" }
  if (isEnrolled) return { allowed: true, reason: "enrolled" }
  return { allowed: false, reason: "locked" }
}
