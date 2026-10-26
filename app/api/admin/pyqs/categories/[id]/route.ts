import { NextResponse } from "next/server"
import { updateCategory, deleteCategory } from "@/lib/pyqs-service"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { CACHE_TAGS, safeRevalidateTags } from "@/lib/cache-tags"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied: Only Teachers and Admins can modify categories" }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const updated = await updateCategory({ id, ...body })
    safeRevalidateTags(CACHE_TAGS.pyqs)
    return NextResponse.json(updated)
  } catch (error: any) {
    console.error("PUT /api/admin/pyqs/categories/[id] error:", error)
    return NextResponse.json({ error: error.message || "Failed to update category" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Access Denied: Only Admins can delete major exam categories" }, { status: 403 })
    }

    const { id } = await params
    await deleteCategory(id)
    safeRevalidateTags(CACHE_TAGS.pyqs)
    return NextResponse.json({ success: true, message: "Category deleted successfully" })
  } catch (error: any) {
    console.error("DELETE /api/admin/pyqs/categories/[id] error:", error)
    return NextResponse.json({ error: error.message || "Failed to delete category" }, { status: 500 })
  }
}
