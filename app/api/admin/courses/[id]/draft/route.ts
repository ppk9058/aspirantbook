import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"

/**
 * POST /api/admin/courses/[id]/draft
 *
 * Dedicated server-side draft autosave endpoint:
 * - Saves in-progress draft state directly into the database row
 * - Preserves DRAFT status (never accidentally publishes)
 * - Returns server timestamp of the saved draft
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()

    const existing = await prisma.course.findUnique({
      where: { id },
      select: { id: true, metadataJson: true, status: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    let meta: any = {}
    try {
      meta = JSON.parse(existing.metadataJson || "{}")
    } catch (e) {
      meta = {}
    }

    // Merge draft data into metadataJson.serverDraft
    meta.serverDraft = {
      ...(meta.serverDraft || {}),
      ...(body.draft || {}),
      savedAt: new Date().toISOString(),
      savedBy: user.email,
    }

    // Update DB row: stays in DRAFT status, isPublished remains false unless explicitly published elsewhere
    const updated = await prisma.course.update({
      where: { id },
      data: {
        metadataJson: JSON.stringify(meta),
        ...(body.title ? { title: body.title.trim() } : {}),
        ...(body.subtitle ? { subtitle: body.subtitle.trim() } : {}),
      },
      select: {
        id: true,
        title: true,
        status: true,
        isPublished: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      savedAt: meta.serverDraft.savedAt,
      course: updated,
    })
  } catch (err: any) {
    console.error("POST /api/admin/courses/[id]/draft error:", err)
    return NextResponse.json({ error: err.message || "Failed to save draft" }, { status: 500 })
  }
}
