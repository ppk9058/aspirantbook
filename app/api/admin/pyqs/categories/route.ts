import { NextResponse } from "next/server"
import { getAllCategories, createCategory } from "@/lib/pyqs-service"
import { getCurrentUserContext } from "@/lib/auth/rbac"

export async function GET() {
  try {
    const categories = await getAllCategories(true)
    return NextResponse.json(categories)
  } catch (error: any) {
    console.error("GET /api/admin/pyqs/categories error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch categories" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied: Only Teachers and Admins can create exam categories" }, { status: 403 })
    }

    const body = await req.json()
    if (!body.name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 })
    }

    const created = await createCategory(body)
    return NextResponse.json(created, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/admin/pyqs/categories error:", error)
    const status = error.message?.includes("FORBIDDEN") ? 403 : error.message?.includes("UNAUTHORIZED") ? 401 : 500
    return NextResponse.json({ error: error.message || "Failed to create category" }, { status })
  }
}
