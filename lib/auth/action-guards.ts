import type { UserContext } from "./rbac"

/**
 * Shared fail-closed guard for privileged server actions.
 * Throws a stable error string so callers/tests can distinguish 401 vs 403.
 */
export function assertRole(
  user: Pick<UserContext, "isAuthenticated" | "role">,
  allowed: string | string[]
): void {
  if (!user.isAuthenticated) {
    throw new Error("UNAUTHORIZED: Authentication required")
  }
  const roles = Array.isArray(allowed) ? allowed : [allowed]
  if (user.role === "ADMIN") return
  if (!roles.includes(user.role)) {
    throw new Error(`FORBIDDEN: Requires role ${roles.join(" or ")}`)
  }
}

export function assertAdmin(user: Pick<UserContext, "isAuthenticated" | "role">): void {
  assertRole(user, "ADMIN")
}
