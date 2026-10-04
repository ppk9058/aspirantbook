import { NextResponse } from "next/server"
import { getAllBatches } from "@/lib/batches-service"

export const dynamic = "force-static"
export const revalidate = 60 // Cache for 60 seconds

export async function GET() {
  try {
    const batches = await getAllBatches()
    const liveBatches = batches.filter(
      (b) => b.badge?.toUpperCase().includes("LIVE") || (b.buttonLink && b.buttonLink.startsWith("/classroom/"))
    )

    const liveCount = liveBatches.length
    const primaryLive = liveBatches[0] || null

    return NextResponse.json({
      success: true,
      count: liveCount,
      liveClass: primaryLive
        ? {
            id: primaryLive.id,
            slug: primaryLive.slug,
            title: primaryLive.title,
            classroomUrl: primaryLive.buttonLink || `/classroom/${primaryLive.slug}`,
            badge: primaryLive.badge,
            teachers: (primaryLive.teachers || []).map((t) => t.name),
          }
        : null,
    })
  } catch (error) {
    return NextResponse.json({ success: false, count: 0, liveClass: null }, { status: 500 })
  }
}
