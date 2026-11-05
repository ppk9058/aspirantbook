"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import BookStoreHeader from "@/components/books/BookStoreHeader"
import CartDrawer from "@/components/books/CartDrawer"
import EBookReaderModal from "@/components/books/EBookReaderModal"
import SecurePdfViewer from "@/components/books/SecurePdfViewer"
import BookImageGallery from "@/components/books/BookImageGallery"
import BookCard from "@/components/books/BookCard"
import { BookCartProvider, useBookCart } from "@/lib/books/cartContext"
import { WishlistProvider, useWishlist } from "@/lib/books/wishlistContext"
import { BOOKS_DATA } from "@/lib/books/data"
import { Book } from "@/lib/books/types"
import {
  Star,
  Share2,
  CheckCircle2,
  FileText,
  Download,
  BookOpen,
  Zap,
  ShieldCheck,
  Smartphone,
  Laptop,
  Printer,
  ChevronRight,
  ShoppingCart,
  Check,
} from "lucide-react"

interface BookDetailsClientProps {
  initialBook?: Book | null
  slug: string
}

function BookDetailsContent({ initialBook, slug }: BookDetailsClientProps) {
  const [book, setBook] = useState<Book>(() => {
    if (initialBook) return initialBook
    const local = BOOKS_DATA.find((b) => b.slug === slug || b.id === slug)
    return local || BOOKS_DATA[0]
  })

  const [allBooks, setAllBooks] = useState<Book[]>(BOOKS_DATA)
  const [activeTab, setActiveTab] = useState<"description" | "details" | "who" | "highlights" | "reviews">("description")
  const [isReaderModalOpen, setIsReaderModalOpen] = useState(false)
  const [isSecureViewerOpen, setIsSecureViewerOpen] = useState(false)
  const [copiedShare, setCopiedShare] = useState(false)

  const { items, addToCart, setIsCartOpen, orders } = useBookCart()
  const { isWishlisted, toggleWishlist } = useWishlist()

  // Check if current user already owns this book
  const isOwned = orders.some(
    (o) =>
      (o.status === "completed" || o.status === "COMPLETED") &&
      o.items?.some((i) => i.bookId === book.id || i.book?.id === book.id)
  )

  const isItemInCart = items.some((i) => i.bookId === book.id)

  useEffect(() => {
    fetch(`/api/books/${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setBook(data.data)
        }
      })
      .catch(() => {})

    fetch("/api/books")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setAllBooks(data.data)
        }
      })
      .catch(() => {})
  }, [slug])

  // Images list for gallery
  const galleryImages =
    book.images && book.images.length > 0
      ? book.images
      : book.thumbnails && book.thumbnails.length > 0
      ? book.thumbnails.map((t) => t.url)
      : [book.coverImage]

  const handleAddToCart = () => {
    addToCart(book, 1)
  }

  const handleBuyNow = () => {
    addToCart(book, 1)
    setIsCartOpen(true)
  }

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href)
      setCopiedShare(true)
      setTimeout(() => setCopiedShare(false), 2500)
    }
  }

  const handleDownloadSample = () => {
    if (book.samplePdfUrl) {
      window.open(book.samplePdfUrl, "_blank")
    } else {
      // Stream sample through protected endpoint
      window.open(`/api/books/${book.id}/download?download=true`, "_blank")
    }
  }

  // Related books in the same category
  const relatedBooks = allBooks
    .filter((b) => b.id !== book.id && (b.category === book.category || b.subject === book.subject))
    .slice(0, 4)

  return (
    <div className="min-h-screen bg-[#f1f2f4] dark:bg-slate-950 pb-24">
      {/* Universal Store Header */}
      <BookStoreHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-6">
        {/* Breadcrumb Navigation & Share Button */}
        <div className="flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link href="/books" className="hover:text-black dark:hover:text-white font-semibold">
              Books
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <Link href="/books" className="hover:text-black dark:hover:text-white">
              {book.category}
            </Link>
            {book.subcategory && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                <span className="hover:text-black dark:hover:text-white">{book.subcategory}</span>
              </>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-bold text-gray-900 dark:text-white truncate max-w-xs sm:max-w-md">
              {book.title}
            </span>
          </div>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold text-xs transition-colors shadow-2xs"
          >
            {copiedShare ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Share2 className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
            )}
            <span>{copiedShare ? "Copied" : "Share"}</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* MAIN PRODUCT VIEW: Two Columns (Flipkart Style)          */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Gallery with Thumbnails, Main Zoom, Heart */}
          <div className="lg:col-span-6 space-y-5">
            <BookImageGallery
              images={galleryImages}
              title={book.title}
              isWishlisted={isWishlisted(book.id)}
              onToggleWishlist={() => toggleWishlist(book.id)}
              showHeart={true}
            />

            {/* If user already owns this book: Verified Access Banner */}
            {isOwned ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-3">
                <div className="flex items-center gap-2 font-black text-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>You already own this eBook</span>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Instant online access is active. You can read online or download the full PDF anytime.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsSecureViewerOpen(true)}
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Read Online</span>
                  </button>
                  <a
                    href={`/api/books/${book.id}/download?download=true`}
                    download
                    className="flex-1 py-3 px-4 rounded-xl border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </a>
                </div>
              </div>
            ) : (
              /* Desktop Action Buttons: Add to Cart + Buy Now */
              <div className="hidden sm:grid grid-cols-2 gap-3 sm:gap-4 pt-1">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="py-3.5 px-4 rounded-xl border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-black text-sm transition-all flex items-center justify-center gap-2 shadow-sm active:scale-98"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{isItemInCart ? "In Cart (Add More)" : "Add to Cart"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="py-3.5 px-4 rounded-xl bg-[#fb641b] hover:bg-[#e85813] text-white font-black text-sm transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-98"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>Buy Now</span>
                </button>
              </div>
            )}

            {/* Free Sample Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsReaderModalOpen(true)}
                className="py-2.5 px-3 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 text-gray-800 dark:text-gray-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <BookOpen className="w-3.5 h-3.5 text-sky-600" />
                <span>Read Free Sample</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadSample}
                className="py-2.5 px-3 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 text-gray-800 dark:text-gray-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                <span>Download Sample PDF</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Book Metadata, Pricing, Delivery */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-snug">
                {book.title}
              </h1>

              <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
                <span>By</span>
                <span className="font-extrabold text-indigo-700 dark:text-indigo-400">{book.author}</span>
                <span>&bull;</span>
                <span className="text-gray-500">{book.publisher}</span>
              </div>

              {/* Rating & Reviews */}
              {book.rating && book.rating > 0 ? (
                <div className="flex items-center gap-2.5 pt-1">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 text-white text-xs font-black shadow-2xs">
                    <span>{book.rating}</span>
                    <Star className="w-3 h-3 fill-white" />
                  </div>
                  {book.ratingCount && book.ratingCount > 0 ? (
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                      {book.ratingCount} ratings and {book.reviewCount} reviews
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Price Box */}
            <div className="p-4 sm:p-5 bg-white dark:bg-slate-800 border border-gray-200/90 dark:border-slate-700 rounded-2xl shadow-2xs space-y-3">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl sm:text-4xl font-black text-gray-950 dark:text-white">
                  ₹{book.price.toLocaleString("en-IN")}
                </span>
                <span className="text-base text-gray-400 line-through">
                  MRP ₹{(book.mrp || book.originalPrice).toLocaleString("en-IN")}
                </span>
                <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                  ({book.discountPercent}% OFF)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <CheckCircle2 className="w-3 h-3" />
                  In Stock &bull; Instant Online PDF Access
                </span>
              </div>
            </div>

            {/* What You Get / Delivery Guarantee Box */}
            <div className="p-4 bg-gradient-to-r from-sky-50/80 via-white to-indigo-50/80 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 border border-sky-200 dark:border-slate-700 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-sky-600 fill-sky-600" />
                  Instant eBook Access Guaranteed
                </span>
                <span className="text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/60 px-2 py-0.5 rounded-full">
                  Zero Delivery Wait
                </span>
              </div>

              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                {book.deliveryNote || "Digital PDF only. Instant online access, no physical copy, no shipping."}
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-700 dark:text-gray-300 pt-1">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>Phone &amp; Tablet Ready</span>
                </div>
                <div className="flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>Desktop &amp; Web Reader</span>
                </div>
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>Printable Notes PDF</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>Lifetime Valid Access</span>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* Sections & Tabs: Description, Details, Who Can Buy, etc. */}
            {/* ======================================================== */}
            <div className="bg-white dark:bg-slate-800 border border-gray-200/90 dark:border-slate-700 rounded-2xl overflow-hidden shadow-2xs">
              {/* Tab Header */}
              <div className="flex border-b border-gray-200 dark:border-slate-700 text-xs sm:text-sm font-bold bg-gray-50/50 dark:bg-slate-900/50 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTab("description")}
                  className={`py-3 px-3.5 border-b-2 text-center shrink-0 transition-colors ${
                    activeTab === "description"
                      ? "border-sky-600 text-sky-700 dark:text-sky-400 font-extrabold bg-white dark:bg-slate-800"
                      : "border-transparent text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                  }`}
                >
                  Description
                </button>
                <button
                  type="button"
                  data-testid="tab-product-details"
                  onClick={() => setActiveTab("details")}
                  className={`py-3 px-3.5 border-b-2 text-center shrink-0 transition-colors ${
                    activeTab === "details"
                      ? "border-sky-600 text-sky-700 dark:text-sky-400 font-extrabold bg-white dark:bg-slate-800"
                      : "border-transparent text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                  }`}
                >
                  Product Details
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("who")}
                  className={`py-3 px-3.5 border-b-2 text-center shrink-0 transition-colors ${
                    activeTab === "who"
                      ? "border-sky-600 text-sky-700 dark:text-sky-400 font-extrabold bg-white dark:bg-slate-800"
                      : "border-transparent text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                  }`}
                >
                  Who Can Buy
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("highlights")}
                  className={`py-3 px-3.5 border-b-2 text-center shrink-0 transition-colors ${
                    activeTab === "highlights"
                      ? "border-sky-600 text-sky-700 dark:text-sky-400 font-extrabold bg-white dark:bg-slate-800"
                      : "border-transparent text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                  }`}
                >
                  Highlights
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("reviews")}
                  className={`py-3 px-3.5 border-b-2 text-center shrink-0 transition-colors ${
                    activeTab === "reviews"
                      ? "border-sky-600 text-sky-700 dark:text-sky-400 font-extrabold bg-white dark:bg-slate-800"
                      : "border-transparent text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                  }`}
                >
                  Reviews ({book.reviewCount})
                </button>
              </div>

              {/* Tab Body */}
              <div className="p-5 text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {activeTab === "description" && (
                  <div className="space-y-4">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {book.shortDescription || book.title}
                    </p>
                    <div className="whitespace-pre-line text-gray-600 dark:text-gray-300 space-y-2">
                      {book.description}
                    </div>
                  </div>
                )}

                {activeTab === "details" && (
                  <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
                    <table className="w-full text-left text-xs">
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {(book.productDetails && book.productDetails.length > 0
                          ? book.productDetails
                          : [
                              { label: "Format", value: "PDF" },
                              { label: "Pages", value: String(book.pages) },
                              { label: "Language", value: book.language },
                              { label: "Publisher", value: book.publisher },
                              { label: "Edition", value: book.edition },
                              { label: "File Size", value: book.fileSize },
                            ]
                        ).map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30">
                            <td className="py-2.5 px-4 font-bold text-gray-500 dark:text-gray-400 w-1/3 bg-gray-50/40 dark:bg-slate-900/30">
                              {row.label}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-gray-900 dark:text-white">
                              {row.value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === "who" && (
                  <div className="space-y-3">
                    <span className="font-bold text-gray-900 dark:text-white block mb-1">
                      Target Audience:
                    </span>
                    <p className="text-gray-700 dark:text-gray-300">
                      {book.whoCanBuy ||
                        "Ideal for students, aspirants and learners targeting competitive examinations and high academic scores."}
                    </p>
                  </div>
                )}

                {activeTab === "highlights" && (
                  <div className="space-y-3">
                    <span className="font-bold text-gray-900 dark:text-white block mb-2">
                      Key Highlights &amp; Exam Advantage:
                    </span>
                    <ul className="space-y-2.5">
                      {(book.highlights || book.features || []).map((feat, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs text-gray-800 dark:text-gray-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeTab === "reviews" && (
                  <div className="space-y-4 text-center py-4">
                    {book.ratingCount && book.ratingCount > 0 ? (
                      <>
                        <div className="flex items-center justify-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className="w-5 h-5 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Rated <strong className="text-gray-900 dark:text-white">{book.rating} out of 5</strong> based on {book.ratingCount} student ratings.
                        </p>
                        <span className="text-[11px] text-gray-400 block">
                          Verified purchaser reviews are automatically refreshed.
                        </span>
                      </>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        No customer reviews yet for this edition.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* More from this author / category row */}
        {relatedBooks.length > 0 && (
          <div className="pt-8 border-t border-gray-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  More from {book.category}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Students who viewed this also explored these recommended eBooks
                </p>
              </div>
              <Link
                href="/books"
                className="text-xs font-bold text-sky-600 hover:underline"
              >
                View all
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {relatedBooks.map((relBook) => (
                <BookCard key={relBook.id} book={relBook} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Sticky Bottom Bar with Add to Cart and Buy Now */}
      {!isOwned && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 p-3 flex items-center gap-2 shadow-lg safe-area-bottom">
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex-1 py-3 px-3 rounded-xl border-2 border-indigo-600 text-indigo-600 font-extrabold text-xs flex items-center justify-center gap-1 active:scale-95"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{isItemInCart ? "In Cart" : "Add to Cart"}</span>
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            className="flex-1 py-3 px-3 rounded-xl bg-[#fb641b] hover:bg-[#e85813] text-white font-extrabold text-xs flex items-center justify-center gap-1 shadow-md active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            <span>Buy Now</span>
          </button>
        </div>
      )}

      {/* Sample EBook Reader Modal (Free sample) */}
      <EBookReaderModal
        book={book}
        isOpen={isReaderModalOpen}
        onClose={() => setIsReaderModalOpen(false)}
        initialPageIndex={0}
      />

      {/* Secure Full PDF Reader Modal (For verified owners) */}
      <SecurePdfViewer
        bookId={book.id}
        title={book.title}
        author={book.author}
        isOpen={isSecureViewerOpen}
        onClose={() => setIsSecureViewerOpen(false)}
        downloadAllowed={true}
      />

      {/* Slide-over Cart Drawer */}
      <CartDrawer />
    </div>
  )
}

export default function BookDetailsClient({ initialBook, slug }: BookDetailsClientProps) {
  return (
    <BookCartProvider>
      <WishlistProvider>
        <BookDetailsContent initialBook={initialBook} slug={slug} />
      </WishlistProvider>
    </BookCartProvider>
  )
}
