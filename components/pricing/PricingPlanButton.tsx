"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Crown, Loader2 } from "lucide-react"
import { useSamePageBuyNow } from "@/lib/payments/useSamePageBuyNow"

interface PricingPlanButtonProps {
    planName: string
    planPrice: string
    buttonText: string
    buttonLink: string
    isCurrentUserPlan?: boolean
}

export default function PricingPlanButton({
    planName,
    planPrice,
    buttonText,
    buttonLink,
    isCurrentUserPlan = false,
}: PricingPlanButtonProps) {
    const [isMounted, setIsMounted] = useState(false)
    const router = useRouter()
    const { handleBuyNow, isProcessing } = useSamePageBuyNow()

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const handleClick = async () => {
        if (isCurrentUserPlan) return

        if (planName === "FREE") {
            router.push(buttonLink)
            return
        }

        // PREMIUM subscription: open same-page Razorpay checkout
        await handleBuyNow(
            {
                type: "subscription",
                id: "MONTHLY",
                title: "Premium Monthly Pass",
                price: 499,
                isFree: false,
            },
            () => {
                router.push("/subscription")
                router.refresh()
            }
        )
    }

    if (planName !== "PREMIUM") {
        return (
            <Button
                onClick={handleClick}
                disabled={isCurrentUserPlan}
                className="w-full min-h-[48px] rounded-2xl font-black text-sm transition-all cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
            >
                {buttonText}
            </Button>
        )
    }

    return (
        <Button
            onClick={handleClick}
            disabled={isProcessing}
            data-testid="pricing-get-pass-btn"
            data-hydrated={isMounted ? "true" : undefined}
            className="w-full min-h-[48px] rounded-2xl font-black text-sm transition-all cursor-pointer bg-[#1448d8] hover:bg-[#0f37a8] text-white shadow-lg shadow-blue-500/25"
        >
            {isProcessing ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening Checkout...
                </>
            ) : (
                <>
                    <Crown className="mr-2 h-4 w-4 fill-amber-300 text-amber-300" />
                    {buttonText}
                </>
            )}
        </Button>
    )
}
