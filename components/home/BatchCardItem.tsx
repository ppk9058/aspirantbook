"use client"

import React, { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { BookOpen, Calendar, ChevronRight, Loader2 } from "lucide-react"
import { COURSE_SLUG_MAP, type BatchCourse } from "./homepage-courses.data"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"

interface BatchCardItemProps {
    batch: BatchCourse
    liveDemoBadge?: string | null
}

// Colourful, per-audience badge tints so the grid feels vibrant without any
// invented data. Falls back to a neutral brand tint for unknown labels.
function classTagStyle(classTag: string): string {
    const tag = classTag.toLowerCase()
    if (tag.includes("upsc")) return "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
    if (tag.includes("bpsc")) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
    if (tag.includes("skill")) return "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300"
    if (tag.includes("class")) return "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300"
    return "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300"
}

export default function BatchCardItem({ batch, liveDemoBadge }: BatchCardItemProps) {
    const router = useRouter()
    const { data: session } = useSession()
    const { openMobileAuth } = useMobileAuth()
    const [isEnrolling, setIsEnrolling] = useState(false)

    const p = (batch.price || "").toLowerCase()
    const isComingSoon =
        batch.isLive === false ||
        p.includes("coming") ||
        (batch.buttonText || "").toLowerCase().includes("coming") ||
        (batch.buttonText || "").toLowerCase().includes("notify")
    const isFree = !isComingSoon && (!batch.price || p.includes("free") || p === "0" || p === "₹0")
    const btnLabel = isComingSoon ? "Coming Soon" : isFree ? "Enroll" : "Buy Now"
    const actionType = isFree ? "enroll" : "buy"
    const courseSlug =
        batch.slug ||
        COURSE_SLUG_MAP[batch.id] ||
        (batch.buttonLink && batch.buttonLink.startsWith("/courses/") && batch.buttonLink !== "/courses"
            ? batch.buttonLink.replace("/courses/", "")
            : batch.id)
    const detailsUrl = `/courses/${courseSlug}`

    const handleCardClick = () => {
        // All students (authenticated or unlogged) visit course details page or Coming Soon page
        router.push(detailsUrl)
    }

    const handleButtonClick = async (e: React.MouseEvent) => {
        // Stop bubbling to card
        e.stopPropagation()
        e.preventDefault()

        if (isComingSoon) {
            // Coming soon course -> navigate directly to its dedicated Coming Soon page
            router.push(detailsUrl)
            return
        }

        // If student is already logged in: no need for OTP
        if (session?.user) {
            if (isFree) {
                // Free course -> enroll immediately (if not already) and redirect to My Batches
                setIsEnrolling(true)
                try {
                    await fetch("/api/auth/mobile-login", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            phoneNumber: (session.user as any).phoneNumber || "0000000000",
                            courseId: courseSlug,
                        }),
                    })
                } catch (err) {
                    console.error("Auto enrollment error:", err)
                } finally {
                    setIsEnrolling(false)
                }
                router.push("/my-learning")
                router.refresh()
            } else {
                // Paid course on homepage -> navigate to course details page, next to payment page
                router.push(detailsUrl)
            }
            return
        }

        // If NOT logged in -> Open Mobile Number & OTP popup
        openMobileAuth({
            course: {
                id: batch.id,
                slug: courseSlug,
                title: batch.title,
                price: batch.price,
                isFree,
                image: batch.image,
                classTag: batch.classTag,
                targetText: batch.targetText,
            },
            actionType,
        })
    }

    return (
        <div
            onClick={handleCardClick}
            data-batch-card
            data-batch-search={`${batch.title} ${batch.targetText}`}
            className="group flex cursor-pointer select-none flex-col justify-between overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400/60 hover:shadow-xl dark:border-white/10 dark:bg-gray-900 dark:hover:border-indigo-500/50"
        >
            <div>
                {/* Top Banner Graphic */}
                <div className="relative h-44 w-full overflow-hidden border-b border-gray-100 bg-gray-50 sm:h-48 dark:border-white/10 dark:bg-white/5">
                    <Image
                        src={batch.image}
                        alt={batch.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {/* Status Badges */}
                    {liveDemoBadge ? (
                        <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm backdrop-blur-sm">
                            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white" />
                            <span>🔴 {liveDemoBadge}</span>
                        </div>
                    ) : batch.isLive ? (
                        <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-emerald-600/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm backdrop-blur-sm">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-200" />
                            <span>Video Course</span>
                        </div>
                    ) : (
                        <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-amber-500/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-gray-950 shadow-sm backdrop-blur-sm">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-950" />
                            <span>Coming Soon</span>
                        </div>
                    )}
                </div>

                {/* Card Details Body */}
                <div className="space-y-4 p-4 sm:p-5">
                    {/* Class Tag and Language Tag Row */}
                    <div className="flex items-center justify-between gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${classTagStyle(batch.classTag)}`}>
                            {batch.classTag}
                        </span>
                        <span className="rounded bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-700 dark:bg-white/10 dark:text-gray-300">
                            {batch.language}
                        </span>
                    </div>

                    {/* Course Title */}
                    <h3 className="line-clamp-2 text-base font-extrabold leading-snug text-gray-900 transition-colors group-hover:text-indigo-700 sm:text-lg dark:text-white dark:group-hover:text-indigo-300">
                        {batch.title}
                    </h3>

                    {/* Syllabus / Target Meta */}
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-start gap-2.5">
                            <BookOpen className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                            <span className="leading-tight">{batch.targetText}</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                            <span className="leading-tight">{batch.scheduleText}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Card Footer: Pricing & Action Button */}
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 p-4 pt-3 sm:p-5 sm:pt-3 dark:border-white/10">
                {/* Pricing column */}
                <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-black text-gray-900 sm:text-xl dark:text-white">
                            {batch.price}
                        </span>
                        {batch.originalPrice && (
                            <span className="text-xs text-gray-500 line-through dark:text-gray-400">
                                {batch.originalPrice}
                            </span>
                        )}
                    </div>
                    {batch.discount && (
                        <span className="-mt-0.5 block text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                            {batch.discount}
                        </span>
                    )}
                </div>

                {/* Right Action Button with Arrow */}
                <div className="flex flex-shrink-0 items-center gap-1.5">
                    <button
                        type="button"
                        onClick={handleButtonClick}
                        disabled={isEnrolling}
                        className={`z-10 flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-5 text-sm font-extrabold shadow-sm transition-all active:scale-95 disabled:opacity-75 ${
                            isComingSoon
                                ? "bg-amber-500 font-black text-gray-950 shadow-amber-200 hover:bg-amber-600"
                                : isFree
                                ? "bg-emerald-700 text-white shadow-emerald-200 hover:bg-emerald-800"
                                : "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700"
                        }`}
                    >
                        {isEnrolling ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Enrolling...</span>
                            </>
                        ) : (
                            <span>{btnLabel}</span>
                        )}
                    </button>
                    <div className="pointer-events-none flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors group-hover:border-gray-300 group-hover:bg-gray-100 dark:border-white/10 dark:text-gray-300 dark:group-hover:bg-white/10">
                        <ChevronRight className="h-4 w-4" />
                    </div>
                </div>
            </div>
        </div>
    )
}
