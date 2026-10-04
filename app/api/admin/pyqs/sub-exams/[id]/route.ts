import { NextResponse } from "next/server"
import { updateSubExam, deleteSubExam } from "@/lib/pyqs-service"
import { getCurrentUserContext } from "@/lib/auth/rbac"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied: Only Teachers and Admins can modify sub-exams" }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const updated = await updateSubExam({ id, ...body })
    return NextResponse.json(updated)
  } catch (error: any) {
    console.error("PUT /api/admin/pyqs/sub-exams/[id] error:", error)
    return NextResponse.json({ error: error.message || "Failed to update sub-exam" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied: Only Teachers and Admins can delete sub-exams" }, { status: 403 })
    }

    const { id } = await params
    await deleteSubExam(id)
    return NextResponse.json({ success: true, message: "Sub-exam deleted successfully" })
  } catch (error: any) {
    console.error("DELETE /api/admin/pyqs/sub-exams/[id] error:", error)
    return NextResponse.json({ error: error.message || "Failed to delete sub-exam" }, { status: 500 })
  }
}
