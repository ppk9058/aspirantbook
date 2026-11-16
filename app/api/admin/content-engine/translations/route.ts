import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** GET /api/admin/content-engine/translations?lang=hi&reviewed=false&take=50 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUserContext()
  if (!user.isAuthenticated || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Access Denied: Admin role required for Content Engine Studio" },
      { status: 403 },
    )
  }
  try {
    const { searchParams } = new URL(req.url)
    const reviewedParam = searchParams.get("reviewed")
    const reviewed = reviewedParam === null ? undefined : reviewedParam === "true"
    const take = Math.min(Number.parseInt(searchParams.get("take") || "50", 10) || 50, 200)

    const translations = await prisma.contentEngineTranslation.findMany({
      where: {
        lang: "hi",
        ...(reviewed === undefined ? {} : { isReviewed: reviewed }),
      },
      orderBy: { updatedAt: "desc" },
      take,
      select: {
        id: true,
        lang: true,
        q: true,
        options: true,
        answer: true,
        solution: true,
        isReviewed: true,
        updatedAt: true,
        question: {
          select: {
            shortId: true,
            q: true,
            answer: true,
            sub: true,
            top: true,
            exam: true,
            year: true,
          },
        },
      },
    })
    const pendingCount = await prisma.contentEngineTranslation.count({
      where: { lang: "hi", isReviewed: false },
    })
    return NextResponse.json({ translations, pendingCount })
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to load translations", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
