import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { cookies } from "next/headers"
import { bulkManageTests } from "@/lib/exam-tests"
import { verifyMutationAuth } from "@/lib/exam/audit-helper"
import { getDemoRole } from "@/lib/auth/demo-role"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const cookieStore = await cookies()
    const demoRole = getDemoRole(cookieStore)

    const authCheck = verifyMutationAuth({ session, demoRole })
    if (!authCheck.authorized || !authCheck.userId || !authCheck.role) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status || 401 })
    }

    const body = await req.json()
    const { testIds, action, payload } = body

    if (!Array.isArray(testIds) || !action) {
      return NextResponse.json({ error: "testIds array and action are required" }, { status: 400 })
    }

    const result = await bulkManageTests({
      testIds,
      action,
      payload,
      userId: authCheck.userId,
      role: authCheck.role,
    })

    if (result.status !== 200) {
      return NextResponse.json({ error: result.error || "Bulk action failed" }, { status: result.status })
    }

    return NextResponse.json({ success: true, affected: result.affected })
  } catch (error: any) {
    console.error("[TEST_BULK_ROUTE_ERROR]", error)
    return NextResponse.json({ error: error.message || "Failed to process bulk action" }, { status: 500 })
  }
}
