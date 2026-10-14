import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import fs from "fs/promises"
import fsSync from "fs"
import path from "path"
import { Readable } from "stream"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const lang = searchParams.get("lang") === "hi" ? "hi" : "en"
    const isDownload = searchParams.get("download") === "1" || searchParams.get("download") === "true"

    const document = await prisma.currentAffairsPdf.findUnique({
      where: { id },
    })

    if (!document || document.status === "ARCHIVED") {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const user = await getCurrentUserContext()

    // 1. Status Check: DRAFT items can only be viewed/downloaded by ADMIN or creator TEACHER
    if (document.status === "DRAFT") {
      const isOwner = user.isAuthenticated && user.role === "TEACHER" && document.createdById === user.userId
      const isAdmin = user.isAuthenticated && user.role === "ADMIN"
      if (!isAdmin && !isOwner) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 })
      }
    }

    // 2. Download Check: downloads require authenticated user (guest gets 401)
    if (isDownload) {
      if (!user.isAuthenticated || !user.userId) {
        return NextResponse.json(
          { error: "Authentication required to download" },
          { status: 401 }
        )
      }
    }

    // 3. Select requested language file
    const targetUrl = lang === "hi" ? document.pdfUrlHi : document.pdfUrlEn
    if (!targetUrl) {
      return NextResponse.json(
        { error: `${lang === "hi" ? "Hindi" : "English"} PDF not available` },
        { status: 404 }
      )
    }

    // 4. Resolve filesystem path
    let resolvedFilePath = ""
    if (targetUrl.startsWith("/uploads/ca-private/") || targetUrl.startsWith("uploads/ca-private/")) {
      const base = path.basename(targetUrl)
      resolvedFilePath = path.join(process.cwd(), "uploads", "ca-private", base)
    } else if (path.isAbsolute(targetUrl)) {
      resolvedFilePath = targetUrl
    } else {
      resolvedFilePath = path.join(process.cwd(), "uploads", "ca-private", path.basename(targetUrl))
    }

    if (!fsSync.existsSync(resolvedFilePath)) {
      return NextResponse.json({ error: "File unavailable" }, { status: 404 })
    }

    const fileStat = await fs.stat(resolvedFilePath)

    // 5. Increment download count if requested
    if (isDownload) {
      await prisma.currentAffairsPdf.update({
        where: { id: document.id },
        data: { downloadCount: { increment: 1 } },
      })
    }

    const safeTitle = document.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60)
    const fileName = `${safeTitle}_${document.month}_${document.year}_${lang.toUpperCase()}.pdf`

    const disposition = isDownload
      ? `attachment; filename="${encodeURIComponent(fileName)}"`
      : `inline; filename="${encodeURIComponent(fileName)}"`

    const cacheControl = isDownload
      ? "private, no-cache, no-store, must-revalidate"
      : document.status === "PUBLISHED"
      ? "public, max-age=3600"
      : "private, no-store"

    const nodeStream = fsSync.createReadStream(resolvedFilePath)
    const webStream = Readable.toWeb(nodeStream)

    return new NextResponse(webStream as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": fileStat.size.toString(),
        "Content-Disposition": disposition,
        "Cache-Control": cacheControl,
      },
    })
  } catch (error: any) {
    console.error("Error serving Current Affairs file:", error)
    return NextResponse.json(
      { error: "Internal server error serving document" },
      { status: 500 }
    )
  }
}
