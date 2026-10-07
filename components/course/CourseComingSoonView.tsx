"use client"

import React, { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
    Clock,
    Sparkles,
    Bell,
    CheckCircle2,
    ArrowLeft,
    Video,
    FileText,
    Users,
    Award,
    HelpCircle,
    Check,
} from "lucide-react"
import CuriousNavbar from "@/components/common/CuriousNavbar"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"

interface CourseComingSoonViewProps {
    slug: string
    title: string
    classTag?: string
    targetText?: string
    scheduleText?: string
    price?: string
    image?: string
    language?: string
}

export function CourseComingSoonView({
    slug,
    title,
    classTag = "Video Course",
    targetText,
    scheduleText,
    price,
    image = "/batch-purple.svg",
    language = "HINGLISH",
}: CourseComingSoonViewProps) {
    const router = useRouter()
    const { data: session } = useSession()
    const { openMobileAuth } = useMobileAuth()
    const [isNotified, setIsNotified] = useState(false)

    const handleNotifyMe = () => {
        if (session?.user) {
            // Already logged in - confirm notification registration
            setIsNotified(true)
            return
        }

        // Open Mobile Number & OTP popup to capture student phone number
        openMobileAuth({
            course: {
                id: slug,
                slug,
                title,
                price: price || "Coming Soon",
                isFree: false,
                image,
                classTag,
                targetText: targetText || "Video Batch Launching Soon",
            },
            actionType: "buy",
        })
    }

    return (
        <div className="min-h-screen bg-transparent text-gray-900 pb-20">
            {/* Top Bar Actions */}
            <div className="py-2 flex items-center justify-between">
                <button
                    onClick={() => router.push("/courses")}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-[#5B47FB] transition-colors cursor-pointer"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Courses</span>
                </button>
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-black uppercase tracking-wider shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Coming Soon
                    </span>
                </div>
            </div>

            {/* Main Container */}
            <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
                <div className="bg-white rounded-3xl border border-gray-200/90 shadow-xl overflow-hidden">
                    {/* Header Banner */}
                    <div className="relative bg-gradient-to-br from-[#1E1B4B] via-[#312E81] to-[#4338CA] p-6 sm:p-10 text-white overflow-hidden">
                        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-[#5B47FB]/30 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute top-4 right-4 sm:top-8 sm:right-8 opacity-10 sm:opacity-20 pointer-events-none">
                            <Sparkles className="w-36 h-36 text-white" />
                        </div>

                        <div className="relative z-10 max-w-3xl space-y-4">
                            {/* Badges */}
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/20 text-white backdrop-blur-xs border border-white/20">
                                    {classTag}
                                </span>
                                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-400 text-gray-950 font-black">
                                    Coming Soon
                                </span>
                                <span className="text-xs text-indigo-200 font-semibold">
                                    Language: <strong className="text-white">{language}</strong>
                                </span>
                            </div>

                            {/* Title */}
                            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-snug">
                                {title}
                            </h1>

                            {/* Target Description */}
                            {targetText && (
                                <p className="text-sm sm:text-base text-indigo-100/90 leading-relaxed font-medium">
                                    {targetText}
                                </p>
                            )}

                            {/* Schedule info if available */}
                            {scheduleText && (
                                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs text-xs sm:text-sm text-indigo-100 border border-white/15">
                                    <Clock className="w-4 h-4 text-amber-300 shrink-0" />
                                    <span>{scheduleText}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notification Callout */}
                    <div className="p-6 sm:p-10 bg-amber-50/70 border-b border-amber-200/80">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                            <div className="space-y-1.5 max-w-xl">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                                    <h2 className="text-base sm:text-lg font-black text-amber-950">
                                        This Video Course is Coming Soon!
                                    </h2>
                                </div>
                                <p className="text-xs sm:text-sm text-amber-900/80 leading-relaxed">
                                    Our educators and subject-matter experts are recording high-definition video lectures, curated chapter-wise study notes, and test series for this batch. Pre-register with your mobile number to receive instant SMS & WhatsApp notifications the moment enrollments open.
                                </p>
                            </div>

                            <div className="shrink-0 w-full sm:w-auto">
                                {isNotified ? (
                                    <div className="px-6 py-3.5 rounded-2xl bg-emerald-600 text-white font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-emerald-200">
                                        <Check className="w-5 h-5 text-emerald-200" />
                                        <span>You&apos;re on the Priority List!</span>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleNotifyMe}
                                        className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#5B47FB] hover:bg-[#4A38E8] text-white font-black text-sm transition-all shadow-lg shadow-indigo-300 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                                    >
                                        <Bell className="w-4 h-4" />
                                        <span>Notify Me on Launch</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* What to Expect Section */}
                    <div className="p-6 sm:p-10 space-y-8">
                        <div>
                            <h3 className="text-lg font-black text-gray-900 mb-2">
                                What Will Be Included in This Video Batch
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600">
                                Every AspirantBook video course is structured for complete concept mastery, regular practice, and exam excellence.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 flex items-start gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-[#5B47FB] flex items-center justify-center shrink-0">
                                    <Video className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-extrabold text-sm text-gray-900">HD Video Lectures</h4>
                                    <p className="text-xs text-gray-600 mt-0.5">
                                        Comprehensive chapter-wise video tutorials delivered in Hinglish/English with real-world examples.
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 flex items-start gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-extrabold text-sm text-gray-900">Downloadable PDF Notes</h4>
                                    <p className="text-xs text-gray-600 mt-0.5">
                                        High-yield classroom summary notes, formula cheat sheets, and solved exemplar problem sets.
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 flex items-start gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                    <Award className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-extrabold text-sm text-gray-900">Mock Tests & Quizzes</h4>
                                    <p className="text-xs text-gray-600 mt-0.5">
                                        Topic-wise practice quizzes and full-length simulated mock exams with detailed video explanations.
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 flex items-start gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-extrabold text-sm text-gray-900">Dedicated Doubt Clearing</h4>
                                    <p className="text-xs text-gray-600 mt-0.5">
                                        Ask doubts under any lecture and get responses from expert faculty and teaching assistants.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Actions */}
                        <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-xs text-gray-500 font-medium">
                                Looking for batches that are currently live?
                            </p>
                            <Link
                                href="/"
                                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-extrabold text-xs sm:text-sm text-center transition-all shadow-md active:scale-95"
                            >
                                Browse Live Video Batches →
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
