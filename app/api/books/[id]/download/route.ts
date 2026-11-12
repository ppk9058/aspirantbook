import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { getBookById, getAllOrders } from "@/lib/books/bookService"
import {
  BookFileError,
  normalizeBookStorageKey,
  planBookFileFallback,
  readBookFile,
} from "@/lib/books/book-file-storage"
import { getPrivateFileSignedUrl, isPrivateStorageConfigured } from "@/lib/s3"

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

    // Serve the file buffer securely. A missing or invalid file is an error;
    // we never fabricate a placeholder PDF.
    if (!book.fullPdfUrl) {
      return NextResponse.json(
        { error: "No full PDF is available for this book" },
        { status: 404 }
      )
    }

    const isDownload = searchParams.get("download") === "true"
    const disposition = isDownload ? "attachment" : "inline"
    const safeFilename = `${book.slug || "ebook"}.pdf`
    const storageKey = normalizeBookStorageKey(book.fullPdfUrl)

    let fileBuffer: Buffer
    try {
      fileBuffer = await readBookFile(book.fullPdfUrl)
    } catch (err: any) {
      if (err instanceof BookFileError) {
        const fallback =
          err.status === 404
            ? planBookFileFallback({
                storageKey,
                privateStorageConfigured: isPrivateStorageConfigured(),
              })
            : "missing"

        if (fallback === "private-s3" && storageKey) {
          // The caller already passed the ownership checks above. The signed
          // URL is only ever returned as this redirect's Location header.
          const signedUrl = await getPrivateFileSignedUrl(storageKey, 60, {
            contentDisposition: `${disposition}; filename="${safeFilename}"`,
          })
          return new NextResponse(null, {
            status: 302,
            headers: {
              Location: signedUrl,
              "Cache-Control": "private, no-store, no-cache, must-revalidate",
            },
          })
        }

        return NextResponse.json({ error: err.message }, { status: err.status })
      }
      throw err
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
