import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { AppRole } from "@/lib/auth/roles"
import { isDemoModeEnabled, normalizeDemoRole } from "@/lib/auth/demo-role"
import { logAuditAction } from "@/lib/audit/audit-logger"

export async function GET() {
  if (!isDemoModeEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  const cookieStore = await cookies()
  const currentRole = (normalizeDemoRole(cookieStore.get("ts_demo_role")?.value) as AppRole) || "STUDENT"
  return NextResponse.json({ role: currentRole })
}

export async function POST(req: NextRequest) {
  // Demo role switching must never be reachable in production.
  if (!isDemoModeEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const { role } = await req.json()
    if (role !== "STUDENT" && role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    const cookieStore = await cookies()
    cookieStore.set("ts_demo_role", role, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
    })

    await logAuditAction({
      actorId: "demo-user",
      actorName: "Active Session",
      actorRole: role,
      action: "role.switch",
      resource: `role:${role}`,
      metadata: { targetRole: role },
    })

    return NextResponse.json({ success: true, role })
  } catch (error) {
    return NextResponse.json({ error: "Failed to set role" }, { status: 500 })
  }
}
