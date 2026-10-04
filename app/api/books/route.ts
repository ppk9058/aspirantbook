import { NextResponse } from "next/server"
import { getAllBooks, getBookBySlug } from "@/lib/books/bookService"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get("slug")

    if (slug) {
      const book = await getBookBySlug(slug)
      if (!book) {
        return NextResponse.json({ error: "Book not found" }, { status: 404 })
      }
      return NextResponse.json(
        { success: true, data: book },
        {
          headers: {
            "Cache-Control": "public, max-age=120, stale-while-revalidate=600",
          },
        }
      )
    }

    const books = await getAllBooks()
    return NextResponse.json(
      { success: true, data: books },
      {
        headers: {
          "Cache-Control": "public, max-age=120, stale-while-revalidate=600",
        },
      }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch books" }, { status: 500 })
  }
}
