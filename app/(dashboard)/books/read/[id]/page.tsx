"use client"

import React, { useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, BookOpen, Download, ShieldCheck } from "lucide-react"
import { BookCartProvider, useBookCart } from "@/lib/books/cartContext"
import { BOOKS_DATA } from "@/lib/books/data"

function BookReaderContent() {
  const params = useParams()
  const router = useRouter()
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

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push("/books/orders")
    }
  }

  const encodedId = encodeURIComponent(id)
  const downloadUrl = `/api/books/${encodedId}/download?download=true`
  const inlineSrc = `/api/books/${encodedId}/download?inline=1`

  return (
    <div
      data-testid="book-reader-page"
      className="flex flex-col h-[calc(100dvh-5.5rem)] sm:h-[calc(100dvh-5rem)] lg:h-[calc(100dvh-2.5rem)] w-full bg-white dark:bg-slate-900 overflow-hidden"
    >
      {/* Slim Top Bar */}
      <header className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 border-b border-gray-200 dark:border-slate-800 bg-gray-50/90 dark:bg-slate-900/90 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-3">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back to orders"
            className="p-1.5 sm:p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>

          <div className="min-w-0">
            <h1 className="font-extrabold text-xs sm:text-sm text-gray-950 dark:text-white truncate">
              {title}
            </h1>
            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
              {author && <span className="truncate">By {author}</span>}
              {author && <span>&bull;</span>}
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Verified eBook</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={downloadUrl}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition-colors shadow-2xs shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download PDF</span>
          </a>
        </div>
      </header>

      {/* Reader Iframe */}
      <div className="flex-1 w-full bg-gray-100 dark:bg-slate-950 relative overflow-hidden">
        {id ? (
          <iframe
            src={inlineSrc}
            className="w-full h-full border-0"
            title={`eBook Reader: ${title}`}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-gray-500">
            No book specified
          </div>
        )}
      </div>
    </div>
  )
}

export default function BookReaderPage() {
  return (
    <BookCartProvider>
      <BookReaderContent />
    </BookCartProvider>
  )
}
