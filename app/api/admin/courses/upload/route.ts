import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import fs from "fs/promises"
import path from "path"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied: Only Teachers and Admins can upload course materials" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const subFolder = (formData.get("folder") as string) || "assets"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const nameLower = file.name.toLowerCase()
    const isDoc = nameLower.endsWith(".pdf") || nameLower.endsWith(".doc") || nameLower.endsWith(".docx") || nameLower.endsWith(".ppt") || nameLower.endsWith(".pptx") || nameLower.endsWith(".txt")
    const isImage = nameLower.endsWith(".png") || nameLower.endsWith(".jpg") || nameLower.endsWith(".jpeg") || nameLower.endsWith(".webp")
    const isVideo = nameLower.endsWith(".mp4") || nameLower.endsWith(".webm") || nameLower.endsWith(".mov") || nameLower.endsWith(".mkv")

    if (!isDoc && !isImage && !isVideo) {
      return NextResponse.json({ error: "Unsupported file format. Please upload PDF, Word/Doc, Image, or Video files." }, { status: 400 })
    }

    // 250MB limit
    const MAX_SIZE = 250 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds 250 MB size limit." }, { status: 400 })
    }

    const timestamp = Date.now()
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const fileName = `${timestamp}-${cleanName}`

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "courses", subFolder)
    await fs.mkdir(uploadsDir, { recursive: true })
    const localFilePath = path.join(uploadsDir, fileName)

    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(localFilePath, buffer)

    const fileUrl = `/uploads/courses/${subFolder}/${fileName}`
    const fileSizeKb = Math.round(file.size / 1024)

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName: file.name,
      fileSizeKb,
      fileType: isVideo ? "VIDEO" : isDoc ? "DOCUMENT" : "IMAGE",
    })
  } catch (error: any) {
    console.error("POST /api/admin/courses/upload error:", error)
    return NextResponse.json({ error: error.message || "Failed to upload file" }, { status: 500 })
  }
}
