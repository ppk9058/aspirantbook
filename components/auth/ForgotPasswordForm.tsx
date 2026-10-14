"use client"

import { useActionState } from "react"
import { requestPasswordResetAction } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Loader2, Mail, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export function ForgotPasswordForm() {
    const [state, dispatch, isPending] = useActionState(requestPasswordResetAction, null)

    return (
        <form action={dispatch} className="space-y-4">
            <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1" htmlFor="email">
                    Email Address
                </label>
                <div className="relative">
                    <input
                        className="w-full px-3.5 py-2 pl-9 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1448d8] dark:text-white"
                        id="email"
                        type="email"
                        name="email"
                        placeholder="you@example.com"
                        required
                        disabled={isPending}
                        autoComplete="email"
                    />
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
            </div>

            <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-[#1448d8] hover:bg-[#0f36a5] text-white font-semibold py-2.5 rounded-xl shadow-xs transition-all text-xs sm:text-sm"
            >
                {isPending ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending reset link...
                    </>
                ) : (
                    "Send Password Reset Link"
                )}
            </Button>

            {state?.error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-xs font-medium" role="alert">
                    {state.error}
                </div>
            )}

            {state?.success && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-medium flex items-start gap-2.5" role="status">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                    <div>
                        <p className="font-semibold">{state.success}</p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                            Click the link in your email to choose a new password. The link is valid for 30 minutes.
                        </p>
                    </div>
                </div>
            )}
        </form>
    )
}
