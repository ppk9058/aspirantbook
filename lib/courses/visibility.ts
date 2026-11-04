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
  createdById?: string | null
  instructorId?: string | null
  authorId?: string | null
  userId?: string | null
}

export function isCourseVisibleToUser(
  course: CourseLike | null | undefined,
  userRole?: string | null,
  userId?: string | null
): boolean {
  if (!course) return false
  if (userRole === "ADMIN") return true

  // Allow owner / instructor teacher to preview their draft course
  const isOwnerTeacher =
    userRole === "TEACHER" &&
    Boolean(
      userId &&
      (course.createdById === userId ||
        course.instructorId === userId ||
        course.authorId === userId ||
        course.userId === userId)
    )
  if (isOwnerTeacher) return true

  // For everyone else:
  // Must have status === "PUBLISHED" AND isPublished !== false
  const isStatusPublished = course.status === "PUBLISHED"
  const isFlagPublished = course.isPublished !== false
  return isStatusPublished && isFlagPublished
}

export function isCourseDetailReady(course: {
  chapters?: Array<{ lessons?: Array<any> | null }> | null
} | null | undefined): boolean {
  if (!course || !course.chapters || course.chapters.length === 0) {
    return false
  }
  return course.chapters.some((ch) => ch.lessons && ch.lessons.length > 0)
}

