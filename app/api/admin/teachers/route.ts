import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const teachers = await prisma.teacher.findMany({
      orderBy: { createdAt: "desc" },
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
    return NextResponse.json({ success: true, teachers })
  } catch (err: any) {
    console.error("GET /api/admin/teachers error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied: Only Admins can manage faculty" }, { status: 403 })
    }

    const body = await req.json()
    const { id, name, nameHi, role, roleHi, bio, bioHi, avatar, credentials, credentialsHi, courseIds } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Teacher name is required" }, { status: 400 })
    }

    const teacherData = {
      name: name.trim(),
      nameHi: nameHi?.trim() || null,
      role: role?.trim() || null,
      roleHi: roleHi?.trim() || null,
      bio: bio?.trim() || null,
      bioHi: bioHi?.trim() || null,
      avatar: avatar?.trim() || null,
      credentials: Array.isArray(credentials) ? credentials : [],
      credentialsHi: Array.isArray(credentialsHi) ? credentialsHi : [],
    }

    let teacher: any
    if (id) {
      teacher = await prisma.teacher.upsert({
        where: { id },
        update: teacherData,
        create: { id, ...teacherData },
      })
    } else {
      teacher = await prisma.teacher.create({
        data: teacherData,
      })
    }

    // Attach to courses if specified
    if (Array.isArray(courseIds)) {
      // Remove existing attachments that are not in courseIds
      await prisma.courseTeacher.deleteMany({
        where: {
          teacherId: teacher.id,
          courseId: { notIn: courseIds },
        },
      })

      // Add or retain attachments
      for (let i = 0; i < courseIds.length; i++) {
        const cId = courseIds[i]
        await prisma.courseTeacher.upsert({
          where: {
            courseId_teacherId: {
              courseId: cId,
              teacherId: teacher.id,
            },
          },
          update: {
            order: i,
            role: teacher.role,
            roleHi: teacher.roleHi,
          },
          create: {
            courseId: cId,
            teacherId: teacher.id,
            order: i,
            isPrimary: i === 0,
            role: teacher.role,
            roleHi: teacher.roleHi,
          },
        })
      }
    }

    // Revalidate paths
    try {
      revalidatePath("/courses")
      revalidatePath("/admin/courses")
      revalidatePath("/admin/courses/teachers")
    } catch {}

    const reloaded = await prisma.teacher.findUnique({
      where: { id: teacher.id },
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

    return NextResponse.json({ success: true, teacher: reloaded })
  } catch (err: any) {
    console.error("POST /api/admin/teachers error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
