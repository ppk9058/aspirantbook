"use client"

import React, { useState, useRef } from "react"
import { Book } from "@/lib/books/types"
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  BookOpen,
  CheckCircle2,
  List,
  Sun,
  Moon,
} from "lucide-react"

interface EBookReaderModalProps {
  book: Book
  isOpen: boolean
  onClose: () => void
  initialPageIndex?: number
}

export default function EBookReaderModal({
  book,
  isOpen,
  onClose,
  initialPageIndex = 0,
}: EBookReaderModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialPageIndex)
  const [zoom, setZoom] = useState(100)
  const [theme, setTheme] = useState<"light" | "dark" | "sepia">("light")
  const [showToc, setShowToc] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const touchStartXRef = useRef<number | null>(null)
  const touchEndXRef = useRef<number | null>(null)

  if (!isOpen) return null

  const pages = book.thumbnails.length > 0 ? book.thumbnails : [
    { id: "1", label: "Cover", url: book.coverImage, type: "cover" as const }
  ]
  const currentPage = pages[currentIndex] || pages[0]

  const handleNext = () => {
    if (currentIndex < pages.length - 1) setCurrentIndex(currentIndex + 1)
  }

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStartXRef.current || !touchEndXRef.current) return
    const distance = touchStartXRef.current - touchEndXRef.current
    const isLeftSwipe = distance > 45
    const isRightSwipe = distance < -45

    if (isLeftSwipe && currentIndex < pages.length - 1) {
      setCurrentIndex((prev) => Math.min(pages.length - 1, prev + 1))
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex((prev) => Math.max(0, prev - 1))
    }

    touchStartXRef.current = null
    touchEndXRef.current = null
  }

  const handleDownload = () => {
    setIsDownloading(true)
    setTimeout(() => {
      setIsDownloading(false)
      const blob = new Blob([
        `%PDF-1.4\naspirantbook Official Verified eBook Sample\nTitle: ${book.title}\nPublisher: ${book.publisher}\nPages: ${book.pages}\n`
      ], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${book.slug}-sample-ebook.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 600)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Top Reader Navigation Bar */}
      <div className="h-14 bg-gray-900 border-b border-gray-800 px-4 sm:px-6 flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setShowToc(!showToc)}
            className={`p-2 rounded-lg transition-colors ${
              showToc ? "bg-sky-600 text-white" : "hover:bg-gray-800 text-gray-300"
            }`}
            title="Table of Contents"
          >
            <List className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold truncate max-w-xs sm:max-w-md md:max-w-lg">
              {book.title}
            </h3>
            <span className="text-[11px] text-gray-400 block">
              {currentPage.label} &bull; Page {currentIndex + 1} of {pages.length}
            </span>
          </div>
        </div>

        {/* Reader Controls */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Zoom Controls */}
          <div className="hidden sm:flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setZoom(Math.max(70, zoom - 15))}
              className="p-1 hover:bg-gray-700 rounded text-gray-300"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono px-1.5 text-gray-300">{zoom}%</span>
            <button
              onClick={() => setZoom(Math.min(150, zoom + 15))}
              className="p-1 hover:bg-gray-700 rounded text-gray-300"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Download PDF Button */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isDownloading ? "Downloading..." : "Download PDF"}
            </span>
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Reader Stage */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Collapsible Table of Contents Sidebar */}
        {showToc && (
          <aside className="w-64 sm:w-80 bg-gray-900 border-r border-gray-800 p-4 overflow-y-auto shrink-0 space-y-4 animate-in slide-in-from-left duration-200">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">
              Sample Pages &amp; Contents
            </h4>
            <div className="space-y-1.5">
              {pages.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setCurrentIndex(idx)
                    setShowToc(false)
                  }}
                  className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                    idx === currentIndex
                      ? "bg-sky-600 text-white"
                      : "text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  <span className="truncate">{p.label}</span>
                  <span className="text-[10px] opacity-75 font-mono">P.{idx + 1}</span>
                </button>
              ))}
            </div>

            {book.tableOfContents && (
              <div className="pt-4 border-t border-gray-800 space-y-3">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">
                  Full Syllabus Index
                </h4>
                {book.tableOfContents.map((toc, i) => (
                  <div key={i} className="text-xs space-y-1">
                    <span className="font-bold text-sky-400">{toc.section}</span>
                    <ul className="text-gray-400 text-[11px] list-disc list-inside space-y-0.5">
                      {toc.topics.slice(0, 3).map((t, j) => (
                        <li key={j} className="truncate">{t}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}

        {/* Page Canvas Container */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex-1 overflow-auto flex items-center justify-center p-2 sm:p-8 bg-[#18181b] touch-pan-y"
        >
          <div
            style={{ width: `${zoom}%`, maxWidth: "850px" }}
            className="transition-all duration-200 shadow-2xl rounded-xl overflow-hidden bg-white border border-gray-700"
          >
            <img
              src={currentPage.url}
              alt={currentPage.label}
              className="w-full h-auto object-contain select-none"
              draggable={false}
            />
          </div>
        </div>

        {/* Floating Page Flip Buttons (Desktop & Tablet) */}
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white items-center justify-center shadow-lg backdrop-blur-xs disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="Previous Page"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={handleNext}
          disabled={currentIndex === pages.length - 1}
          className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white items-center justify-center shadow-lg backdrop-blur-xs disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="Next Page"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Bottom Navigation Bar with Swipe Hint */}
      <div className="sm:hidden flex items-center justify-between px-4 py-2 bg-gray-900 border-t border-gray-800 text-white safe-area-bottom shrink-0">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-xs font-bold active:scale-95 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Prev</span>
        </button>

        <div className="flex flex-col items-center">
          <span className="text-xs font-mono font-semibold text-gray-200">
            Page {currentIndex + 1} of {pages.length}
          </span>
          <span className="text-[10px] text-gray-400">Swipe to flip</span>
        </div>

        <button
          type="button"
          onClick={handleNext}
          disabled={currentIndex === pages.length - 1}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-xs font-bold active:scale-95 transition-all"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
