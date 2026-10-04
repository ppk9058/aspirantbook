"use client"

import { useFormStatus } from "react-dom"
import { useActionState } from "react"
import { register } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react"
import { useEffect, useState } from "react"

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <Button
            className="w-full bg-[#1DB954] hover:bg-[#16a34a] text-white font-bold py-2.5 rounded-xl shadow-xs transition-all"
            aria-disabled={pending}
            disabled={pending}
        >
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Free Account...
                </>
            ) : (
                "Create Free Account"
            )}
        </Button>
    )
}

export function RegisterForm() {
    const [state, dispatch, isPending] = useActionState(register, null)
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)

    useEffect(() => {
        if (state?.success) {
            setTimeout(() => {
                window.location.href = "/login"
            }, 1500)
        }
    }, [state?.success])

    const getStrength = (pass: string) => {
        if (!pass) return 0
        let s = 0
        if (pass.length >= 6) s += 33
        if (/[A-Z]/.test(pass) || /[0-9]/.test(pass)) s += 33
        if (/[^A-Za-z0-9]/.test(pass) && pass.length >= 8) s += 34
        return s
    }

    const strength = getStrength(password)

    return (
        <div className="space-y-4">
            {/* Google Social Login */}
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
                <span>Sign up with Google</span>
            </button>

            <div className="relative flex items-center justify-center my-4">
                <div className="border-t border-gray-200 dark:border-gray-800 w-full" />
                <span className="bg-white dark:bg-[#05192D] px-3 text-[11px] text-gray-400 font-medium uppercase absolute">
                    Or with email
                </span>
            </div>

            <form action={dispatch} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1" htmlFor="name">
                        Full Name
                    </label>
                    <input
                        className="w-full px-3.5 py-2 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1DB954] dark:text-white"
                        id="name"
                        type="text"
                        name="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ada Lovelace"
                        required
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1" htmlFor="email">
                        Email Address
                    </label>
                    <input
                        className="w-full px-3.5 py-2 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1DB954] dark:text-white"
                        id="email"
                        type="email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ada@example.com"
                        required
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1" htmlFor="password">
                        Password
                    </label>
                    <div className="relative">
                        <input
                            className="w-full px-3.5 py-2 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1DB954] dark:text-white pr-10"
                            id="password"
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Min. 6 characters"
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

                    {/* Password Strength meter */}
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

                <div className="pt-2">
                    <SubmitButton />
                </div>

                {state?.error && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-xs font-medium">
                        {state.error}
                    </div>
                )}

                {state?.success && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-medium flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                        <span>{state.success} Redirecting to login...</span>
                    </div>
                )}
            </form>
        </div>
    )
}
