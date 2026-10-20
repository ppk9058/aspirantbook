"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Loader2, Eye, EyeOff, Phone } from "lucide-react"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"
import { sanitizeReturnPath } from "@/lib/utils/return-path"
import { isNativeApp } from "@/lib/native/platform"

interface LoginFormProps {
    onSuccess?: () => void
    isModal?: boolean
    initialCallbackUrl?: string
}

export function LoginForm({ onSuccess, isModal = false, initialCallbackUrl }: LoginFormProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [isPending, setIsPending] = useState(false)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(true)
    const { openMobileAuth, closeMobileAuth } = useMobileAuth()

    const rawCallback = initialCallbackUrl || (searchParams ? searchParams.get("callbackUrl") : null)
    const safeCallback = rawCallback ? sanitizeReturnPath(rawCallback, "") : ""

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMessage(null)
        setIsPending(true)

        const normalizedEmail = email.trim().toLowerCase()

        try {
            const res = await signIn("credentials", {
                email: normalizedEmail,
                password,
                redirect: false,
            })

            if (res?.error) {
                const code = (res as any)?.code || ""
                const errStr = `${res.error} ${code} ${res.url || ""}`
                if (code === "account_locked" || errStr.includes("account_locked")) {
                    setErrorMessage("Too many failed attempts. Your account has been temporarily locked for 15 minutes. Please try again later or reset your password.")
                } else if (code === "account_deactivated" || errStr.includes("account_deactivated")) {
                    setErrorMessage("Your account has been deactivated. Please contact support.")
                } else {
                    setErrorMessage("Invalid email or password.")
                }
                setIsPending(false)
                return
            }

            // Sync NextAuth SessionProvider and cross-tab broadcasts
            try {
                if (typeof window !== "undefined") {
                    window.dispatchEvent(new Event("storage"))
                    if ("BroadcastChannel" in window) {
                        const bc = new BroadcastChannel("next-auth")
                        bc.postMessage({ event: "session", data: { trigger: "getSession" } })
                        bc.close()
                    }
                }
            } catch {}

            if (onSuccess) {
                onSuccess()
                setIsPending(false)
                return
            }

            if (safeCallback && safeCallback.length > 0) {
                router.push(safeCallback)
                router.refresh()
                return
            }

            // Determine target based on user session role
            const sessionRes = await fetch("/api/auth/session")
            const sessionData = await sessionRes.json().catch(() => null)
            const role = sessionData?.user?.role

            let target = "/dashboard"
            if (role === "ADMIN") {
                target = "/admin"
            } else if (role === "TEACHER") {
                target = "/teacher"
            }

            router.push(target)
            router.refresh()
        } catch {
            setErrorMessage("Something went wrong. Please try again.")
            setIsPending(false)
        }
    }

    return (
        <div className="space-y-4">
            {!isModal && (
                <>
                    {/* Mobile Number & OTP Instant Login */}
                    <button
                        type="button"
                        onClick={() => openMobileAuth({ actionType: "login", callbackUrl: safeCallback || undefined })}
                        className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-gradient-to-r from-[#F26522] to-[#FF7A38] hover:from-[#E05310] hover:to-[#F26522] text-white rounded-xl text-xs sm:text-sm font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer transform active:scale-[0.99]"
                    >
                        <Phone className="h-4 w-4" />
                        <span>Continue with Mobile OTP (Instant)</span>
                    </button>

                    {!isNativeApp() && (
                        <>
                            <div className="relative flex items-center justify-center my-3">
                                <div className="border-t border-gray-200 dark:border-gray-800 w-full" />
                                <span className="bg-white dark:bg-[#05192D] px-2.5 text-[10px] text-gray-400 font-bold uppercase tracking-wider absolute">
                                    Or social / email
                                </span>
                            </div>

                            {/* Google Social Login button */}
                            <button
                                type="button"
                                onClick={() => alert("Google OAuth login initialized. Set GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET in .env.local to activate production redirect.")}
                                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/10 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 shadow-2xs transition-all"
                            >
                                <svg className="h-4 w-4" viewBox="0 0 24 24">
                                    <path
                                        fill="#4285F4"
                                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                                    />
                                </svg>
                                <span>Continue with Google</span>
                            </button>
                        </>
                    )}

                    <div className="relative flex items-center justify-center my-4">
                        <div className="border-t border-gray-200 dark:border-gray-800 w-full" />
                        <span className="bg-white dark:bg-[#05192D] px-3 text-[11px] text-gray-400 font-medium uppercase absolute">
                            Or with email
                        </span>
                    </div>
                </>
            )}

            <form method="POST" onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1" htmlFor="email">
                        Email Address
                    </label>
                    <input
                        className="w-full px-3.5 py-2 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1448d8] dark:text-white disabled:opacity-50"
                        id="email"
                        type="email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        disabled={isPending}
                        autoComplete="email"
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1" htmlFor="password">
                        Password
                    </label>
                    <div className="relative">
                        <input
                            className="w-full px-3.5 py-2 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1448d8] dark:text-white pr-10 disabled:opacity-50"
                            id="password"
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            disabled={isPending}
                            autoComplete="current-password"
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
                </div>

                <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="rounded border-gray-300 text-[#1448d8] focus:ring-[#1448d8]"
                        />
                        <span className="text-gray-600 dark:text-gray-400">Remember me</span>
                    </label>
                    <Link
                        href={(() => {
                            const params = new URLSearchParams()
                            if (email.trim()) params.set("email", email.trim().toLowerCase())
                            if (safeCallback) params.set("callbackUrl", safeCallback)
                            const qs = params.toString()
                            return `/forgot-password${qs ? `?${qs}` : ""}`
                        })()}
                        data-testid="forgot-password-link"
                        onClick={() => {
                            if (isModal) {
                                closeMobileAuth()
                            }
                        }}
                        className="text-[#1448d8] font-medium hover:underline"
                    >
                        Forgot password?
                    </Link>
                </div>

                <div className="pt-2">
                    <Button
                        type="submit"
                        data-testid="login-submit"
                        className="w-full bg-[#1448d8] hover:bg-[#0f37a8] text-white font-bold py-2.5 rounded-xl transition-all shadow-xs disabled:opacity-60"
                        aria-disabled={isPending}
                        disabled={isPending}
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            "Sign In"
                        )}
                    </Button>
                </div>

                {errorMessage && (
                    <div
                        data-testid="login-error-message"
                        className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-xs font-medium"
                    >
                        {errorMessage}
                    </div>
                )}
            </form>
        </div>
    )
}
