import { NextRequest, NextResponse } from "next/server"
import { getAllBooks, getBookBySlug, createBook } from "@/lib/books/bookService"
import { getCurrentUserContext } from "@/lib/auth/rbac"

export const dynamic = "force-dynamic"

function sanitizeBookForPublic(book: any, canViewFullPdf: boolean = false) {
  if (canViewFullPdf) return book
  // Strip fullPdfUrl from public catalogue/API
  const { fullPdfUrl, ...safe } = book
  return safe
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get("slug")
    const id = searchParams.get("id")
    const includeUnpublished = searchParams.get("all") === "true"

    const user = await getCurrentUserContext()
    const isStaff = user.isAuthenticated && (user.role === "ADMIN" || user.role === "TEACHER")

    if (slug) {
      const book = await getBookBySlug(slug)
      if (!book) {
        return NextResponse.json({ error: "Book not found" }, { status: 404 })
      }
      // If book is not published, only owner or admin can view
      if (book.status && book.status !== "published") {
        const isOwner = user.isAuthenticated && book.createdBy?.id === user.userId
        if (!isOwner && user.role !== "ADMIN") {
          return NextResponse.json({ error: "Book not found or not published" }, { status: 404 })
        }
      }
      return NextResponse.json({
        success: true,
        data: sanitizeBookForPublic(book, isStaff),
      })
    }

    if (id) {
      const all = await getAllBooks()
      const book = all.find((b) => b.id === id)
      if (!book) {
        return NextResponse.json({ error: "Book not found" }, { status: 404 })
      }
      if (book.status && book.status !== "published") {
        const isOwner = user.isAuthenticated && book.createdBy?.id === user.userId
        if (!isOwner && user.role !== "ADMIN") {
          return NextResponse.json({ error: "Book not found or not published" }, { status: 404 })
        }
      }
      return NextResponse.json({
        success: true,
        data: sanitizeBookForPublic(book, isStaff),
      })
    }

    const books = await getAllBooks()

    // If teacher or admin is requesting their own/manageable books with all=true
    if (includeUnpublished && isStaff) {
      if (user.role === "ADMIN") {
        return NextResponse.json({ success: true, data: books })
      }
      // Teacher: see all published books plus their own drafts/pending/rejected
      const teacherBooks = books.filter(
        (b) => b.status === "published" || b.createdBy?.id === user.userId
      )
      return NextResponse.json({ success: true, data: teacherBooks })
    }

    // Public visitor / student: only published books, strip fullPdfUrl
    const publishedBooks = books
      .filter((b) => !b.status || b.status === "published")
      .map((b) => sanitizeBookForPublic(b, false))

    return NextResponse.json(
      { success: true, data: publishedBooks },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch books" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json(
        { error: "Access Denied: Only Teachers and Admins can create books" },
        { status: 403 }
      )
    }

    let body: any = {}
    try {
      const text = await req.text()
      if (text && text.trim().length > 0) {
        body = JSON.parse(text)
      }
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: "Book title is required" }, { status: 400 })
    }

    if (body.price === undefined || isNaN(Number(body.price))) {
      return NextResponse.json({ error: "Valid selling price is required" }, { status: 400 })
    }

    const price = Number(body.price)
    const mrp = Number(body.mrp ?? body.originalPrice ?? price)
    if (price > mrp) {
      return NextResponse.json(
        { error: "Selling price cannot be greater than MRP" },
        { status: 400 }
      )
    }

    // Role-based status:
    // Teachers start as "pending" unless saved as "draft"
    // Admins can be "published" or "draft"
    let status = body.status || "draft"
    if (user.role === "TEACHER") {
      if (status === "published" || status === "pending") {
        status = "pending"
      } else {
        status = "draft"
      }
    } else if (user.role === "ADMIN") {
      if (status !== "draft") {
        status = "published"
      }
    }

    const newBook = await createBook({
      ...body,
      status,
      createdBy: {
        id: user.userId || "unknown",
        role: user.role,
        name: user.name || (user.role === "ADMIN" ? "Admin" : "Teacher"),
      },
    })

    return NextResponse.json({
      success: true,
      data: newBook,
      message:
        status === "pending"
          ? "Book submitted for Admin approval"
          : status === "published"
          ? "Book published successfully"
          : "Book saved as draft",
    })
  } catch (error: any) {
    console.error("POST /api/books error:", error)
    return NextResponse.json({ error: error.message || "Failed to create book" }, { status: 500 })
  }
}
