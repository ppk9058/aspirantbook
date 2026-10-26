"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { BookOpen, Calendar, ChevronRight, Phone, X, CheckCircle2, Sparkles, Loader2 } from "lucide-react"
import type { BatchCourse } from "./homepage-courses.data"

interface BatchEnrollModalProps {
    batch: BatchCourse | null
    onClose: () => void
}

export default function BatchEnrollModal({ batch, onClose }: BatchEnrollModalProps) {
    const router = useRouter()
    const [phoneNumber, setPhoneNumber] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [enrollError, setEnrollError] = useState("")
    const [enrollSuccess, setEnrollSuccess] = useState(false)

    // B-020: `batch` is nullable. Every field below is dereferenced, so bail out
    // before rendering instead of throwing on a slow/failed fetch.
    if (!batch) return null

    const isFree = !batch.price || batch.price.toLowerCase().includes("free") || batch.price === "0"

    const handleMobileEnroll = async (e: React.FormEvent) => {
        e.preventDefault()
        setEnrollError("")

        if (!/^[0-9]{10}$/.test(phoneNumber)) {
            setEnrollError("Please enter a valid 10-digit mobile number.")
            return
        }

        setIsLoading(true)
        try {
            // Step 1: Create/find user and auto-enroll if free
            const res = await fetch("/api/auth/mobile-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phoneNumber,
                    courseId: isFree ? (batch.slug || batch.id || null) : null,
                }),
            })
            const data = await res.json()

            if (!res.ok || !data.success) {
                setEnrollError(data.error || "Registration failed. Please try again.")
                setIsLoading(false)
                return
            }

            // Step 2: Sign in via the mobile credentials provider
            const result = await signIn("mobile", {
                phoneNumber,
                redirect: false,
            })

            if (result?.error) {
                setEnrollError("Login failed. Please try again.")
                setIsLoading(false)
                return
            }

            // Update platform goal automatically to enrolled course category
            if (data.goalId) {
                try {
                    localStorage.setItem("trillion_selected_goal", data.goalId)
                    window.dispatchEvent(new CustomEvent("goalChange", { detail: { goalId: data.goalId } }))
                } catch {}
            }

            // Step 3: Route depending on free vs paid
            if (isFree) {
                setEnrollSuccess(true)
                setTimeout(() => {
                    router.push("/my-learning")
                }, 1600)
            } else {
                // Redirect directly to checkout with real course fee
                const targetCourseParam = batch.slug || batch.id
                router.push(`/checkout?courseId=${targetCourseParam}`)
            }
        } catch {
            setEnrollError("Something went wrong. Please try again.")
            setIsLoading(false)
        }
    }

    const handleClose = () => {
        setEnrollSuccess(false)
        setPhoneNumber("")
        setEnrollError("")
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-gray-100 flex items-center justify-between z-10">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#F26522] bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">
                            {batch.classTag}
                        </span>
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase">
                            {batch.language}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Graphic & Title */}
                    <div className="flex items-center gap-4">
                        <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                            <Image
                                src={batch.image}
                                alt={batch.title}
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900 leading-snug">
                                {batch.title}
                            </h3>
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-2xl font-black text-gray-900">
                                    {batch.price}
                                </span>
                                {batch.originalPrice && (
                                    <span className="text-sm text-gray-400 line-through">
                                        {batch.originalPrice}
                                    </span>
                                )}
                                {batch.discount && (
                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                        {batch.discount}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Batch Highlights */}
                    <div className="bg-gray-50/80 rounded-2xl p-4 space-y-3 border border-gray-100 text-xs text-gray-700">
                        <div className="flex items-start gap-2.5">
                            <BookOpen className="h-4 w-4 text-[#5B47FB] mt-0.5 flex-shrink-0" />
                            <span><strong>Target:</strong> {batch.targetText}</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <Calendar className="h-4 w-4 text-[#5B47FB] mt-0.5 flex-shrink-0" />
                            <span><strong>Schedule:</strong> {batch.scheduleText}</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <Sparkles className="h-4 w-4 text-[#5B47FB] mt-0.5 flex-shrink-0" />
                            <span><strong>Includes:</strong> Live lectures, chapter-wise notes, DPP quizzes & 24/7 doubt resolution</span>
                        </div>
                    </div>

                    {/* Enrollment Form / Success Message */}
                    {enrollSuccess ? (
                        <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-4">
                            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="h-8 w-8" />
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                                    Enrollment Confirmed ✓
                                </span>
                                <h4 className="font-extrabold text-gray-900 text-lg">
                                    You&apos;re now enrolled!
                                </h4>
                                <p className="text-xs text-gray-600 leading-relaxed max-w-xs mx-auto">
                                    You are enrolled in <strong>{batch.title}</strong>. Redirecting to your courses...
                                </p>
                            </div>

                            <div className="pt-2 space-y-2">
                                <button
                                    type="button"
                                    onClick={() => router.push("/my-learning")}
                                    className="w-full py-3.5 px-6 bg-gradient-to-r from-[#F26522] to-[#FF7A38] hover:from-[#E05310] hover:to-[#F26522] text-white font-extrabold rounded-xl shadow-md hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>Go to My Courses 🚀</span>
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="text-xs text-gray-500 hover:text-gray-800 font-bold block mx-auto pt-1 cursor-pointer"
                                >
                                    Stay on Courses
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form
                            onSubmit={handleMobileEnroll}
                            className="space-y-4"
                        >
                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-gray-700">
                                    Enter Mobile Number to Enroll
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="tel"
                                        required
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                        placeholder="10-digit Mobile Number"
                                        pattern="[0-9]{10}"
                                        title="10-digit mobile number without spaces or dashes"
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#5B47FB] focus:bg-white transition-all"
                                    />
                                </div>
                                {enrollError && (
                                    <p className="text-xs text-red-500 font-medium">{enrollError}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3.5 bg-[#5B47FB] hover:bg-[#4a36ea] disabled:opacity-70 text-white font-extrabold rounded-xl shadow-md hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Enrolling...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>{isFree ? "Enroll Free Now" : `Continue to Checkout (${batch.price})`}</span>
                                        <ChevronRight className="h-4 w-4" />
                                    </>
                                )}
                            </button>

                            <p className="text-[11px] text-gray-400 text-center">
                                No OTP needed. Account created instantly with your mobile number.
                            </p>
                        </form>
                    )}

                </div>
            </div>
        </div>
    )
}
