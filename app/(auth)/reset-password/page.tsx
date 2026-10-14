import { verifyPasswordResetToken } from "@/lib/auth/tokens"
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm"
import Link from "next/link"
import { Lock, XCircle, ArrowLeft } from "lucide-react"

import { sanitizeReturnPath } from "@/lib/utils/return-path"

interface ResetPasswordPageProps {
    searchParams: Promise<{ token?: string; callbackUrl?: string }>
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
    const { token, callbackUrl } = await searchParams
    const safeCallback = callbackUrl ? sanitizeReturnPath(callbackUrl, "") : ""

    let tokenValidation: { valid: boolean; email?: string; reason?: string } | null = null

    if (token) {
        tokenValidation = await verifyPasswordResetToken(token)
    }

    const isTokenValid = Boolean(token && tokenValidation?.valid)

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-8">
            <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8">
                {isTokenValid && token ? (
                    <div>
                        <div className="text-center mb-6">
                            <div className="flex justify-center mb-3">
                                <div className="h-12 w-12 bg-blue-50 dark:bg-blue-950/60 rounded-xl flex items-center justify-center border border-blue-200 dark:border-blue-900">
                                    <Lock className="h-6 w-6 text-[#1448d8] dark:text-blue-400" />
                                </div>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reset Your Password</h1>
                            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1.5">
                                Enter a strong new password for{" "}
                                <strong className="text-gray-900 dark:text-white">{tokenValidation?.email}</strong>.
                            </p>
                        </div>

                        <ResetPasswordForm token={token} callbackUrl={safeCallback} />
                    </div>
                ) : (
                    <div className="text-center space-y-4">
                        <div className="mx-auto w-14 h-14 bg-red-100 dark:bg-red-950/60 rounded-full flex items-center justify-center">
                            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invalid Reset Link</h1>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                            {tokenValidation?.reason === "expired"
                                ? "This password reset link has expired (links are valid for 30 minutes)."
                                : tokenValidation?.reason === "used"
                                ? "This password reset link has already been used."
                                : "This password reset link is invalid or has already been consumed."}
                        </p>
                        <div className="pt-2">
                            <Link
                                href="/forgot-password"
                                className="inline-flex justify-center items-center px-5 py-2.5 bg-[#1448d8] hover:bg-[#0f36a5] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors"
                            >
                                Request New Reset Link
                            </Link>
                        </div>
                    </div>
                )}

                <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
                    <Link
                        href={safeCallback ? `/login?callbackUrl=${encodeURIComponent(safeCallback)}` : "/login"}
                        className="inline-flex items-center gap-1.5 text-[#1448d8] dark:text-blue-400 font-semibold hover:underline"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                    </Link>
                </div>
            </div>
        </div>
    )
}
