"use client"

import { useEffect, useRef, useState } from "react"
import { Calendar, Check, Copy, Share2 } from "lucide-react"
import type { CalendarLecture } from "./CalendarMenu"
import type { DetailCourse } from "./types"
import { fontStackFor } from "./theme"
import type { Lang } from "@/lib/i18n/localized"
import { isValidThumbnailUrl, sanitizeThumbnailUrl, generateCourseCoverSvg } from "@/lib/courses/cover-fallback"

interface StickyCardProps {
  course: DetailCourse
  lang?: Lang
  isEnrolled: boolean
  isFree: boolean
  estimatedFinalPrice: number
  isProcessing: boolean
  buyNow: () => void
  startTrial: () => void
  thumbnailBadge?: string | null
  disclaimer?: string | null
  lectures: CalendarLecture[]
  shareUrl: string
}

export { useEnrollActions } from "./useEnrollActions"

export function StickyCard({
  course,
  lang = "en",
  isEnrolled,
  isFree,
  estimatedFinalPrice,
  isProcessing,
  buyNow,
  startTrial,
  thumbnailBadge,
  disclaimer,
  lectures,
  shareUrl,
}: StickyCardProps) {
  const [shareCopied, setShareCopied] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const finalPrice = Math.round(estimatedFinalPrice)

  const hasValidThumb = isValidThumbnailUrl(course.thumbnailUrl)
  const safeThumbnail = sanitizeThumbnailUrl(course.thumbnailUrl)
  const showFallbackCover = !hasValidThumb || imgError

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth === 0) {
      setImgError(true)
    }
  }, [safeThumbnail])

  const fallbackSvgUri = generateCourseCoverSvg({
    title: course.title,
    category: thumbnailBadge || course.technology || "Course",
  })

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: course.title,
          text: course.subtitle || course.title,
          url: shareUrl || window.location.href,
        })
        return
      } catch (err: any) {
        if (err?.name === "AbortError") return
      }
    }
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl || window.location.href)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2500)
    } catch {
      setShareOpen(true)
    }
  }

  const handleDownloadCalendar = () => {
    // Triggers download of the course's .ics endpoint
    const url = `/api/courses/${course.slug}/calendar.ics`
    const a = document.createElement("a")
    a.href = url
    a.download = `${course.slug}.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const enrollCta = lang === "hi"
    ? course.enrollCtaLabelHi || course.enrollCtaLabel || "अभी जुड़ें"
    : course.enrollCtaLabel || (isFree ? "Start learning free" : "Enroll now")

  const helperText = lang === "hi"
    ? course.enrollHelperTextHi || course.enrollHelperText || "आप अपने मोबाइल या ईमेल से साइन इन करें, फिर भुगतान करें। पहले से खरीदा है? साइन इन करें और यह यहां खुल जाएगा।"
    : course.enrollHelperText || "You sign in with your mobile or email, then pay. Already bought it? Sign in and it opens here."

  return (
    <aside
      aria-label="Course enrollment and options"
      className="w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-[color:var(--cd-cream-dark)] bg-[color:var(--cd-cream-card)] shadow-2xl transition-all"
      style={{ fontFamily: fontStackFor(lang) }}
    >
      {/* 16:10 Thumbnail Card Image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[color:var(--cd-navy)]">
        {!showFallbackCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={safeThumbnail}
            alt={course.title}
            data-testid={safeThumbnail.startsWith("data:image/svg+xml") ? "generated-cover" : "course-thumbnail"}
            onError={() => setImgError(true)}
            onLoad={(e) => {
              if (e.currentTarget.naturalWidth === 0) setImgError(true)
            }}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            data-testid="generated-cover"
            className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-white relative overflow-hidden"
            style={{
              backgroundImage: `url("${fallbackSvgUri}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <span className="sr-only">{course.title}</span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-6">
        {/* Price Row: Shows FREE strictly when isFree is true */}
        <div className="flex items-baseline gap-2 flex-wrap">
          {isFree ? (
            <span
              className="text-3xl sm:text-4xl font-black text-emerald-700"
              style={{ fontFamily: "var(--cd-font-heading)" }}
            >
              FREE
            </span>
          ) : (
            <>
              <span
                className="text-3xl sm:text-4xl font-black text-[color:var(--cd-ink)]"
                style={{ fontFamily: "var(--cd-font-heading)" }}
              >
                ₹{finalPrice.toLocaleString("en-IN")}
              </span>
              {typeof course.originalPrice === "number" && course.originalPrice > finalPrice && (
                <>
                  <span className="text-base text-gray-600 line-through">
                    ₹{course.originalPrice.toLocaleString("en-IN")}
                  </span>
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                    {course.discountPercent || Math.round(((course.originalPrice - finalPrice) / course.originalPrice) * 100)}% OFF
                  </span>
                </>
              )}
            </>
          )}
        </div>

        {/* Enroll CTA Button */}
        {!isEnrolled ? (
          <button
            type="button"
            onClick={isFree || finalPrice <= 0 ? startTrial : buyNow}
            disabled={isProcessing}
            className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[color:var(--cd-gold)] px-6 py-3.5 text-base font-extrabold text-[color:var(--cd-ink)] shadow-[0_4px_0_0_#d4aa2e] transition hover:translate-y-[1px] hover:shadow-[0_2px_0_0_#d4aa2e] hover:brightness-105 active:translate-y-[3px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
            style={{ fontFamily: "var(--cd-font-heading)" }}
          >
            {isProcessing ? (lang === "hi" ? "कृपया प्रतीक्षा करें…" : "Please wait…") : enrollCta}
          </button>
        ) : (
          <div className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-emerald-700 px-6 py-3.5 text-base font-extrabold text-white shadow-sm">
            {lang === "hi" ? "नामांकित" : "Enrolled"}
          </div>
        )}

        {/* Helper text */}
        <p className="mt-3 text-center text-xs leading-relaxed text-gray-600" lang={lang}>
          {helperText}
        </p>

        {/* Divider */}
        <hr className="my-5 border-[color:var(--cd-cream-dark)]" />

        {/* Two actions side by side: Share + Add to Calendar */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <button
            type="button"
            onClick={handleShare}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold text-gray-800 transition hover:bg-black/5 cursor-pointer"
          >
            {shareCopied ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                <span>{lang === "hi" ? "कॉपी हो गया!" : "Copied!"}</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 text-gray-600" aria-hidden="true" />
                <span>{lang === "hi" ? "कोर्स शेयर करें" : "Share this course"}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadCalendar}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold text-gray-800 transition hover:bg-black/5 cursor-pointer"
          >
            <Calendar className="h-4 w-4 text-gray-600" aria-hidden="true" />
            <span>{lang === "hi" ? "कैलेंडर में जोड़ें" : "Add to my calendar"}</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
