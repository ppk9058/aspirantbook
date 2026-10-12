import { NextRequest, NextResponse } from "next/server"
import { getPaperById } from "@/lib/pyqs-service"
import { getCurrentUserContext } from "@/lib/auth/rbac"

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

    return NextResponse.json(paper)
  } catch (error: any) {
    console.error("GET /api/pyqs/[paperId] error:", error)
    return NextResponse.json(
      { error: "Internal server error fetching paper details" },
      { status: 500 }
    )
  }
}
