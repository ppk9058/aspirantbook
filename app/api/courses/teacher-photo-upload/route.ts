import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import fs from "fs/promises"
import path from "path"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json(
        { error: "Access Denied: Only Admins can upload teacher photos in Studio." },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const courseId = formData.get("courseId") as string | null
    const teacherIndexStr = formData.get("teacherIndex") as string | null
    const teacherIndex = teacherIndexStr !== null ? parseInt(teacherIndexStr, 10) : null
    const batchSlug = formData.get("batchSlug") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const nameLower = file.name.toLowerCase()
    const isImage =
      nameLower.endsWith(".png") ||
      nameLower.endsWith(".jpg") ||
      nameLower.endsWith(".jpeg") ||
      nameLower.endsWith(".webp") ||
      nameLower.endsWith(".svg")

    if (!isImage) {
      return NextResponse.json(
        { error: "Invalid file format. Please upload a PNG, JPG, WEBP, or SVG image." },
        { status: 400 }
      )
    }

    // Limit to 15MB
    const MAX_SIZE = 15 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 15 MB size limit." },
        { status: 400 }
      )
    }

    const timestamp = Date.now()
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const fileName = `${timestamp}-${cleanName}`

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "teachers")
    await fs.mkdir(uploadsDir, { recursive: true })
    const localFilePath = path.join(uploadsDir, fileName)

    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(localFilePath, buffer)

    const fileUrl = `/uploads/teachers/${fileName}`

    // If courseId and teacherIndex are provided, persist in database
    if (courseId && teacherIndex !== null && !isNaN(teacherIndex)) {
      try {
        const course = await prisma.course.findUnique({
          where: { id: courseId },
          select: { id: true, slug: true, metadataJson: true },
        })

        if (course) {
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

          try {
            revalidatePath(`/courses/${course.slug}`)
            revalidatePath(`/admin/courses/${courseId}/edit`)
          } catch {}
        }
      } catch (dbErr) {
        console.warn("Could not persist teacher avatar to database course record:", dbErr)
      }
    }

    // If batchSlug is provided, persist in batches.json
    if (batchSlug && teacherIndex !== null && !isNaN(teacherIndex)) {
      try {
        const batchesFilePath = path.join(process.cwd(), "data", "batches.json")
        const content = await fs.readFile(batchesFilePath, "utf-8")
        const batches = JSON.parse(content)
        const batch = batches.find((b: any) => b.slug === batchSlug || b.id === batchSlug)
        if (batch && Array.isArray(batch.teachers) && batch.teachers[teacherIndex]) {
          batch.teachers[teacherIndex].avatar = fileUrl
          batch.teachers[teacherIndex].image = fileUrl
          await fs.writeFile(batchesFilePath, JSON.stringify(batches, null, 2), "utf-8")
        }
      } catch (batchErr) {
        console.warn("Could not persist teacher avatar to batches.json:", batchErr)
      }
    }

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName: file.name,
    })
  } catch (error: any) {
    console.error("POST /api/courses/teacher-photo-upload error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to upload teacher photo" },
      { status: 500 }
    )
  }
}
