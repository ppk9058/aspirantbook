import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { cookies } from "next/headers"
import { exportTestsCsv } from "@/lib/exam-tests"
import { verifyMutationAuth } from "@/lib/exam/audit-helper"

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    const cookieStore = await cookies()
    const demoRole = cookieStore.get("ts_demo_role")?.value

    const authCheck = verifyMutationAuth({ session, demoRole })
    if (!authCheck.authorized || !authCheck.userId || !authCheck.role) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status || 401 })
    }

    const result = await exportTestsCsv({
      userId: authCheck.userId,
      role: authCheck.role,
    })

    if (result.status !== 200 || !result.csv) {
      return NextResponse.json({ error: result.error || "Failed to export CSV" }, { status: result.status })
    }

    return new NextResponse(result.csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="trillionskill-tests-export-${Date.now()}.csv"`,
      },
    })
  } catch (error: any) {
    console.error("[TEST_EXPORT_ROUTE_ERROR]", error)
    return NextResponse.json({ error: error.message || "Failed to export tests" }, { status: 500 })
  }
}
