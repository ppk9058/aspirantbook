import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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
      },
    })

    return NextResponse.json({ success: true, data: items })
  } catch (error: any) {
    console.error("Error fetching public current affairs PDFs:", error)
    return NextResponse.json(
      { error: "Failed to load current affairs documents" },
      { status: 500 }
    )
  }
}
