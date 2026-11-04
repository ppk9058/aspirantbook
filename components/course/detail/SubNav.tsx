"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Info, Layers, BookOpen, Users, HelpCircle, LucideIcon } from "lucide-react"
import type { Lang } from "@/lib/i18n/localized"

export interface SubNavItem {
  id: string
  label: string
  labelHi?: string | null
  icon?: string | null
}

interface SubNavProps {
  items: SubNavItem[]
  lang: Lang
  priceLabel?: string
  onEnroll?: () => void
  enrollLabel?: string
  isHeroOutOfView?: boolean
}

const DEFAULT_ICONS: Record<string, LucideIcon> = {
  about: Info,
  plan: Layers,
  syllabus: BookOpen,
  teachers: Users,
  questions: HelpCircle,
}

export function SubNav({
  items,
  lang,
  priceLabel,
  onEnroll,
  enrollLabel = "Enroll now",
}: SubNavProps) {
  const [active, setActive] = useState(items[0]?.id ?? "")
  const [isStuck, setIsStuck] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const navRef = useRef<HTMLElement | null>(null)

  const ids = useMemo(() => items.map((item) => item.id), [items])

  useEffect(() => {
    const handleScroll = () => {
      // Check if hero has scrolled out
      const hero = document.querySelector("section[aria-label='Course overview']")
      if (hero) {
        const rect = hero.getBoundingClientRect()
        setIsStuck(rect.bottom <= 60)
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el))

    if (sections.length === 0) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]?.target?.id) setActive(visible[0].target.id)
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: [0, 0.2] }
    )

    sections.forEach((s) => observerRef.current?.observe(s))
    return () => observerRef.current?.disconnect()
  }, [ids])

  const scrollTo = (id: string) => {
    const element = document.getElementById(id)
    if (!element) return
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    const top = element.getBoundingClientRect().top + window.scrollY - 80
    window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" })
    setActive(id)
  }

  if (items.length === 0) return null

  return (
    <nav
      ref={navRef}
      aria-label="Course section navigation"
      className="sticky top-0 z-30 w-full transition-all bg-[color:var(--cd-cream)]/95 backdrop-blur-md py-3 border-b border-[color:var(--cd-cream-dark)]"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Tab Pills */}
        <div
          role="tablist"
          className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5"
        >
          {items.map((item) => {
            const isSelected = active === item.id
            const Icon = DEFAULT_ICONS[item.id] || Info
            const labelText = lang === "hi" && item.labelHi ? item.labelHi : item.label

            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls={item.id}
                onClick={() => scrollTo(item.id)}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-bold transition-all shrink-0 ${
                  isSelected
                    ? "bg-[color:var(--cd-olive)] text-white shadow-sm"
                    : "border border-[color:var(--cd-cream-dark)] bg-[color:var(--cd-cream-card)] text-gray-800 shadow-xs hover:bg-white"
                }`}
                lang={lang}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isSelected ? "text-white" : "text-gray-600"}`} aria-hidden="true" />
                <span>{labelText}</span>
              </button>
            )
          })}
        </div>

        {/* Right sticky enroll info: shown when hero scrolled past */}
        {isStuck && priceLabel && onEnroll && (
          <div className="hidden shrink-0 items-center gap-3 pl-4 sm:flex animate-in fade-in duration-200">
            <span
              className="text-lg font-black text-[color:var(--cd-ink)]"
              style={{ fontFamily: "var(--cd-font-heading)" }}
            >
              {priceLabel}
            </span>
            <button
              type="button"
              onClick={onEnroll}
              className="rounded-lg bg-[color:var(--cd-gold)] px-4 py-2 text-xs font-extrabold text-[color:var(--cd-ink)] shadow-xs transition hover:brightness-105"
              style={{ fontFamily: "var(--cd-font-heading)" }}
            >
              {enrollLabel}
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
