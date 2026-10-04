/**
 * Centralized Role Definitions for aspirantbook
 * Supports 3 primary RBAC roles: STUDENT, TEACHER, ADMIN
 * Designed to cleanly accommodate future roles (SUPER_ADMIN, CONTENT_MANAGER, MODERATOR).
 */

export type AppRole = "STUDENT" | "TEACHER" | "ADMIN"

export const APP_ROLES: { [key in AppRole]: { name: string; description: string } } = {
  STUDENT: {
    name: "Student",
    description: "Learner who attends classes, watches lectures, takes tests, and submits doubts",
  },
  TEACHER: {
    name: "Teacher / Faculty",
    description: "Educator who schedules & conducts classes, answers questions, creates tests & polls",
  },
  ADMIN: {
    name: "Platform Administrator",
    description: "Super authority with full administrative access across platform resources",
  },
}

/**
 * Normalizes database roles or legacy strings into standard AppRole
 */
export function normalizeAppRole(rawRole?: string | null): AppRole {
  if (!rawRole) return "STUDENT"
  const upper = rawRole.toUpperCase()
  if (upper === "ADMIN" || upper === "SUPER_ADMIN") return "ADMIN"
  if (upper === "TEACHER" || upper === "INSTRUCTOR" || upper === "FACULTY") return "TEACHER"
  // FREE, PREMIUM, STUDENT all map to STUDENT with entitlement-based access
  return "STUDENT"
}

/**
 * Returns role-specific dashboard link:
 * - ADMIN -> /teacher (or /admin)
 * - TEACHER -> /teacher
 * - STUDENT -> /dashboard
 * - logged-out (no role) -> /
 */
export function getDashboardHref(rawRole?: string | null, isAuthenticated: boolean = true): string {
  if (!isAuthenticated) return "/"
  const role = normalizeAppRole(rawRole)
  if (role === "ADMIN" || role === "TEACHER") return "/teacher"
  return "/dashboard"
}

