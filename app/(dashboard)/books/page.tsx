"use client"

import React, { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import BookStoreHeader from "@/components/books/BookStoreHeader"
import BookCard from "@/components/books/BookCard"
import CartDrawer from "@/components/books/CartDrawer"
import { BookCartProvider } from "@/lib/books/cartContext"
import { WishlistProvider } from "@/lib/books/wishlistContext"
import { BOOKS_DATA } from "@/lib/books/data"
import { Book } from "@/lib/books/types"
import { BookOpen, Zap } from "lucide-react"

function BooksCatalogContent() {
  const [isHydrated, setIsHydrated] = useState(false)
  const [allBooks, setAllBooks] = useState<Book[]>(BOOKS_DATA)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<string>("featured")

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    fetch("/api/books")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setAllBooks(data.data)
        }
      })
      .catch(() => {})
  }, [])

  // Filter books by search only — the exam/category chip row was removed from
  // the storefront, so search and sort are the only controls.
  const filteredBooks = useMemo(() => {
    return allBooks.filter((book) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesTitle = book.title.toLowerCase().includes(q)
        const matchesAuthor = book.author.toLowerCase().includes(q)
        const matchesCategory = book.category.toLowerCase().includes(q)
        const matchesSubject = book.subject.toLowerCase().includes(q)
        if (!matchesTitle && !matchesAuthor && !matchesCategory && !matchesSubject) {
          return false
        }
      }

      return true
    })
  }, [allBooks, searchQuery])

  // Sort filtered books
  const sortedBooks = useMemo(() => {
    const list = [...filteredBooks]
    if (sortBy === "price-low") {
      list.sort((a, b) => a.price - b.price)
    } else if (sortBy === "price-high") {
      list.sort((a, b) => b.price - a.price)
    } else if (sortBy === "rating") {
      list.sort((a, b) => b.rating - a.rating)
    }
    return list
  }, [filteredBooks, sortBy])

  return (
    <div data-testid="books-page-root" data-hydrated={isHydrated ? "true" : "false"} className="space-y-6 font-sans">
      {/* Store Header with Search, Orders, Cart */}
      <BookStoreHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Title Bar & Sorting Header: gap between title divider and first card is 16px */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-slate-700 pb-4 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              All eBooks &amp; Study Material
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Showing {sortedBooks.length} verified {sortedBooks.length === 1 ? "eBook" : "eBooks"}
            </p>
          </div>

          {/* Sort Control */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <label htmlFor="books-sort" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Sort by:
            </label>
            <select
              id="books-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-2 px-3 min-h-[44px] focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="featured">Featured / Recommended</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>

        {/* ======================================================== */}
        {/* BOOKS LISTING GRID: auto-fill minmax(240px, 1fr)         */}
        {/* ======================================================== */}
        {sortedBooks.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 sm:gap-6">
            {sortedBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl space-y-3">
            <BookOpen className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto" />
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">No eBooks found</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Try a different search term.
            </p>
            <button
              onClick={() => {
                setSearchQuery("")
              }}
              className="px-4 py-2.5 min-h-[44px] rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold transition-colors"
            >
              View All eBooks
            </button>
          </div>
        )}

        {/* Digital Delivery Guarantee Banner: 56 to 64px height */}
        <div className="p-4 sm:px-6 min-h-[56px] sm:min-h-[64px] bg-gradient-to-r from-sky-50 via-indigo-50 to-emerald-50 dark:from-slate-800 dark:via-slate-800/90 dark:to-slate-800 border border-sky-200/80 dark:border-slate-700 rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="space-y-0.5">
            <span className="font-extrabold text-sky-950 dark:text-sky-200 flex items-center gap-1.5 text-sm">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" /> 100% Digital eBooks &amp; Fast Delivery
            </span>
            <p className="text-sky-800 dark:text-sky-300 text-[11px] leading-relaxed">
              Instant delivery directly to your account. No delivery charges, no shipping waiting period. Read on Web, Tablet, or Mobile!
            </p>
          </div>
          <Link
            href="/books/orders"
            className="self-start sm:self-auto shrink-0 px-4 py-2 min-h-[44px] sm:min-h-[40px] flex items-center rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs transition-colors shadow-2xs"
          >
            My Purchased Books
          </Link>
        </div>
      </div>

      {/* Slide-over Cart Drawer */}
      <CartDrawer />
    </div>
  )
}

export default function BooksPage() {
  return (
    <BookCartProvider>
      <WishlistProvider>
        <BooksCatalogContent />
      </WishlistProvider>
    </BookCartProvider>
  )
}
