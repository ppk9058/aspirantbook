import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { getAuditLogs } from "@/lib/audit/audit-logger"

export async function GET(request: NextRequest) {
  try {
    const userContext = await getCurrentUserContext()
    if (userContext.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Requires ADMIN role" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get("limit") || 50)
    const logs = await getAuditLogs(limit)

    return NextResponse.json({ success: true, logs })
  } catch (error: any) {
    console.error("GET /api/admin/audit error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch audit logs" }, { status: 500 })
  }
}
