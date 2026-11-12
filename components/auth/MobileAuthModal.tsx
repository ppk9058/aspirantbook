"use client"

import { useRef, useEffect, useState } from "react"
import Image from "next/image"
import { X, Loader2, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useMobileAuth, triggerMobileAuth, MobileAuthCourseInfo, MobileAuthOptions } from "./MobileAuthContext"
import { LoginForm } from "@/components/auth/LoginForm"
import BrandLogo from "@/components/brand/BrandLogo"

export { triggerMobileAuth as openMobileAuth }
export type { MobileAuthCourseInfo }

export default function MobileAuthModal() {
    const {
        isOpen,
        step,
        phoneNumber,
        otp,
        countdown,
        isVerifying,
        isSending,
        errorMessage,
        successMessage,
        activeCourse,
        callbackUrl,
        onSuccessCallback,
        closeMobileAuth,
        setPhoneNumber,
        setStep,
        setErrorMessage,
        handleGetOtp,
        handleResendOtp,
        handleOtpChange,
        handleOtpKeyDown,
        handleOtpPaste,
    } = useMobileAuth()

    const [authMode, setAuthMode] = useState<"otp" | "credentials">("otp")

    const inputRefs = useRef<(HTMLInputElement | null)[]>([])
    const phoneInputRef = useRef<HTMLInputElement | null>(null)

    // Auto-focus phone or first OTP box
    useEffect(() => {
        if (!isOpen) return
        if (step === "phone") {
            setTimeout(() => phoneInputRef.current?.focus(), 150)
        } else if (step === "otp") {
            setTimeout(() => inputRefs.current[0]?.focus(), 150)
        }
    }, [isOpen, step])

    if (!isOpen) return null

    const p = String(activeCourse?.price || "").toLowerCase()
    const isFree = !activeCourse?.price || p.includes("free") || p === "0" || p === "₹0" || activeCourse?.isFree === true

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
            onClick={closeMobileAuth}
        >
            <div
                data-testid="mobile-auth-modal"
                className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    type="button"
                    onClick={closeMobileAuth}
                    disabled={isVerifying}
                    className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors z-20 cursor-pointer disabled:opacity-50"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Brand Header */}
                <div className="pt-7 pb-4 px-6 text-center border-b border-gray-100 bg-gradient-to-b from-[#FFFDF9] to-white">
                    <div className="flex justify-center mb-3">
                        <BrandLogo size="xl" priority />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 font-medium">
                        {step === "phone"
                            ? "Enter your mobile number to get started"
                            : "Enter the 6-digit OTP to verify your account"}
                    </p>
                </div>

                {/* Course Banner Pill (if opened from a course card) */}
                {activeCourse && (
                    <div className="mx-6 mt-4 p-3 bg-orange-50/70 border border-orange-100 rounded-2xl flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-black uppercase text-[#F26522] tracking-wider block">
                                {activeCourse.classTag || "Course Enrollment"}
                            </span>
                            <h4 className="text-xs font-bold text-gray-900 truncate">
                                {activeCourse.title}
                            </h4>
                        </div>
                        <span
                            className={`text-xs font-black px-2.5 py-1 rounded-lg shrink-0 ${
                                isFree
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-gray-900 text-white"
                            }`}
                        >
                            {isFree ? "Free" : (activeCourse.price || "Paid")}
                        </span>
                    </div>
                )}

                {/* Form Body */}
                <div className="p-6 pt-4 space-y-4">
                    {/* Mode Switcher Tabs */}
                    <div className="flex border-b border-gray-100">
                        <button
                            type="button"
                            onClick={() => setAuthMode("otp")}
                            className={`flex-1 pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                                authMode === "otp"
                                    ? "border-[#F26522] text-[#F26522]"
                                    : "border-transparent text-gray-400 hover:text-gray-600"
                            }`}
                        >
                            Mobile OTP
                        </button>
                        <button
                            type="button"
                            onClick={() => setAuthMode("credentials")}
                            className={`flex-1 pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                                authMode === "credentials"
                                    ? "border-[#1448d8] text-[#1448d8]"
                                    : "border-transparent text-gray-400 hover:text-gray-600"
                            }`}
                        >
                            Email &amp; Password
                        </button>
                    </div>

                    {authMode === "credentials" ? (
                        <div className="pt-2">
                            <LoginForm
                                isModal={true}
                                onSuccess={async () => {
                                    closeMobileAuth()
                                    if (onSuccessCallback) {
                                        const { getSession } = await import("next-auth/react")
                                        const freshSession = await getSession()
                                        onSuccessCallback(freshSession?.user)
                                    } else if (callbackUrl) {
                                        window.location.href = callbackUrl
                                    }
                                }}
                                initialCallbackUrl={callbackUrl || undefined}
                            />
                        </div>
                    ) : (
                        <>
                            {/* Error and Success Notices */}
                            {errorMessage && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-semibold text-center animate-in fade-in">
                                    {errorMessage}
                                </div>
                            )}

                            {successMessage && (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-bold text-center flex items-center justify-center gap-2 animate-in fade-in">
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                    <span>{successMessage}</span>
                                </div>
                            )}

                            {step === "phone" ? (
                                /* ─── STEP 1: ENTER MOBILE NUMBER ───────────────────────── */
                                <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2">
                                    Mobile Number
                                </label>
                                <div className="flex items-center rounded-2xl border-2 border-gray-200 focus-within:border-[#F26522] focus-within:ring-2 focus-within:ring-[#F26522]/20 transition-all overflow-hidden bg-gray-50/70 focus-within:bg-white">
                                    <div className="flex items-center gap-1.5 px-3.5 py-3 border-r border-gray-200 text-gray-600 font-bold text-sm bg-gray-100/60 select-none">
                                        <span className="text-base">🇮🇳</span>
                                        <span>+91</span>
                                    </div>
                                    <input
                                        ref={phoneInputRef}
                                        type="tel"
                                        inputMode="numeric"
                                        pattern="[0-9]{10}"
                                        maxLength={10}
                                        value={phoneNumber}
                                        onChange={(e) => {
                                            setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
                                            if (errorMessage) setErrorMessage("")
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && phoneNumber.length === 10) {
                                                handleGetOtp()
                                            }
                                        }}
                                        placeholder="Enter 10-digit mobile number"
                                        className="w-full px-4 py-3 text-sm font-semibold text-gray-900 placeholder:text-gray-400 bg-transparent outline-none"
                                    />
                                </div>
                                <p className="text-[11px] text-gray-400 mt-1.5 pl-1">
                                    We will send an OTP via SMS for instant verification.
                                </p>
                            </div>

                            {/* Get OTP Button */}
                            <button
                                type="button"
                                onClick={handleGetOtp}
                                disabled={phoneNumber.length !== 10 || isSending}
                                className={`w-full py-3.5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all ${
                                    phoneNumber.length === 10 && !isSending
                                        ? "bg-gradient-to-r from-[#F26522] to-[#FF7A38] hover:from-[#E05310] hover:to-[#F26522] text-white shadow-md hover:shadow-lg cursor-pointer transform active:scale-[0.99]"
                                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                }`}
                            >
                                <span>{isSending ? "Sending..." : "Get OTP"}</span>
                                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                            </button>

                            <div className="flex items-center justify-between text-xs pt-1 px-1">
                                <button
                                    type="button"
                                    onClick={() => setAuthMode("credentials")}
                                    className="text-gray-500 hover:text-[#1448d8] font-medium cursor-pointer"
                                >
                                    Log in with Password
                                </button>
                                <Link
                                    href={(() => {
                                        const params = new URLSearchParams()
                                        if (callbackUrl) params.set("callbackUrl", callbackUrl)
                                        const qs = params.toString()
                                        return `/forgot-password${qs ? `?${qs}` : ""}`
                                    })()}
                                    data-testid="modal-forgot-password-link"
                                    onClick={() => closeMobileAuth()}
                                    className="text-[#1448d8] font-medium hover:underline"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                        </div>
                    ) : (
                        /* ─── STEP 2: 6-DIGIT OTP FIELD ──────────────────────────── */
                        <div className="space-y-5">
                            <div className="text-center">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold mb-2">
                                    <span>+91 {phoneNumber}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStep("phone")
                                            setErrorMessage("")
                                        }}
                                        disabled={isVerifying}
                                        className="text-[#F26522] hover:underline font-bold ml-1 cursor-pointer disabled:opacity-50"
                                    >
                                        Change
                                    </button>
                                </div>
                                <p className="text-xs text-gray-600 font-medium">
                                    Enter 6-digit OTP (auto-verifies on completion)
                                </p>
                            </div>

                            {/* 6 Segmented OTP Input Boxes */}
                            <div className="flex items-center justify-center gap-2 sm:gap-2.5">
                                {otp.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        ref={(el) => {
                                            inputRefs.current[idx] = el
                                        }}
                                        type="tel"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        disabled={isVerifying}
                                        onChange={(e) => handleOtpChange(e.target.value, idx, inputRefs)}
                                        onKeyDown={(e) => handleOtpKeyDown(e, idx, inputRefs)}
                                        onPaste={(e) => handleOtpPaste(e, inputRefs)}
                                        className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-2xl border-2 transition-all outline-none ${
                                            digit
                                                ? "border-[#F26522] bg-orange-50/30 text-gray-900"
                                                : "border-gray-200 bg-gray-50 focus:border-[#F26522] focus:bg-white"
                                        } focus:ring-4 focus:ring-[#F26522]/15`}
                                    />
                                ))}
                            </div>

                            {/* Verifying Status */}
                            {isVerifying ? (
                                <div className="py-2 flex items-center justify-center gap-2 text-xs font-bold text-[#F26522] animate-pulse">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Verifying OTP &amp; logging in...</span>
                                </div>
                            ) : (
                                /* Resend Timer / Action */
                                <div className="text-center pt-1 text-xs">
                                    {countdown > 0 ? (
                                        <span className="text-gray-400 font-medium">
                                            Resend OTP in <strong className="text-gray-700">{countdown}s</strong>
                                        </span>
                                    ) : (
                                        <div className="flex items-center justify-center gap-1">
                                            <span className="text-gray-500 font-medium">Didn&apos;t receive OTP?</span>
                                            <button
                                                type="button"
                                                onClick={handleResendOtp}
                                                disabled={isSending}
                                                className="text-[#F26522] hover:text-[#E05310] font-extrabold cursor-pointer hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isSending ? "Sending..." : "Resend OTP"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100 flex items-center gap-2 text-[11px] text-gray-500">
                                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                                <span>We&apos;ll verify the code sent to your mobile number.</span>
                            </div>
                        </div>
                    )}
                    </>
                    )}

                    {/* Bottom Terms */}
                    <p className="text-[11px] text-center text-gray-400 leading-relaxed pt-2 border-t border-gray-100">
                        By proceeding, you agree to our Terms of Service &amp; Privacy Policy.
                    </p>
                </div>
            </div>
        </div>
    )
}
