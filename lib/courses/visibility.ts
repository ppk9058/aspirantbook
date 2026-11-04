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
      (course.instructorId === userId || course.authorId === userId || course.userId === userId)
    )
  if (isOwnerTeacher) return true

  // For everyone else:
  // Must have status === "PUBLISHED" AND isPublished !== false
  const isStatusPublished = course.status === "PUBLISHED"
  const isFlagPublished = course.isPublished !== false
  return isStatusPublished && isFlagPublished
}

export function isCourseDetailReady(course: {
  schemaVersion?: number | null
  units?: Array<any> | null
  chapters?: Array<{ lessons?: Array<any> | null }> | null
  metadataJson?: string | null
} | null | undefined): boolean {
  if (!course) return false

  let isV2 = (course as any).schemaVersion === 2 || ((course.units?.length || 0) > 0)
  if (!isV2 && course.metadataJson) {
    try {
      const parsed = JSON.parse(course.metadataJson)
      if (parsed.schemaVersion === 2) isV2 = true
    } catch {}
  }
  if (isV2) return true

  if (!course.chapters || course.chapters.length === 0) {
    return false
  }
  return course.chapters.some((ch) => ch.lessons && ch.lessons.length > 0)
}

