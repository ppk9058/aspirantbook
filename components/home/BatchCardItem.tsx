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
            className="bg-white rounded-2xl border border-gray-200/90 hover:border-[#5B47FB]/50 shadow-xs hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between cursor-pointer group hover:-translate-y-1 select-none"
        >
            <div>
                {/* Top Banner Graphic */}
                <div className="relative h-48 w-full bg-gray-50 overflow-hidden border-b border-gray-100">
                    <Image
                        src={batch.image}
                        alt={batch.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Status Badges */}
                    {liveDemoBadge ? (
                        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600 backdrop-blur-xs text-white text-[10px] font-black uppercase tracking-wider shadow-sm animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                            <span>🔴 {liveDemoBadge}</span>
                        </div>
                    ) : batch.isLive ? (
                        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-pulse" />
                            <span>Video Course</span>
                        </div>
                    ) : (
                        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/95 backdrop-blur-xs text-gray-950 text-[10px] font-black uppercase tracking-wider shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-950 animate-pulse" />
                            <span>Coming Soon</span>
                        </div>
                    )}
                </div>

                {/* Card Details Body */}
                <div className="p-5 space-y-4">
                    {/* Class Tag and Language Tag Row */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#F26522]">
                            {batch.classTag}
                        </span>
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded uppercase tracking-wider">
                            {batch.language}
                        </span>
                    </div>

                    {/* Course Title */}
                    <h3 className="font-extrabold text-base sm:text-lg text-gray-900 group-hover:text-[#5B47FB] transition-colors line-clamp-1 leading-snug">
                        {batch.title}
                    </h3>

                    {/* Syllabus / Target Meta */}
                    <div className="space-y-2 text-xs text-gray-600">
                        <div className="flex items-start gap-2.5">
                            <BookOpen className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="leading-tight">{batch.targetText}</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="leading-tight text-gray-500">{batch.scheduleText}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Card Footer: Pricing & Action Button */}
            <div className="p-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                {/* Pricing column */}
                <div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-lg sm:text-xl font-black text-gray-900">
                            {batch.price}
                        </span>
                        {batch.originalPrice && (
                            <span className="text-xs text-gray-400 line-through">
                                {batch.originalPrice}
                            </span>
                        )}
                    </div>
                    {batch.discount && (
                        <span className="text-[11px] font-bold text-emerald-600 block -mt-0.5">
                            {batch.discount}
                        </span>
                    )}
                </div>

                {/* Right Action Button with Arrow */}
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={handleButtonClick}
                        disabled={isEnrolling}
                        className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer z-10 active:scale-95 disabled:opacity-75 ${
                            isComingSoon
                                ? "bg-amber-500 hover:bg-amber-600 text-gray-950 font-black shadow-amber-200"
                                : isFree
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
                                : "bg-[#5B47FB] hover:bg-[#4A38E8] text-white shadow-indigo-200"
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
                    <div className="p-2.5 rounded-xl border border-gray-200 text-gray-600 group-hover:bg-gray-100 group-hover:border-gray-300 transition-colors pointer-events-none">
                        <ChevronRight className="h-4 w-4" />
                    </div>
                </div>
            </div>
        </div>
    )
}
