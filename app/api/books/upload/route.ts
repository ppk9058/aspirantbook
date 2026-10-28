import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { storeUpload, uploadErrorResponse } from "@/lib/security/upload-policy"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_PDF_BYTES = 50 * 1024 * 1024

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
    // A6: the folder is never user-controlled. It is derived from the asset kind.
    const wantsSample = String(formData.get("folder") || "").includes("sample")

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // 1. PDF uploads (sample or full)
    if (type === "pdf" || file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const stored = await storeUpload({
        file,
        buffer,
        category: "pdf",
        folder: wantsSample ? "books-sample" : "books-secure",
        maxBytes: MAX_PDF_BYTES,
        visibility: wantsSample ? "public" : "private",
      })

      return NextResponse.json({
        success: true,
        url: stored.url,
        filePath: stored.url,
        fileName: stored.fileName,
        fileSizeKb: stored.sizeKb,
        fileSizeMb: Number((stored.sizeKb / 1024).toFixed(2)),
        detectedPages: null,
      })
    }

    // 2. Cover / gallery images. SVG is rejected by the shared policy.
    const lower = file.name.toLowerCase()
    const looksLikeImage =
      ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) ||
      /\.(jpg|jpeg|png|webp|gif)$/.test(lower)
    if (!looksLikeImage) {
      return NextResponse.json(
        { error: "Invalid image file format. Supported: JPG, PNG, WEBP, GIF." },
        { status: 400 }
      )
    }

    const stored = await storeUpload({
      file,
      buffer,
      category: "image",
      folder: "books",
      maxBytes: MAX_IMAGE_BYTES,
    })

    return NextResponse.json({
      success: true,
      url: stored.url,
      fileName: stored.fileName,
      fileSizeKb: stored.sizeKb,
    })
  } catch (error: any) {
    console.error("POST /api/books/upload error:", error)
    const mapped = uploadErrorResponse(error)
    return NextResponse.json({ error: mapped.error }, { status: mapped.status })
  }
}
