"use client"

import React, { useState } from "react"
import Link from "next/link"
import BookStoreHeader from "@/components/books/BookStoreHeader"
import CartDrawer from "@/components/books/CartDrawer"
import { BookCartProvider, useBookCart } from "@/lib/books/cartContext"
import { BOOKS_DATA } from "@/lib/books/data"
import { Book } from "@/lib/books/types"
import {
  PackageCheck,
  Download,
  BookOpen,
  CheckCircle2,
  FileText,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  ShoppingBag,
  Zap,
  AlertCircle,
} from "lucide-react"

function OrdersContent() {
  // Orders + ownership come from the database (GET /api/books/orders).
  const { orders, ordersStatus } = useBookCart()
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // Real orders only - the empty state is shown ONLY when the API answered
  // with an empty list, never while the request is still in flight.
  const displayOrders = orders

  const handleDownloadPdf = (book: Book, orderNumber?: string) => {
    setDownloadingId(book.id)
    const downloadUrl = `/api/books/${book.id}/download?download=true${orderNumber ? `&order=${encodeURIComponent(orderNumber)}` : ""}`
    window.open(downloadUrl, "_blank")
    setTimeout(() => {
      setDownloadingId(null)
    }, 1000)
  }

  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div
      data-testid="orders-page-root"
      data-hydrated={mounted ? "true" : "false"}
      className="min-h-screen bg-gray-50/50 pb-20"
    >
      <BookStoreHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Breadcrumb Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Orders
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Access your digital library, download high-resolution PDFs, or read online anytime.
            </p>
          </div>

          <Link
            href="/books"
            className="px-4 py-2 min-h-[44px] flex items-center rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors shadow-2xs"
          >
            Browse Books
          </Link>
        </div>

        {/* Orders Listing or Compact Empty State */}
        {ordersStatus === "loading" ? (
          <div
            data-testid="orders-loading"
            aria-busy="true"
            className="p-8 sm:p-12 text-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl space-y-3"
          >
            <div className="h-10 w-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-700 animate-pulse" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Loading your orders…
            </p>
          </div>
        ) : ordersStatus === "error" ? (
          <div
            data-testid="orders-error"
            role="alert"
            className="p-8 sm:p-12 text-center bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl space-y-2"
          >
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-rose-800 dark:text-rose-200">
              Could not load your orders
            </h3>
            <p className="text-xs text-rose-700 dark:text-rose-300 max-w-sm mx-auto">
              The order list is unavailable right now. Refresh the page to retry.
            </p>
          </div>
        ) : displayOrders.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl space-y-3">
            <PackageCheck className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto" />
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">No orders yet</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
              You haven&apos;t purchased any digital books or study notes yet. Explore our curated catalog.
            </p>
            <div className="pt-2">
              <Link
                href="/books"
                className="inline-flex items-center px-4 py-2.5 min-h-[44px] rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold transition-colors shadow-2xs"
              >
                Browse Books
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {displayOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white border border-gray-200/90 rounded-2xl shadow-2xs overflow-hidden"
              >
                {/* Order Header Summary */}
                <div className="p-4 sm:p-5 bg-gray-50/80 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <span className="text-gray-400 block font-semibold">ORDER PLACED</span>
                      <span className="font-bold text-gray-800">{order.date}</span>
                    </div>

                    <div>
                      <span className="text-gray-400 block font-semibold">TOTAL PAID</span>
                      <span className="font-extrabold text-gray-900">
                        ₹{order.finalTotal.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400 block font-semibold">PAYMENT METHOD</span>
                      <span className="font-semibold text-gray-700">{order.paymentMethod}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-gray-500">
                      #{order.orderNumber}
                    </span>
                  </div>
                </div>

              {/* Order Items */}
              <div className="divide-y divide-gray-100 p-4 sm:p-5 space-y-4">
                {order.items.map((item) => (
                  <div
                    key={item.bookId}
                    className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-between items-start sm:items-center pt-3 first:pt-0"
                  >
                    {/* Book Info */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Link
                        href={`/books/${item.book.slug}`}
                        className="w-16 h-22 shrink-0 bg-gray-50 rounded-xl p-1 border border-gray-200 flex items-center justify-center"
                      >
                        <Image
                          src={item.book.coverImage}
                          alt={item.book.title}
                          width={64}
                          height={88}
                          className="h-full w-full object-contain"
                        />
                      </Link>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            DELIVERED &bull; DIGITAL ACCESS READY
                          </span>
                        </div>

                        <Link
                          href={`/books/${item.book.slug}`}
                          className="text-sm font-bold text-gray-900 hover:text-indigo-600 line-clamp-2 leading-snug"
                        >
                          {item.book.title}
                        </Link>

                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{item.book.edition}</span>
                          <span>&bull;</span>
                          <span>Format: {item.book.format}</span>
                          <span>&bull;</span>
                          <span className="font-extrabold text-gray-900">
                            ₹{item.book.price}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Instant Access Action Buttons */}
                    <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto pt-2 sm:pt-0">
                      <Link
                        href={`/books/read/${encodeURIComponent(item.book.id)}`}
                        className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Read Online</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(item.book, order.orderNumber)}
                        disabled={downloadingId === item.book.id}
                        className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-gray-600" />
                        <span>
                          {downloadingId === item.book.id ? "Preparing..." : "Download PDF"}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Slide-over Cart Drawer */}
      <CartDrawer />
    </div>
  )
}

import { WishlistProvider } from "@/lib/books/wishlistContext"
import Image from "next/image"

export default function OrdersPage() {
  return (
    <WishlistProvider>
      <BookCartProvider>
        <OrdersContent />
      </BookCartProvider>
    </WishlistProvider>
  )
}
