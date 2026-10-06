"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { sanitizeReturnPath } from "@/lib/utils/return-path"

export interface MobileAuthCourseInfo {
    id: string
    slug?: string
    title: string
    price?: string | number
    isFree?: boolean
    image?: string
    classTag?: string
    targetText?: string
}

export interface MobileAuthOptions {
    course?: MobileAuthCourseInfo | null
    actionType?: "enroll" | "buy" | "details" | "login"
    callbackUrl?: string
    onSuccess?: (user: any) => void
}

interface MobileAuthContextType {
    isOpen: boolean
    step: "phone" | "otp"
    phoneNumber: string
    otp: string[]
    countdown: number
    isVerifying: boolean
    errorMessage: string
    successMessage: string
    activeCourse: MobileAuthCourseInfo | null
    actionType: "enroll" | "buy" | "details" | "login"
    callbackUrl: string | null
    openMobileAuth: (options?: MobileAuthOptions) => void
    closeMobileAuth: () => void
    setPhoneNumber: (phone: string) => void
    setStep: (step: "phone" | "otp") => void
    setErrorMessage: (msg: string) => void
    handleGetOtp: () => void
    handleResendOtp: () => void
    handleOtpChange: (val: string, index: number, inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>) => void
    handleOtpKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, index: number, inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>) => void
    handleOtpPaste: (e: React.ClipboardEvent<HTMLInputElement>, inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>) => void
    verifyOtp: (code: string) => Promise<void>
}

const MobileAuthContext = createContext<MobileAuthContextType | null>(null)

// Standalone global trigger function
export function triggerMobileAuth(options?: MobileAuthOptions) {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("openMobileAuth", { detail: options || {} }))
    }
}

