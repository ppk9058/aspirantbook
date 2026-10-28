import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { getBookById, updateBook, deleteBook } from "@/lib/books/bookService"
import { bookUpdateSchema } from "@/lib/books/book-validation"
import { normalizeBookStorageKey } from "@/lib/books/book-file-storage"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const book = await getBookById(id)
    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 })
    }

    const user = await getCurrentUserContext()
    const isOwner = user.isAuthenticated && book.createdBy?.id === user.userId
    const isAdmin = user.isAuthenticated && user.role === "ADMIN"

    if (book.status && book.status !== "published" && !isOwner && !isAdmin) {
      return NextResponse.json({ error: "Book not found or not published" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: book })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch book" }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json(
        { error: "Access Denied: Only Teachers and Admins can edit books" },
        { status: 403 }
      )
    }

    const { id } = await params
    const existing = await getBookById(id)
    if (!existing) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 })
    }

    // Teacher can only edit their own books
    if (user.role === "TEACHER" && existing.createdBy?.id !== user.userId) {
      return NextResponse.json(
        { error: "Access Denied: Teachers can only edit their own books" },
        { status: 403 }
      )
    }

    // A5/A12: only allowlisted fields are accepted. Unknown keys (including
    // createdBy and arbitrary JSON) are stripped by the schema.
    const parsed = bookUpdateSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid book payload", issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })) },
        { status: 400 }
      )
    }
    const body = parsed.data

    // Store canonical storage keys, never caller-supplied paths.
    for (const field of ["fullPdfUrl", "samplePdfUrl"] as const) {
      const value = body[field]
      if (value !== undefined) {
        body[field] = value === "" ? "" : normalizeBookStorageKey(value) || ""
        if (value !== "" && body[field] === "") {
          return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 })
        }
      }
    }

    // Validate price <= MRP if changed
    const price = body.price !== undefined ? Number(body.price) : existing.price
    const mrp = body.mrp !== undefined ? Number(body.mrp) : (body.originalPrice !== undefined ? Number(body.originalPrice) : existing.originalPrice)
    if (price > mrp) {
      return NextResponse.json({ error: "Selling price cannot exceed MRP" }, { status: 400 })
    }

    // Status logic: if Teacher edits, they can save as "draft" or "pending" (re-submit)
    // Teachers cannot self-publish to "published"
    let status = body.status ?? existing.status
    if (user.role === "TEACHER") {
      if (status === "published") {
        status = "pending"
      }
    }

    const updated = await updateBook(id, {
      ...body,
      status,
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Book updated successfully",
    })
  } catch (error: any) {
    console.error("PUT /api/books/[id] error:", error)
    return NextResponse.json({ error: error.message || "Failed to update book" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json(
        { error: "Access Denied: Only Teachers and Admins can delete books" },
        { status: 403 }
      )
    }

    const { id } = await params
    const existing = await getBookById(id)
    if (!existing) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 })
    }

    // Teacher can only delete their own book
    if (user.role === "TEACHER" && existing.createdBy?.id !== user.userId) {
      return NextResponse.json(
        { error: "Access Denied: Teachers can only delete their own books" },
        { status: 403 }
      )
    }

    const success = await deleteBook(id)
    if (!success) {
      return NextResponse.json({ error: "Book not found or could not be deleted" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Book deleted successfully" })
  } catch (error: any) {
    console.error("DELETE /api/books/[id] error:", error)
    return NextResponse.json({ error: error.message || "Failed to delete book" }, { status: 500 })
  }
}
