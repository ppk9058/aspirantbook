import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import fs from "fs/promises"
import path from "path"

import { atomicWriteJson, safeReadJson } from "@/lib/books/storage"

const WISHLIST_FILE = path.join(process.cwd(), "data", "book-wishlist.json")

interface WishlistStore {
  [userId: string]: string[] // array of book IDs
}

async function getWishlistData(): Promise<WishlistStore> {
  return safeReadJson<WishlistStore>(WISHLIST_FILE, {})
}

async function saveWishlistData(data: WishlistStore) {
  await atomicWriteJson(WISHLIST_FILE, data)
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserContext()
    const userId = user.userId
    if (!user.isAuthenticated || !userId) {
      return NextResponse.json({ success: true, bookIds: [] })
    }

    const data = await getWishlistData()
    const bookIds = data[userId] || []
    return NextResponse.json({ success: true, bookIds })
  } catch (error: any) {
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

    const data = await getWishlistData()
    let userList = new Set<string>(data[userId] || [])

    if (Array.isArray(bookIds)) {
      // Bulk sync from localStorage
      bookIds.forEach((id: string) => userList.add(id))
    } else if (bookId) {
      if (action === "remove") {
        userList.delete(bookId)
      } else {
        userList.add(bookId)
      }
    }

    data[userId] = Array.from(userList)
    await saveWishlistData(data)

    return NextResponse.json({ success: true, bookIds: data[userId] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update wishlist" }, { status: 500 })
  }
}
