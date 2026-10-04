"use client"

import { useFormStatus } from "react-dom"
import { useActionState, useState } from "react"
import { authenticate } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Loader2, Eye, EyeOff, Phone } from "lucide-react"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <Button
            className="w-full bg-[#3AAFA9] hover:bg-[#2d8a85] text-white font-bold py-2.5 rounded-xl transition-all shadow-xs"
            aria-disabled={pending}
            disabled={pending}
        >
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                </>
            ) : (
                "Sign In"
            )}
        </Button>
    )
}

export function LoginForm() {
    const [errorMessage, dispatch, isPending] = useActionState(authenticate, undefined)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const { openMobileAuth } = useMobileAuth()

    return (
        <div className="space-y-4">
            {/* Mobile Number & OTP Instant Login */}
            <button
                type="button"
                onClick={() => openMobileAuth({ actionType: "login" })}
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-gradient-to-r from-[#F26522] to-[#FF7A38] hover:from-[#E05310] hover:to-[#F26522] text-white rounded-xl text-xs sm:text-sm font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer transform active:scale-[0.99]"
            >
                <Phone className="h-4 w-4" />
                <span>Continue with Mobile OTP (Instant)</span>
            </button>

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

            <div className="relative flex items-center justify-center my-4">
                <div className="border-t border-gray-200 dark:border-gray-800 w-full" />
                <span className="bg-white dark:bg-[#05192D] px-3 text-[11px] text-gray-400 font-medium uppercase absolute">
                    Or with email
                </span>
            </div>

            <form action={dispatch} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1" htmlFor="email">
                        Email Address
                    </label>
                    <input
                        className="w-full px-3.5 py-2 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3AAFA9] dark:text-white"
                        id="email"
                        type="email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1" htmlFor="password">
                        Password
                    </label>
                    <div className="relative">
                        <input
                            className="w-full px-3.5 py-2 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3AAFA9] dark:text-white pr-10"
                            id="password"
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded border-gray-300 text-[#3AAFA9] focus:ring-[#3AAFA9]" />
                        <span className="text-gray-600 dark:text-gray-400">Remember me</span>
                    </label>
                    <a href="#" className="text-[#3AAFA9] font-medium hover:underline">Forgot password?</a>
                </div>

                <div className="pt-2">
                    <SubmitButton />
                </div>

                {errorMessage && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-xs font-medium">
                        {errorMessage}
                    </div>
                )}
            </form>
        </div>
    )
}
