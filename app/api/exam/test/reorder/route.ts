import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { cookies } from "next/headers"
import { reorderPackageTests } from "@/lib/exam-tests"
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
    const { packageIdOrSlug, testIdsInOrder } = body

    if (!packageIdOrSlug || !Array.isArray(testIdsInOrder)) {
      return NextResponse.json(
        { error: "packageIdOrSlug and testIdsInOrder array are required" },
        { status: 400 }
      )
    }

    const result = await reorderPackageTests({
      packageIdOrSlug,
      testIdsInOrder,
      userId: authCheck.userId,
      role: authCheck.role,
    })

    if (result.status !== 200) {
      return NextResponse.json({ error: result.error || "Reorder failed" }, { status: result.status })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[TEST_REORDER_ROUTE_ERROR]", error)
    return NextResponse.json({ error: error.message || "Failed to reorder tests" }, { status: 500 })
  }
}
