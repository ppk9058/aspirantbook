"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import BookStoreHeader from "@/components/books/BookStoreHeader"
import CartDrawer from "@/components/books/CartDrawer"
import EBookReaderModal from "@/components/books/EBookReaderModal"
import { BookCartProvider, useBookCart } from "@/lib/books/cartContext"
import { BOOKS_DATA } from "@/lib/books/data"
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
  ShoppingBag,
  ExternalLink,
  Check,
} from "lucide-react"

function BookDetailsContent() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const initialBook =
    BOOKS_DATA.find((b) => b.slug === slug) ||
    BOOKS_DATA.find((b) => b.id === slug) ||
    BOOKS_DATA[0]

  const [book, setBook] = useState(initialBook)

  React.useEffect(() => {
    fetch(`/api/books?slug=${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setBook(data.data)
        }
      })
      .catch(() => {})
  }, [slug])

  const { addToCart, setIsCartOpen, items } = useBookCart()
  const isItemInCart = items.some((i) => i.bookId === book.id)

  const [activeThumbnailIndex, setActiveThumbnailIndex] = useState(1) // Default to Contents page matching Image 2!
  const [activeTab, setActiveTab] = useState<"description" | "features" | "toc">("description")
  const [isReaderModalOpen, setIsReaderModalOpen] = useState(false)
  const [copiedShare, setCopiedShare] = useState(false)

  const activeImage = book.thumbnails[activeThumbnailIndex] || book.thumbnails[0] || {
    id: "cover",
    label: "Cover",
    url: book.coverImage,
    type: "cover",
  }

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

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans pb-20">
      {/* Store Header matching Image 1 & 2 */}
      <BookStoreHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-6">
        {/* ======================================================== */}
        {/* Breadcrumb Navigation & Share Button matching Image 2 */}
        {/* ======================================================== */}
        <div className="flex items-center justify-between gap-3 text-xs text-gray-500 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link href="/books" className="hover:text-black font-semibold">
              Books
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <Link href="/books" className="hover:text-black">
              {book.category}
            </Link>
            {book.subcategory && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                <span className="hover:text-black">{book.subcategory}</span>
              </>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-bold text-gray-900 truncate max-w-xs sm:max-w-md">
              {book.title}
            </span>
          </div>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs transition-colors shadow-2xs"
          >
            {copiedShare ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Share2 className="w-3.5 h-3.5 text-gray-600" />
            )}
            <span>{copiedShare ? "Copied" : "Share"}</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* MAIN PRODUCT VIEW: Two Columns matching Image 2 */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ------------------------------------------------------ */}
          {/* LEFT COLUMN: Gallery Strip + Large Preview + Action Buttons */}
          {/* ------------------------------------------------------ */}
          <div className="lg:col-span-6 xl:col-span-6 space-y-5">
            <div className="flex gap-3 sm:gap-4">
              {/* Vertical Thumbnail Strip on Left */}
              <div className="flex flex-col gap-2 shrink-0 max-h-[500px] overflow-y-auto no-scrollbar">
                {book.thumbnails.map((thumb, idx) => {
                  const isActive = idx === activeThumbnailIndex
                  return (
                    <button
                      key={thumb.id}
                      type="button"
                      onClick={() => setActiveThumbnailIndex(idx)}
                      className={`w-14 h-20 sm:w-16 sm:h-22 rounded-xl p-1 bg-white border-2 transition-all flex items-center justify-center overflow-hidden shadow-2xs ${
                        isActive
                          ? "border-sky-600 ring-2 ring-sky-200"
                          : "border-gray-200 hover:border-gray-300 opacity-75 hover:opacity-100"
                      }`}
                      title={thumb.label}
                    >
                      <img
                        src={thumb.url}
                        alt={thumb.label}
                        className="w-full h-full object-contain"
                      />
                    </button>
                  )
                })}
              </div>

              {/* Large Main Preview Page (e.g. Contents page matching Image 2) */}
              <div className="flex-1 relative aspect-[3/4] max-h-[520px] bg-white rounded-2xl border border-gray-200/90 shadow-sm p-3 sm:p-4 flex items-center justify-center overflow-hidden group">
                <img
                  src={activeImage.url}
                  alt={activeImage.label}
                  className="w-full h-full object-contain drop-shadow"
                />

                {/* Floating "Preview Book (PDF)" Pill Button matching Image 2 */}
                <button
                  type="button"
                  onClick={() => setIsReaderModalOpen(true)}
                  className="absolute bottom-4 right-4 px-3.5 py-2 rounded-xl bg-white/95 hover:bg-white text-gray-900 border border-gray-300 shadow-md font-extrabold text-xs flex items-center gap-1.5 backdrop-blur-xs transition-all hover:scale-105 active:scale-95 group/btn"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-600" />
                  <span>Preview Book (PDF)</span>
                </button>
              </div>
            </div>

            {/* Bottom Two Big Action Buttons matching Image 2 */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-1">
              <button
                type="button"
                onClick={handleAddToCart}
                className="py-3.5 px-4 rounded-xl border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-black text-sm transition-all flex items-center justify-center gap-2 shadow-sm active:scale-98"
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
          </div>

          {/* ------------------------------------------------------ */}
          {/* RIGHT COLUMN: Book Metadata, Pricing, Delivery, Tabs */}
          {/* ------------------------------------------------------ */}
          <div className="lg:col-span-6 xl:col-span-6 space-y-6">
            {/* Title & Publisher */}
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 tracking-tight leading-snug">
                {book.title}
              </h1>

              <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                <span>By</span>
                <span className="font-extrabold text-indigo-700">{book.author}</span>
                <span>&bull;</span>
                <span className="text-gray-500">{book.publisher}</span>
              </div>

              {/* Rating & Reviews matching Image 2 */}
              <div className="flex items-center gap-2.5 pt-1">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 text-white text-xs font-black shadow-2xs">
                  <span>{book.rating}</span>
                  <Star className="w-3 h-3 fill-white" />
                </div>
                <span className="text-xs text-gray-500 font-semibold">
                  {book.ratingCount} ratings and {book.reviewCount} reviews
                </span>
              </div>
            </div>

            {/* Price Box matching Image 2 */}
            <div className="p-4 sm:p-5 bg-white border border-gray-200/90 rounded-2xl shadow-2xs space-y-3">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl sm:text-4xl font-black text-gray-950">
                  ₹{book.price.toLocaleString("en-IN")}
                </span>
                <span className="text-base text-gray-400 line-through">
                  MRP ₹{book.originalPrice.toLocaleString("en-IN")}
                </span>
                <span className="text-sm font-extrabold text-emerald-600">
                  ({book.discountPercent}% OFF)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3 h-3" />
                  In Stock &bull; Instant Digital Access
                </span>
              </div>
            </div>

            {/* ======================================================== */}
            {/* eBook Delivery Highlights (No pincode needed as requested) */}
            {/* ======================================================== */}
            <div className="p-4 bg-gradient-to-r from-sky-50/80 via-white to-indigo-50/80 border border-sky-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-sky-600 fill-sky-600" />
                  Instant eBook Access Guaranteed
                </span>
                <span className="text-[11px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                  Zero Delivery Wait
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-700 pt-1">
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
            {/* Description & Smart Features Tabs matching Image 2 */}
            {/* ======================================================== */}
            <div className="bg-white border border-gray-200/90 rounded-2xl overflow-hidden shadow-2xs">
              {/* Tab Header */}
              <div className="flex border-b border-gray-200 text-xs sm:text-sm font-bold bg-gray-50/50">
                <button
                  type="button"
                  onClick={() => setActiveTab("description")}
                  className={`flex-1 py-3 px-4 border-b-2 text-center transition-colors ${
                    activeTab === "description"
                      ? "border-sky-600 text-sky-700 font-extrabold bg-white"
                      : "border-transparent text-gray-600 hover:text-black"
                  }`}
                >
                  Book Description
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("features")}
                  className={`flex-1 py-3 px-4 border-b-2 text-center transition-colors ${
                    activeTab === "features"
                      ? "border-sky-600 text-sky-700 font-extrabold bg-white"
                      : "border-transparent text-gray-600 hover:text-black"
                  }`}
                >
                  Smart Features for Smart Preparation
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("toc")}
                  className={`flex-1 py-3 px-4 border-b-2 text-center transition-colors ${
                    activeTab === "toc"
                      ? "border-sky-600 text-sky-700 font-extrabold bg-white"
                      : "border-transparent text-gray-600 hover:text-black"
                  }`}
                >
                  Table of Contents
                </button>
              </div>

              {/* Tab Body */}
              <div className="p-5 text-xs sm:text-sm text-gray-700 leading-relaxed">
                {activeTab === "description" && (
                  <div className="space-y-4">
                    <p className="font-semibold text-gray-900">
                      {book.shortDescription || book.title}
                    </p>
                    <div className="whitespace-pre-line text-gray-600 text-xs sm:text-sm space-y-2">
                      {book.description}
                    </div>

                    <div className="pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-gray-400 block font-semibold">Pages</span>
                        <span className="font-extrabold text-gray-900">{book.pages}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-semibold">Format</span>
                        <span className="font-extrabold text-gray-900">{book.format}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-semibold">File Size</span>
                        <span className="font-extrabold text-gray-900">{book.fileSize}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-semibold">Language</span>
                        <span className="font-extrabold text-gray-900">{book.language}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "features" && (
                  <div className="space-y-3">
                    <span className="font-bold text-gray-900 block mb-2">
                      Key Highlights &amp; Exam Advantage:
                    </span>
                    <ul className="space-y-2.5">
                      {book.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs text-gray-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeTab === "toc" && (
                  <div className="space-y-4">
                    {book.tableOfContents.map((section, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-xl space-y-1.5">
                        <span className="text-xs font-black text-sky-800 uppercase tracking-wider">
                          {section.section}
                        </span>
                        <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                          {section.topics.map((t, j) => (
                            <li key={j}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive eBook PDF Reader Modal */}
      <EBookReaderModal
        book={book}
        isOpen={isReaderModalOpen}
        onClose={() => setIsReaderModalOpen(false)}
        initialPageIndex={activeThumbnailIndex}
      />

      {/* Slide-over Cart Drawer */}
      <CartDrawer />
    </div>
  )
}

export default function BookDetailsPage() {
  return (
    <BookCartProvider>
      <BookDetailsContent />
    </BookCartProvider>
  )
}
