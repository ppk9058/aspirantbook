"use client"

import { memo } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Star, Users, Clock, PlayCircle, BookOpen } from "lucide-react"
import { cleanDescriptionSnippet } from "@/lib/utils"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"

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
}

function CourseCard({
    course,
    enrolled = false,
    progress = 0,
    index,
}: CourseCardProps) {
    const router = useRouter()
    const { data: session } = useSession()
    const { openMobileAuth } = useMobileAuth()

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

        if (session?.user) {
            // Logged in
            if (isFree) {
                try {
                    await fetch("/api/auth/mobile-login", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            phoneNumber: (session.user as any).phoneNumber || "0000000000",
                            courseId: course.slug || course.id,
                        }),
                    })
                } catch (err) {
                    console.error("Enrollment error:", err)
                }
                router.push("/my-learning")
                router.refresh()
            } else {
                router.push(`/courses/${course.slug}`)
            }
        } else {
            // Unauthenticated -> Open Mobile Number & OTP Modal
            openMobileAuth({
                course: {
                    id: course.id,
                    slug: course.slug,
                    title: course.title,
                    price: isFree ? "Free" : "Pro",
                    isFree,
                    image: course.thumbnailUrl || undefined,
                },
                actionType: isFree ? "enroll" : "buy",
            })
        }
    }

    return (
        <Link href={`/courses/${course.slug}`} prefetch={true} className="group block h-full">
            <div className="bg-white rounded-2xl border-2 border-[#10162F] shadow-[4px_4px_0px_0px_#10162F] hover:shadow-[6px_6px_0px_0px_#10162F] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col h-full">
                {/* Thumbnail Header */}
                <div className="relative h-44 sm:h-48 w-full bg-[#FFF5EB] border-b-2 border-[#10162F] overflow-hidden">
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
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#FFF9F0] to-[#FFF0DE] text-[#10162F]">
                            <BookOpen className="h-12 w-12 stroke-[1.5] text-[#3A10E5] mb-2" />
                            <span className="text-xs font-black uppercase tracking-wider text-[#10162F]">
                                Interactive Course
                            </span>
                        </div>
                    )}

                    {/* Badges Top Left & Right */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                        {course.isPremium ? (
                            <span className="px-2.5 py-0.5 bg-[#10162F] text-white text-[10px] font-black rounded-full uppercase tracking-wider border border-[#10162F]">
                                Pro
                            </span>
                        ) : (
                            <span className="px-2.5 py-0.5 bg-[#FFD15C] text-black text-[10px] font-black rounded-full uppercase tracking-wider border border-[#10162F]">
                                Free Course
                            </span>
                        )}

                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white text-[#10162F] border border-[#10162F]">
                            {course.difficulty}
                        </span>
                    </div>

                    {/* Rating bottom left - show ONLY if rating > 0 */}
                    {typeof course.rating === "number" && course.rating > 0 ? (
                        <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white border border-[#10162F] px-2.5 py-0.5 rounded-full text-[#10162F] text-xs font-black shadow-xs">
                            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                            <span>{course.rating.toFixed(1)}</span>
                        </div>
                    ) : null}

                    {/* Progress Bar (if enrolled) */}
                    {enrolled && (
                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200 border-t border-[#10162F]">
                            <div
                                className="h-full bg-[#3A10E5] transition-all"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                        <h3 className="font-extrabold text-base text-[#10162F] line-clamp-2 group-hover:text-[#3A10E5] transition-colors">
                            {course.title}
                        </h3>
                        <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed font-normal">
                            {cleanDescriptionSnippet(course.description, 130)}
                        </p>
                    </div>

                    {/* Footer Stats & Action */}
                    <div className="pt-3 border-t border-gray-100">
                        {(course.duration > 0 || (course.enrollmentCount && course.enrollmentCount > 0)) ? (
                            <div className="flex items-center justify-between text-xs text-gray-600 font-medium mb-3">
                                {course.duration > 0 ? (
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5 text-[#10162F]" />
                                        {durationText}
                                    </span>
                                ) : <span />}
                                {course.enrollmentCount && course.enrollmentCount > 0 ? (
                                    <span className="flex items-center gap-1">
                                        <Users className="h-3.5 w-3.5 text-[#10162F]" />
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
                            className={`w-full py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-[2px_2px_0px_#10162F] border border-[#10162F] cursor-pointer ${
                                enrolled
                                    ? "bg-[#3A10E5] hover:bg-[#300ec2] text-white"
                                    : isFree
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "bg-[#F26522] hover:bg-[#e05310] text-white"
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
