import { NextRequest, NextResponse } from "next/server"
import { getPaperById } from "@/lib/pyqs-service"
import { getCurrentUserContext } from "@/lib/auth/rbac"

import { resolveAccess } from "@/lib/authwall/resolveAccess"
import { isVerifiedSearchEngineCrawler } from "@/lib/authwall/bot-verify"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paperId: string }> }
) {
  try {
    const { paperId } = await params
    const paper = await getPaperById(paperId)

    if (!paper) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 })
    }

    const user = await getCurrentUserContext()

    // Status check: DRAFT papers are invisible to guests and unauthorized students
    if (paper.status === "DRAFT") {
      const isOwner = user.isAuthenticated && user.role === "TEACHER" && paper.creatorId === user.userId
      const isAdmin = user.isAuthenticated && user.role === "ADMIN"
      if (!isAdmin && !isOwner) {
        return NextResponse.json({ error: "Paper not found" }, { status: 404 })
      }
    }

    // Authwall check
    const isBot = await isVerifiedSearchEngineCrawler(request.headers)
    const isOwner = Boolean(user.isAuthenticated && user.role === "TEACHER" && paper.creatorId === user.userId)
    const isAdmin = Boolean(user.isAuthenticated && user.role === "ADMIN")

    const access = resolveAccess({
      viewer: {
        userId: user.userId || null,
        role: user.role || null,
        isVerifiedBot: isBot,
      },
      content: [paper.title, paper.subject, paper.year, paper.stage].filter(Boolean),
      containerGate: paper,
      isOwner,
    })

    if (access.isLockedForGuest) {
      const sanitizedPaper = {
        ...paper,
        paperPdfUrl: null,
        solutionPdfUrl: null,
        isLockedForGuest: true,
        previewPercentage: access.effectivePercentage,
        gateTitle: access.gateTitle,
        gateSubtitle: access.gateSubtitle,
      }
      return NextResponse.json(sanitizedPaper, {
        headers: {
          "Cache-Control": "private, no-store",
          "Vary": "Cookie, User-Agent",
        },
      })
    }

    return NextResponse.json(paper)
  } catch (error: any) {
    console.error("GET /api/pyqs/[paperId] error:", error)
    return NextResponse.json(
      { error: "Internal server error fetching paper details" },
      { status: 500 }
    )
  }
}
