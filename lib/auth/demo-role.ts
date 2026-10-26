import type { AppRole } from "./roles"

export const DEMO_ROLE_COOKIE = "ts_demo_role"

export type DemoRole = "STUDENT" | "TEACHER" | "ADMIN"

const DEMO_ROLES: readonly AppRole[] = ["STUDENT", "TEACHER", "ADMIN"]

type CookieReader = { get(name: string): { value: string } | undefined }
type CookieSource = CookieReader | { cookies: CookieReader }

/**
 * Demo role switching (`ts_demo_role` cookie) is a local/staging convenience only.
 *
 * Security rules:
 * - Never trusted in a production build, regardless of any other flag.
 * - Only trusted when demo mode is explicitly enabled (`DEMO_MODE_ENABLED=true` or `ENABLE_DEMO_ROLE=true`)
 *   or when running against the isolated test environment (`APP_ENV=test`).
 *
 * This module intentionally has no `next/headers` import so it can be used from
 * the edge middleware, route handlers, server actions and server components alike.
 */
export function isDemoRoleEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NODE_ENV === "production") return false
  return (
    env.DEMO_MODE_ENABLED === "true" ||
    env.ENABLE_DEMO_ROLE === "true" ||
    env.APP_ENV === "test"
  )
}

export const isDemoModeEnabled = isDemoRoleEnabled

export function resolveDemoRole(
  rawValue: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env
): AppRole | undefined {
  if (!isDemoRoleEnabled(env)) return undefined
  if (!rawValue) return undefined
  return DEMO_ROLES.includes(rawValue as AppRole) ? (rawValue as AppRole) : undefined
}

export function normalizeDemoRole(
  value: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env
): DemoRole | undefined {
  return resolveDemoRole(value, env)
}

/**
 * Single entry point for reading the demo role cookie.
 *
 * Accepts either a `NextRequest` (uses `req.cookies`) or a cookie store from
 * `next/headers` (`await cookies()`).
 */
export function getDemoRole(source: CookieSource): AppRole | undefined {
  const reader: CookieReader =
    "cookies" in source && (source as any).cookies ? (source as any).cookies : (source as CookieReader)
  return resolveDemoRole(reader.get(DEMO_ROLE_COOKIE)?.value)
}
