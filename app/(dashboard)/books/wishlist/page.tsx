"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import BookStoreHeader from "@/components/books/BookStoreHeader"
import BookCard from "@/components/books/BookCard"
import CartDrawer from "@/components/books/CartDrawer"
import { BookCartProvider } from "@/lib/books/cartContext"
import { WishlistProvider, useWishlist } from "@/lib/books/wishlistContext"
import { BOOKS_DATA } from "@/lib/books/data"
import { Book } from "@/lib/books/types"
import { Heart, BookOpen, ArrowLeft } from "lucide-react"

function WishlistContent() {
  const { wishlistIds } = useWishlist()
  const [allBooks, setAllBooks] = useState<Book[]>(BOOKS_DATA)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/books")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setAllBooks(data.data)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const wishlistedBooks = allBooks.filter((book) => wishlistIds.includes(book.id))

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 font-sans">
      <BookStoreHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/books"
              className="p-2 rounded-xl text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              title="Back to store"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                <Heart className="w-6 h-6 fill-rose-500 text-rose-500" />
                <span>My Saved Books &amp; Wishlist</span>
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {wishlistedBooks.length} {wishlistedBooks.length === 1 ? "book" : "books"} saved for later purchase.
              </p>
            </div>
          </div>

          <Link
            href="/books"
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors shadow-2xs"
          >
            Explore More Books
          </Link>
        </div>

        {/* Wishlist Grid */}
        {wishlistedBooks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {wishlistedBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-slate-700 space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto">
              <Heart className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Your wishlist is empty
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Explore our wide range of competitive exam eBooks and tap the heart icon on any book cover to save it here.
            </p>
            <Link
              href="/books"
              className="inline-block px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black shadow-md transition-all active:scale-95"
            >
              Browse Bookstore
            </Link>
          </div>
        )}
      </div>

      <CartDrawer />
    </div>
  )
}

export default function WishlistPage() {
  return (
    <BookCartProvider>
      <WishlistProvider>
        <WishlistContent />
      </WishlistProvider>
    </BookCartProvider>
  )
}
