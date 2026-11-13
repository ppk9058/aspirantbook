"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { CheckCheck, Plus, Loader2, ShieldCheck, ArrowRight, AlertCircle, Play } from "lucide-react"
import { useSamePageBuyNow } from "@/lib/payments/useSamePageBuyNow"
import PassPurchaseModal from "@/components/pass/PassPurchaseModal"
import { usePassPurchaseModal } from "@/lib/payments/usePassPurchaseModal"
import { usePassStatus } from "@/lib/auth/usePassStatus"

interface EnrollButtonProps {
    seriesId: string          // slug or id
    isFree?: boolean
    className?: string
    size?: "sm" | "md" | "lg"
    onEnrolled?: () => void
}

export default function EnrollButton({
    seriesId,
    isFree = true,
    className = "",
    size = "md",
    onEnrolled,
}: EnrollButtonProps) {
    const { data: session } = useSession()
    const router = useRouter()
    const { handleBuyNow, isProcessing } = useSamePageBuyNow()

    // Database-backed Pass entitlement (server resolved, never session role).
    const passStatus = usePassStatus()
    const passPending = passStatus.isLoading || passStatus.error

    const [enrolled, setEnrolled] = useState(false)
    const [loading, setLoading] = useState(true)
    const [effectiveIsFree, setEffectiveIsFree] = useState<boolean>(isFree)
    const [enrollError, setEnrollError] = useState<string | null>(null)

    const {
        isOpen: isPassModalOpen,
        openPassModal,
        closePassModal,
    } = usePassPurchaseModal({
        hasActivePass: passStatus.hasActivePass,
        onSuccess: () => {
            setEnrolled(true)
            onEnrolled?.()
        },
    })

    // Update effectiveIsFree when isFree prop changes
    useEffect(() => {
        setEffectiveIsFree(isFree)
    }, [isFree])

    // Check current enrollment and authoritative series flags on mount
    useEffect(() => {
        let isMounted = true
        fetch(`/api/exam/series/enroll?seriesId=${encodeURIComponent(seriesId)}`)
            .then((r) => r.json())
            .then((d) => {
                if (!isMounted) return
                setEnrolled(!!d.enrolled)
                if (d.series) {
                    const serverFree = !!d.series.isFree || !d.series.isPro
                    setEffectiveIsFree(serverFree)
                }
            })
            .catch((err) => {
                console.error("[EnrollButton] failed to load enrollment:", err)
                if (isMounted) setEnrollError("Could not load this test series. Please retry.")
            })
            .finally(() => {
                if (isMounted) setLoading(false)
            })

        return () => {
            isMounted = false
        }
    }, [seriesId, session?.user?.id])

    /**
     * Pass holder path: the server re-checks the entitlement from the database
     * (POST /api/exam/series/enroll with enrollType PASS) and then we hand over
     * to the existing test-series / attempt flow.
     */
    const enrollWithPass = async () => {
        setEnrollError(null)
        setLoading(true)
        try {
            const res = await fetch("/api/exam/series/enroll", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ seriesId, enrollType: "PASS" }),
            })
            const json = await res.json().catch(() => null)
            if (!res.ok || !json?.success) {
                throw new Error(json?.error || "Could not open this test series with your Pass.")
            }
            setEnrolled(true)
            onEnrolled?.()
            router.push(`/test-series/${seriesId}`)
        } catch (err: any) {
            console.error("[EnrollButton] pass enrollment failed:", err)
            setEnrollError(err?.message || "Could not open this test series with your Pass.")
        } finally {
            setLoading(false)
        }
    }

    const handleEnroll = async (e?: React.MouseEvent<HTMLButtonElement>) => {
        if (enrolled || isProcessing) return

        if (passStatus.hasActivePass) {
            await enrollWithPass()
            return
        }

        if (!effectiveIsFree) {
            // Paid series, no Pass: Open Pass Purchase Modal on the SAME page
            openPassModal(e?.currentTarget)
            return
        }

        // Free series enrollment
        await handleBuyNow(
            {
                type: "package",
                id: seriesId,
                slug: seriesId,
                title: `Test Series (${seriesId})`,
                price: "Free",
                isFree: true,
            },
            () => {
                setEnrolled(true)
                onEnrolled?.()
            }
        )
    }

    const sizeClasses = {
        sm: "px-4 py-2 text-xs min-h-[44px]",
        md: "px-6 py-2.5 text-sm min-h-[44px]",
        lg: "px-8 py-3 text-base min-h-[48px]",
    }

    if (loading) {
        return (
            <button
                disabled
                className={`rounded-xl font-bold flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-wait ${sizeClasses[size]} ${className}`}
            >
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking…
            </button>
        )
    }

    if (enrolled) {
        return (
            <button
                onClick={() => router.push("/my-tests")}
                data-testid="series-enrolled-btn"
                className={`rounded-xl font-extrabold flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer transition-all active:scale-[0.98] shadow-md ${sizeClasses[size]} ${className}`}
                aria-label="View in My Tests"
            >
                <CheckCheck className="w-4 h-4 stroke-[2.5]" />
                <span>My Tests</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
        )
    }

    // Paid series while the database pass value is still loading (or failed):
    // neutral state, never a "Get Pass" flash at a real pass holder.
    if (!effectiveIsFree && passPending) {
        return (
            <button
                disabled
                aria-busy="true"
                className={`rounded-xl font-bold flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-wait ${sizeClasses[size]} ${className}`}
            >
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking access…
            </button>
        )
    }

    const isPassHolder = passStatus.hasActivePass && !effectiveIsFree

    return (
        <>
            <button
                onClick={handleEnroll}
                disabled={isProcessing}
                data-testid="series-enroll-btn"
                data-hydrated="true"
                data-pass-holder={isPassHolder ? "true" : "false"}
                className={`rounded-xl font-extrabold flex items-center justify-center gap-2 transition-all active:scale-[0.98] bg-[#1448d8] hover:bg-[#0f37a8] text-white shadow-md ${sizeClasses[size]} ${className}`}
                aria-label={isPassHolder ? "Take Test" : effectiveIsFree ? "Enroll Free" : "Get Pass"}
            >
                {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : isPassHolder ? (
                    <Play className="w-4 h-4 fill-current" />
                ) : effectiveIsFree ? (
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                ) : (
                    <ShieldCheck className="w-4 h-4" />
                )}
                {isProcessing
                    ? "Processing…"
                    : isPassHolder
                    ? "Take Test"
                    : effectiveIsFree
                    ? "Enroll Free"
                    : "Get Pass"}
            </button>

            {enrollError && (
                <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{enrollError}</span>
                </p>
            )}

            <PassPurchaseModal
                isOpen={isPassModalOpen}
                onClose={closePassModal}
                onSuccess={() => {
                    setEnrolled(true)
                    onEnrolled?.()
                }}
            />
        </>
    )
}
