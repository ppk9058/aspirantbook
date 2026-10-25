import { NextResponse } from "next/server"
import { getCurrentUserContext, UserContext } from "@/lib/auth/rbac"

export async function requireContentEngineAdmin(): Promise<{ user?: UserContext; response?: NextResponse }> {
  const user = await getCurrentUserContext()
  if (!user.isAuthenticated) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  if (user.role !== "ADMIN") {
    return { response: NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 }) }
  }
  return { user }
}
