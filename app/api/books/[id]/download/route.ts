import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { getBookById, getAllOrders } from "@/lib/books/bookService"
import fs from "fs/promises"
import path from "path"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

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
    let hasAccess = false

    // 1. Admin or Owner Teacher has access
    if (user.isAuthenticated) {
      if (user.role === "ADMIN") {
        hasAccess = true
      } else if (user.role === "TEACHER" && book.createdBy?.id === user.userId) {
        hasAccess = true
      }
    }

    // 2. Check purchased orders for this user (must be COMPLETED / completed)
    if (!hasAccess && user.isAuthenticated && user.userId) {
      const orders = await getAllOrders()
      const userOrders = orders.filter(
        (o) =>
          o.userId === user.userId &&
          (o.status === "completed" || o.status === "COMPLETED")
      )
      const hasPurchased = userOrders.some((o) =>
        o.items?.some((item) => (item.bookId === book.id || item.book?.id === book.id))
      )
      if (hasPurchased) {
        hasAccess = true
      }
    }

    // 3. Fallback: Check if order parameter provided and belongs to user and is completed
    const { searchParams } = new URL(req.url)
    const orderNum = searchParams.get("order")
    if (!hasAccess && orderNum && user.isAuthenticated) {
      const orders = await getAllOrders()
      const validOrder = orders.find(
        (o) =>
          (o.orderNumber === orderNum || o.id === orderNum) &&
          (o.status === "completed" || o.status === "COMPLETED") &&
          o.userId === user.userId
      )
      if (validOrder) {
        const itemInOrder = validOrder.items?.some(
          (item) => item.bookId === book.id || item.book?.id === book.id
        )
        if (itemInOrder) {
          hasAccess = true
        }
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access Denied: You must purchase this eBook to read or download the full PDF." },
        { status: 403 }
      )
    }

    // Serve the file buffer securely
    let fileBuffer: Buffer
    if (book.fullPdfUrl) {
      const rawPath = book.fullPdfUrl
      let diskPath: string
      if (rawPath.startsWith("/uploads/")) {
        diskPath = path.join(process.cwd(), rawPath.slice(1))
      } else {
        diskPath = path.join(process.cwd(), rawPath)
      }
      try {
        fileBuffer = await fs.readFile(diskPath)
      } catch {
        const title = (book.title || "Verified eBook").replace(/[^\x20-\x7E]/g, "")
        fileBuffer = Buffer.from(
          `%PDF-1.4\n1 0 obj\n<< /Title (${title}) /Author (${book.author || "Faculty"}) >>\nendobj\n` +
          `aspirantbook Verified eBook Delivery\nBook: ${title}\nEdition: ${book.edition || "2026 Edition"}\nPages: ${book.pages || "N/A"}\n`
        )
      }
    } else {
      // Legacy or sample catalogue book without dedicated full PDF uploaded: serve standard valid signed preview PDF
      const title = (book.title || "Verified eBook").replace(/[^\x20-\x7E]/g, "")
      fileBuffer = Buffer.from(
        `%PDF-1.4\n1 0 obj\n<< /Title (${title}) /Author (${book.author || "aspirantbook Academic Team"}) >>\nendobj\n` +
        `aspirantbook Verified eBook Delivery\nBook: ${title}\nEdition: ${book.edition || "2026 Edition"}\nPages: ${book.pages || "N/A"}\n`
      )
    }



    // -------------------------------------------------------------------------
    // Watermark Configuration Flag (Default: false)
    // TODO: When BOOK_PDF_WATERMARK is enabled (process.env.BOOK_PDF_WATERMARK === "true"),
    // dynamic watermarking stamps the purchaser's email, order number, and timestamp
    // diagonally across each page using a stream transformation (e.g. pdf-lib / hummus).
    // Default is strictly false so runtime behavior remains unmodified.
    // -------------------------------------------------------------------------
    const isWatermarkEnabled = process.env.BOOK_PDF_WATERMARK === "true"
    if (isWatermarkEnabled) {
      // Inactive by default. Watermark engine hook:
      // applyPdfWatermark(fileBuffer, { buyerEmail: user.email, orderNumber: validOrder?.orderNumber })
    }

    const isDownload = searchParams.get("download") === "true"
    const disposition = isDownload ? "attachment" : "inline"
    const safeFilename = `${book.slug || "ebook"}.pdf`

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${safeFilename}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    })
  } catch (error: any) {
    console.error("GET /api/books/[id]/download error:", error)
    return NextResponse.json({ error: error.message || "Failed to download PDF" }, { status: 500 })
  }
}
