import { NextResponse } from "next/server"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { getAllBooks, createBook } from "@/lib/books/bookService"

export async function GET() {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access Denied: Only Admins can access Online Bookstore management" },
        { status: 403 }
      )
    }

    const books = await getAllBooks()
    return NextResponse.json({ success: true, data: books })
  } catch (error: any) {
    console.error("GET /api/admin/books error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch books" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access Denied: Only Admins can create and sell eBooks" },
        { status: 403 }
      )
    }

    const body = await req.json()
    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: "eBook title is required" }, { status: 400 })
    }

    if (body.price === undefined || isNaN(Number(body.price))) {
      return NextResponse.json({ error: "Valid selling price is required" }, { status: 400 })
    }

    const newBook = await createBook(body)
    return NextResponse.json({ success: true, data: newBook, message: "eBook published successfully" })
  } catch (error: any) {
    console.error("POST /api/admin/books error:", error)
    return NextResponse.json({ error: error.message || "Failed to create eBook" }, { status: 500 })
  }
}
