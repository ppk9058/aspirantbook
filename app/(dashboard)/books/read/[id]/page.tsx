"use client"

import React, { useMemo } from "react"
import { useParams } from "next/navigation"
import { BookCartProvider, useBookCart } from "@/lib/books/cartContext"
import { BOOKS_DATA } from "@/lib/books/data"
import { PdfReaderFrame } from "@/components/pdf/PdfReaderFrame"

function BookReaderContent() {
  const params = useParams()
  const rawId = params?.id
  const id = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : ""

  const { orders } = useBookCart()

  // Find book from orders history or catalog (same source used by orders page)
  const book = useMemo(() => {
    if (!id) return null
    for (const order of orders) {
      const match = order.items.find((item) => item.book?.id === id || item.bookId === id)
      if (match?.book) return match.book
    }
    return BOOKS_DATA.find((b) => b.id === id) || null
  }, [id, orders])

  const title = book?.title || "eBook"
  const author = book?.author

  const encodedId = encodeURIComponent(id)
  const downloadUrl = `/api/books/${encodedId}/download?download=true`
  const inlineSrc = `/api/books/${encodedId}/download?inline=1`

  if (!id) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-xs text-gray-500">
        No book specified
      </div>
    )
  }

  return (
    <PdfReaderFrame
      src={inlineSrc}
      downloadUrl={downloadUrl}
      title={title}
      subtitle={author ? `By ${author}` : undefined}
      badgeLabel="Verified eBook"
      fallbackBackUrl="/books/orders"
      custom403Message="Buy this eBook to read the full PDF."
      testId="book-reader-page"
    />
  )
}

export default function BookReaderPage() {
  return (
    <BookCartProvider>
      <BookReaderContent />
    </BookCartProvider>
  )
}
