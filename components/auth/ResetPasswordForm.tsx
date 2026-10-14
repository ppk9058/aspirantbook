"use client"

import { useActionState, useEffect, useState } from "react"
import { resetPasswordAction } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Loader2, Eye, EyeOff, CheckCircle2, ShieldCheck } from "lucide-react"

export function ResetPasswordForm({ token }: { token: string }) {
    const [state, dispatch, isPending] = useActionState(resetPasswordAction, null)
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    useEffect(() => {
        if (state?.success) {
            const timer = setTimeout(() => {
                window.location.href = "/login"
            }, 2500)
            return () => clearTimeout(timer)
        }
    }, [state?.success])

    const getStrength = (pass: string) => {
        if (!pass) return 0
        let s = 0
        if (pass.length >= 8) s += 34
        if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) s += 33
        if (/[^A-Za-z0-9]/.test(pass)) s += 33
        return s
    }

    const strength = getStrength(password)

    return (
        <form action={dispatch} className="space-y-4">
            <input type="hidden" name="token" value={token} />

            <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1" htmlFor="password">
                    New Password
                </label>
                <div className="relative">
                    <input
                        className="w-full px-3.5 py-2 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1448d8] dark:text-white pr-10"
                        id="password"
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        required
                        minLength={8}
                        disabled={isPending}
                        autoComplete="new-password"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                {password && (
                    <div className="mt-2">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 h-1 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-300 ${
                                    strength <= 33
                                        ? "bg-rose-500 w-1/3"
                                        : strength <= 66
                                        ? "bg-amber-500 w-2/3"
                                        : "bg-emerald-500 w-full"
                                }`}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1" htmlFor="confirmPassword">
                    Confirm New Password
                </label>
                <div className="relative">
                    <input
                        className="w-full px-3.5 py-2 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1448d8] dark:text-white pr-10"
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        required
                        minLength={8}
                        disabled={isPending}
                        autoComplete="new-password"
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
                    >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
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
                        Updating Password...
                    </>
                ) : (
                    "Reset Password"
                )}
            </Button>

            {state?.error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-xs font-medium" role="alert">
                    {state.error}
                </div>
            )}

            {state?.success && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-medium flex items-center gap-2" role="status">
                    <ShieldCheck className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div>
                        <p className="font-semibold">{state.success}</p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                            Redirecting you to login...
                        </p>
                    </div>
                </div>
            )}
        </form>
    )
}
