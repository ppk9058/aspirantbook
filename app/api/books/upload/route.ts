import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { savePdfFile } from "@/lib/upload/pdf-storage"
import fs from "fs/promises"
import path from "path"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json(
        { error: "Access Denied: Only Teachers and Admins can upload Book assets" },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const type = (formData.get("type") as string) || "pdf"
    const folder = (formData.get("folder") as string) || "books"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // 1. PDF Upload handling
    if (type === "pdf" || file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const isSample = folder.includes("sample")
      // Sample PDFs can be stored in public/uploads/books-sample, full PDFs in uploads/books-secure
      const subFolder = isSample ? "books-sample" : "books-secure"
      const result = await savePdfFile(file, subFolder, isSample)

      return NextResponse.json({
        success: true,
        url: result.url,
        filePath: result.filePath,
        fileName: result.fileName,
        fileSizeKb: result.fileSizeKb,
        fileSizeMb: result.fileSizeMb,
        detectedPages: result.detectedPages,
      })
    }

    // 2. Image Upload handling (Cover & gallery images)
    const validImageTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"]
    const isImage = validImageTypes.includes(file.type) || /\.(jpg|jpeg|png|webp|svg)$/i.test(file.name)

    if (!isImage) {
      return NextResponse.json(
        { error: "Invalid image file format. Supported: JPG, PNG, WEBP, SVG." },
        { status: 400 }
      )
    }

    // Max 10MB for images
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Image size exceeds 10 MB limit." }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const timestamp = Date.now()
    const ext = path.extname(file.name) || ".png"
    const safeBase = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 50)
    const imageName = `${timestamp}-${safeBase}${ext}`

    const publicImagesDir = path.join(process.cwd(), "public", "images", "books")
    await fs.mkdir(publicImagesDir, { recursive: true })
    const localImgPath = path.join(publicImagesDir, imageName)
    await fs.writeFile(localImgPath, buffer)

    const imgUrl = `/images/books/${imageName}`

    return NextResponse.json({
      success: true,
      url: imgUrl,
      fileName: file.name,
      fileSizeKb: Math.round(file.size / 1024),
    })
  } catch (error: any) {
    console.error("POST /api/books/upload error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process asset upload" },
      { status: 500 }
    )
  }
}
