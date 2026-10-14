"use client"

import React, { useState } from "react"
import { Heart, ZoomIn } from "lucide-react"

export interface BookGalleryProps {
  images: string[]
  title: string
  isWishlisted?: boolean
  onToggleWishlist?: () => void
  showHeart?: boolean
  className?: string
}

export default function BookImageGallery({
  images,
  title,
  isWishlisted = false,
  onToggleWishlist,
  showHeart = true,
  className = "",
}: BookGalleryProps) {
  const displayImages = images && images.length > 0
    ? images
    : ["/images/books/cbse-10-solved-papers.svg"]

  const [activeIndex, setActiveIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 })

  const currentImage = displayImages[activeIndex] || displayImages[0]

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setZoomPos({ x, y })
  }

  return (
    <div className={`flex flex-col sm:flex-row gap-3 sm:gap-4 items-start ${className}`}>
      {/* Thumbnail Bar (Left on sm+, bottom on mobile if many) */}
      {displayImages.length > 1 && (
        <div className="flex sm:flex-col gap-2 shrink-0 max-h-[460px] overflow-x-auto sm:overflow-y-auto no-scrollbar order-2 sm:order-1 w-full sm:w-auto">
          {displayImages.map((imgUrl, idx) => {
            const isActive = idx === activeIndex
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`w-14 h-18 sm:w-16 sm:h-22 rounded-xl p-1 bg-white dark:bg-slate-900 border-2 transition-all flex items-center justify-center overflow-hidden shrink-0 shadow-2xs ${
                  isActive
                    ? "border-sky-600 ring-2 ring-sky-200 dark:ring-sky-900"
                    : "border-gray-200 dark:border-slate-700 hover:border-gray-400 opacity-80 hover:opacity-100"
                }`}
                title={`View image ${idx + 1}`}
              >
                <img
                  src={imgUrl}
                  alt={`${title} thumbnail ${idx + 1}`}
                  className="w-full h-full object-contain"
                />
              </button>
            )
          })}
        </div>
      )}

      {/* Main Image Stage with Flipkart-style Zoom & Heart Badge */}
      <div className="flex-1 w-full order-1 sm:order-2">
        <div
          className="relative aspect-[3/4] max-h-[520px] bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/90 dark:border-slate-700 shadow-sm p-4 flex items-center justify-center overflow-hidden group cursor-crosshair"
          onMouseEnter={() => setIsZoomed(true)}
          onMouseLeave={() => setIsZoomed(false)}
          onMouseMove={handleMouseMove}
        >
          {/* Main Image with Zoom Effect */}
          <div
            className="w-full h-full flex items-center justify-center overflow-hidden transition-transform duration-100"
            style={
              isZoomed
                ? {
                    transform: "scale(1.8)",
                    transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                  }
                : undefined
            }
          >
            <img
              src={currentImage}
              alt={title}
              className="w-full h-full object-contain drop-shadow select-none pointer-events-none"
            />
          </div>

          {/* Heart / Wishlist Icon in Top Right Corner of Image */}
          {showHeart && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onToggleWishlist?.()
              }}
              className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-white/95 dark:bg-slate-800/95 hover:bg-white dark:hover:bg-slate-800 shadow-md border border-gray-200 dark:border-slate-700 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
              aria-label="Wishlist toggle"
            >
              <Heart
                className={`w-5 h-5 transition-colors ${
                  isWishlisted
                    ? "fill-rose-500 text-rose-500"
                    : "text-gray-500 hover:text-rose-500"
                }`}
              />
            </button>
          )}

          {/* Zoom hint indicator */}
          <div className="absolute bottom-3 left-3 pointer-events-none bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <ZoomIn className="w-3 h-3" />
            <span>Hover to zoom</span>
          </div>
        </div>
      </div>
    </div>
  )
}
