import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm"
import Link from "next/link"
import { KeyRound, ArrowLeft } from "lucide-react"

export default function ForgotPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-8">
            <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8">
                <div className="text-center mb-6">
                    <div className="flex justify-center mb-3">
                        <div className="h-12 w-12 bg-blue-50 dark:bg-blue-950/60 rounded-xl flex items-center justify-center border border-blue-200 dark:border-blue-900">
                            <KeyRound className="h-6 w-6 text-[#1448d8] dark:text-blue-400" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Forgot Password?</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1.5">
                        Enter your email address and we'll send you instructions to reset your password.
                    </p>
                </div>

                <ForgotPasswordForm />

                <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
                    <Link href="/login" className="inline-flex items-center gap-1.5 text-[#1448d8] dark:text-blue-400 font-semibold hover:underline">
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                    </Link>
                </div>
            </div>
        </div>
    )
}
