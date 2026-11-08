"use client"

import React, { useState } from "react"
import Link from "next/link"
import BookStoreHeader from "@/components/books/BookStoreHeader"
import CartDrawer from "@/components/books/CartDrawer"
import { BookCartProvider, useBookCart } from "@/lib/books/cartContext"
import { BOOKS_DATA } from "@/lib/books/data"
import { Book } from "@/lib/books/types"
import { PdfModal, usePdfModal } from "@/components/pdf/usePdfModal"
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
} from "lucide-react"

function OrdersContent() {
  const { orders } = useBookCart()
  const { pdfDoc, openPdf, closePdf } = usePdfModal()

  // Fallback demo order so the page isn't totally barren on first load
  const displayOrders = orders.length > 0 ? orders : [
    {
      id: "demo-ord-1",
      orderNumber: "TS-ORD-928471",
      date: "26 Sep 2026, 06:15 PM",
      originalTotal: 999,
      discountTotal: 199,
      couponDiscount: 0,
      finalTotal: 800,
      status: "COMPLETED" as const,
      paymentMethod: "UPI Instant Payment",
      items: [
        {
          bookId: BOOKS_DATA[0].id,
          book: BOOKS_DATA[0],
          quantity: 1,
          addedAt: new Date().toISOString(),
        },
      ],
    },
  ]

  const openBookPdf = (book: Book, orderNumber?: string) => {
    const orderParam = orderNumber ? `&order=${encodeURIComponent(orderNumber)}` : ""
    openPdf({
      src: `/api/books/${book.id}/download?inline=1${orderParam}`,
      downloadUrl: `/api/books/${book.id}/download?download=true${orderParam}`,
      title: book.title,
      author: book.author,
      subtitle: book.edition,
      badgeLabel: "Verified Ebook",
    })
  }

  const handleDownloadInvoice = (orderNumber: string) => {
    const blob = new Blob([
      `aspirantbook Official Tax Invoice / Receipt\nOrder No: ${orderNumber}\nDate: ${new Date().toLocaleDateString()}\nStatus: PAID & DELIVERED\n`
    ], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Invoice-${orderNumber}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Breadcrumb Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              My Orders &amp; Purchased eBooks
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Access your digital library, download high-resolution PDFs, or read online anytime.
            </p>
          </div>

          <Link
            href="/books"
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors shadow-2xs"
          >
            Browse Store
          </Link>
        </div>

        {/* Orders Listing */}
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
                  <button
                    onClick={() => handleDownloadInvoice(order.orderNumber)}
                    className="text-xs font-bold text-sky-700 hover:underline flex items-center gap-1"
                  >
                    <span>Invoice</span>
                    <FileText className="w-3.5 h-3.5" />
                  </button>
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
                        onClick={() => openBookPdf(item.book, order.orderNumber)}
                        className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-gray-600" />
                        <span>Download PDF</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Slide-over Cart Drawer */}
      <CartDrawer />

      <PdfModal doc={pdfDoc} onClose={closePdf} />
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
