import { NextResponse } from "next/server"
import { getCurrentUserContext, UserContext } from "@/lib/auth/rbac"

export async function requireContentEngineAdmin(): Promise<{ user?: UserContext; response?: NextResponse }> {
  const user = await getCurrentUserContext()

  // In production, ts_demo_role cookie fallback is strictly forbidden for admin mutations
  const isProd = process.env.NODE_ENV === "production"
  if (isProd && user.userId?.startsWith("demo-")) {
    return {
      response: NextResponse.json(
        { error: "Unauthorized: Active session required in production" },
        { status: 401 }
      ),
    }
  }

  if (!user.isAuthenticated) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  if (user.role !== "ADMIN") {
    return { response: NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 }) }
  }
  return { user }
}
