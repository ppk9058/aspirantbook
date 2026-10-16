import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { getExamPackageDetail, updateExamPackageGate } from "@/lib/exam-packages"
import { logContentAudit } from "@/lib/actions/admin/audit"

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

export async function PATCH(
  req: NextRequest,
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

    const body = await req.json()

    const result = await updateExamPackageGate({
      packageIdOrSlug: id,
      userId,
      role: effectiveRole,
      data: body,
    })

    if (result.status !== 200) {
      return NextResponse.json({ error: result.error || "Failed to update package gate" }, { status: result.status })
    }

    revalidatePath(`/admin/test-series/package/${id}`)
    revalidatePath(`/teacher/test-series/package/${id}`)
    revalidatePath(`/test-series/${id}`)
    revalidatePath(`/test-series`)
    revalidatePath(`/current-affairs-quizzes`)

    await logContentAudit({
      entityId: id,
      entityType: "EXAM_SERIES",
      action: "UPDATE",
      details: {
        isGated: body.isGated,
        previewPercentage: body.previewPercentage,
        testsCount: Array.isArray(body.tests) ? body.tests.length : 0,
      },
    })

    return NextResponse.json({ success: true, data: result.data })
  } catch (error: any) {
    console.error("[EXAM_PACKAGE_PATCH_ERROR]", error)
    return NextResponse.json({ error: error.message || "Failed to update package gate" }, { status: 500 })
  }
}
