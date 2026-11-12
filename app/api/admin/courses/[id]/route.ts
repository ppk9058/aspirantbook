import { NextResponse } from "next/server"
import { revalidatePath, revalidateTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { requireManagedCourse } from "@/lib/auth/course-access-server"
import { decideCourseDelete } from "@/lib/auth/course-access"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied: Only Teachers and Admins can update courses" }, { status: 403 })
    }

    const { id } = await params

    // A8: teachers may only modify their own courses.
    const access = await requireManagedCourse(user, id)
    if (access.response) return access.response

    const body = await req.json()

    const data: any = {}
    if (body.title !== undefined) data.title = body.title.trim()
    if (body.titleHi !== undefined) data.titleHi = body.titleHi ? body.titleHi.trim() : null
    if (body.subtitle !== undefined) data.subtitle = body.subtitle ? body.subtitle.trim() : null
    if (body.subtitleHi !== undefined) data.subtitleHi = body.subtitleHi ? body.subtitleHi.trim() : null
    if (body.descriptionHi !== undefined) data.descriptionHi = body.descriptionHi ? body.descriptionHi.trim() : null
    if (body.slug !== undefined) data.slug = body.slug.trim().toLowerCase().replace(/[^a-z0-9]/g, "-")
    if (body.technology !== undefined) data.technology = body.technology.trim()
    if (body.description !== undefined) data.description = body.description.trim()
    if (body.thumbnailUrl !== undefined) data.thumbnailUrl = body.thumbnailUrl
    if (body.price !== undefined) data.price = Number(body.price)
    if (body.originalPrice !== undefined) data.originalPrice = Number(body.originalPrice)
    if (body.discountPercent !== undefined) data.discountPercent = Number(body.discountPercent)
    if (body.couponCode !== undefined) data.couponCode = body.couponCode.trim().toUpperCase()
    if (body.couponDiscount !== undefined) data.couponDiscount = Number(body.couponDiscount)
    if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt.trim()
    if (body.hasTrialLesson !== undefined) data.hasTrialLesson = Boolean(body.hasTrialLesson)
    if (body.isPremium !== undefined) data.isPremium = Boolean(body.isPremium)
    if (body.status !== undefined) {
      if (body.status !== "DRAFT" && body.status !== "PUBLISHED" && body.status !== "ARCHIVED") {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 })
      }
      data.status = body.status
    }
    if (body.demoSettings !== undefined) {
      let currentMeta: any = {}
      if (data.metadataJson) {
        try { currentMeta = JSON.parse(data.metadataJson) } catch (e) {}
      } else {
        const existing = await prisma.course.findUnique({ where: { id }, select: { metadataJson: true } })
        try { currentMeta = JSON.parse(existing?.metadataJson || "{}") } catch (e) {}
      }
      if (!currentMeta || typeof currentMeta !== "object" || Array.isArray(currentMeta)) currentMeta = {}
      currentMeta.demoSettings = body.demoSettings
      data.metadataJson = JSON.stringify(currentMeta)
    } else if (body.metadataJson !== undefined) {
      const rawMeta = typeof body.metadataJson === "string" ? body.metadataJson : JSON.stringify(body.metadataJson)
      try {
        const parsedMeta = JSON.parse(rawMeta)
        if (!parsedMeta || typeof parsedMeta !== "object" || Array.isArray(parsedMeta)) {
          return NextResponse.json({ error: "metadataJson must be a JSON object" }, { status: 400 })
        }
        data.metadataJson = rawMeta
      } catch {
        return NextResponse.json({ error: "metadataJson must be valid JSON" }, { status: 400 })
      }
    }

    const updated = await prisma.course.update({
      where: { id },
      data,
    })

    try {
      revalidatePath("/courses")
      revalidatePath("/admin/courses")
      revalidateTag("courses")
      if (updated.slug) {
        revalidatePath(`/courses/${updated.slug}`)
      }
    } catch (e) {
      // Ignore cache revalidation errors
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error("PUT /api/admin/courses/[id] error:", error)
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A course with this slug already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied: Only Teachers and Admins can delete courses" }, { status: 403 })
    }

    const { id } = await params

    // A8: ownership check. Teachers may only delete their own courses.
    const access = await requireManagedCourse(user, id)
    if (access.response) return access.response

    // A8: never destroy a course that learners are enrolled in — archive it.
    if (decideCourseDelete(access.course.enrollmentRowCount) === "archive") {
      const archived = await prisma.course.update({
        where: { id },
        data: { status: "ARCHIVED", isPublished: false },
      })
      try {
        revalidatePath("/courses")
        revalidatePath("/admin/courses")
        revalidateTag("courses")
        revalidatePath(`/courses/${archived.slug}`)
      } catch (e) {
        // Ignore cache revalidation errors
      }
      return NextResponse.json({
        success: true,
        archived: true,
        message: "Course has enrolled learners, so it was archived instead of deleted",
      })
    }

    await prisma.course.delete({ where: { id } })
    try {
      revalidatePath("/courses")
      revalidatePath("/admin/courses")
      revalidateTag("courses")
    } catch (e) {
      // Ignore cache revalidation errors
    }
    return NextResponse.json({ success: true, archived: false, message: "Course deleted successfully" })
  } catch (error: any) {
    console.error("DELETE /api/admin/courses/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete course" }, { status: 500 })
  }
}
