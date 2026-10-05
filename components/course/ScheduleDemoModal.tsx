"use client"

import React, { useState, useEffect, useRef } from "react"
import { useSession, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Calendar,
  Clock,
  CheckCircle2,
  Sparkles,
  Phone,
  ArrowRight,
  X,
  Video,
  ShieldCheck,
  Loader2,
  Copy,
  Check,
  RotateCcw,
} from "lucide-react"

interface ScheduleDemoModalProps {
  isOpen: boolean
  onClose: () => void
  course: {
    id: string
    slug: string
    title: string
    thumbnailUrl?: string | null
    price?: number | null
    demoSettings?: {
      enabled?: boolean
      topic?: string
      facultyName?: string
      slots?: Array<{ id: string; dateLabel: string; timeLabel: string; tag: string }>
    }
  }
}

const DEFAULT_SLOTS = [
  { id: "today-evening", dateLabel: "Today", timeLabel: "6:00 PM", tag: "Fastest / In Demand" },
  { id: "tomorrow-morning", dateLabel: "Tomorrow", timeLabel: "11:00 AM", tag: "Morning Batch" },
  { id: "tomorrow-evening", dateLabel: "Tomorrow", timeLabel: "6:00 PM", tag: "Evening Batch" },
]

export default function ScheduleDemoModal({
  isOpen,
  onClose,
  course,
}: ScheduleDemoModalProps) {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()

  const [fetchedSlots, setFetchedSlots] = useState<any[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [utmSource, setUtmSource] = useState<string | null>(null)
  const [utmCampaign, setUtmCampaign] = useState<string | null>(null)

  const activeSlots = fetchedSlots.length > 0
    ? fetchedSlots
    : course.demoSettings?.slots && course.demoSettings.slots.length > 0
    ? course.demoSettings.slots
    : DEFAULT_SLOTS

  const [selectedSlot, setSelectedSlot] = useState<any>(activeSlots[0])
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""])
  const [flowStep, setFlowStep] = useState<"slot" | "otp" | "confirmed">("slot")
  const [countdown, setCountdown] = useState(30)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [copiedLink, setCopiedLink] = useState(false)

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Capture UTM parameters from URL query params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const src = urlParams.get("utm_source")
      const cmp = urlParams.get("utm_campaign")
      if (src) setUtmSource(src)
      if (cmp) setUtmCampaign(cmp)
    }
  }, [])

  // Fetch real database slots on modal open
  useEffect(() => {
    if (!isOpen) return
    setIsLoadingSlots(true)
    fetch(`/api/courses/${encodeURIComponent(course.slug)}/demo-slots`)
      .then((res) => res.json())
      .then((data) => {
        if (data.slots && data.slots.length > 0) {
          setFetchedSlots(data.slots)
          setSelectedSlot(data.slots[0])
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingSlots(false))
  }, [isOpen, course.slug])

  // Populate phone number if user already has an active session
  useEffect(() => {
    if (session?.user) {
      const userPhone = (session.user as any).phoneNumber || ""
      if (userPhone) setPhoneNumber(userPhone.replace(/\D/g, "").slice(-10))
    }
  }, [session])

  // Resend OTP countdown
  useEffect(() => {
    if (flowStep !== "otp" || countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [flowStep, countdown])

  if (!isOpen) return null

  // Direct booking for logged-in user or after OTP verification
  const executeBooking = async (phoneToUse: string, slotToUse: any) => {
    const cleanPhone = phoneToUse.replace(/\D/g, "").slice(-10)
    const res = await fetch("/api/courses/demo/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: course.id,
        courseSlug: course.slug,
        slotId: slotToUse?.id,
        phoneNumber: cleanPhone,
        utmSource,
        utmCampaign,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || "Failed to schedule demo.")
    }
    return data
  }

  // Handle Step 1 Submit (either booking directly if logged in, or advancing to OTP)
  const handleProceedFromSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")

    const cleanPhone = (phoneNumber || (session?.user as any)?.phoneNumber || "").replace(/\D/g, "")
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.")
      return
    }

    if (!selectedSlot?.id) {
      setErrorMsg("Please select an available demo slot.")
      return
    }

    // If user is already logged in with NextAuth session, book immediately
    if (session?.user) {
      setIsSubmitting(true)
      try {
        const data = await executeBooking(cleanPhone, selectedSlot)
        setBookingSuccess(data)
        setFlowStep("confirmed")
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to schedule demo.")
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    // User is NOT logged in: Transition to OTP verification step
    setFlowStep("otp")
    setCountdown(30)
    setOtpCode(["", "", "", "", "", ""])
    setTimeout(() => {
      otpInputRefs.current[0]?.focus()
    }, 100)
  }

  // Handle OTP digit entry
  const handleOtpDigitChange = (val: string, index: number) => {
    const cleanVal = val.replace(/\D/g, "").slice(-1)
    const newOtp = [...otpCode]
    newOtp[index] = cleanVal
    setOtpCode(newOtp)

    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus()
    }

    // Auto submit if all 6 digits are filled
    if (cleanVal && index === 5 && newOtp.every((d) => d.length === 1)) {
      submitOtpAndBook(newOtp.join(""))
    }
  }

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasted) return
    const newOtp = ["", "", "", "", "", ""]
    pasted.split("").forEach((char, idx) => {
      newOtp[idx] = char
    })
    setOtpCode(newOtp)
    if (pasted.length === 6) {
      submitOtpAndBook(pasted)
    } else {
      otpInputRefs.current[Math.min(pasted.length, 5)]?.focus()
    }
  }

  // Submit OTP, establish session, book demo in PostgreSQL, and show confirmation
  const submitOtpAndBook = async (codeToVerify?: string) => {
    const fullCode = codeToVerify || otpCode.join("")
    if (fullCode.length !== 6) {
      setErrorMsg("Please enter the complete 6-digit OTP.")
      return
    }

    setIsSubmitting(true)
    setErrorMsg("")

    try {
      // 1. Mobile login endpoint to find or create user and validate OTP
      const loginRes = await fetch("/api/auth/mobile-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber,
          otp: fullCode,
        }),
      })

      const loginData = await loginRes.json()
      if (!loginRes.ok || !loginData.success) {
        throw new Error(loginData.error || "Invalid OTP. Please try again.")
      }

      // 2. NextAuth signIn to establish client session
      await signIn("mobile", {
        phoneNumber,
        redirect: false,
      })

      // 3. Immediately book demo in PostgreSQL with slotId
      const bookingData = await executeBooking(phoneNumber, selectedSlot)
      setBookingSuccess(bookingData)
      setFlowStep("confirmed")
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to verify and schedule demo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const roomLink = bookingSuccess?.demoUrl || (typeof window !== "undefined"
    ? `${window.location.origin}/courses/${course.slug}/demo?slot=${bookingSuccess?.slotId || selectedSlot?.id}`
    : `/courses/${course.slug}/demo?slot=${bookingSuccess?.slotId || selectedSlot?.id}`)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#071322] border border-gray-200 dark:border-gray-800 rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl space-y-5 relative max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {flowStep === "slot" && (
          <>
            {/* Header */}
            <div className="space-y-1.5 pr-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-extrabold uppercase tracking-wider border border-emerald-500/20">
                <Video className="w-3.5 h-3.5" />
                <span>100% Free Live Interactive Demo</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight">
                Schedule Your Free Demo Class
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Select your preferred timing to join the live interactive lecture for <strong>{course.title}</strong>.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 text-xs rounded-xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800 font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleProceedFromSlot} className="space-y-4">
              {/* Step 1: Slot Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Choose Available Slot (IST)</span>
                  </span>
                  {isLoadingSlots && (
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading slots...
                    </span>
                  )}
                </label>

                <div className="grid grid-cols-1 gap-2.5">
                  {activeSlots.map((slot) => {
                    const isSelected = selectedSlot?.id === slot.id
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 ring-2 ring-emerald-500/30"
                            : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-white/5"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                              {slot.dateLabel}
                            </span>
                            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                              • {slot.timeLabel}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 block font-medium">
                            {slot.topic || slot.tag || "Live Strategy & Syllabus Breakdown"}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Mobile Number Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Your Mobile Number (for Demo Access & Reminders)</span>
                  </span>
                  {session?.user && (
                    <span className="text-[10px] text-emerald-600 font-extrabold">
                      Verified Session ✓
                    </span>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-gray-500">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 10-digit mobile"
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 text-gray-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Exclusive Perks */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-extrabold text-gray-900 dark:text-white">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Exclusive Free Demo Benefits:</span>
                </div>
                <p className="text-[11px] text-gray-600 dark:text-gray-300">
                  Join on time to unlock exclusive discounts for full course enrollment.
                </p>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={isSubmitting || !phoneNumber || phoneNumber.length < 10}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Reserving Your Seat...</span>
                  </>
                ) : session?.user ? (
                  <>
                    <Video className="w-4 h-4" />
                    <span>Confirm Free Demo Booking</span>
                  </>
                ) : (
                  <>
                    <span>Verify Mobile & Confirm Seat</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {flowStep === "otp" && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            <div className="space-y-1.5 pr-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] font-extrabold uppercase tracking-wider border border-amber-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verification Code</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight">
                Enter 6-Digit OTP
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Enter the verification code sent to <strong>+91 {phoneNumber}</strong> to confirm your slot for <strong>{selectedSlot?.dateLabel} at {selectedSlot?.timeLabel}</strong>.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 text-xs rounded-xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800 font-medium">
                {errorMsg}
              </div>
            )}

            {/* 6 Digit OTP Inputs */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 py-2">
              {otpCode.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpInputRefs.current[idx] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpDigitChange(e.target.value, idx)}
                  onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                  onPaste={handleOtpPaste}
                  className="w-11 h-13 sm:w-12 sm:h-14 rounded-2xl border-2 border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-white/5 text-center text-xl font-black text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all"
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
              <button
                type="button"
                onClick={() => setFlowStep("slot")}
                className="text-gray-500 hover:text-gray-800 dark:hover:text-white font-medium underline cursor-pointer"
              >
                Change Number
              </button>

              {countdown > 0 ? (
                <span className="font-semibold text-gray-400">
                  Resend in {countdown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setCountdown(30)
                    setErrorMsg("")
                  }}
                  className="font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Resend Code</span>
                </button>
              )}
            </div>

            {/* Verify CTA */}
            <button
              type="button"
              onClick={() => submitOtpAndBook()}
              disabled={isSubmitting || otpCode.some((d) => !d)}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying &amp; Confirming Booking...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify OTP &amp; Confirm Booking</span>
                </>
              )}
            </button>
          </div>
        )}

        {flowStep === "confirmed" && bookingSuccess && (
          /* Confirmation Success View */
          <div className="space-y-5 text-center py-2 animate-in fade-in-50 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                {bookingSuccess.alreadyBooked ? "Already Registered" : "Booking Confirmed"}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                {bookingSuccess.alreadyBooked ? "You're Set for This Demo!" : "You're Scheduled for Demo!"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                Your live demo for <strong className="text-gray-900 dark:text-white">{course.title}</strong> is reserved in the classroom.
              </p>
            </div>

            {/* Scheduled Slot Summary Card */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#081a2f] border border-gray-200 dark:border-gray-800 text-left space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium">Scheduled Time:</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {bookingSuccess.fullTimeLabel || `${bookingSuccess.slotDate} at ${bookingSuccess.slotTime}`}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium">Registered Phone:</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {bookingSuccess.phoneNumber}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium">Class Status:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  Seat Confirmed
                </span>
              </div>

              {/* Slot-specific Room Link */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-800 space-y-1">
                <span className="text-[11px] font-bold text-gray-500 block">Your Slot-Specific Demo Room Link:</span>
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white dark:bg-black/30 border border-gray-200 dark:border-gray-700 text-[11px] font-mono">
                  <span className="truncate flex-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    {roomLink}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(roomLink)
                      setCopiedLink(true)
                      setTimeout(() => setCopiedLink(false), 2000)
                    }}
                    className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-800 dark:text-gray-200 font-sans font-bold text-[10px] shrink-0 cursor-pointer"
                  >
                    {copiedLink ? "Copied ✓" : "Copy"}
                  </button>
                </div>
              </div>
            </div>

            {/* Direct Action Button */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  onClose()
                  router.push(`/courses/${course.slug}/demo?slot=${bookingSuccess.slotId}`)
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-100 font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Enter Live Demo Classroom Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

