import Link from "next/link"
import { verifyEmailAction } from "@/lib/actions/auth"
import { ResendVerificationForm } from "@/components/auth/ResendVerificationForm"
import { CheckCircle2, XCircle, MailCheck } from "lucide-react"

interface VerifyEmailPageProps {
    searchParams: Promise<{ token?: string }>
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
    const { token } = await searchParams

    let verificationResult: { success: boolean; email?: string; error?: string } | null = null

    if (token) {
        verificationResult = await verifyEmailAction(token)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-8">
            <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8 text-center">
                {/* Case 1: Token provided and successfully verified */}
                {verificationResult?.success ? (
                    <div className="space-y-4">
                        <div className="mx-auto w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Verified!</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Your email address <strong className="font-semibold text-gray-900 dark:text-white">{verificationResult.email}</strong> has been successfully verified.
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            You now have full access to our courses, test series, and purchasing features.
                        </p>
                        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                            <Link
                                href="/login"
                                className="inline-flex justify-center items-center px-5 py-2.5 bg-[#1DB954] hover:bg-[#16a34a] text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
                            >
                                Continue to Sign In
                            </Link>
                            <Link
                                href="/dashboard"
                                className="inline-flex justify-center items-center px-5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-semibold rounded-xl transition-colors"
                            >
                                Go to Dashboard
                            </Link>
                        </div>
                    </div>
                ) : verificationResult?.error ? (
                    /* Case 2: Token provided but invalid or expired */
                    <div className="space-y-4">
                        <div className="mx-auto w-14 h-14 bg-red-100 dark:bg-red-950/60 rounded-full flex items-center justify-center">
                            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Verification Failed</h1>
                        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 rounded-xl text-xs font-medium text-left">
                            {verificationResult.error}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            You can request a new verification email below:
                        </p>
                        <ResendVerificationForm />
                        <div className="pt-2 text-xs text-gray-500">
                            Already verified? <Link href="/login" className="text-emerald-600 font-semibold hover:underline">Sign in</Link>
                        </div>
                    </div>
                ) : (
                    /* Case 3: No token provided; prompt instructions to check email or resend */
                    <div className="space-y-4">
                        <div className="mx-auto w-14 h-14 bg-blue-100 dark:bg-blue-950/60 rounded-full flex items-center justify-center">
                            <MailCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Verify Your Email</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            We've sent a verification link to your registered email address. Click the link in your email to activate your account.
                        </p>
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
                                Didn't receive the email? Enter your email to resend:
                            </p>
                            <ResendVerificationForm />
                        </div>
                        <div className="pt-2 text-xs text-gray-500">
                            Return to <Link href="/login" className="text-emerald-600 font-semibold hover:underline">Sign In</Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
