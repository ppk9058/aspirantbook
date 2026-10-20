"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Crown, Loader2, Check, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react"
import { useSamePageBuyNow } from "@/lib/payments/useSamePageBuyNow"
import { isPurchaseAllowedInApp } from "@/lib/native/platform"
import { AvailableOnWebsite } from "@/components/native/AvailableOnWebsite"

interface PricingPlanButtonProps {
    planName: string
    planPrice: string
    buttonText: string
    buttonLink: string
    isCurrentUserPlan?: boolean
}

const PREMIUM_FEATURES = [
    "Access to all courses",
    "Unlimited coding exercises",
    "All assessments and tutorials",
    "Course completion certificates",
    "Priority support",
    "Downloadable resources",
    "Ad-free experience",
    "Early access to new content",
]

export default function PricingPlanButton({
    planName,
    planPrice,
    buttonText,
    buttonLink,
    isCurrentUserPlan = false,
}: PricingPlanButtonProps) {
    const [isMounted, setIsMounted] = useState(false)
    const [checkoutStatus, setCheckoutStatus] = useState<
        "idle" | "opening" | "cancelled" | "failed" | "success"
    >("idle")
    const [failReason, setFailReason] = useState<string | null>(null)
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

        // Set opening status
        setCheckoutStatus("opening")
        setFailReason(null)

        // PREMIUM subscription: open same-page Razorpay checkout
        await handleBuyNow(
            {
                type: "subscription",
                id: "MONTHLY",
                title: "PREMIUM PASS - Pro Learner",
                price: 499,
                isFree: false,
            },
            () => {
                setCheckoutStatus("success")
            },
            {
                onOpening: () => setCheckoutStatus("opening"),
                onSuccess: () => setCheckoutStatus("success"),
                onDismiss: () => setCheckoutStatus("cancelled"),
                onError: (err) => {
                    setCheckoutStatus("failed")
                    setFailReason(err)
                },
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

    const isSuccess = checkoutStatus === "success"
    const isActive = isCurrentUserPlan || isSuccess

    if (!isActive && !isPurchaseAllowedInApp()) {
        return (
            <div className="space-y-4">
                <AvailableOnWebsite fullWidth size="lg" url="/pricing" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <Button
                onClick={handleClick}
                disabled={isProcessing || isActive}
                data-testid="pricing-get-pass-btn"
                data-hydrated={isMounted ? "true" : undefined}
                className={`w-full min-h-[48px] rounded-2xl font-black text-sm transition-all cursor-pointer ${
                    isActive
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-default"
                        : "bg-[#1448d8] hover:bg-[#0f37a8] text-white shadow-lg shadow-blue-500/25"
                }`}
            >
                {isProcessing ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Opening Checkout...
                    </>
                ) : isActive ? (
                    <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Already active
                    </>
                ) : (
                    <>
                        <Crown className="mr-2 h-4 w-4 fill-amber-300 text-amber-300" />
                        {buttonText || "Get Pass Now"}
                    </>
                )}
            </Button>

            {/* 
              Architecture Note: The hosted Razorpay checkout window (standard Razorpay iframe/modal) 
              accepts only primitive strings for options (name, description, image, theme color) and 
              cannot render custom HTML cards or arbitrary JSX templates. 
              Therefore, plan name, tier, price breakdown, and feature lists appear in our own 
              on-page order summary panel (data-testid="pricing-order-summary"), ensuring complete 
              learner transparency, visual verification, and accessibility across all viewports.
            */}
            {/* Persistent Order Summary Panel behind Razorpay checkout */}
            {checkoutStatus !== "idle" && (
                <div
                    data-testid="pricing-order-summary"
                    className="p-4 rounded-2xl border bg-slate-50 dark:bg-slate-900/90 border-blue-200 dark:border-blue-900/60 shadow-sm space-y-3 animate-in fade-in duration-200 text-left"
                >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                                Order Summary
                            </span>
                            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                                PREMIUM PASS - Pro Learner
                            </h4>
                        </div>
                        <div className="text-right">
                            <span className="text-base font-black text-blue-700 dark:text-blue-400">
                                ₹499
                            </span>
                            <span className="text-[11px] text-slate-500 block">/ monthly</span>
                        </div>
                    </div>

                    {/* Features checklist */}
                    <div className="space-y-1 pt-1">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                            Included in this pass:
                        </span>
                        {PREMIUM_FEATURES.slice(0, 4).map((f, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{f}</span>
                            </div>
                        ))}
                    </div>

                    {/* Checkout Status Indicator */}
                    {checkoutStatus === "opening" && (
                        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-blue-600" />
                            <span>Opening secure Razorpay window...</span>
                        </div>
                    )}

                    {checkoutStatus === "cancelled" && (
                        <div className="space-y-2 pt-1">
                            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-medium flex items-center gap-2 border border-amber-200 dark:border-amber-900/50">
                                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                                <span>Payment was cancelled. You can retry whenever you&apos;re ready.</span>
                            </div>
                            <Button
                                onClick={handleClick}
                                data-testid="pricing-retry-btn"
                                className="w-full bg-[#1448d8] hover:bg-[#0f37a8] text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Retry payment</span>
                            </Button>
                        </div>
                    )}

                    {checkoutStatus === "failed" && (
                        <div className="space-y-2 pt-1">
                            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2 border border-red-200 dark:border-red-900/50">
                                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                                <span>{failReason || "Payment failed. Please retry or choose another method."}</span>
                            </div>
                            <Button
                                onClick={handleClick}
                                data-testid="pricing-retry-btn"
                                className="w-full bg-[#1448d8] hover:bg-[#0f37a8] text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Retry payment</span>
                            </Button>
                        </div>
                    )}

                    {checkoutStatus === "success" && (
                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 border border-emerald-200 dark:border-emerald-900/50">
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                            <span>Payment verified! Your Premium Pass is now active.</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
