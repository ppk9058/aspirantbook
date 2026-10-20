"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, ShoppingCart, Sparkles, CheckCheck } from "lucide-react"
import { useSamePageBuyNow } from "@/lib/payments/useSamePageBuyNow"
import { isPurchaseAllowedInApp } from "@/lib/native/platform"
import { AvailableOnWebsite } from "@/components/native/AvailableOnWebsite"

interface EnrollButtonProps {
    courseId: string
    isPremium: boolean
    courseSlug?: string
    courseTitle?: string
    isEnrolled?: boolean
    price?: number | string
}

export default function EnrollButton({
    courseId,
    isPremium,
    courseSlug,
    courseTitle,
    isEnrolled: initialEnrolled = false,
    price = 499,
}: EnrollButtonProps) {
    const [isEnrolled, setIsEnrolled] = useState(initialEnrolled)
    const [isMounted, setIsMounted] = useState(false)
    const router = useRouter()
    const { handleBuyNow, isProcessing } = useSamePageBuyNow()

    useEffect(() => {
        setIsMounted(true)
    }, [])

    useEffect(() => {
        setIsEnrolled(initialEnrolled)
    }, [initialEnrolled])

    const handleClick = async () => {
        if (isPremium) {
            await handleBuyNow(
                {
                    type: "course",
                    id: courseId,
                    slug: courseSlug,
                    title: courseTitle || "Premium Course",
                    price: price,
                    isFree: false,
                },
                () => {
                    setIsEnrolled(true)
                }
            )
            return
        }

        // Free course flow
        await handleBuyNow(
            {
                type: "course",
                id: courseId,
                slug: courseSlug,
                title: courseTitle || "Free Course",
                price: "Free",
                isFree: true,
            },
            () => {
                setIsEnrolled(true)
            }
        )
    }

    if (isEnrolled) {
        return (
            <Button
                onClick={() => router.push(`/courses/${courseSlug || courseId}/learn`)}
                data-testid="enrolled-continue-btn"
                className="font-black text-sm sm:text-base px-8 py-6 rounded-xl border-2 border-emerald-700 bg-emerald-600 hover:bg-emerald-700 text-white shadow-[3px_3px_0px_0px_#065f46] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
            >
                <CheckCheck className="mr-2 h-4 w-4 stroke-[2.5]" />
                Enrolled • Continue Learning
            </Button>
        )
    }

    if (isPremium && !isPurchaseAllowedInApp()) {
        return <AvailableOnWebsite size="lg" url={`/courses/${courseSlug || courseId}`} />
    }

    return (
        <Button
            onClick={handleClick}
            disabled={isProcessing}
            data-testid="enroll-buy-btn"
            data-hydrated={isMounted ? "true" : undefined}
            className={`font-black text-sm sm:text-base px-8 py-6 rounded-xl border-2 border-[#10162F] shadow-[3px_3px_0px_0px_#10162F] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer ${
                isPremium
                    ? "bg-[#1448d8] hover:bg-[#0f37a8] text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
        >
            {isProcessing ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
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
