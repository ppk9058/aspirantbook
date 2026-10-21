import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { cookies } from "next/headers"
import {
  getExamPackageDetail,
  updateExamPackageGate,
  updateExamPackageDetails,
  deleteExamPackage,
} from "@/lib/exam-packages"
import { verifyMutationAuth } from "@/lib/exam/audit-helper"

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
    console.error("[GET /api/exam/series/packages/[id]] Error loading package detail:", error)
    return NextResponse.json({ error: error.message || "Failed to load package detail" }, { status: 500 })
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

    const authCheck = verifyMutationAuth({ session, demoRole })
    if (!authCheck.authorized || !authCheck.userId || !authCheck.role) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status || 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Package ID is required" }, { status: 400 })
    }

    const body = await req.json()

    // Determine if this is a general package edit or exclusively a gate-setting update
    const isMetadataEdit =
      body.title !== undefined ||
      body.slug !== undefined ||
      body.category !== undefined ||
      body.examName !== undefined ||
      body.description !== undefined ||
      body.thumbnailUrl !== undefined ||
      body.logoType !== undefined ||
      body.languages !== undefined ||
      body.highlights !== undefined ||
      body.isFree !== undefined ||
      body.isPro !== undefined ||
      body.isPublished !== undefined ||
      body.bannerUrl !== undefined ||
      body.syllabus !== undefined ||
      body.keyFeatures !== undefined ||
      body.whyThisSeries !== undefined

    if (isMetadataEdit) {
      const result = await updateExamPackageDetails({
        packageIdOrSlug: id,
        userId: authCheck.userId,
        role: authCheck.role,
        data: body,
        expectedUpdatedAt: body.expectedUpdatedAt,
      })

      if (result.status !== 200) {
        return NextResponse.json(
          { error: result.error || "Failed to update package details" },
          { status: result.status }
        )
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        package: result.data,
      })
    }

    // Otherwise, handle Authwall Gate settings
    const gateResult = await updateExamPackageGate({
      packageIdOrSlug: id,
      userId: authCheck.userId,
      role: authCheck.role,
      data: body,
    })

    if (gateResult.status !== 200) {
      return NextResponse.json(
        { error: gateResult.error || "Failed to update package gate" },
        { status: gateResult.status }
      )
    }

    return NextResponse.json({ success: true, data: gateResult.data })
  } catch (error: any) {
    console.error("[EXAM_PACKAGE_PATCH_ERROR]", error)
    return NextResponse.json({ error: error.message || "Failed to update package" }, { status: 500 })
  }
}

export async function DELETE(
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
      return NextResponse.json({ error: "Package ID is required" }, { status: 400 })
    }

    const result = await deleteExamPackage({
      packageIdOrSlug: id,
      userId: authCheck.userId,
      role: authCheck.role,
    })

    if (result.status !== 200) {
      return NextResponse.json({ error: result.error || "Failed to delete package" }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      action: (result.action || "").toLowerCase(),
      status: result.action,
      message: result.message,
    })
  } catch (error: any) {
    console.error("[EXAM_PACKAGE_DELETE_ERROR]", error)
    return NextResponse.json({ error: error.message || "Failed to delete package" }, { status: 500 })
  }
}
