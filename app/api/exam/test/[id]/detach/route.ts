import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { cookies } from "next/headers"
import { detachExamTest } from "@/lib/exam-tests"
import { verifyMutationAuth } from "@/lib/exam/audit-helper"
import { getDemoRole } from "@/lib/auth/demo-role"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const cookieStore = await cookies()
    const demoRole = getDemoRole(cookieStore)

    const authCheck = verifyMutationAuth({ session, demoRole })
    if (!authCheck.authorized || !authCheck.userId || !authCheck.role) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status || 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Test ID is required" }, { status: 400 })
    }

    let body: any = {}
    try {
      body = await req.json()
    } catch {
      // Body is optional
    }

    const result = await detachExamTest({
      testId: id,
      packageIdOrSlug: body?.packageIdOrSlug,
      userId: authCheck.userId,
      role: authCheck.role,
    })

    if (result.status !== 200) {
      return NextResponse.json({ error: result.error || "Failed to detach test" }, { status: result.status })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error: any) {
    console.error("[TEST_DETACH_ROUTE_ERROR]", error)
    return NextResponse.json({ error: error.message || "Failed to detach test" }, { status: 500 })
  }
}
