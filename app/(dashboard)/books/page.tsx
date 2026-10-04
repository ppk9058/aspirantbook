"use client"

import React, { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import BookStoreHeader from "@/components/books/BookStoreHeader"
import BookCard from "@/components/books/BookCard"
import CartDrawer from "@/components/books/CartDrawer"
import { BookCartProvider } from "@/lib/books/cartContext"
import { BOOKS_DATA, CATEGORIES_TREE, SUBJECTS_LIST } from "@/lib/books/data"
import { Book } from "@/lib/books/types"
import {
  ChevronRight,
  ChevronDown,
  Filter,
  ArrowRight,
  Sparkles,
  BookOpen,
  CheckSquare,
  Square,
  ExternalLink,
} from "lucide-react"

function BooksCatalogContent() {
  const [allBooks, setAllBooks] = useState<Book[]>(BOOKS_DATA)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("CBSE Class 10th Books")
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("Previous Year Papers")
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [expandedCategories, setExpandedCategories] = useState<{ [cat: string]: boolean }>({
    "CBSE Class 10th Books": true,
  })

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

  const toggleCategoryExpand = (catName: string) => {
    setExpandedCategories((prev) => ({ ...prev, [catName]: !prev[catName] }))
  }

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    )
  }

  // Filter books
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

      // Category filter (if not searching)
      if (!searchQuery.trim() && selectedCategory) {
        if (selectedCategory !== "All Books" && book.category !== selectedCategory) {
          return false
        }
        if (selectedSubcategory && book.subcategory && book.subcategory !== selectedSubcategory) {
          // allow through if parent matches
        }
      }

      // Subject filter
      if (selectedSubjects.length > 0) {
        if (!selectedSubjects.includes(book.subject)) {
          return false
        }
      }

      return true
    })
  }, [searchQuery, selectedCategory, selectedSubcategory, selectedSubjects])

  // Recommended / Featured row (R.D. Sharma & more matching Image 1)
  const featuredRowBooks = useMemo(() => {
    return BOOKS_DATA.filter((b) => b.isFeatured || b.category.includes("CBSE") || b.category.includes("BPSC"))
  }, [])

  return (
    <div className="space-y-6 pb-32 sm:pb-24 lg:pb-16 font-sans">
      {/* Store Header matching Image 1 */}
      <BookStoreHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ======================================================== */}
          {/* LEFT SIDEBAR: Categories Tree & Subject Filters */}
          {/* ======================================================== */}
          <aside className="w-full lg:w-64 xl:w-72 shrink-0 space-y-6">
            {/* Category Tree Box */}
            <div className="bg-white dark:bg-slate-800 border border-gray-200/90 dark:border-slate-700 rounded-2xl p-4 shadow-2xs">
              <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Browse Categories
              </h3>

              <div className="space-y-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("All Books")
                    setSelectedSubcategory("")
                  }}
                  className={`w-full text-left px-3 py-2 min-h-[44px] rounded-xl font-bold flex items-center justify-between transition-colors ${
                    selectedCategory === "All Books"
                      ? "bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                  }`}
                >
                  <span>All eBooks</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{BOOKS_DATA.length}</span>
                </button>

                {CATEGORIES_TREE.map((cat) => {
                  const isSelected = selectedCategory === cat.name
                  const isExpanded = expandedCategories[cat.name] || isSelected

                  return (
                    <div key={cat.name} className="space-y-0.5">
                      <div
                        onClick={() => {
                          setSelectedCategory(cat.name)
                          toggleCategoryExpand(cat.name)
                        }}
                        className={`px-3 py-2 min-h-[44px] rounded-xl cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? "bg-sky-50/80 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 font-extrabold"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 font-semibold"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleCategoryExpand(cat.name)
                            }}
                            className="text-gray-400 hover:text-gray-700"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                            )}
                          </button>
                          <span className="truncate">{cat.name}</span>
                        </div>
                      </div>

                      {/* Subcategories */}
                      {isExpanded && cat.subcategories && (
                        <div className="pl-7 pr-2 py-1 space-y-1">
                          {cat.subcategories.map((sub) => {
                            const isSubActive = isSelected && selectedSubcategory === sub
                            return (
                              <button
                                key={sub}
                                type="button"
                                onClick={() => {
                                  setSelectedCategory(cat.name)
                                  setSelectedSubcategory(sub)
                                }}
                                className={`block w-full text-left py-1 px-2 rounded-lg text-[11px] transition-colors ${
                                  isSubActive
                                    ? "text-sky-800 dark:text-sky-300 font-extrabold bg-sky-100/50 dark:bg-sky-950/60"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                }`}
                              >
                                {sub}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Subject Checkboxes Filter matching Image 1 */}
            <div className="bg-white dark:bg-slate-800 border border-gray-200/90 dark:border-slate-700 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Subject
                </h3>
                {selectedSubjects.length > 0 && (
                  <button
                    onClick={() => setSelectedSubjects([])}
                    className="text-[11px] font-bold text-sky-700 dark:text-sky-400 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {SUBJECTS_LIST.map((subj) => {
                  const isChecked = selectedSubjects.includes(subj)
                  return (
                    <label
                      key={subj}
                      className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer hover:text-slate-950 dark:hover:text-white font-medium select-none min-h-[36px]"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSubject(subj)}
                        className="rounded border-gray-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                      />
                      <span>{subj}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* eBook Delivery Guarantee Banner */}
            <div className="p-4 bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/80 border border-sky-200/80 dark:border-slate-700 rounded-2xl text-xs space-y-2">
              <span className="font-extrabold text-sky-950 dark:text-sky-200 flex items-center gap-1.5">
                ⚡ 100% Digital eBooks
              </span>
              <p className="text-sky-800 dark:text-sky-300 text-[11px] leading-relaxed">
                Instant delivery directly to your account. No delivery charges, no shipping waiting period. Read on Web, Tablet, or Mobile!
              </p>
            </div>
          </aside>

          {/* ======================================================== */}
          {/* RIGHT MAIN CONTENT: Books Listing Grid */}
          {/* ======================================================== */}
          <main className="flex-1 space-y-8">
            {/* Category Breadcrumb / Title Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 dark:border-slate-700 pb-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  {selectedCategory}
                  {selectedSubcategory ? ` &bull; ${selectedSubcategory}` : ""}
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Showing {filteredBooks.length} verified {filteredBooks.length === 1 ? "eBook" : "eBooks"}
                </p>
              </div>

              {/* Active Filters summary pills */}
              {selectedSubjects.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedSubjects.map((s) => (
                    <span
                      key={s}
                      onClick={() => toggleSubject(s)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 cursor-pointer hover:bg-sky-200 transition-colors"
                    >
                      {s} &times;
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Books Grid (4 Columns matching Image 1) */}
            {filteredBooks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                {filteredBooks.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            ) : (
              <div className="p-12 text-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl space-y-3">
                <BookOpen className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto" />
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">No eBooks found</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Try adjusting your subject filters or search terms.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory("All Books")
                    setSelectedSubjects([])
                    setSearchQuery("")
                  }}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold transition-colors"
                >
                  View All eBooks
                </button>
              </div>
            )}

            {/* ======================================================== */}
            {/* SECONDARY ROW: "R.D. Sharma & more" matching Image 1 */}
            {/* ======================================================== */}
            <div className="p-6 bg-sky-50/50 dark:bg-slate-800/60 border border-sky-100 dark:border-slate-700 rounded-3xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-gray-900 dark:text-white">
                    R.D. Sharma &amp; Toppers' Recommended Books
                  </h2>
                  <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                    Powered by <strong className="text-gray-800 dark:text-gray-200 font-extrabold">Prepmarket &bull; aspirantbook</strong>
                  </span>
                </div>

                <Link
                  href="/books"
                  className="text-xs font-bold text-sky-700 dark:text-sky-400 hover:underline flex items-center gap-1 min-h-[44px]"
                >
                  <span>View All</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Horizontal Scroll of Featured Books */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {featuredRowBooks.slice(0, 4).map((book) => (
                  <BookCard key={`featured-${book.id}`} book={book} />
                ))}
              </div>
            </div>
          </main>
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
      <BooksCatalogContent />
    </BookCartProvider>
  )
}
