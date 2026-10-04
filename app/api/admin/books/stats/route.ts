import { NextResponse } from "next/server"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { getBookstoreStats } from "@/lib/books/bookService"

export async function GET() {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access Denied: Only Admins can view Online Bookstore analytics" },
        { status: 403 }
      )
    }

    const stats = await getBookstoreStats()
    return NextResponse.json({ success: true, data: stats })
  } catch (error: any) {
    console.error("GET /api/admin/books/stats error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch stats" }, { status: 500 })
  }
}
