import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json(
        { error: "Access Denied: Only Teachers and Admins can access this document" },
        { status: 403 }
      )
    }

    const item = await prisma.currentAffairsPdf.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!item || item.status === "ARCHIVED") {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Role-based ownership check:
    // Teachers can only view their own items (legacy null createdById is ADMIN only)
    if (user.role === "TEACHER" && item.createdById !== user.userId) {
      return NextResponse.json(
        { error: "Access Denied: You do not have permission to view this document" },
        { status: 403 }
      )
    }

    return NextResponse.json({ success: true, data: item })
  } catch (error: any) {
    console.error("Error fetching Current Affairs PDF:", error)
    return NextResponse.json(
      { error: "Internal server error fetching document" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json(
        { error: "Access Denied: Only Teachers and Admins can update this document" },
        { status: 403 }
      )
    }

    const existing = await prisma.currentAffairsPdf.findUnique({
      where: { id },
    })

    if (!existing || existing.status === "ARCHIVED") {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Role-based ownership check:
    // Teachers can only update their own items (legacy null createdById is ADMIN only)
    if (user.role === "TEACHER" && existing.createdById !== user.userId) {
      return NextResponse.json(
        { error: "Access Denied: You can only edit your own documents" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      title,
      titleHi,
      month,
      year,
      status,
      pdfUrlEn,
      pdfUrlHi,
      fileSizeKbEn,
      fileSizeKbHi,
      isGated,
      previewPercentage,
      seoMode,
      gateTitle,
      gateSubtitle,
    } = body

    const updateData: any = {}

    if (isGated !== undefined) updateData.isGated = Boolean(isGated)
    if (previewPercentage !== undefined) updateData.previewPercentage = Math.max(0, Math.min(100, Math.round(Number(previewPercentage))))
    if (seoMode !== undefined) updateData.seoMode = seoMode === "bot-full" ? "bot-full" : "preview"
    if (gateTitle !== undefined) updateData.gateTitle = gateTitle ? String(gateTitle).trim() : null
    if (gateSubtitle !== undefined) updateData.gateSubtitle = gateSubtitle ? String(gateSubtitle).trim() : null

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 })
      }
      updateData.title = title.trim()
    }

    if (titleHi !== undefined) {
      updateData.titleHi = titleHi && typeof titleHi === "string" ? titleHi.trim() : null
    }

    if (month !== undefined) {
      const parsedMonth = Number(month)
      if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
        return NextResponse.json({ error: "Month must be between 1 and 12" }, { status: 400 })
      }
      updateData.month = parsedMonth
    }

    if (year !== undefined) {
      const parsedYear = Number(year)
      if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
        return NextResponse.json({ error: "Valid year is required" }, { status: 400 })
      }
      updateData.year = parsedYear
    }

    if (status !== undefined) {
      if (!["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 })
      }
      updateData.status = status
    }

    if (pdfUrlEn !== undefined) {
      updateData.pdfUrlEn = pdfUrlEn || null
    }

    if (pdfUrlHi !== undefined) {
      updateData.pdfUrlHi = pdfUrlHi || null
    }

    if (fileSizeKbEn !== undefined) {
      updateData.fileSizeKbEn = fileSizeKbEn ? Number(fileSizeKbEn) : null
    }

    if (fileSizeKbHi !== undefined) {
      updateData.fileSizeKbHi = fileSizeKbHi ? Number(fileSizeKbHi) : null
    }

    const updated = await prisma.currentAffairsPdf.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error("Error updating Current Affairs PDF:", error)
    return NextResponse.json(
      { error: "Internal server error updating document" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json(
        { error: "Access Denied: Only Teachers and Admins can archive documents" },
        { status: 403 }
      )
    }

    const existing = await prisma.currentAffairsPdf.findUnique({
      where: { id },
    })

    if (!existing || existing.status === "ARCHIVED") {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Role-based ownership check:
    // Teachers can only archive their own items (legacy null createdById is ADMIN only)
    if (user.role === "TEACHER" && existing.createdById !== user.userId) {
      return NextResponse.json(
        { error: "Access Denied: You can only archive your own documents" },
        { status: 403 }
      )
    }

    // Soft delete only - never delete from DB or disk
    const updated = await prisma.currentAffairsPdf.update({
      where: { id },
      data: { status: "ARCHIVED" },
    })

    return NextResponse.json({
      success: true,
      message: "Document archived successfully",
      data: updated,
    })
  } catch (error: any) {
    console.error("Error archiving Current Affairs PDF:", error)
    return NextResponse.json(
      { error: "Internal server error archiving document" },
      { status: 500 }
    )
  }
}
