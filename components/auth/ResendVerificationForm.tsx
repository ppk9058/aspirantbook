"use client"

import { useActionState } from "react"
import { resendVerificationEmailAction } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Loader2, Mail, CheckCircle2 } from "lucide-react"

export function ResendVerificationForm({ defaultEmail }: { defaultEmail?: string }) {
    const [state, dispatch, isPending] = useActionState(resendVerificationEmailAction, null)

    return (
        <form action={dispatch} className="space-y-3 mt-4 text-left">
            <div>
                <label htmlFor="email" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Email address
                </label>
                <div className="relative">
                    <input
                        id="email"
                        name="email"
                        type="email"
                        defaultValue={defaultEmail || ""}
                        required
                        placeholder="you@example.com"
                        className="w-full px-3.5 py-2 pl-9 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1DB954] dark:text-white"
                    />
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
            </div>

            <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-[#1DB954] hover:bg-[#16a34a] text-white font-semibold py-2 rounded-xl text-xs sm:text-sm shadow-xs transition-all"
            >
                {isPending ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending verification link...
                    </>
                ) : (
                    "Resend Verification Link"
                )}
            </Button>

            {state?.error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-xs font-medium" role="alert">
                    {state.error}
                </div>
            )}

            {state?.success && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-medium flex items-center gap-2" role="status">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{state.success}</span>
                </div>
            )}
        </form>
    )
}
