import { auth } from "@/auth"
import { AppRole, normalizeAppRole } from "./roles"
import { Permission, hasPermission, ROLE_PERMISSIONS } from "./permissions"
import { cookies } from "next/headers"
import { normalizeDemoRole } from "./demo-role"

export interface UserContext {
  userId?: string
  name?: string | null
  email?: string | null
  role: AppRole
  permissions: Permission[]
  isAuthenticated: boolean
}

/**
 * Retrieves the current user's authenticated context with normalized role and permissions.
 * Checks NextAuth session, and checks cookie "ts_demo_role" for instant dev/demo role switching.
 */
export async function getCurrentUserContext(): Promise<UserContext> {
  const session = await auth()
  let demoRoleCookie: string | undefined = undefined
  try {
    const cookieStore = await cookies()
    demoRoleCookie = normalizeDemoRole(cookieStore.get("ts_demo_role")?.value)
  } catch {
    // Outside Next.js request scope (e.g. unit tests or background scripts)
  }

  // Authentic session role always takes precedence; fallback to demo cookie for unauthenticated testing
  let rawRole: string | undefined = session?.user?.role
  if (!rawRole && demoRoleCookie && (demoRoleCookie === "STUDENT" || demoRoleCookie === "TEACHER" || demoRoleCookie === "ADMIN")) {
    rawRole = demoRoleCookie
  }

  const role = normalizeAppRole(rawRole)
  const permissions = ROLE_PERMISSIONS[role] || []

  return {
    userId: session?.user?.id || (demoRoleCookie ? `demo-${role.toLowerCase()}` : undefined),
    name: session?.user?.name || (role === "TEACHER" ? "Prof. Sharma" : role === "ADMIN" ? "Admin Authority" : "Student Learner"),
    email: session?.user?.email || `${role.toLowerCase()}@aspirantbook.com`,
    role,
    permissions,
    isAuthenticated: !!session?.user || !!demoRoleCookie,
  }
}

/**
 * Enforces role requirement in API routes or Server Actions.
 * Throws an Error or returns authorization failure.
 */
export async function requireRole(allowedRoles: AppRole | AppRole[]): Promise<UserContext> {
  const context = await getCurrentUserContext()
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]

  if (!context.isAuthenticated) {
    throw new Error("UNAUTHORIZED: Authentication required")
  }

  if (context.role === "ADMIN") {
    return context // Super authority
  }

  if (!roles.includes(context.role)) {
    throw new Error(`FORBIDDEN: Requires role ${roles.join(" or ")}, but got ${context.role}`)
  }

  return context
}

/**
 * Enforces specific permission in API routes or Server Actions.
 */
export async function requirePermission(permission: Permission): Promise<UserContext> {
  const context = await getCurrentUserContext()

  if (!context.isAuthenticated) {
    throw new Error("UNAUTHORIZED: Authentication required")
  }

  if (!hasPermission(context.role, permission)) {
    throw new Error(`FORBIDDEN: Missing required permission '${permission}'`)
  }

  return context
}
