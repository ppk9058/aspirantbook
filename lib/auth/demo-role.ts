export const DEMO_ROLE_COOKIE = "ts_demo_role"

export type DemoRole = "STUDENT" | "TEACHER" | "ADMIN"

/**
 * Demo role switching is an explicit, non-production affordance.
 *
 * It is enabled only when the process is NOT a production build AND either:
 *  - the process is the isolated test environment (APP_ENV=test), or
 *  - demo mode was explicitly turned on (ENABLE_DEMO_ROLE=true).
 *
 * In every other case the `ts_demo_role` cookie must be ignored, so an
 * anonymous caller can never obtain a privileged role by setting it.
 */
export function isDemoModeEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false
  return (
    process.env.APP_ENV === "test" ||
    process.env.ENABLE_DEMO_ROLE === "true"
  )
}

export function normalizeDemoRole(value: string | null | undefined): DemoRole | undefined {
  if (!isDemoModeEnabled()) return undefined
  if (value === "STUDENT" || value === "TEACHER" || value === "ADMIN") {
    return value
  }
  return undefined
}
