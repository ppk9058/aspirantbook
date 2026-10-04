"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { enrollInCourse } from "@/lib/actions/course/enrollment"
import { toast } from "sonner"
import { Loader2, Lock, ShoppingCart, Sparkles, CheckCheck } from "lucide-react"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"

interface EnrollButtonProps {
    courseId: string
    isPremium: boolean
    courseSlug?: string
    courseTitle?: string
    isEnrolled?: boolean
}

export default function EnrollButton({
    courseId,
    isPremium,
    courseSlug,
    courseTitle,
    isEnrolled = false,
}: EnrollButtonProps) {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const { data: session } = useSession()
    const { openMobileAuth } = useMobileAuth()

    const targetCourseParam = courseSlug || courseId

    const handleClick = async () => {
        // Paid course flow: "Buy Now"
        if (isPremium) {
            if (session?.user) {
                router.push(`/checkout?courseId=${targetCourseParam}`)
            } else {
                openMobileAuth({
                    course: {
                        id: courseId,
                        slug: courseSlug,
                        title: courseTitle || "Premium Course",
                        price: "Pro",
                        isFree: false,
                    },
                    actionType: "buy",
                })
            }
            return
        }

        // Free course flow: "Enroll"
        if (session?.user) {
            setIsLoading(true)
            try {
                const res = await fetch("/api/auth/mobile-login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        phoneNumber: (session.user as any).phoneNumber || "0000000000",
                        courseId: targetCourseParam,
                    }),
                })
                const data = await res.json()
                if (res.ok && data.success) {
                    toast.success("Successfully enrolled in course!")
                    router.push("/my-learning")
                    router.refresh()
                } else {
                    // Fallback to server action
                    const result = await enrollInCourse(courseId)
                    toast.success(result.message)
                    router.push("/my-learning")
                    router.refresh()
                }
            } catch (error: any) {
                toast.error(error.message || "Failed to enroll")
            } finally {
                setIsLoading(false)
            }
        } else {
            // Unauthenticated user -> Open Mobile Number & OTP Modal
            openMobileAuth({
                course: {
                    id: courseId,
                    slug: courseSlug,
                    title: courseTitle || "Free Course",
                    price: "Free",
                    isFree: true,
                },
                actionType: "enroll",
            })
        }
    }

    if (isEnrolled) {
        return (
            <Button
                onClick={() => router.push(`/courses/${courseSlug || courseId}/learn`)}
                className="font-black text-sm sm:text-base px-8 py-6 rounded-xl border-2 border-emerald-700 bg-emerald-600 hover:bg-emerald-700 text-white shadow-[3px_3px_0px_0px_#065f46] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
            >
                <CheckCheck className="mr-2 h-4 w-4 stroke-[2.5]" />
                Enrolled • Continue Learning
            </Button>
        )
    }

    return (
        <Button
            onClick={handleClick}
            disabled={isLoading}
            className={`font-black text-sm sm:text-base px-8 py-6 rounded-xl border-2 border-[#10162F] shadow-[3px_3px_0px_0px_#10162F] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer ${
                isPremium
                    ? "bg-[#F26522] hover:bg-[#E05310] text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
        >
            {isLoading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enrolling...
                </>
            ) : isPremium ? (
                <>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Buy Now
                </>
            ) : (
                <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Enroll for Free
                </>
            )}
        </Button>
    )
}
