import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { isVerifiedSearchEngineCrawler } from "@/lib/authwall/bot-verify"
import { checkPaperAccess, isPaperPaid } from "@/lib/pyqs/pyq-access"
import { extractPyqStorageKey } from "@/lib/pyqs/pyq-storage-key"
import { getPrivateFileSignedUrl } from "@/lib/s3"
import fs from "fs/promises"
import fsSync from "fs"
import path from "path"
import { Readable } from "stream"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paperId: string }> }
) {
  try {
    const { paperId } = await params
    const searchParams = request.nextUrl.searchParams
    const kind = searchParams.get("kind") === "solution" ? "solution" : "paper"
    const isDownload = searchParams.get("download") === "1" || searchParams.get("download") === "true"

    const paper = await prisma.pyqPaper.findUnique({
      where: { id: paperId },
      include: { category: true },
    })

    if (!paper) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 })
    }

    const user = await getCurrentUserContext()

    // 1. Status Check: DRAFT papers can only be viewed by ADMIN or creator TEACHER
    if (paper.status === "DRAFT") {
      const isOwner = user.isAuthenticated && user.role === "TEACHER" && paper.creatorId === user.userId
      const isAdmin = user.isAuthenticated && user.role === "ADMIN"
      if (!isAdmin && !isOwner) {
        return NextResponse.json({ error: "Paper not found" }, { status: 404 })
      }
    }

    // 2. Access Check: Paid papers require an active Pass, admin/owner, or legacy unlock
    const paperAccess = await checkPaperAccess({
      userId: user.userId,
      role: user.role,
      paper: {
        id: paper.id,
        accessType: paper.accessType,
        creatorId: paper.creatorId,
      },
    })

    if (!paperAccess.allowed) {
      if (paperAccess.reason === "LOGIN_REQUIRED") {
        return NextResponse.json(
          {
            error: "Login required",
            code: "LOGIN_REQUIRED",
            message: "Please log in to view this paper.",
            loginUrl: "/login",
          },
          { status: 403 }
        )
      }

      return NextResponse.json(
        {
          error: "Pass required",
          code: "PASS_REQUIRED",
          message: "This paper needs the AspirantBook Pass.",
          checkoutUrl: "/pricing",
        },
        { status: 403 }
      )
    }

    // 3. Authwall Gate Check: Gated papers require authentication unless crawler in bot-full mode
    if (paper.isGated && (!user.isAuthenticated || !user.userId)) {
      const isBot = await isVerifiedSearchEngineCrawler(request.headers)
      if (!(isBot && paper.seoMode === "bot-full")) {
        return NextResponse.json(
          {
            error: "Gated document: Please sign in to read or download this PYQ paper",
            isLockedForGuest: true,
            previewPercentage: paper.previewPercentage,
            gateTitle: paper.gateTitle,
            gateSubtitle: paper.gateSubtitle,
          },
          {
            status: 403,
            headers: {
              "Cache-Control": "private, no-store",
              "Vary": "Cookie, User-Agent",
            },
          }
        )
      }
    }

    // Target file URL
    const targetUrl = kind === "solution" ? paper.solutionPdfUrl : paper.paperPdfUrl

    if (!targetUrl) {
      return NextResponse.json(
        { error: kind === "solution" ? "Solution PDF not available" : "Paper PDF not available" },
        { status: 404 }
      )
    }

    const safeTitle = paper.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60)
    const downloadFileName = `${safeTitle}${kind === "solution" ? "_Solution" : ""}.pdf`

    const disposition = isDownload
      ? `attachment; filename="${encodeURIComponent(downloadFileName)}"`
      : `inline; filename="${encodeURIComponent(downloadFileName)}"`

    // 1. S3 / Cloudflare R2 Remote Storage Branch
    // Stored URLs may be virtual-hosted or path-style URLs, or already relative keys
    const isRemote =
      targetUrl.startsWith("http://") ||
      targetUrl.startsWith("https://") ||
      targetUrl.startsWith("pyq-private/")

    if (isRemote) {
      const storageKey = extractPyqStorageKey(targetUrl)
      if (!storageKey) {
        return NextResponse.json({ error: "File not found on storage" }, { status: 404 })
      }

      // Increment download count before redirect
      if (isDownload) {
        await prisma.pyqPaper.update({
          where: { id: paper.id },
          data: { downloadCount: { increment: 1 } },
        }).catch((err) => console.error("Failed to increment download count:", err))
      }

      const signedUrl = await getPrivateFileSignedUrl(storageKey, 60, {
        contentDisposition: disposition,
      })

      return new NextResponse(null, {
        status: 302,
        headers: {
          Location: signedUrl,
          "Cache-Control": "private, no-store, no-cache, must-revalidate",
        },
      })
    }

    // 2. Local Filesystem Storage Fallback (/uploads/...)
    let filePath = ""
    if (targetUrl.startsWith("/uploads/pyq-private/")) {
      const rel = targetUrl.replace(/^\/uploads\/pyq-private\//, "")
      filePath = path.join(process.cwd(), "uploads", "pyq-private", path.basename(rel))
    } else if (targetUrl.startsWith("/uploads/pyq/")) {
      const rel = targetUrl.replace(/^\/uploads\/pyq\//, "")
      filePath = path.join(process.cwd(), "public", "uploads", "pyq", path.basename(rel))
    } else if (targetUrl.startsWith("/uploads/")) {
      const rel = targetUrl.replace(/^\/uploads\//, "")
      const p1 = path.join(process.cwd(), "uploads", "pyq-private", path.basename(rel))
      const p2 = path.join(process.cwd(), "public", "uploads", path.basename(rel))
      filePath = fsSync.existsSync(p1) ? p1 : p2
    } else {
      filePath = path.join(process.cwd(), "uploads", "pyq-private", path.basename(targetUrl))
    }

    if (!fsSync.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found on storage" }, { status: 404 })
    }

    const fileStat = await fs.stat(filePath)

    // Increment download count if requested
    if (isDownload) {
      await prisma.pyqPaper.update({
        where: { id: paper.id },
        data: { downloadCount: { increment: 1 } },
      }).catch((err) => console.error("Failed to increment download count:", err))
    }

    // Paid papers must never get "public" Cache-Control
    const cacheControl =
      paper.status === "PUBLISHED" && !isPaperPaid(paper.accessType)
        ? "public, max-age=3600"
        : "private, no-store, no-cache, must-revalidate"

    const nodeStream = fsSync.createReadStream(filePath)
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
    console.error("Error serving PYQ file:", error)
    return NextResponse.json(
      { error: "Internal server error serving document" },
      { status: 500 }
    )
  }
}
