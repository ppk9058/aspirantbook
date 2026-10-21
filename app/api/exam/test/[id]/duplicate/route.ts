import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { cookies } from "next/headers"
import { duplicateExamTest } from "@/lib/exam-tests"
import { verifyMutationAuth } from "@/lib/exam/audit-helper"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const cookieStore = await cookies()
    const demoRole = cookieStore.get("ts_demo_role")?.value

    const authCheck = verifyMutationAuth({ session, demoRole })
    if (!authCheck.authorized || !authCheck.userId || !authCheck.role) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status || 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Test ID is required" }, { status: 400 })
    }

    const result = await duplicateExamTest({
      testId: id,
      userId: authCheck.userId,
      role: authCheck.role,
    })

    if (result.status !== 200) {
      return NextResponse.json({ error: result.error || "Failed to duplicate test" }, { status: result.status })
    }

    return NextResponse.json({ success: true, data: result.data, test: result.data })
  } catch (error: any) {
    console.error("[TEST_DUPLICATE_ROUTE_ERROR]", error)
    return NextResponse.json({ error: error.message || "Failed to duplicate test" }, { status: 500 })
  }
}
