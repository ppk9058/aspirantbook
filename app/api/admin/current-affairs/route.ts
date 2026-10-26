import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { CACHE_TAGS, safeRevalidateTags } from "@/lib/cache-tags"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json(
        { error: "Access Denied: Only Teachers and Admins can view Current Affairs studio" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month")
    const year = searchParams.get("year")
    const status = searchParams.get("status")

    const where: any = {
      status: status ? status : { not: "ARCHIVED" },
    }

    // Role-based filtering:
    // Teachers only see their own items (legacy null createdById is ADMIN only)
    if (user.role === "TEACHER") {
      where.createdById = user.userId
    }

    if (month && !isNaN(Number(month))) {
      where.month = Number(month)
    }
    if (year && !isNaN(Number(year))) {
      where.year = Number(year)
    }

    const items = await prisma.currentAffairsPdf.findMany({
      where,
      orderBy: [
        { year: "desc" },
        { month: "desc" },
        { createdAt: "desc" },
      ],
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

    return NextResponse.json({ success: true, data: items })
  } catch (error: any) {
    console.error("Error fetching Current Affairs PDFs:", error)
    return NextResponse.json(
      { error: "Internal server error fetching documents" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json(
        { error: "Access Denied: Only Teachers and Admins can create Current Affairs documents" },
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

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const parsedMonth = Number(month)
    if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      return NextResponse.json(
        { error: "Valid month between 1 and 12 is required" },
        { status: 400 }
      )
    }

    const parsedYear = Number(year)
    if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      return NextResponse.json({ error: "Valid year is required" }, { status: 400 })
    }

    if (!pdfUrlEn && !pdfUrlHi) {
      return NextResponse.json(
        { error: "At least one PDF file (English or Hindi) is required" },
        { status: 400 }
      )
    }

    const initialStatus = status === "DRAFT" ? "DRAFT" : "PUBLISHED"

    const created = await prisma.currentAffairsPdf.create({
      data: {
        title: title.trim(),
        titleHi: titleHi && typeof titleHi === "string" ? titleHi.trim() : null,
        month: parsedMonth,
        year: parsedYear,
        pdfUrlEn: pdfUrlEn || null,
        pdfUrlHi: pdfUrlHi || null,
        fileSizeKbEn: fileSizeKbEn ? Number(fileSizeKbEn) : null,
        fileSizeKbHi: fileSizeKbHi ? Number(fileSizeKbHi) : null,
        status: initialStatus,
        createdById: user.userId,
        isGated: Boolean(isGated),
        previewPercentage: previewPercentage !== undefined ? Math.max(0, Math.min(100, Math.round(Number(previewPercentage)))) : 20,
        seoMode: seoMode === "bot-full" ? "bot-full" : "preview",
        gateTitle: gateTitle ? String(gateTitle).trim() : null,
        gateSubtitle: gateSubtitle ? String(gateSubtitle).trim() : null,
      },
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

    safeRevalidateTags(CACHE_TAGS.currentAffairs)
    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating Current Affairs PDF:", error)
    return NextResponse.json(
      { error: "Internal server error creating document" },
      { status: 500 }
    )
  }
}
