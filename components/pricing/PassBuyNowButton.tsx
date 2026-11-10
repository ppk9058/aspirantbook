"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle2, Zap } from "lucide-react"
import { useSamePageBuyNow } from "@/lib/payments/useSamePageBuyNow"
import { PASS_PRICE_INR } from "@/lib/payments/pass-plan"
interface PassBuyNowButtonProps {
    isActive: boolean
    userId?: string
    userName?: string | null
    userEmail?: string | null
    userPhone?: string | null
}
export default function PassBuyNowButton({
    isActive,
    userId,
    userName,
    userEmail,
    userPhone,
}: PassBuyNowButtonProps) {
    const [mounted, setMounted] = useState(false)
    const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "opening" | "success" | "failed" | "dismissed">("idle")
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const router = useRouter()
    const { handleBuyNow, isProcessing } = useSamePageBuyNow()
    const isGuest = !userId
    useEffect(() => {
        setMounted(true)
    }, [])
    useEffect(() => {
        // Auto-open popup after login redirect
        if (!mounted || !userId) return
        const params = new URLSearchParams(window.location.search)
        const shouldAutoOpen = params.get("autoOpenPass") === "1"
        if (shouldAutoOpen && !isActive) {
            // Clean URL
            const cleanUrl = window.location.pathname
            window.history.replaceState({}, "", cleanUrl)
            // Open popup
            handlePurchase()
        }
    }, [mounted, userId, isActive])
    const handlePurchase = async () => {
        // Guest: redirect to login with return path
        if (isGuest) {
            const returnTo = encodeURIComponent("/pricing?autoOpenPass=1")
            router.push(`/login?returnTo=${returnTo}`)
            return
        }
        setCheckoutStatus("opening")
        setErrorMessage(null)
        await handleBuyNow(
            {
                type: "subscription",
                id: "YEARLY",
                title: "aspirantBook Pass (Yearly)",
                price: PASS_PRICE_INR,
                isFree: false,
            },
            () => {
                setCheckoutStatus("success")
                router.refresh()
            },
            {
                onOpening: () => {
                    setCheckoutStatus("opening")
                    setErrorMessage(null)
                },
                onSuccess: () => {
                    setCheckoutStatus("success")
                    router.refresh()
                },
                onDismiss: () => {
                    setCheckoutStatus("dismissed")
                    setTimeout(() => setCheckoutStatus("idle"), 3000)
                },
                onError: (err) => {
                    setCheckoutStatus("failed")
                    setErrorMessage(err || "Payment failed. Please try again.")
                    setTimeout(() => setCheckoutStatus("idle"), 5000)
                },
            }
        )
    }
    if (isActive) {
        // Show active state with expiry date (if available in user data)
        // For now, show generic active state
        return (
            <button
                disabled
                className="w-full min-h-[52px] rounded-xl bg-emerald-600 text-white font-extrabold text-base flex items-center justify-center gap-2 cursor-not-allowed"
            >
                <CheckCircle2 className="h-5 w-5" />
                Pass Active
            </button>
        )
    }

    // Show error message if payment failed
    if (checkoutStatus === "failed" && errorMessage) {
        return (
            <div className="space-y-3">
                <div className="text-sm text-red-600 dark:text-red-400 text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    {errorMessage}
                </div>
                <button
                    onClick={handlePurchase}
                    className="w-full min-h-[52px] rounded-xl bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white font-extrabold text-base shadow-lg shadow-green-600/30 transition-all duration-200 flex items-center justify-center gap-2"
                >
                    <Zap className="h-5 w-5 fill-current" />
                    <span>Try Again</span>
                </button>
            </div>
        )
    }

    // Show dismissed message
    if (checkoutStatus === "dismissed") {
        return (
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                Payment was cancelled. Click Buy Now to try again.
            </div>
        )
    }
    return (
        <button
            onClick={handlePurchase}
            disabled={isProcessing}
            data-testid="pass-buy-now-btn"
            className="w-full min-h-[52px] rounded-xl bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white font-extrabold text-base shadow-lg shadow-green-600/30 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
            {isProcessing ? (
                <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Processing...</span>
                </>
            ) : (
                <>
                    <Zap className="h-5 w-5 fill-current" />
                    <span>Buy Now</span>
                </>
            )}
        </button>
    )
}
