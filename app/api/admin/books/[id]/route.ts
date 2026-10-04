import { NextResponse } from "next/server"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { getBookById, updateBook, deleteBook } from "@/lib/books/bookService"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Access Denied: Only Admins can view eBook details" }, { status: 403 })
    }

    const { id } = await params
    const book = await getBookById(id)
    if (!book) {
      return NextResponse.json({ error: "eBook not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: book })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch eBook" }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Access Denied: Only Admins can edit eBooks" }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const updated = await updateBook(id, body)
    if (!updated) {
      return NextResponse.json({ error: "eBook not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updated, message: "eBook updated successfully" })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update eBook" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Access Denied: Only Admins can delete eBooks" }, { status: 403 })
    }

    const { id } = await params
    const success = await deleteBook(id)
    if (!success) {
      return NextResponse.json({ error: "eBook not found or could not be deleted" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "eBook deleted successfully" })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete eBook" }, { status: 500 })
  }
}
