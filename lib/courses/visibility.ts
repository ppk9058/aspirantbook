/**
 * Course Visibility Helper
 *
 * Rules:
 * A course whose status is not PUBLISHED (or isPublished is false)
 * returns 404 to everyone except ADMIN, including anonymous and enrolled students.
 * Only ADMIN can view or access DRAFT / unpublished courses.
 */

export type CourseLike = {
  status?: string | null
  isPublished?: boolean | null
}

export function isCourseVisibleToUser(
  course: CourseLike | null | undefined,
  userRole?: string | null
): boolean {
  if (!course) return false
  if (userRole === "ADMIN") return true

  // For everyone except ADMIN:
  // Must have status === "PUBLISHED" AND isPublished !== false
  const isStatusPublished = course.status === "PUBLISHED"
  const isFlagPublished = course.isPublished !== false
  return isStatusPublished && isFlagPublished
}
