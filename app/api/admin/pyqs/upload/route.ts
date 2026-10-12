import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import fs from "fs/promises"
import path from "path"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied: Only Teachers and Admins can upload PYQ documents" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const subDirectory = (formData.get("folder") as string) || "pyq"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate mime type and extension
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    if (!isPdf) {
      return NextResponse.json({ error: "Invalid file format. Only PDF files are permitted for PYQ papers." }, { status: 400 })
    }

    // Maximum 50MB
    const MAX_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File size exceeds maximum allowed limit (50 MB)." }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Validate PDF magic bytes: PDF files start with "%PDF-" (0x25 0x50 0x44 0x46)
    if (buffer.length < 5 || buffer.toString("utf8", 0, 4) !== "%PDF") {
      return NextResponse.json({ error: "Invalid file content. The file does not have a valid PDF signature." }, { status: 400 })
    }

    const timestamp = Date.now()
    // Sanitize filename to strict safe characters
    const safeBaseName = file.name
      .replace(/\.[^/.]+$/, "") // strip extension
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 80)
    const fileName = `${timestamp}-${safeBaseName || "document"}.pdf`

    // Store in uploads directory (stored in private uploads directory when requested or default uploads)
    const uploadsDir = path.join(process.cwd(), "uploads", "pyq-private")
    await fs.mkdir(uploadsDir, { recursive: true })
    const localFilePath = path.join(uploadsDir, fileName)

    await fs.writeFile(localFilePath, buffer)

    const fileUrl = `/uploads/pyq-private/${fileName}`
    const fileSizeKb = Math.round(file.size / 1024)

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName: file.name,
      fileSizeKb,
    })
  } catch (error: any) {
    console.error("POST /api/admin/pyqs/upload error:", error)
    return NextResponse.json({ error: error.message || "Failed to upload PDF file" }, { status: 500 })
  }
}
