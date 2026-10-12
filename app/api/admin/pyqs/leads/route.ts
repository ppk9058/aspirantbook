import { NextResponse } from "next/server"
import { getLeadsList, recordPhoneLead } from "@/lib/pyqs-service"
import { getCurrentUserContext } from "@/lib/auth/rbac"

export async function GET() {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied: Only Teachers and Admins can view leads" }, { status: 403 })
    }

    const leads = await getLeadsList(user.role === "TEACHER" ? user.userId : undefined)
    return NextResponse.json(leads)
  } catch (error: any) {
    console.error("GET /api/admin/pyqs/leads error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch leads" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { paperId, phoneNumber, userId } = body

    if (!paperId || !phoneNumber) {
      return NextResponse.json({ error: "Paper ID and phone number are required" }, { status: 400 })
    }

    const record = await recordPhoneLead(paperId, phoneNumber, userId)
    return NextResponse.json(record, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/admin/pyqs/leads error:", error)
    return NextResponse.json({ error: error.message || "Failed to capture lead" }, { status: 400 })
  }
}