export function MobileAuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [step, setStep] = useState<"phone" | "otp">("phone")
    const [phoneNumber, setPhoneNumber] = useState("")
    const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""])
    const [countdown, setCountdown] = useState(30)
    const [isVerifying, setIsVerifying] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")
    const [successMessage, setSuccessMessage] = useState("")
    const [activeCourse, setActiveCourse] = useState<MobileAuthCourseInfo | null>(null)
    const [actionType, setActionType] = useState<"enroll" | "buy" | "details" | "login">("login")
    const [callbackUrl, setCallbackUrl] = useState<string | null>(null)

    const openMobileAuth = useCallback((options?: MobileAuthOptions) => {
        const course = options?.course || null
        const act = options?.actionType || "login"
        const rawCb = options?.callbackUrl || null
        const safeCb = rawCb ? sanitizeReturnPath(rawCb, "") : null

        setActiveCourse(course)
        setActionType(act)
        setCallbackUrl(safeCb)
        setStep("phone")
        setPhoneNumber("")
        setOtp(["", "", "", "", "", ""])
        setErrorMessage("")
        setSuccessMessage("")
        setIsVerifying(false)
        setCountdown(30)
        setIsOpen(true)
    }, [])

    const closeMobileAuth = useCallback(() => {
        if (isVerifying) return
        setIsOpen(false)
    }, [isVerifying])

    // Listen to global window event as well
    useEffect(() => {
        const handler = (e: any) => {
            openMobileAuth(e.detail)
        }
        window.addEventListener("openMobileAuth", handler)
        return () => window.removeEventListener("openMobileAuth", handler)
    }, [openMobileAuth])

    // Countdown timer for Resend OTP
    useEffect(() => {
        if (!isOpen || step !== "otp" || countdown <= 0) return
        const timer = setInterval(() => {
            setCountdown((prev) => Math.max(0, prev - 1))
        }, 1000)
        return () => clearInterval(timer)
    }, [isOpen, step, countdown])

    const handleGetOtp = useCallback(() => {
        if (phoneNumber.length !== 10) {
            setErrorMessage("Please enter a valid 10-digit mobile number.")
            return
        }
        setErrorMessage("")
        setStep("otp")
        setCountdown(30)
        setOtp(["", "", "", "", "", ""])
    }, [phoneNumber])

    const handleResendOtp = useCallback(() => {
        setCountdown(30)
        setOtp(["", "", "", "", "", ""])
        setErrorMessage("")
    }, [])

    const isCourseFree = (course?: MobileAuthCourseInfo | null): boolean => {
        if (!course) return false
        if (course.isFree !== undefined) return course.isFree
        if (!course.price) return true
        const p = String(course.price).toLowerCase()
        return p.includes("free") || p === "0" || p === "₹0"
    }

    // Auto-verify without clicking: Accepts ANY 6-digit number as valid OTP
    const verifyOtp = useCallback(async (code: string) => {
        if (isVerifying) return
        setIsVerifying(true)
        setErrorMessage("")

        const isFree = isCourseFree(activeCourse)
        const effectiveAction = actionType === "enroll" || (actionType === "login" && isFree) ? "enroll" : actionType

        try {
            // Step 1: Call mobile-login API (auto-enrolls if free course)
            const courseParam = effectiveAction === "enroll" && activeCourse
                ? (activeCourse.slug || activeCourse.id)
                : null

            const res = await fetch("/api/auth/mobile-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phoneNumber,
                    courseId: courseParam,
                }),
            })

            const data = await res.json()
            if (!res.ok || !data.success) {
                setErrorMessage(data.error || "Login failed. Please try again.")
                setIsVerifying(false)
                return
            }

            // Step 2: Sign in NextAuth session
            const signInRes = await signIn("mobile", {
                phoneNumber,
                redirect: false,
            })

            if (signInRes?.error) {
                setErrorMessage("Authentication failed. Please try again.")
                setIsVerifying(false)
                return
            }

            if (data.goalId) {
                try {
                    localStorage.setItem("trillion_selected_goal", data.goalId)
                    window.dispatchEvent(new CustomEvent("goalChange", { detail: { goalId: data.goalId } }))
                } catch {}
            }

            // Step 3: Handle redirection according to requirements
            if (callbackUrl) {
                setSuccessMessage("Logged in successfully! Returning to page...")
                setTimeout(() => {
                    setIsOpen(false)
                    router.push(callbackUrl)
                    router.refresh()
                }, 900)
            } else if (effectiveAction === "enroll" && activeCourse) {
                // Free course -> enroll without payment page -> show list in My Batches with Watch Now
                setSuccessMessage("Enrolled successfully! Redirecting to My Batches...")
                setTimeout(() => {
                    setIsOpen(false)
                    router.push("/my-learning")
                    router.refresh()
                }, 1000)
            } else if (actionType === "buy" && activeCourse) {
                // Paid course -> go to payment page
                setSuccessMessage("Verified! Redirecting to Checkout...")
                setTimeout(() => {
                    setIsOpen(false)
                    const targetId = activeCourse.slug || activeCourse.id
                    router.push(`/checkout?courseId=${targetId}`)
                    router.refresh()
                }, 900)
            } else if (actionType === "details" && activeCourse) {
                // Course details navigation
                setSuccessMessage("Verified! Redirecting to Course...")
                setTimeout(() => {
                    setIsOpen(false)
                    const targetId = activeCourse.slug || activeCourse.id
                    router.push(`/courses/${targetId}`)
                    router.refresh()
                }, 900)
            } else {
                setSuccessMessage("Logged in successfully!")
                setTimeout(() => {
                    setIsOpen(false)
                    router.push("/my-learning")
                    router.refresh()
                }, 900)
            }
        } catch (err) {
            console.error("OTP verification error:", err)
            setErrorMessage("Something went wrong. Please try again.")
            setIsVerifying(false)
        }
    }, [actionType, activeCourse, callbackUrl, isVerifying, phoneNumber, router])

    const handleOtpChange = (
        val: string,
        index: number,
        inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>
    ) => {
        const cleaned = val.replace(/\D/g, "")
        if (!cleaned) {
            const next = [...otp]
            next[index] = ""
            setOtp(next)
            return
        }

        const char = cleaned.slice(-1)
        const next = [...otp]
        next[index] = char
        setOtp(next)

        if (index < 5) {
            inputRefs.current[index + 1]?.focus()
        }

        const fullOtp = next.join("")
        if (fullOtp.length === 6) {
            verifyOtp(fullOtp)
        }
    }

    const handleOtpKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>,
        index: number,
        inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>
    ) => {
        if (e.key === "Backspace") {
            if (!otp[index] && index > 0) {
                const next = [...otp]
                next[index - 1] = ""
                setOtp(next)
                inputRefs.current[index - 1]?.focus()
            }
        } else if (e.key === "ArrowLeft" && index > 0) {
            inputRefs.current[index - 1]?.focus()
        } else if (e.key === "ArrowRight" && index < 5) {
            inputRefs.current[index + 1]?.focus()
        }
    }

    const handleOtpPaste = (
        e: React.ClipboardEvent<HTMLInputElement>,
        inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>
    ) => {
        e.preventDefault()
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
        if (!pasted) return

        const next = ["", "", "", "", "", ""]
        for (let i = 0; i < pasted.length; i++) {
            next[i] = pasted[i]
        }
        setOtp(next)

        if (pasted.length === 6) {
            verifyOtp(pasted)
        } else {
            inputRefs.current[Math.min(pasted.length, 5)]?.focus()
        }
    }

    return (
        <MobileAuthContext.Provider
            value={{
                isOpen,
                step,
                phoneNumber,
                otp,
                countdown,
                isVerifying,
                errorMessage,
                successMessage,
                activeCourse,
                actionType,
                callbackUrl,
                openMobileAuth,
                closeMobileAuth,
                setPhoneNumber,
                setStep,
                setErrorMessage,
                handleGetOtp,
                handleResendOtp,
                handleOtpChange,
                handleOtpKeyDown,
                handleOtpPaste,
                verifyOtp,
            }}
        >
            {children}
        </MobileAuthContext.Provider>
    )
}

export function useMobileAuth() {
    const context = useContext(MobileAuthContext)
    if (!context) {
        return {
            isOpen: false,
            step: "phone" as const,
            phoneNumber: "",
            otp: ["", "", "", "", "", ""],
            countdown: 30,
            isVerifying: false,
            errorMessage: "",
            successMessage: "",
            activeCourse: null,
            actionType: "login" as const,
            callbackUrl: null,
            openMobileAuth: triggerMobileAuth,
            closeMobileAuth: () => {},
            setPhoneNumber: () => {},
            setStep: () => {},
            setErrorMessage: () => {},
            handleGetOtp: () => {},
            handleResendOtp: () => {},
            handleOtpChange: () => {},
            handleOtpKeyDown: () => {},
            handleOtpPaste: () => {},
            verifyOtp: async () => {},
        }
    }
    return context
}
