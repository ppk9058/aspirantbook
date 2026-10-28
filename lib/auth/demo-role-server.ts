import { cookies } from "next/headers"
import { DEMO_ROLE_COOKIE, DemoRole, isDemoModeEnabled, normalizeDemoRole } from "./demo-role"

/** Reads and validates the demo-role cookie. Returns undefined when demo mode is off. */
export async function getDemoRoleFromCookies(): Promise<DemoRole | undefined> {
  if (!isDemoModeEnabled()) return undefined
  const cookieStore = await cookies()
  return normalizeDemoRole(cookieStore.get(DEMO_ROLE_COOKIE)?.value)
}
