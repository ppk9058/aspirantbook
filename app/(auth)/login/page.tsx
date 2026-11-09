import { LoginForm } from "@/components/auth/LoginForm"
import Link from "next/link"
import Image from "next/image"
import BrandLogo from "@/components/brand/BrandLogo"

import { Suspense } from "react"

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-3 sm:px-4 py-6 sm:py-8 box-border w-full overflow-x-hidden">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 p-5 sm:p-8 box-border">
                <div className="text-center mb-7">
                    <div className="flex justify-center mb-3">
                        <BrandLogo size="xl" href="/" priority />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 font-medium">
                        Log in with verified mobile OTP, Google, or email to access your dashboard
                    </p>
                </div>

                <Suspense fallback={<div className="py-8 text-center text-xs text-gray-400">Loading form...</div>}>
                    <LoginForm />
                </Suspense>

                <div className="mt-6 text-center text-sm text-gray-600">
                    Don't have an account?{" "}
                    <Link href="/register" className="text-blue-600 font-medium hover:underline">
                        Sign up for free
                    </Link>
                </div>
            </div>
        </div>
    )
}
