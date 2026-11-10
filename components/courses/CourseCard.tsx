"use client"

import { memo } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Star, Users, Clock, PlayCircle, BookOpen } from "lucide-react"
import { cleanDescriptionSnippet } from "@/lib/utils"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"
import { useSamePageBuyNow } from "@/lib/payments/useSamePageBuyNow"
import { CoursePromoBadge } from "@/components/course/CoursePromoBadge"
import type { CourseBadgeInfo } from "@/lib/coupons/badge-query"

interface CourseCardProps {
    course: {
        id: string
        title: string
        slug: string
        description: string
        thumbnailUrl: string | null
        difficulty: string
        rating: number
        enrollmentCount: number
        duration: number
        isPremium: boolean
    }
    enrolled?: boolean
    progress?: number
    index?: number
    promoBadge?: CourseBadgeInfo | null
}

function CourseCard({
    course,
    enrolled = false,
    progress = 0,
    index,
    promoBadge,
}: CourseCardProps) {
    const router = useRouter()
    const { data: session } = useSession()
    const { openMobileAuth } = useMobileAuth()

    const { handleBuyNow, isProcessing } = useSamePageBuyNow()

    const isAboveFold = typeof index === "number" && index < 4
    const hours = Math.floor(course.duration / 60)
    const minutes = course.duration % 60
    const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes || 15}m`

    const isFree = !course.isPremium

    const handleActionButtonClick = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (enrolled) {
            router.push(`/courses/${course.slug}`)
            return
        }

        if (isFree) {
            await handleBuyNow({
                type: "course",
                id: course.id,
                slug: course.slug,
                title: course.title,
                price: "Free",
                isFree: true,
                image: course.thumbnailUrl || undefined,
            }, () => {
                router.push("/my-learning")
                router.refresh()
            })
            return
        }

        // Paid course: direct same-page Buy Now
        await handleBuyNow({
            type: "course",
            id: course.id,
            slug: course.slug,
            title: course.title,
            price: 499,
            isFree: false,
            image: course.thumbnailUrl || undefined,
        }, () => {
            router.refresh()
        })
    }

    return (
        <Link href={`/courses/${course.slug}`} prefetch={true} className="group block h-full">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-[#10162F] dark:border-slate-700 shadow-[4px_4px_0px_0px_#10162F] dark:shadow-none hover:shadow-[6px_6px_0px_0px_#10162F] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col h-full">
                {/* Thumbnail Header */}
                <div className="relative h-44 sm:h-48 w-full bg-[#FFF5EB] dark:bg-slate-900 border-b-2 border-[#10162F] dark:border-slate-700 overflow-hidden">
                    {course.thumbnailUrl ? (
                        <Image
                            src={course.thumbnailUrl}
                            alt={course.title}
                            fill
                            priority={isAboveFold}
                            loading={isAboveFold ? "eager" : "lazy"}
                            decoding="async"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 384px"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#FFF9F0] to-[#FFF0DE] dark:from-slate-800 dark:to-slate-900 text-[#10162F] dark:text-white">
                            <BookOpen className="h-12 w-12 stroke-[1.5] text-indigo-600 dark:text-indigo-400 mb-2" />
                            <span className="text-xs font-black uppercase tracking-wider text-[#10162F] dark:text-white">
                                Interactive Course
                            </span>
                        </div>
                    )}

                    {/* Badges Top Left & Right */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
                        {course.isPremium ? (
                            <span className="px-2.5 py-0.5 bg-[#10162F] text-white text-[10px] font-black rounded-full uppercase tracking-wider border border-[#10162F]">
                                Pro
                            </span>
                        ) : (
                            <span className="px-2.5 py-0.5 bg-[#FFD15C] text-black text-[10px] font-black rounded-full uppercase tracking-wider border border-[#10162F]">
                                Free Course
                            </span>
                        )}

                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white dark:bg-slate-800 text-[#10162F] dark:text-white border border-[#10162F] dark:border-slate-600">
                            {course.difficulty}
                        </span>
                    </div>

                    {/* Promotional Coupon Badge on Thumbnail (if active) */}
                    {promoBadge && (
                        <div className="absolute bottom-3 right-3 z-10 pointer-events-none">
                            <CoursePromoBadge
                                badgeLabel={promoBadge.badgeLabel}
                                badgeShape={promoBadge.badgeShape}
                                badgeColor={promoBadge.badgeColor}
                                discountType={promoBadge.discountType}
                                discountValue={promoBadge.discountValue}
                                discountText={promoBadge.discountText}
                            />
                        </div>
                    )}

                    {/* Rating bottom left - show ONLY if rating > 0 */}
                    {typeof course.rating === "number" && course.rating > 0 ? (
                        <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white dark:bg-slate-800 border border-[#10162F] dark:border-slate-700 px-2.5 py-0.5 rounded-full text-[#10162F] dark:text-white text-xs font-black shadow-xs z-10">
                            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                            <span>{course.rating.toFixed(1)}</span>
                        </div>
                    ) : null}

                    {/* Progress Bar: show ONLY when real progress > 0 exists, otherwise render nothing */}
                    {enrolled && typeof progress === "number" && progress > 0 ? (
                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200 dark:bg-slate-700 border-t border-[#10162F]">
                            <div
                                className="h-full bg-indigo-600 transition-all"
                                style={{ width: `${Math.min(100, progress)}%` }}
                            />
                        </div>
                    ) : null}
                </div>

                {/* Content */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                        <h3 className="font-extrabold text-base text-[#10162F] dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {course.title}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-2 leading-relaxed font-normal">
                            {cleanDescriptionSnippet(course.description, 130)}
                        </p>
                    </div>

                    {/* Footer Stats & Action */}
                    <div className="pt-3 border-t border-gray-100 dark:border-slate-700">
                        {(course.duration > 0 || (course.enrollmentCount && course.enrollmentCount > 0)) ? (
                            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium mb-3">
                                {course.duration > 0 ? (
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5 text-[#10162F] dark:text-slate-300" />
                                        {durationText}
                                    </span>
                                ) : <span />}
                                {course.enrollmentCount && course.enrollmentCount > 0 ? (
                                    <span className="flex items-center gap-1">
                                        <Users className="h-3.5 w-3.5 text-[#10162F] dark:text-slate-300" />
                                        {course.enrollmentCount >= 1000
                                            ? `${(course.enrollmentCount / 1000).toFixed(1)}k learners`
                                            : `${course.enrollmentCount} learners`}
                                    </span>
                                ) : null}
                            </div>
                        ) : null}

                        {/* Action Button: Watch Now (enrolled), Enroll (free), Buy Now (paid) */}
                        <button
                            type="button"
                            onClick={handleActionButtonClick}
                            className={`w-full py-2.5 px-3 min-h-[44px] rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-[2px_2px_0px_#10162F] dark:shadow-none border border-[#10162F] dark:border-slate-700 cursor-pointer ${
                                enrolled
                                    ? "bg-indigo-700 hover:bg-indigo-800 text-white"
                                    : isFree
                                    ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                                    : "bg-amber-700 hover:bg-amber-800 text-white"
                            }`}
                        >
                            <PlayCircle className="h-4 w-4" />
                            <span>
                                {enrolled
                                    ? "Watch Now"
                                    : isFree
                                    ? "Enroll"
                                    : "Buy Now"}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </Link>
    )
}

export default memo(CourseCard)
