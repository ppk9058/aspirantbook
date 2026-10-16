import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { isVerifiedSearchEngineCrawler } from "@/lib/authwall/bot-verify"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month")
    const year = searchParams.get("year")
    const search = searchParams.get("search")

    const where: any = {
      status: "PUBLISHED",
    }

    if (month && !isNaN(Number(month))) {
      where.month = Number(month)
    }
    if (year && !isNaN(Number(year))) {
      where.year = Number(year)
    }
    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: "insensitive" } },
        { titleHi: { contains: search.trim(), mode: "insensitive" } },
      ]
    }

    const items = await prisma.currentAffairsPdf.findMany({
      where,
      orderBy: [
        { year: "desc" },
        { month: "desc" },
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        title: true,
        titleHi: true,
        month: true,
        year: true,
        pdfUrlEn: true,
        pdfUrlHi: true,
        fileSizeKbEn: true,
        fileSizeKbHi: true,
        status: true,
        downloadCount: true,
        createdAt: true,
        isGated: true,
        previewPercentage: true,
        seoMode: true,
        gateTitle: true,
        gateSubtitle: true,
      },
    })

    const session = await auth()
    const isAuthenticated = Boolean(session?.user?.id)
    const isBot = await isVerifiedSearchEngineCrawler(request.headers)

    const sanitizedItems = items.map((item) => {
      if (item.isGated && !isAuthenticated) {
        if (!(isBot && item.seoMode === "bot-full")) {
          return {
            ...item,
            pdfUrlEn: null,
            pdfUrlHi: null,
            isLockedForGuest: true,
          }
        }
      }
      return {
        ...item,
        isLockedForGuest: false,
      }
    })

    return NextResponse.json({ success: true, data: sanitizedItems }, {
      headers: !isAuthenticated
        ? {
            "Cache-Control": "private, no-store",
            "Vary": "Cookie, User-Agent",
          }
        : undefined,
    })
  } catch (error: any) {
    console.error("Error fetching public current affairs PDFs:", error)
    return NextResponse.json(
      { error: "Failed to load current affairs documents" },
      { status: 500 }
    )
  }
}
