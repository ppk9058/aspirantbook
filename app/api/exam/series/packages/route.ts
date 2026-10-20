import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { cookies } from "next/headers"
import { listExamPackages } from "@/lib/exam-packages"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const cookieStore = await cookies()
    const demoRole = cookieStore.get("ts_demo_role")?.value
    const effectiveRole = session?.user?.role || demoRole
    const userId = session?.user?.id || (demoRole ? `demo-${demoRole.toLowerCase()}` : "")

    if (!session?.user?.id && !demoRole) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (effectiveRole !== "TEACHER" && effectiveRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Teacher or Admin access required" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const archivedParam = (searchParams.get("archived") || "ACTIVE").toUpperCase() as
      | "ACTIVE"
      | "ARCHIVED"
      | "ALL"

    const packages = await listExamPackages({
      userId,
      role: effectiveRole,
      archivedFilter: archivedParam,
    })

    return NextResponse.json({ success: true, packages })
  } catch (error: any) {
    console.error("[GET /api/exam/series/packages] Error listing packages:", error)
    return NextResponse.json({ error: error.message || "Failed to list packages" }, { status: 500 })
  }
}
