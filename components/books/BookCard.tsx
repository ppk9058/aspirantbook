"use client"

import React from "react"
import Link from "next/link"
import { Book } from "@/lib/books/types"
import { useBookCart } from "@/lib/books/cartContext"
import { useWishlist } from "@/lib/books/wishlistContext"
import { Star, Plus, Minus, Heart, Zap, ShoppingCart } from "lucide-react"

interface BookCardProps {
  book: Book
}

export default function BookCard({ book }: BookCardProps) {
  const { items, addToCart, updateQuantity, setIsCartOpen } = useBookCart()
  const { isWishlisted, toggleWishlist } = useWishlist()

  const cartItem = items.find((i) => i.bookId === book.id)
  const wishlisted = isWishlisted(book.id)

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addToCart(book, 1)
  }

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addToCart(book, 1)
    setIsCartOpen(true)
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

  const handleToggleHeart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWishlist(book.id)
  }

  return (
    <div className="group relative bg-white dark:bg-slate-800 border border-gray-200/90 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 rounded-2xl p-3 sm:p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-md">
      {/* Clickable Area linking to Book Details */}
      <Link href={`/books/${book.slug}`} className="block flex-1">
        {/* Book Cover Container */}
        <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-2 mb-3">
          <img
            src={book.coverImage}
            alt={book.title}
            className="w-full h-full object-contain drop-shadow-md group-hover:scale-[1.03] transition-transform duration-200"
          />

          {/* Heart / Wishlist Icon in the TOP-RIGHT corner of the image itself */}
          <button
            type="button"
            onClick={handleToggleHeart}
            className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 shadow-sm border border-gray-200 dark:border-slate-700 flex items-center justify-center transition-transform active:scale-90"
            title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            aria-label="Wishlist toggle"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                wishlisted
                  ? "fill-rose-500 text-rose-500"
                  : "text-gray-400 hover:text-rose-500"
              }`}
            />
          </button>
        </div>

        {/* Book Title (2-line clamp) */}
        <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug min-h-[2.5rem]">
          {book.title}
        </h3>

        {/* Edition Pill / Badge */}
        <div className="mt-1.5 flex items-center justify-between gap-1">
          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            {book.edition}
          </span>
          {/* Rating Badge */}
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-700 text-white text-[11px] font-extrabold shrink-0 shadow-2xs">
            <span>{book.rating}</span>
            <Star className="w-2.5 h-2.5 fill-white" />
          </div>
        </div>
      </Link>

      {/* Pricing Row */}
      <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-slate-700 flex items-baseline gap-1.5 flex-wrap">
        <span className="text-sm sm:text-base font-black text-gray-950 dark:text-white">
          ₹{book.price.toLocaleString("en-IN")}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400 line-through">
          MRP ₹{(book.mrp || book.originalPrice).toLocaleString("en-IN")}
        </span>
        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
          ({book.discountPercent}% off)
        </span>
      </div>

      {/* Action Buttons: Add to Cart (turns into stepper) + Buy Now */}
      <div className="mt-3 pt-2 grid grid-cols-2 gap-2">
        {cartItem ? (
          <div
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            className="flex items-center justify-between bg-white dark:bg-slate-800 border-2 border-indigo-600 rounded-xl px-1.5 py-1 shadow-sm h-9"
          >
            <button
              type="button"
              onClick={handleDecrement}
              className="w-5 h-5 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded font-bold"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-xs font-black text-indigo-950 dark:text-indigo-200 px-1">
              {cartItem.quantity}
            </span>
            <button
              type="button"
              onClick={handleIncrement}
              className="w-5 h-5 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded font-bold"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-testid="book-card-add-to-cart-btn"
            onClick={handleAdd}
            className="h-9 px-2.5 rounded-xl border-2 border-indigo-600 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 font-extrabold text-xs transition-all shadow-2xs active:scale-95 flex items-center justify-center gap-1"
          >
            <ShoppingCart className="w-3 h-3 shrink-0" />
            <span>Add to Cart</span>
          </button>
        )}

        <button
          type="button"
          data-testid="book-card-buy-now-btn"
          onClick={handleBuyNow}
          className="h-9 px-2.5 rounded-xl bg-[#fb641b] hover:bg-[#e85813] text-white font-black text-xs transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1"
        >
          <Zap className="w-3 h-3 fill-white shrink-0" />
          <span>Buy Now</span>
        </button>
      </div>
    </div>
  )
}
