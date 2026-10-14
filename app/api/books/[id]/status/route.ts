import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { getBookById, updateBook } from "@/lib/books/bookService"

export const dynamic = "force-dynamic"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json(
        { error: "Access Denied: Only Admins and Teachers can update book status" },
        { status: 403 }
      )
    }

    const { id } = await params
    const book = await getBookById(id)
    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 })
    }

    const rawText = await req.text()
    let body: any = {}
    if (rawText && rawText.trim().length > 0) {
      try {
        body = JSON.parse(rawText)
      } catch (e) {
        return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
      }
    }
    const { status, rejectionReason } = body

    if (!["draft", "pending", "published", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 })
    }

    // Role verification:
    // Only ADMIN can approve ("published") or reject ("rejected")
    if (status === "published" || status === "rejected") {
      if (user.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Access Denied: Only Admins can approve or reject books" },
          { status: 403 }
        )
      }
    }

    // Teachers can only submit their own books for review ("pending") or unpublish/draft ("draft")
    if (user.role === "TEACHER") {
      if (book.createdBy?.id !== user.userId) {
        return NextResponse.json(
          { error: "Access Denied: Teachers can only update status of their own books" },
          { status: 403 }
        )
      }
    }

    // Full PDF is required before publishing
    if (status === "published" && !book.fullPdfUrl) {
      return NextResponse.json(
        { error: "Cannot publish book: A Full PDF document must be uploaded first" },
        { status: 400 }
      )
    }

    const updated = await updateBook(id, {
      status,
      rejectionReason: status === "rejected" ? rejectionReason || "Does not meet guidelines" : undefined,
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Book status changed to ${status}`,
    })
  } catch (error: any) {
    console.error("PATCH /api/books/[id]/status error:", error)
    return NextResponse.json({ error: error.message || "Failed to update status" }, { status: 500 })
  }
}
