import { prisma } from "@/lib/prisma"
import { AdminTeacherManagerClient } from "./AdminTeacherManagerClient"

export const dynamic = "force-dynamic"

export default async function AdminTeachersPage() {
  const [teachers, courses] = await Promise.all([
    prisma.teacher.findMany({
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
    }),
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { title: "asc" },
      select: { id: true, title: true, slug: true },
    }),
  ])

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8">
      <AdminTeacherManagerClient initialTeachers={teachers as any} allCourses={courses} />
    </div>
  )
}
