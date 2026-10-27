import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { storeUpload, uploadErrorResponse } from "@/lib/security/upload-policy"
import { updateBatch, getBatchBySlug, getBatchById } from "@/lib/batches-service"
import { requireManagedCourse } from "@/lib/auth/course-access-server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAX_SIZE = 15 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated) {
      return NextResponse.json(
        { error: "Unauthorized: Login required" },
        { status: 401 }
      )
    }
    if (user.role !== "ADMIN" && user.role !== "TEACHER") {
      return NextResponse.json(
        { error: "Access Denied: Only Admins and Teachers can upload teacher photos in Studio." },
        { status: 403 }
      )
    }

    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json({ error: "Invalid form data or no file provided" }, { status: 400 })
    }

    const file = formData.get("file") as File | null
    const courseId = formData.get("courseId") as string | null
    const teacherIndexStr = formData.get("teacherIndex") as string | null
    const teacherIndex = teacherIndexStr !== null ? parseInt(teacherIndexStr, 10) : null
    const batchSlug = formData.get("batchSlug") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const nameLower = file.name.toLowerCase()
    // SVG is deliberately excluded — it can carry executable script.
    const isImage =
      nameLower.endsWith(".png") ||
      nameLower.endsWith(".jpg") ||
      nameLower.endsWith(".jpeg") ||
      nameLower.endsWith(".webp")

    if (!isImage) {
      return NextResponse.json(
        { error: "Invalid file format. Please upload a PNG, JPG, or WEBP image." },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 15 MB size limit." },
        { status: 413 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const stored = await storeUpload({
      file,
      buffer,
      category: "image",
      folder: "teachers",
      maxBytes: MAX_SIZE,
    })
    const fileUrl = stored.url

    // If courseId and teacherIndex are provided, persist in database
    if (courseId && teacherIndex !== null && !isNaN(teacherIndex)) {
      // A8: teachers may only edit faculty on their own courses.
      const access = await requireManagedCourse(user, courseId)
      if (access.response) return access.response

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, slug: true, metadataJson: true },
      })

      if (!course) {
        return NextResponse.json({ error: "Course not found" }, { status: 404 })
      }

      let metadata: any = {}
      if (course.metadataJson) {
        try {
          metadata = JSON.parse(course.metadataJson)
        } catch (e) {
          metadata = {}
        }
      }

      if (!Array.isArray(metadata.teachers)) {
        metadata.teachers = []
      }

      if (metadata.teachers[teacherIndex]) {
        metadata.teachers[teacherIndex].avatar = fileUrl
      } else {
        metadata.teachers[teacherIndex] = {
          name: "Faculty Member",
          role: "Subject Expert",
          subject: "Course Instructor",
          experience: "5+ Years",
          qualification: "Senior Educator",
          avatar: fileUrl,
        }
      }

      await prisma.course.update({
        where: { id: courseId },
        data: { metadataJson: JSON.stringify(metadata) },
      })

      revalidatePath(`/courses/${course.slug}`)
      revalidatePath(`/admin/courses/${courseId}/edit`)
    }

    // If batchSlug is provided, persist through the database-backed batches
    // service (never a runtime file write).
    if (batchSlug && teacherIndex !== null && !isNaN(teacherIndex)) {
      const batch = (await getBatchBySlug(batchSlug)) || (await getBatchById(batchSlug))
      if (!batch) {
        return NextResponse.json({ error: "Batch not found" }, { status: 404 })
      }
      const teachers = Array.isArray(batch.teachers) ? [...batch.teachers] : []
      if (teachers[teacherIndex]) {
        teachers[teacherIndex] = { ...teachers[teacherIndex], avatar: fileUrl }
      } else {
        teachers[teacherIndex] = {
          name: "Faculty Member",
          role: "Subject Expert",
          subject: "Course Instructor",
          experience: "5+ Years",
          qualification: "Senior Educator",
          avatar: fileUrl,
        }
      }
      await updateBatch(batch.id, { teachers })
    }

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName: stored.fileName,
    })
  } catch (error: any) {
    console.error("POST /api/courses/teacher-photo-upload error:", error)
    const mapped = uploadErrorResponse(error)
    return NextResponse.json({ error: mapped.error }, { status: mapped.status })
  }
}
