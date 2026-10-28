import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { prisma } from "@/lib/prisma"

// S5: the wishlist used to live in data/book-wishlist.json (one row per user in
// a shared file, read-modify-written on every request), so two users adding a
// book at the same time could lose one entry and nothing survived a redeploy.
// It is now one row per (userId, bookId) with a unique constraint.

async function listBookIds(userId: string): Promise<string[]> {
  const rows = await prisma.bookWishlistItem.findMany({
    where: { userId },
    orderBy: [{ createdAt: "asc" }, { bookId: "asc" }],
    select: { bookId: true },
  })
  return rows.map((row) => row.bookId)
}

export async function GET() {
  try {
    const user = await getCurrentUserContext()
    const userId = user.userId
    if (!user.isAuthenticated || !userId) {
      return NextResponse.json({ success: true, bookIds: [] })
    }

    return NextResponse.json({ success: true, bookIds: await listBookIds(userId) })
  } catch (error: any) {
    console.error("GET /api/books/wishlist failed:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch wishlist" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserContext()
    const userId = user.userId
    if (!user.isAuthenticated || !userId) {
      return NextResponse.json({ success: true, synced: false })
    }

    const body = await req.json()
    const { bookId, action, bookIds } = body

    if (Array.isArray(bookIds)) {
      // Bulk sync from localStorage. createMany + skipDuplicates is a single
      // statement, so concurrent syncs cannot lose rows.
      const uniqueIds = Array.from(
        new Set(bookIds.filter((id: unknown): id is string => typeof id === "string" && id.length > 0))
      )
      if (uniqueIds.length > 0) {
        await prisma.bookWishlistItem.createMany({
          data: uniqueIds.map((id) => ({ userId, bookId: id })),
          skipDuplicates: true,
        })
      }
    } else if (typeof bookId === "string" && bookId.length > 0) {
      if (action === "remove") {
        await prisma.bookWishlistItem.deleteMany({ where: { userId, bookId } })
      } else {
        await prisma.bookWishlistItem.createMany({
          data: [{ userId, bookId }],
          skipDuplicates: true,
        })
      }
    }

    return NextResponse.json({ success: true, bookIds: await listBookIds(userId) })
  } catch (error: any) {
    console.error("POST /api/books/wishlist failed:", error)
    return NextResponse.json({ error: error.message || "Failed to update wishlist" }, { status: 500 })
  }
}
