import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { storeUpload, uploadErrorResponse } from "@/lib/security/upload-policy"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAX_SIZE = 250 * 1024 * 1024

function categoryFor(fileName: string): "pdf" | "image" | "video" | "dataset" {
  const lower = fileName.toLowerCase()
  if (/\.(png|jpe?g|webp|gif)$/.test(lower)) return "image"
  if (/\.(mp4|webm|mov|mkv)$/.test(lower)) return "video"
  if (/\.(txt|csv)$/.test(lower)) return "dataset"
  return "pdf"
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied: Only Teachers and Admins can upload course materials" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    // A6: fixed folder. A caller-supplied folder is ignored, so it can never
    // become a path segment.
    const folder = "courses"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Read the file once, with the hard cap enforced before any storage work.
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds 250 MB size limit." }, { status: 413 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const category = categoryFor(file.name)

    const stored = await storeUpload({
      file,
      buffer,
      category,
      folder,
      maxBytes: MAX_SIZE,
    })

    const fileType = category === "video" ? "VIDEO" : category === "image" ? "IMAGE" : "DOCUMENT"

    return NextResponse.json({
      success: true,
      url: stored.url,
      fileName: stored.fileName,
      fileSizeKb: stored.sizeKb,
      fileType,
    })
  } catch (error: any) {
    console.error("POST /api/admin/courses/upload error:", error)
    const mapped = uploadErrorResponse(error)
    return NextResponse.json({ error: mapped.error }, { status: mapped.status })
  }
}
