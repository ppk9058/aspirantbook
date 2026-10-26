import { NextResponse } from "next/server"
import { getPaperById, updatePaper, deletePaper } from "@/lib/pyqs-service"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { CACHE_TAGS, safeRevalidateTags } from "@/lib/cache-tags"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const paper = await getPaperById(id)
    if (!paper) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 })
    }
    return NextResponse.json(paper)
  } catch (error: any) {
    console.error("GET /api/admin/pyqs/papers/[id] error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch paper" }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied: Only Teachers and Admins can update papers" }, { status: 403 })
    }

    const { id } = await params
    const existing = await getPaperById(id)
    if (!existing) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 })
    }

    // Ownership check: Teacher can only edit their own papers; legacy null creatorId is admin-only
    if (user.role !== "ADMIN") {
      if (!existing.creatorId || existing.creatorId !== user.userId) {
        return NextResponse.json({ error: "Forbidden: You can only edit papers you created" }, { status: 403 })
      }
    }

    const body = await req.json()
    const updated = await updatePaper({ id, ...body })
    safeRevalidateTags(CACHE_TAGS.pyqs)
    return NextResponse.json(updated)
  } catch (error: any) {
    console.error("PUT /api/admin/pyqs/papers/[id] error:", error)
    return NextResponse.json({ error: error.message || "Failed to update paper" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied: Only Teachers and Admins can delete papers" }, { status: 403 })
    }

    const { id } = await params
    const existing = await getPaperById(id)
    if (!existing) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 })
    }

    // Ownership check: Teacher can only delete their own papers; legacy null creatorId is admin-only
    if (user.role !== "ADMIN") {
      if (!existing.creatorId || existing.creatorId !== user.userId) {
        return NextResponse.json({ error: "Forbidden: You can only delete papers you created" }, { status: 403 })
      }
    }

    await deletePaper(id)
    safeRevalidateTags(CACHE_TAGS.pyqs)
    return NextResponse.json({ success: true, message: "Paper deleted successfully" })
  } catch (error: any) {
    console.error("DELETE /api/admin/pyqs/papers/[id] error:", error)
    return NextResponse.json({ error: error.message || "Failed to delete paper" }, { status: 500 })
  }
}
