import { NextResponse } from "next/server"
import { createSubExam } from "@/lib/pyqs-service"
import { getCurrentUserContext } from "@/lib/auth/rbac"

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied: Only Teachers and Admins can create sub-exams" }, { status: 403 })
    }

    const body = await req.json()
    if (!body.categoryId || !body.name) {
      return NextResponse.json({ error: "Category ID and Sub-exam name are required" }, { status: 400 })
    }

    const created = await createSubExam(body)
    return NextResponse.json(created, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/admin/pyqs/sub-exams error:", error)
    return NextResponse.json({ error: error.message || "Failed to create sub-exam" }, { status: 500 })
  }
}
