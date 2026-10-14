"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react"

export function UnverifiedEmailBanner() {
    const { data: session } = useSession()
    const [dismissed, setDismissed] = useState(false)
    const [sending, setSending] = useState(false)
    const [sentMessage, setSentMessage] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Only display if user is logged in and email is not verified
    const isUnverified = Boolean(
        session?.user?.email && !(session.user as any)?.emailVerified
    )

    if (!isUnverified || dismissed) {
        return null
    }

    const handleResend = async () => {
        if (!session?.user?.email || sending) return
        setSending(true)
        setSentMessage(null)
        setErrorMessage(null)

        try {
            const formData = new FormData()
            formData.append("email", session.user.email)
            const { resendVerificationEmailAction } = await import("@/lib/actions/auth")
            const result = await resendVerificationEmailAction(null, formData)
            if (result?.error) {
                setErrorMessage(result.error)
            } else if (result?.success) {
                setSentMessage("Verification link sent! Please check your inbox.")
            }
        } catch {
            setErrorMessage("Failed to send verification link. Please try again.")
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-2.5 text-xs">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span>
                        Your email <strong className="font-semibold">{session?.user?.email}</strong> is not verified.
                    </span>
                    {sentMessage ? (
                        <span className="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {sentMessage}
                        </span>
                    ) : errorMessage ? (
                        <span className="text-red-600 dark:text-red-400 font-semibold">
                            {errorMessage}
                        </span>
                    ) : (
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={sending}
                            className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-300 underline font-bold hover:text-amber-950 dark:hover:text-white transition-colors"
                        >
                            {sending ? (
                                <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                "Resend verification link"
                            )}
                        </button>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => setDismissed(true)}
                    className="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-white p-1"
                    aria-label="Dismiss banner"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    )
}
