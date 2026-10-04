"use client"

import React from "react"
import Link from "next/link"
import { Book } from "@/lib/books/types"
import { useBookCart } from "@/lib/books/cartContext"
import { Star, Plus, Minus, Check, ShoppingCart } from "lucide-react"

interface BookCardProps {
  book: Book
}

export default function BookCard({ book }: BookCardProps) {
  const { items, addToCart, updateQuantity, setIsCartOpen } = useBookCart()
  const cartItem = items.find((i) => i.bookId === book.id)

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addToCart(book, 1)
  }

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (cartItem) {
      updateQuantity(book.id, cartItem.quantity + 1)
    }
  }

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (cartItem) {
      updateQuantity(book.id, cartItem.quantity - 1)
    }
  }

  return (
    <div className="group relative bg-white border border-gray-200/90 hover:border-gray-300 rounded-2xl p-3 sm:p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-md">
      {/* Clickable Area linking to Book Details */}
      <Link href={`/books/${book.slug}`} className="block flex-1">
        {/* Book Cover Container */}
        <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center p-2 mb-3">
          <img
            src={book.coverImage}
            alt={book.title}
            className="w-full h-full object-contain drop-shadow-md group-hover:scale-[1.03] transition-transform duration-200"
          />

          {/* Quick ADD Button matching Image 1 placement */}
          <div className="absolute bottom-2 right-2 z-10">
            {cartItem ? (
              <div
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                className="flex items-center gap-1.5 bg-white border-2 border-indigo-600 rounded-xl px-2 py-1 shadow-md"
              >
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="w-5 h-5 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 rounded font-bold"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-xs font-black text-indigo-950 px-1">
                  {cartItem.quantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="w-5 h-5 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 rounded font-bold"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAdd}
                className="px-3.5 py-1.5 rounded-xl border-2 border-indigo-600 bg-white hover:bg-indigo-600 text-indigo-600 hover:text-white font-extrabold text-xs transition-all shadow-sm active:scale-95 flex items-center gap-1"
              >
                <span>ADD</span>
              </button>
            )}
          </div>
        </div>

        {/* Book Title matching Image 1 (2-line truncate) */}
        <h3 className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug min-h-[2.5rem]">
          {book.title}
        </h3>

        {/* Edition Pill / Badge */}
        <div className="mt-2">
          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            {book.edition}
          </span>
        </div>
      </Link>

      {/* Pricing & Rating Row matching Image 1 */}
      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between gap-1 flex-wrap">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm sm:text-base font-black text-gray-950">
            ₹{book.price.toLocaleString("en-IN")}
          </span>
          <span className="text-xs text-gray-400 line-through">
            M.R.P ₹{book.originalPrice.toLocaleString("en-IN")}
          </span>
          <span className="text-xs font-bold text-emerald-600">
            ({book.discountPercent}% off)
          </span>
        </div>

        {/* Rating Badge */}
        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[11px] font-extrabold shrink-0 shadow-2xs">
          <span>{book.rating}</span>
          <Star className="w-2.5 h-2.5 fill-white" />
        </div>
      </div>
    </div>
  )
}
