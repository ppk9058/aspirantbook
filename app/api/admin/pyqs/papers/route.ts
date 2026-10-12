import { NextResponse } from "next/server"
import { getAllPapers, createPaper } from "@/lib/pyqs-service"
import { getCurrentUserContext } from "@/lib/auth/rbac"

export async function GET(req: Request) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (user.role !== "ADMIN" && user.role !== "TEACHER") {
      return NextResponse.json({ error: "Forbidden: Admin or Teacher required" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get("categoryId") || undefined
    const subExamId = searchParams.get("subExamId") || undefined
    const year = searchParams.get("year") ? Number(searchParams.get("year")) : undefined
    const stage = searchParams.get("stage") || undefined
    const accessType = searchParams.get("accessType") || undefined

    const papers = await getAllPapers({
      categoryId,
      subExamId,
      year,
      stage,
      accessType,
      includeAllStatuses: true,
      creatorId: user.role === "ADMIN" ? undefined : user.userId,
    })

    return NextResponse.json(papers)
  } catch (error: any) {
    console.error("GET /api/admin/pyqs/papers error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch papers" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied: Only Teachers and Admins can upload and publish PYQ papers" }, { status: 403 })
    }

    const body = await req.json()
    if (!body.title || !body.categoryId || !body.year || !body.paperPdfUrl) {
      return NextResponse.json({
        error: "Missing required fields: title, categoryId, year, and paperPdfUrl are mandatory"
      }, { status: 400 })
    }

    const created = await createPaper(body)
    return NextResponse.json(created, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/admin/pyqs/papers error:", error)
    return NextResponse.json({ error: error.message || "Failed to create PYQ paper" }, { status: 500 })
  }
}
