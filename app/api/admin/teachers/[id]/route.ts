import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        courses: {
          include: {
            course: {
              select: { id: true, title: true, slug: true },
            },
          },
        },
      },
    })
    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, teacher })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()

    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name.trim()
    if (body.nameHi !== undefined) updateData.nameHi = body.nameHi ? body.nameHi.trim() : null
    if (body.role !== undefined) updateData.role = body.role ? body.role.trim() : null
    if (body.roleHi !== undefined) updateData.roleHi = body.roleHi ? body.roleHi.trim() : null
    if (body.bio !== undefined) updateData.bio = body.bio ? body.bio.trim() : null
    if (body.bioHi !== undefined) updateData.bioHi = body.bioHi ? body.bioHi.trim() : null
    if (body.avatar !== undefined) updateData.avatar = body.avatar ? body.avatar.trim() : null
    if (body.credentials !== undefined) updateData.credentials = body.credentials
    if (body.credentialsHi !== undefined) updateData.credentialsHi = body.credentialsHi

    const teacher = await prisma.teacher.update({
      where: { id },
      data: updateData,
      include: {
        courses: {
          include: {
            course: {
              select: { id: true, title: true, slug: true },
            },
          },
        },
      },
    })

    // If courseIds were provided, update attachments
    if (Array.isArray(body.courseIds)) {
      await prisma.courseTeacher.deleteMany({
        where: {
          teacherId: id,
          courseId: { notIn: body.courseIds },
        },
      })
      for (let i = 0; i < body.courseIds.length; i++) {
        const cId = body.courseIds[i]
        await prisma.courseTeacher.upsert({
          where: { courseId_teacherId: { courseId: cId, teacherId: id } },
          update: { order: i },
          create: { courseId: cId, teacherId: id, order: i, isPrimary: i === 0 },
        })
      }
    }

    try {
      revalidatePath("/courses")
      revalidatePath("/admin/courses")
      revalidatePath("/admin/courses/teachers")
      for (const ct of teacher.courses) {
        if (ct.course.slug) revalidatePath(`/courses/${ct.course.slug}`)
      }
    } catch {}

    return NextResponse.json({ success: true, teacher })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 })
    }

    const { id } = await params
    await prisma.teacher.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
