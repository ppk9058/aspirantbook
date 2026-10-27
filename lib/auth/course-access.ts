/**
 * A8: course ownership policy.
 *
 * Until now any TEACHER could edit or delete any course (and the delete route
 * even let teachers delete published courses). Ownership is now explicit:
 *
 *  - ADMIN  → every course.
 *  - TEACHER → only courses they created (`createdById === user.userId`).
 *  - Legacy courses with no creator (`createdById === null`) are ADMIN-only,
 *    with one exception: the in-process demo teacher (`demo-teacher`) may still
 *    use them, otherwise the demo studio has no course to open. That exception
 *    can only exist when demo mode is enabled (see `lib/auth/demo-role.ts`).
 *  - Anyone else → denied, fail closed.
 *
 * This module is pure (no Prisma, no cookies) so it is unit-testable.
 */

export interface CourseAccessUser {
  isAuthenticated: boolean
  role: string
  userId?: string
}

export interface CourseOwnership {
  id: string
  createdById?: string | null
}

export type CourseAccessLevel = "ADMIN" | "OWNER" | "LEGACY_DEMO" | "DENIED"

/** Roles that may manage course content at all. */
const EDITOR_ROLES = ["ADMIN", "TEACHER"]

/**
 * Demo identities are synthesised by `getCurrentUserContext` when the demo role
 * cookie is active (`demo-admin`, `demo-teacher`, `demo-student`).
 */
export function isDemoUserId(userId?: string): boolean {
  return typeof userId === "string" && userId.startsWith("demo-")
}

export function courseAccessLevel(
  user: CourseAccessUser | null | undefined,
  course: CourseOwnership | null | undefined
): CourseAccessLevel {
  if (!user || !user.isAuthenticated || !course) return "DENIED"
  if (!EDITOR_ROLES.includes(user.role)) return "DENIED"
  if (user.role === "ADMIN") return "ADMIN"

  // TEACHER from here on.
  if (!user.userId) return "DENIED"

  if (course.createdById) {
    return course.createdById === user.userId ? "OWNER" : "DENIED"
  }

  // Legacy course without a creator: the demo teacher keeps the demo studio
  // usable; every real teacher is denied.
  if (user.role === "TEACHER" && isDemoUserId(user.userId)) {
    return "LEGACY_DEMO"
  }

  return "DENIED"
}

export function canManageCourse(
  user: CourseAccessUser | null | undefined,
  course: CourseOwnership | null | undefined
): boolean {
  return courseAccessLevel(user, course) !== "DENIED"
}

/** Throws a stable `FORBIDDEN:` error when the caller may not manage a course. */
export function assertCanManageCourse(
  user: CourseAccessUser | null | undefined,
  course: CourseOwnership | null | undefined,
  action = "manage"
): void {
  if (!user || !user.isAuthenticated) {
    throw new Error("UNAUTHORIZED: Authentication required")
  }
  if (!canManageCourse(user, course)) {
    throw new Error(`FORBIDDEN: You cannot ${action} this course`)
  }
}

export type CourseDeleteDecision = "delete" | "archive"

/**
 * Courses with learners must never disappear. When an enrollment exists the
 * course is archived (unpublished + status ARCHIVED) instead of deleted, so
 * progress, payments and certificates stay intact.
 */
export function decideCourseDelete(enrollmentCount: number): CourseDeleteDecision {
  return enrollmentCount > 0 ? "archive" : "delete"
}

/**
 * The creator recorded for a new course. Demo identities are not persisted
 * (they are not real users and would violate the foreign key).
 */
export function creatorIdFor(user: CourseAccessUser): string | null {
  if (!user.userId || isDemoUserId(user.userId)) return null
  return user.userId
}

/** Adapts a NextAuth session user to the policy shape. */
export function toCourseAccessUser(
  user: { id?: string; role?: string } | null | undefined
): CourseAccessUser {
  return {
    isAuthenticated: Boolean(user),
    role: user?.role || "",
    userId: user?.id,
  }
}
