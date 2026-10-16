import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { isVerifiedSearchEngineCrawler } from "@/lib/authwall/bot-verify"
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

    // 2. Access Check: PAID papers require unlock or ADMIN/owner role
    if (paper.accessType === "PAID") {
      const isOwner = user.isAuthenticated && user.role === "TEACHER" && paper.creatorId === user.userId
      const isAdmin = user.isAuthenticated && user.role === "ADMIN"

      if (!isAdmin && !isOwner) {
        if (!user.isAuthenticated || !user.userId) {
          return NextResponse.json(
            { error: "Paid paper", unlockPrice: paper.unlockPrice },
            { status: 403 }
          )
        }

        const unlock = await prisma.pyqUnlock.findUnique({
          where: {
            userId_paperId: {
              userId: user.userId,
              paperId: paper.id,
            },
          },
        })

        if (!unlock) {
          return NextResponse.json(
            { error: "Paid paper", unlockPrice: paper.unlockPrice },
            { status: 403 }
          )
        }
      }
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

    // Determine filesystem path
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
      if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
        return NextResponse.redirect(targetUrl)
      }
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
      })
    }

    const safeTitle = paper.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60)
    const downloadFileName = `${safeTitle}${kind === "solution" ? "_Solution" : ""}.pdf`

    const disposition = isDownload
      ? `attachment; filename="${encodeURIComponent(downloadFileName)}"`
      : "inline"

    const cacheControl =
      paper.status === "PUBLISHED" && paper.accessType === "FREE"
        ? "public, max-age=3600"
        : "private, no-store"

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
