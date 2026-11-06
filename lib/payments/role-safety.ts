export const PROTECTED_ROLES = ["ADMIN", "TEACHER"] as const
export type ProtectedRole = (typeof PROTECTED_ROLES)[number]

/**
 * Decides whether a payment-, subscription-, or webhook-driven role change
 * may be applied for a user with the given current role.
 *
 * Rules:
 * - ADMIN and TEACHER roles are protected and must NEVER be changed by payments or subscriptions.
 * - FREE (or already PREMIUM) users are eligible for role changes.
 * - If current role is undefined/null/empty, returns false (fail-safe).
 */
export function canApplyPaymentRoleChange(currentRole?: string | null): boolean {
  if (!currentRole) return false
  return !PROTECTED_ROLES.includes(currentRole as ProtectedRole)
}
