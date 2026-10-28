import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { storeUpload, uploadErrorResponse } from "@/lib/security/upload-policy"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAX_SIZE = 50 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied: Only Teachers and Admins can upload PYQ documents" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Invalid file format. Only PDF files are permitted for PYQ papers." }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File size exceeds maximum allowed limit (50 MB)." }, { status: 413 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const stored = await storeUpload({
      file,
      buffer,
      category: "pdf",
      folder: "pyq-private",
      maxBytes: MAX_SIZE,
      visibility: "private",
    })

    return NextResponse.json({
      success: true,
      url: stored.url,
      fileName: stored.fileName,
      fileSizeKb: stored.sizeKb,
    })
  } catch (error: any) {
    console.error("POST /api/admin/pyqs/upload error:", error)
    const mapped = uploadErrorResponse(error)
    return NextResponse.json({ error: mapped.error }, { status: mapped.status })
  }
}
