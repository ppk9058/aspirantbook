"use client"

import { useFormStatus } from "react-dom"
import { useActionState } from "react"
import { register } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"

function SubmitButton({ disabled = false }: { disabled?: boolean }) {
    const { pending } = useFormStatus()
    return (
        <Button
            type="submit"
            className="w-full bg-[#1DB954] hover:bg-[#16a34a] text-white font-bold py-2.5 rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-disabled={pending || disabled}
            disabled={pending || disabled}
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
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get("callbackUrl")
    const [state, dispatch, isPending] = useActionState(register, null)
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [phoneNumber, setPhoneNumber] = useState("")
    const [selectedGoal, setSelectedGoal] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [agreedToTerms, setAgreedToTerms] = useState(true)

    useEffect(() => {
        if (state?.success) {
            const timer = setTimeout(() => {
                const target = callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login"
                window.location.href = target
            }, 3000)
            return () => clearTimeout(timer)
        }
    }, [state?.success, callbackUrl])

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
        <div className="space-y-4">
            {/* Google Social Login */}
            <button
                type="button"
                onClick={() => {
                    signIn("google", { callbackUrl: "/dashboard" })
                }}
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

            <form action={dispatch} className="space-y-3.5">
                <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1" htmlFor="name">
                        Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        className="w-full px-3.5 py-2 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1DB954] dark:text-white"
                        id="name"
                        type="text"
                        name="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        required
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1" htmlFor="email">
                        Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                        className="w-full px-3.5 py-2 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1DB954] dark:text-white"
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
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1" htmlFor="phoneNumber">
                        Phone Number (Optional)
                    </label>
                    <input
                        className="w-full px-3.5 py-2 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1DB954] dark:text-white"
                        id="phoneNumber"
                        type="tel"
                        name="phoneNumber"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+91 98765 43210"
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1" htmlFor="selectedGoal">
                        Primary Goal / Target Exam
                    </label>
                    <div className="relative">
                        <select
                            className="w-full px-3.5 py-2 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1DB954] dark:text-white"
                            id="selectedGoal"
                            name="selectedGoal"
                            value={selectedGoal}
                            onChange={(e) => setSelectedGoal(e.target.value)}
                        >
                            <option value="">Select your goal...</option>
                            <option value="UPSC">UPSC Civil Services</option>
                            <option value="SSC">SSC / Banking Exams</option>
                            <option value="STATE_PSC">State PSC Exams</option>
                            <option value="CODING_TECH">Coding & Technology</option>
                            <option value="DATA_AI">Data Science & AI</option>
                            <option value="GENERAL_SKILLS">Professional Skills</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1" htmlFor="password">
                        Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <input
                            className="w-full px-3.5 py-2 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1DB954] dark:text-white pr-10"
                            id="password"
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Min. 8 characters"
                            required
                            minLength={8}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                        Must be at least 8 characters. Avoid common or easily guessed passwords.
                    </p>

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

                {/* Age & Consent Checkbox */}
                <div className="flex items-start gap-2 pt-1">
                    <input
                        type="checkbox"
                        id="consentCheckbox"
                        name="consent"
                        required
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        data-testid="register-consent-checkbox"
                    />
                    <label htmlFor="consentCheckbox" className="text-xs text-gray-600 dark:text-gray-400 leading-snug cursor-pointer select-none">
                        I am 13+ and agree to{" "}
                        <Link href="/terms" target="_blank" className="text-indigo-600 dark:text-indigo-400 underline font-semibold hover:text-indigo-700">
                            Terms
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy" target="_blank" className="text-indigo-600 dark:text-indigo-400 underline font-semibold hover:text-indigo-700">
                            Privacy
                        </Link>
                        .
                    </label>
                </div>

                <div className="pt-2">
                    <SubmitButton disabled={!agreedToTerms} />
                </div>

                {state?.error && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-xs font-medium" role="alert">
                        {state.error}
                    </div>
                )}

                {state?.success && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-medium flex items-center gap-2" role="status">
                        <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                        <div>
                            <p className="font-semibold">{state.success}</p>
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                                Redirecting to login... Or <a href="/login" className="underline font-bold">click here to sign in</a>.
                            </p>
                        </div>
                    </div>
                )}
            </form>
        </div>
    )
}
