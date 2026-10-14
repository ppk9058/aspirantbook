"use client"

import React from "react"
import Link from "next/link"
import { CheckCircle2, BookOpen, ShoppingBag, ExternalLink, ArrowRight, X } from "lucide-react"
import { BookOrder } from "@/lib/books/types"

interface PaymentSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  order: BookOrder | null
  onReadNow: (bookId: string, title: string, author?: string) => void
}

export default function PaymentSuccessModal({
  isOpen,
  onClose,
  order,
  onReadNow,
}: PaymentSuccessModalProps) {
  if (!isOpen || !order) return null

  const firstItem = order.items?.[0]
  const firstBook = firstItem?.book

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 p-6 sm:p-8 overflow-hidden text-center animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-xl transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Celebration icon */}
        <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-4 shadow-inner">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white mb-2">
          Payment Successful!
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-6">
          Your payment has been verified. Your eBook is ready to read immediately with lifetime online access.
        </p>

        {/* Order Details Card */}
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200/80 dark:border-slate-700 text-left mb-6 space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-200 dark:border-slate-700">
            <span className="font-semibold text-gray-500 dark:text-gray-400">Order ID</span>
            <span className="font-mono font-bold text-gray-900 dark:text-white">
              {order.orderNumber || order.id}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-200 dark:border-slate-700">
            <span className="font-semibold text-gray-500 dark:text-gray-400">Amount Paid</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
              ₹{order.finalTotal?.toLocaleString("en-IN")}
            </span>
          </div>

          {/* Book item preview */}
          {firstBook && (
            <div className="flex items-center gap-3 pt-1">
              <div className="w-12 h-16 rounded-lg bg-gray-200 dark:bg-slate-700 overflow-hidden shrink-0 shadow-2xs">
                {firstBook.coverImage ? (
                  <img
                    src={firstBook.coverImage}
                    alt={firstBook.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <BookOpen className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2">
                  {firstBook.title}
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  By {firstBook.author}
                </p>
                {order.items.length > 1 && (
                  <p className="text-[10px] font-semibold text-sky-600 mt-0.5">
                    + {order.items.length - 1} more eBook(s) in this order
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          {firstBook && (
            <button
              type="button"
              onClick={() => {
                onClose()
                onReadNow(firstBook.id, firstBook.title, firstBook.author)
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-98"
            >
              <BookOpen className="w-4 h-4" />
              <span>Read Now</span>
            </button>
          )}

          <Link
            href="/books/orders"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl border border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-800 dark:text-gray-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <ShoppingBag className="w-4 h-4 text-gray-500" />
            <span>View All My Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
