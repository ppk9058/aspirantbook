"use client"

import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Sparkles, ChevronRight, Zap } from "lucide-react"
import type { HomepagePromoCard } from "@/lib/homepage-cards-service"

interface MobilePromoCarouselProps {
  cards: HomepagePromoCard[]
}

export default function MobilePromoCarousel({ cards }: MobilePromoCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const handleScroll = () => {
      const scrollLeft = el.scrollLeft
      const width = el.offsetWidth
      if (width > 0) {
        const idx = Math.round(scrollLeft / width)
        setActiveIndex(Math.min(cards.length - 1, Math.max(0, idx)))
      }
    }

    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => el.removeEventListener("scroll", handleScroll)
  }, [cards.length])

  if (!cards || cards.length === 0) return null

  return (
    <div className="lg:hidden relative w-full pt-1">
      {/* Scroll-Snap Horizontal Container */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar px-3 gap-3"
        style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
      >
        {cards.map((card, idx) => (
          <div
            key={card.id || idx}
            className="w-[88vw] max-w-[360px] shrink-0 snap-center"
          >
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white p-4 shadow-md border border-slate-800/80 flex flex-col justify-between h-[164px]">
              {/* Subtle brand glow behind card */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Top Row: Tag, Discount & Badge */}
              <div className="flex items-center justify-between gap-2 z-10">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    {card.classTag}
                  </span>
                  {card.discount && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>{card.discount}</span>
                    </span>
                  )}
                </div>

                {card.isLive && (
                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                    <span>Live</span>
                  </span>
                )}
              </div>

              {/* Middle Row: Title & Subtitle */}
              <div className="z-10 mt-1">
                <h3 className="font-extrabold text-sm text-white line-clamp-2 leading-snug">
                  {card.title}
                </h3>
                {card.targetText && (
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                    {card.targetText}
                  </p>
                )}
              </div>

              {/* Bottom Row: Price & Full-Width CTA */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/80 z-10">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-extrabold text-teal-300">
                    {card.price}
                  </span>
                  {card.originalPrice && (
                    <span className="text-[10px] line-through text-slate-500">
                      {card.originalPrice}
                    </span>
                  )}
                </div>

                <Link
                  href={card.buttonLink}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs flex items-center gap-1 shadow-xs active:scale-95 transition-transform"
                >
                  <span>{card.buttonText || "Explore"}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Dots */}
      {cards.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2.5">
          {cards.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? "w-5 bg-teal-500 dark:bg-teal-400"
                  : "w-1.5 bg-slate-300 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
