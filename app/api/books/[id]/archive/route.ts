import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { getBookById, updateBook } from "@/lib/books/bookService"
import { writeDualAuditLog } from "@/lib/exam/audit-helper"
import { BookStatus } from "@/lib/books/types"

export const dynamic = "force-dynamic"

const archiveSchema = z.object({
  isArchived: z.boolean().optional(),
  status: z.enum(["archived", "published", "draft", "pending"]).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json(
        { error: "Access Denied: Only Teachers and Admins can archive or restore books" },
        { status: 403 }
      )
    }

    const { id } = await params
    const book = await getBookById(id)
    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 })
    }

    // Teacher ownership check
    if (user.role === "TEACHER" && book.createdBy?.id !== user.userId) {
      return NextResponse.json(
        { error: "Access Denied: Teachers can only archive or restore their own books" },
        { status: 403 }
      )
    }

    const rawBody = await req.json().catch(() => ({}))
    const parsed = archiveSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid archive request payload" }, { status: 400 })
    }

    let targetStatus: BookStatus
    if (parsed.data.status) {
      targetStatus = parsed.data.status
    } else if (parsed.data.isArchived !== undefined) {
      targetStatus = parsed.data.isArchived ? "archived" : (user.role === "ADMIN" ? "published" : "draft")
    } else {
      // Toggle
      targetStatus = book.status === "archived" ? (user.role === "ADMIN" ? "published" : "draft") : "archived"
    }

    // Non-admin cannot self-publish to published
    if (user.role !== "ADMIN" && targetStatus === "published") {
      targetStatus = "pending"
    }

    const updated = await updateBook(id, {
      status: targetStatus,
    })

    await writeDualAuditLog({
      actorId: user.userId || "unknown",
      action: targetStatus === "archived" ? "ARCHIVE" : "RESTORE",
      targetId: id,
      entityType: "ARTICLE",
      details: {
        title: book.title,
        previousStatus: book.status,
        newStatus: targetStatus,
      },
    })

    revalidatePath("/admin/books")
    revalidatePath("/admin/book-studio")
    revalidatePath("/books")

    return NextResponse.json({
      success: true,
      data: updated,
      status: targetStatus,
      message:
        targetStatus === "archived"
          ? `Book "${book.title}" archived successfully`
          : `Book "${book.title}" restored successfully`,
    })
  } catch (error: any) {
    console.error("POST /api/books/[id]/archive error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update book archive state" },
      { status: 500 }
    )
  }
}
