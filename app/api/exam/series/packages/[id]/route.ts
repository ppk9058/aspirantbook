import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { cookies } from "next/headers"
import { getExamPackageDetail } from "@/lib/exam-packages"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Package ID is required" }, { status: 400 })
    }

    const result = await getExamPackageDetail({
      packageIdOrSlug: id,
      userId,
      role: effectiveRole,
    })

    if (result.status === 404) {
      return NextResponse.json({ error: result.error || "Package not found" }, { status: 404 })
    }

    if (result.status === 403) {
      return NextResponse.json(
        { error: result.error || "Forbidden: You do not have access to this package" },
        { status: 403 }
      )
    }

    return NextResponse.json({ success: true, package: result.data })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to load package detail" }, { status: 500 })
  }
}
