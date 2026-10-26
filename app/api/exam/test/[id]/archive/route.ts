import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { cookies } from "next/headers"
import { toggleArchiveExamTest } from "@/lib/exam-tests"
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

    const body = await req.json()
    const isArchived = Boolean(body?.isArchived)

    const result = await toggleArchiveExamTest({
      testId: id,
      isArchived,
      userId: authCheck.userId,
      role: authCheck.role,
    })

    if (result.status !== 200) {
      return NextResponse.json({ error: result.error || "Failed to update test archive state" }, { status: result.status })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error: any) {
    console.error("[TEST_ARCHIVE_ROUTE_ERROR]", error)
    return NextResponse.json({ error: error.message || "Failed to update test archive state" }, { status: 500 })
  }
}
