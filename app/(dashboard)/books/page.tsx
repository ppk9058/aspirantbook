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
import { BookOpen, ExternalLink, Zap } from "lucide-react"

const BOOK_CHIP_CATEGORIES = [
  "All",
  "UPSC",
  "BPSC",
  "10th",
  "9th",
  "8th",
  "Skills",
  "Notes",
] as const

function bookMatchesChip(book: Book, chip: string): boolean {
  if (chip === "All") return true
  const cat = (book.category || "").toLowerCase()
  const title = (book.title || "").toLowerCase()
  const subcat = (book.subcategory || "").toLowerCase()

  if (chip === "UPSC") {
    return cat.includes("upsc") || subcat.includes("upsc") || title.includes("upsc") || cat.includes("civil services")
  }
  if (chip === "BPSC") {
    return cat.includes("bpsc") || subcat.includes("bpsc") || title.includes("bpsc")
  }
  if (chip === "10th") {
    return cat.includes("10th") || cat.includes("class 10") || title.includes("class 10")
  }
  if (chip === "9th") {
    return cat.includes("9th") || cat.includes("class 9") || title.includes("class 9")
  }
  if (chip === "8th") {
    return cat.includes("8th") || cat.includes("class 8") || title.includes("class 8")
  }
  if (chip === "Skills") {
    return (
      cat.includes("skill") ||
      subcat.includes("skill") ||
      title.includes("skill") ||
      cat.includes("tech") ||
      cat.includes("coding") ||
      cat.includes("computer")
    )
  }
  if (chip === "Notes") {
    return (
      cat.includes("notes") ||
      subcat.includes("notes") ||
      title.includes("notes") ||
      subcat.includes("revision")
    )
  }
  return false
}

function BooksCatalogContent() {
  const [isHydrated, setIsHydrated] = useState(false)
  const [allBooks, setAllBooks] = useState<Book[]>(BOOKS_DATA)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedChip, setSelectedChip] = useState<string>("All")
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

  // Filter books by search & category chip
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

      // Chip Category filter
      if (!bookMatchesChip(book, selectedChip)) {
        return false
      }

      return true
    })
  }, [allBooks, searchQuery, selectedChip])

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

  // Featured Row Books
  const featuredRowBooks = useMemo(() => {
    return allBooks.filter((b) => b.isFeatured || b.category.includes("CBSE") || b.category.includes("BPSC"))
  }, [allBooks])

  return (
    <div data-testid="books-page-root" data-hydrated={isHydrated ? "true" : "false"} className="space-y-6 pb-32 sm:pb-24 lg:pb-16 font-sans">
      {/* Store Header with Search, Orders, Cart */}
      <BookStoreHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* ======================================================== */}
        {/* HORIZONTAL SINGLE-LINE SCROLL-SNAP CHIP FILTER BAR       */}
        {/* With 44px tap targets, edge fade, data-scroll-x          */}
        {/* ======================================================== */}
        <div className="relative w-full pt-1">
          {/* Left Edge Fade */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 sm:w-10 z-10 bg-gradient-to-r from-gray-50/90 to-transparent dark:from-slate-900/90" />

          {/* Scroll container */}
          <div
            data-scroll-x="true"
            className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory px-1 sm:px-2 py-1 scroll-smooth"
          >
            {BOOK_CHIP_CATEGORIES.map((chip) => {
              const isActive = selectedChip === chip
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setSelectedChip(chip)}
                  className={`shrink-0 snap-start min-h-[44px] min-w-[44px] px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all focus:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-500 select-none ${
                    isActive
                      ? "bg-sky-600 dark:bg-sky-500 text-white shadow-xs ring-2 ring-sky-600/20"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-gray-200/90 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {chip}
                </button>
              )
            })}
          </div>

          {/* Right Edge Fade */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 sm:w-10 z-10 bg-gradient-to-l from-gray-50/90 to-transparent dark:from-slate-900/90" />
        </div>

        {/* Title Bar & Sorting Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-slate-700 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              {selectedChip === "All" ? "All eBooks & Study Material" : `${selectedChip} eBooks & Notes`}
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
        {/* BOOKS LISTING GRID                                       */}
        {/* ======================================================== */}
        {sortedBooks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {sortedBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl space-y-3">
            <BookOpen className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto" />
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">No eBooks found</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Try adjusting your search terms or selecting &quot;All&quot; category.
            </p>
            <button
              onClick={() => {
                setSelectedChip("All")
                setSearchQuery("")
              }}
              className="px-4 py-2.5 min-h-[44px] rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold transition-colors"
            >
              View All eBooks
            </button>
          </div>
        )}

        {/* Digital Delivery Guarantee Banner */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-sky-50 via-indigo-50 to-emerald-50 dark:from-slate-800 dark:via-slate-800/90 dark:to-slate-800 border border-sky-200/80 dark:border-slate-700 rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="space-y-1">
            <span className="font-extrabold text-sky-950 dark:text-sky-200 flex items-center gap-1.5 text-sm">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" /> 100% Digital eBooks &amp; Fast Delivery
            </span>
            <p className="text-sky-800 dark:text-sky-300 text-[11px] leading-relaxed">
              Instant delivery directly to your account. No delivery charges, no shipping waiting period. Read on Web, Tablet, or Mobile!
            </p>
          </div>
          <Link
            href="/books/orders"
            className="self-start sm:self-auto shrink-0 px-4 py-2 min-h-[44px] flex items-center rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs transition-colors shadow-2xs"
          >
            My Purchased Books
          </Link>
        </div>

        {/* ======================================================== */}
        {/* SECONDARY ROW: Toppers' Recommended Books                */}
        {/* ======================================================== */}
        <div className="p-5 sm:p-6 bg-sky-50/50 dark:bg-slate-800/60 border border-sky-100 dark:border-slate-700 rounded-3xl space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                R.D. Sharma &amp; Toppers&apos; Recommended Books
              </h2>
              <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                Powered by <strong className="text-gray-800 dark:text-gray-200 font-extrabold">Prepmarket &bull; aspirantbook</strong>
              </span>
            </div>

            <Link
              href="/books"
              onClick={() => {
                setSelectedChip("All")
                setSearchQuery("")
              }}
              className="text-xs font-bold text-sky-700 dark:text-sky-400 hover:underline flex items-center gap-1 min-h-[44px]"
            >
              <span>View All</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {featuredRowBooks.slice(0, 4).map((book) => (
              <BookCard key={`featured-${book.id}`} book={book} />
            ))}
          </div>
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
