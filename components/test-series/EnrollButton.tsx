"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { CheckCheck, Plus, Loader2, ShieldCheck } from "lucide-react"

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

    const [enrolled, setEnrolled] = useState(false)
    const [loading, setLoading] = useState(true)
    const [enrolling, setEnrolling] = useState(false)

    // Check current enrollment on mount
    useEffect(() => {
        if (!session?.user?.id) { setLoading(false); return }
        fetch(`/api/exam/series/enroll?seriesId=${encodeURIComponent(seriesId)}`)
            .then((r) => r.json())
            .then((d) => setEnrolled(!!d.enrolled))
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [seriesId, session?.user?.id])

    const handleEnroll = async () => {
        if (!session?.user?.id) {
            router.push("/login")
            return
        }
        if (enrolled || enrolling) return

        if (!isFree) {
            router.push("/subscription")
            return
        }

        setEnrolling(true)
        try {
            const res = await fetch("/api/exam/series/enroll", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ seriesId, enrollType: "FREE" }),
            })
            const data = await res.json()
            if (data.success) {
                setEnrolled(true)
                onEnrolled?.()
            }
        } catch {
            // silent
        } finally {
            setEnrolling(false)
        }
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
                disabled
                className={`rounded-xl font-extrabold flex items-center justify-center gap-2 bg-emerald-700 text-white cursor-default ${sizeClasses[size]} ${className}`}
                aria-label="Already enrolled"
            >
                <CheckCheck className="w-4 h-4 stroke-[2.5]" />
                Enrolled
            </button>
        )
    }

    return (
        <button
            onClick={handleEnroll}
            disabled={enrolling}
            className={`rounded-xl font-extrabold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                isFree
                    ? "bg-sky-700 hover:bg-sky-800 text-white shadow-md"
                    : "bg-emerald-700 hover:bg-emerald-800 text-white shadow-md"
            } ${sizeClasses[size]} ${className}`}
            aria-label={isFree ? "Enroll Free" : "Get Pass"}
        >
            {enrolling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : isFree ? (
                <Plus className="w-4 h-4 stroke-[2.5]" />
            ) : (
                <ShieldCheck className="w-4 h-4" />
            )}
            {enrolling ? "Enrolling…" : isFree ? "Enroll Free" : "Get Pass"}
        </button>
    )
}
