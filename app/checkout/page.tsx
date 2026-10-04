"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useSession, signIn } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Loader2,
    CheckCircle,
    CreditCard,
    ShieldCheck,
    Globe,
    IndianRupee,
    Phone,
    BookOpen,
    Sparkles,
    ArrowRight,
    Lock
} from "lucide-react"
import { createCheckoutSession } from "@/lib/actions/payment/stripe"
import { createRazorpayOrder } from "@/lib/actions/payment/razorpay"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import Script from "next/script"
import Image from "next/image"
import { loadRazorpayScript } from "@/lib/payments/razorpayClient"

declare global {
    interface Window {
        Razorpay: any
    }
}

interface CourseCheckoutInfo {
    id: string
    title: string
    slug: string
    description: string
    thumbnailUrl?: string | null
    price: number
    originalPrice?: number
    discountPercent?: number
    isFree: boolean
    isPremium?: boolean
    totalLessons?: number
}

function CheckoutContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { data: session, status: authStatus } = useSession()

    const rawCourseId = searchParams.get("courseId") || searchParams.get("slug") || searchParams.get("batchId")
    const planParam = (searchParams.get("plan") || "monthly").toUpperCase() as "MONTHLY" | "YEARLY"
    const couponParam = (searchParams.get("coupon") || "").trim().toUpperCase()

    const [course, setCourse] = useState<CourseCheckoutInfo | null>(null)
    const [isCourseLoading, setIsCourseLoading] = useState(Boolean(rawCourseId))
    const [courseError, setCourseError] = useState("")

    const [isLoading, setIsLoading] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState<"stripe" | "razorpay">("razorpay")
    const [isDetectingLocation, setIsDetectingLocation] = useState(false)

    // Mobile auth state for unauthenticated users
    const [phoneNumber, setPhoneNumber] = useState("")
    const [phoneError, setPhoneError] = useState("")
    const [isLoggingIn, setIsLoggingIn] = useState(false)
    const [localUser, setLocalUser] = useState<{ id: string; name?: string; phoneNumber?: string } | null>(null)

    // 2. Fetch course details if courseId is present
    useEffect(() => {
        if (!rawCourseId) {
            setIsCourseLoading(false)
            return
        }

        const fetchCourse = async () => {
            setIsCourseLoading(true)
            try {
                const res = await fetch(`/api/checkout/course-info?id=${encodeURIComponent(rawCourseId)}`)
                const data = await res.json()
                if (res.ok && data.course) {
                    setCourse(data.course)
                } else {
                    setCourseError(data.error || "Course details not found")
                }
            } catch (err) {
                console.error("Failed to load course details:", err)
                setCourseError("Failed to load course details. Please try again.")
            } finally {
                setIsCourseLoading(false)
            }
        }

        fetchCourse()
    }, [rawCourseId])

    const activeUser = session?.user || localUser

    // Quick mobile registration/login helper
    const handleQuickLogin = async (phone: string): Promise<string | null> => {
        if (!/^[0-9]{10}$/.test(phone)) {
            setPhoneError("Please enter a valid 10-digit mobile number.")
            return null
        }
        setPhoneError("")
        setIsLoggingIn(true)
        try {
            const res = await fetch("/api/auth/mobile-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phoneNumber: phone,
                    courseId: course?.id || rawCourseId || null,
                }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                setPhoneError(data.error || "Registration failed.")
                setIsLoggingIn(false)
                return null
            }

            // Sign in with credentials provider
            try {
                await signIn("mobile", {
                    phoneNumber: phone,
                    redirect: false,
                })
            } catch (authErr) {
                console.warn("NextAuth session sync warning (ignorable):", authErr)
            }

            setLocalUser({ id: data.userId, name: data.name, phoneNumber: phone })
            setIsLoggingIn(false)
            return data.userId
        } catch (err: any) {
            console.error("Mobile login network error:", err)
            setPhoneError("Network error. Please check your connection and try again.")
            setIsLoggingIn(false)
            return null
        }
    }

    // Handle Free Course Enrollment
    const handleFreeEnrollment = async () => {
        setIsLoading(true)
        setPhoneError("")

        try {
            let userId = activeUser?.id

            // If not logged in, perform quick phone registration first
            if (!userId) {
                if (!phoneNumber || !/^[0-9]{10}$/.test(phoneNumber)) {
                    setPhoneError("Please enter your 10-digit mobile number to enroll.")
                    setIsLoading(false)
                    return
                }
                const newUserId = await handleQuickLogin(phoneNumber)
                if (!newUserId) {
                    setIsLoading(false)
                    return
                }
                userId = newUserId
            }

            // Call enrollment API
            const targetCourseId = course?.id || course?.slug || rawCourseId
            const enrollRes = await fetch("/api/courses/enroll", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    courseId: targetCourseId,
                    phoneNumber: phoneNumber || undefined,
                }),
            })

            const enrollData = await enrollRes.json()
            if (!enrollRes.ok || !enrollData.success) {
                setPhoneError(enrollData.error || "Enrollment failed.")
                setIsLoading(false)
                return
            }

            if (enrollData.goalId) {
                try {
                    localStorage.setItem("trillion_selected_goal", enrollData.goalId)
                    window.dispatchEvent(new CustomEvent("goalChange", { detail: { goalId: enrollData.goalId } }))
                } catch {}
            }

            // Successfully enrolled -> navigate to My Learning
            router.push("/my-learning")
        } catch (error) {
            console.error("Free enrollment error:", error)
            setPhoneError("Something went wrong. Please try again.")
            setIsLoading(false)
        }
    }

    // Handle Paid Course or Subscription Payment
    const handlePayment = async () => {
        setIsLoading(true)
        setPhoneError("")

        try {
            let userId = activeUser?.id

            // Ensure student is logged in before paying so their purchase attaches to their account
            if (!userId) {
                if (!phoneNumber || !/^[0-9]{10}$/.test(phoneNumber)) {
                    setPhoneError("Please enter your 10-digit mobile number before proceeding to payment.")
                    setIsLoading(false)
                    return
                }
                const newUserId = await handleQuickLogin(phoneNumber)
                if (!newUserId) {
                    setIsLoading(false)
                    return
                }
                userId = newUserId
            }

            if (paymentMethod === "stripe") {
                if (course) {
                    // For international Stripe on courses
                    await createCheckoutSession(planParam === "YEARLY" ? "YEARLY" : "MONTHLY")
                } else {
                    await createCheckoutSession(planParam === "YEARLY" ? "YEARLY" : "MONTHLY")
                }
                return
            }

            // ─── Razorpay Payment ────────────────────────────────────────────────
            const couponDiscount = couponParam === "DEMO30" ? 0.3 : 0
            const exactAmount = course
                ? Math.round(course.price * (1 - couponDiscount))
                : (planParam === "YEARLY" ? 4999 : 499)
            const order = await createRazorpayOrder({
                amount: exactAmount,
                courseId: course?.id,
                courseTitle: course?.title,
                plan: course ? undefined : planParam,
                userId,
                couponCode: couponParam || undefined,
            })

            const options = {
                key: order.keyId,
                amount: order.amount,
                currency: order.currency,
                name: "aspirantbook",
                description: course ? course.title : `${planParam} Subscription`,
                order_id: order.orderId,
                handler: async function (response: any) {
                    try {
                        const verifyRes = await fetch("/api/verify-payment/razorpay", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                orderId: response.razorpay_order_id,
                                paymentId: response.razorpay_payment_id,
                                signature: response.razorpay_signature,
                                courseId: course?.id,
                                plan: course ? undefined : planParam,
                                userId,
                            }),
                        })
                        const verifyData = await verifyRes.json()
                        if (verifyData?.goalId) {
                            try {
                                localStorage.setItem("trillion_selected_goal", verifyData.goalId)
                                window.dispatchEvent(new CustomEvent("goalChange", { detail: { goalId: verifyData.goalId } }))
                            } catch {}
                        }
                        const fallbackRedirect = course ? "/my-learning" : "/my-tests"
                        if (verifyRes.ok && verifyData.success) {
                            router.push(verifyData.redirectUrl || fallbackRedirect)
                        } else {
                            router.push(fallbackRedirect)
                        }
                    } catch {
                        router.push(course ? "/my-learning" : "/my-tests")
                    }
                },
                prefill: {
                    name: activeUser?.name || "Student",
                    email: (activeUser as any)?.email || (phoneNumber ? `mobile_${phoneNumber}@aspirantbook.local` : ""),
                    contact: phoneNumber || (activeUser as any)?.phoneNumber || "",
                },
                theme: {
                    color: "#5B47FB",
                },
            }

            if (typeof window === "undefined" || !window.Razorpay) {
                const loaded = await loadRazorpayScript()
                if (!loaded || !window.Razorpay) {
                    setPhoneError("Payment gateway is initializing. Please wait a few seconds and try again.")
                    setIsLoading(false)
                    return
                }
            }

            const rzp = new window.Razorpay(options)
            rzp.on("payment.failed", function (failRes: any) {
                console.error("Razorpay payment failed:", failRes.error)
                setPhoneError(failRes.error?.description || "Payment failed or was canceled.")
                setIsLoading(false)
            })
            rzp.open()
            setIsLoading(false)
        } catch (error: any) {
            console.error("Payment failed:", error)
            setPhoneError(error.message || "Failed to start payment. Please check your connection.")
            setIsLoading(false)
        }
    }

    if (isCourseLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <Loader2 className="h-10 w-10 animate-spin text-[#5B47FB] mb-3" />
                <p className="text-sm font-semibold text-gray-600">Loading checkout details...</p>
            </div>
        )
    }

    // Pricing calculation
    const isFree = course ? (course.isFree || course.price === 0) : false
    const couponDiscount = couponParam === "DEMO30" ? 0.3 : 0
    const finalCoursePrice = course ? Math.round(course.price * (1 - couponDiscount)) : 0
    const displayPrice = isFree
        ? "₹0 (Free)"
        : course
        ? `₹${finalCoursePrice.toLocaleString("en-IN")}`
        : paymentMethod === "razorpay"
        ? (planParam === "YEARLY" ? "₹4,999" : "₹499")
        : (planParam === "YEARLY" ? "$190" : "$19")

    return (
        <div className="min-h-screen bg-[#F9FAFB] py-10 selection:bg-orange-100">
            <link rel="dns-prefetch" href="https://checkout.razorpay.com" />
            <link rel="preconnect" href="https://checkout.razorpay.com" crossOrigin="anonymous" />
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-100 text-xs font-bold text-[#F26522] mb-2">
                            <span>aspirantbook Secure Checkout</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                            {isFree ? "Complete Free Enrollment" : "Complete Your Order"}
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            {isFree
                                ? "Zero cost. Instant access to full lectures, notes & test series."
                                : "Secure 256-bit encrypted checkout with instant batch access."}
                        </p>
                    </div>

                    {/* Back link */}
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="text-xs font-bold text-gray-500 hover:text-gray-900 cursor-pointer self-start sm:self-auto"
                    >
                        &larr; Go Back
                    </button>
                </div>

                {courseError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
                        {courseError}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Course/Plan Details + Login + Payment */}
                    <div className="lg:col-span-7 space-y-6">
                        {/* 1. Account / Mobile Identification Card */}
                        <Card className="rounded-2xl border-gray-200/80 shadow-xs">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-bold flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-[#5B47FB]" />
                                        Student Account
                                    </span>
                                    {activeUser && (
                                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <CheckCircle className="h-3 w-3" /> Logged In
                                        </span>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {activeUser ? (
                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                                        <div>
                                            <span className="text-gray-500">Enrolling as:</span>
                                            <p className="font-extrabold text-gray-900 text-sm">
                                                {activeUser.name || "Student"}
                                                {(activeUser as any)?.email ? ` (${(activeUser as any).email})` : ""}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <label className="block text-xs font-bold text-gray-700">
                                            Enter Mobile Number to Attach Course Access
                                        </label>
                                        <div className="relative">
                                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input
                                                type="tel"
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                                placeholder="10-digit Mobile Number"
                                                pattern="[0-9]{10}"
                                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#5B47FB] focus:bg-white transition-all font-semibold"
                                            />
                                        </div>
                                        <p className="text-[11px] text-gray-400">
                                            No OTP needed. Account is linked instantly with your mobile number.
                                        </p>
                                    </div>
                                )}
                                {phoneError && (
                                    <p className="text-xs text-red-500 font-semibold mt-2">{phoneError}</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* 2. Payment Method Card (Only for Paid items) */}
                        {!isFree && (
                            <Card className="rounded-2xl border-gray-200/80 shadow-xs">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <CreditCard className="h-4 w-4 text-[#5B47FB]" />
                                        Payment Method
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {isDetectingLocation ? (
                                        <div className="flex items-center justify-center py-6">
                                            <Loader2 className="h-6 w-6 animate-spin text-[#5B47FB]" />
                                            <span className="ml-2 text-xs text-gray-500">Detecting location...</span>
                                        </div>
                                    ) : (
                                        <RadioGroup
                                            value={paymentMethod}
                                            onValueChange={(v: "stripe" | "razorpay") => setPaymentMethod(v)}
                                            className="grid grid-cols-1 gap-3"
                                        >
                                            <div
                                                onClick={() => setPaymentMethod("razorpay")}
                                                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                                                    paymentMethod === "razorpay"
                                                        ? "border-[#5B47FB] bg-[#F5F3FF] shadow-xs"
                                                        : "border-gray-200 hover:bg-gray-50"
                                                }`}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <RadioGroupItem value="razorpay" id="razorpay" />
                                                    <Label htmlFor="razorpay" className="cursor-pointer">
                                                        <div className="font-extrabold text-sm flex items-center gap-1.5 text-gray-900">
                                                            <IndianRupee className="h-4 w-4 text-[#5B47FB]" />
                                                            India (UPI, Cards, Netbanking)
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-0.5">
                                                            Pay via Google Pay, PhonePe, Paytm, Cards &amp; Netbanking
                                                        </div>
                                                    </Label>
                                                </div>
                                                <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                                                    Recommended
                                                </Badge>
                                            </div>

                                            <div
                                                onClick={() => setPaymentMethod("stripe")}
                                                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                                                    paymentMethod === "stripe"
                                                        ? "border-[#5B47FB] bg-[#F5F3FF] shadow-xs"
                                                        : "border-gray-200 hover:bg-gray-50"
                                                }`}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <RadioGroupItem value="stripe" id="stripe" />
                                                    <Label htmlFor="stripe" className="cursor-pointer">
                                                        <div className="font-extrabold text-sm flex items-center gap-1.5 text-gray-900">
                                                            <Globe className="h-4 w-4 text-gray-600" />
                                                            International (Credit/Debit Card)
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-0.5">
                                                            Visa, MasterCard, Amex via Stripe
                                                        </div>
                                                    </Label>
                                                </div>
                                                <Badge variant="outline" className="text-xs">
                                                    Stripe
                                                </Badge>
                                            </div>
                                        </RadioGroup>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Action CTA Button */}
                        <div className="space-y-3 pt-2">
                            {isFree ? (
                                <Button
                                    className="w-full h-14 text-base font-extrabold bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    onClick={handleFreeEnrollment}
                                    disabled={isLoading || isLoggingIn}
                                >
                                    {isLoading || isLoggingIn ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            <span>Enrolling into Batch...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Complete Free Enrollment (₹0)</span>
                                            <ArrowRight className="h-5 w-5" />
                                        </>
                                    )}
                                </Button>
                            ) : (
                                <Button
                                    className="w-full h-14 text-base font-extrabold bg-[#5B47FB] hover:bg-[#4835ea] text-white rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    onClick={handlePayment}
                                    disabled={isLoading || isDetectingLocation || isLoggingIn}
                                >
                                    {isLoading || isLoggingIn ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            <span>Processing Secure Order...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="h-4 w-4" />
                                            <span>
                                                Pay {displayPrice} via {paymentMethod === "razorpay" ? "Razorpay" : "Stripe"}
                                            </span>
                                            <ArrowRight className="h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            )}

                            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 font-medium">
                                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                <span>SSL Encrypted &bull; 100% Satisfaction Guaranteed &bull; Instant Access</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Order Summary & Item Overview */}
                    <div className="lg:col-span-5 space-y-6">
                        <Card className="rounded-2xl border-gray-200/80 shadow-xs overflow-hidden">
                            <CardHeader className="bg-gray-50/80 border-b border-gray-100 py-4">
                                <CardTitle className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                                    Order Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-5">
                                {/* Course or Subscription Details */}
                                {course ? (
                                    <div className="space-y-4">
                                        <div className="flex gap-3 items-start">
                                            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center">
                                                {course.thumbnailUrl ? (
                                                    <Image
                                                        src={course.thumbnailUrl}
                                                        alt={course.title}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <BookOpen className="h-7 w-7 text-[#5B47FB]" />
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-[#F26522] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                                                    Video Batch
                                                </span>
                                                <h3 className="font-black text-sm text-gray-900 leading-snug line-clamp-2">
                                                    {course.title}
                                                </h3>
                                                {course.totalLessons ? (
                                                    <p className="text-[11px] text-gray-500">
                                                        {course.totalLessons} Full Lectures &bull; Notes &bull; DPPs
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-gray-100 space-y-2.5 text-xs text-gray-600">
                                            <div className="flex justify-between">
                                                <span>Batch Fee</span>
                                                <span className="font-semibold text-gray-900">
                                                    {isFree
                                                        ? "₹0"
                                                        : `₹${(course.originalPrice || course.price).toLocaleString("en-IN")}`}
                                                </span>
                                            </div>
                                            {course.originalPrice && course.originalPrice > course.price && (
                                                <div className="flex justify-between text-emerald-600 font-bold">
                                                    <span>Special Launch Discount</span>
                                                    <span>
                                                        -₹{(course.originalPrice - course.price).toLocaleString("en-IN")}
                                                    </span>
                                                </div>
                                            )}
                                            {couponParam === "DEMO30" && course && (
                                                <div className="flex justify-between text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                                    <span className="flex items-center gap-1.5">
                                                        <Sparkles className="w-3.5 h-3.5" />
                                                        <span>Special Demo Discount (DEMO30)</span>
                                                    </span>
                                                    <span>
                                                        -₹{(course.price - finalCoursePrice).toLocaleString("en-IN")} (30% OFF)
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex justify-between">
                                                <span>Platform Access &amp; Certificate</span>
                                                <span className="font-bold text-emerald-600">Included (Free)</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-100 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="font-extrabold text-sm text-gray-900">
                                                    aspirantbook Premium ({planParam})
                                                </span>
                                                <span className="font-black text-base text-[#5B47FB]">
                                                    {displayPrice}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                Full unlimited access to all courses, question banks, and live doubts.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Price Total */}
                                <div className="pt-4 border-t border-gray-100 flex items-baseline justify-between">
                                    <span className="text-sm font-extrabold text-gray-900">Total Payable:</span>
                                    <div className="text-right">
                                        <span className={`text-2xl font-black ${isFree ? "text-emerald-600" : "text-gray-900"}`}>
                                            {displayPrice}
                                        </span>
                                        {course?.originalPrice && course.originalPrice > course.price && (
                                            <div className="text-[11px] text-gray-400 line-through">
                                                ₹{course.originalPrice.toLocaleString("en-IN")}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* What you get */}
                        <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-xs space-y-3">
                            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                Included in this Enrollment
                            </h4>
                            <ul className="space-y-2 text-xs text-gray-600 font-medium">
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                    <span>Instant addition to <strong>My Batches</strong> upon confirmation</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                    <span>High Definition video lectures &bull; Self paced playback</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                    <span>Chapterwise downloadable PDF study notes &amp; DPPs</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                    <span>Certificate of Completion verified by aspirantbook</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function CheckoutPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <Loader2 className="h-8 w-8 animate-spin text-[#5B47FB]" />
                </div>
            }
        >
            <CheckoutContent />
        </Suspense>
    )
}
