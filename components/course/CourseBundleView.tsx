"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Video,
  Radio,
  ExternalLink,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  Sparkles,
  Ticket,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
  Eye,
  Calendar,
  Layers,
  Edit3,
  Play,
  GraduationCap,
  HelpCircle,
  BookOpen,
} from "lucide-react"
import type { Batch } from "@/lib/batches-service"
import CuriousNavbar from "@/components/common/CuriousNavbar"
import { useSession } from "next-auth/react"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"
import { CourseTeachersSection } from "./CourseTeachersSection"
import ScheduleDemoModal from "./ScheduleDemoModal"

interface LessonItem {
  id: string
  title: string
  type: string
  duration?: number | null
  durationText?: string | null
  attachmentType?: string | null
  attachmentName?: string | null
  attachmentUrl?: string | null
  content?: string | null
  videoUrl?: string | null
  isTrial?: boolean
  order: number
}

interface ChapterItem {
  id: string
  title: string
  order: number
  lessons: LessonItem[]
}

interface CourseBundleProps {
  course: {
    id: string
    title: string
    slug: string
    description: string
    thumbnailUrl?: string | null
    price?: number | null
    originalPrice?: number | null
    discountPercent?: number | null
    couponCode?: string | null
    couponDiscount?: number | null
    expiresAt?: string | null
    hasTrialLesson?: boolean
    isPremium?: boolean
    chapters: ChapterItem[]
  }
  batch?: Batch | null
  userRole?: string
  isEnrolled?: boolean
  hasAccess?: boolean
}

const TABS = [
  { id: "syllabus", label: "Syllabus" },
  { id: "about", label: "About" },
  { id: "schedule", label: "Schedule" },
  { id: "teachers", label: "Teachers" },
  { id: "faqs", label: "FAQs" },
]

export function CourseBundleView({
  course,
  batch,
  userRole,
  isEnrolled = false,
  hasAccess = false,
}: CourseBundleProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const { openMobileAuth } = useMobileAuth()
  const [activeTab, setActiveTab] = useState<string>("syllabus")
  const [expandedChapters, setExpandedChapters] = useState<{ [key: string]: boolean }>({
    [course.chapters[0]?.id || ""]: true,
    [course.chapters[1]?.id || ""]: true,
  })
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)
  const [copiedCoupon, setCopiedCoupon] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState(false)
  const [isScheduleDemoOpen, setIsScheduleDemoOpen] = useState(false)
  const [studentDemoBooking, setStudentDemoBooking] = useState<any>(null)

  const demoSettings = useMemo(() => {
    if ((batch as any)?.demoSettings) return (batch as any).demoSettings
    if ((course as any)?.demoSettings) return (course as any).demoSettings
    try {
      if (course?.metadataJson) {
        return JSON.parse(course.metadataJson).demoSettings || null
      }
    } catch {}
    return null
  }, [batch, course])

  useEffect(() => {
    if (session?.user) {
      fetch(`/api/courses/demo/book?slug=${encodeURIComponent(course.slug)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.booked && data.slotId) {
            setStudentDemoBooking(data)
          }
        })
        .catch(() => {})
    }
  }, [session, course.slug])

  const handleBuyClick = () => {
    if (session?.user) {
      router.push(`/checkout?courseId=${course.slug || course.id}`)
    } else {
      openMobileAuth({
        course: {
          id: course.id,
          slug: course.slug,
          title: course.title,
          price: course.price,
          isFree: false,
          image: course.thumbnailUrl || undefined,
        },
        actionType: "buy",
      })
    }
  }

  const handleEnrollClick = async () => {
    if (session?.user) {
      try {
        await fetch("/api/auth/mobile-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phoneNumber: (session.user as any).phoneNumber || "0000000000",
            courseId: course.slug || course.id,
          }),
        })
      } catch {}
      router.push("/my-learning")
      router.refresh()
    } else {
      openMobileAuth({
        course: {
          id: course.id,
          slug: course.slug,
          title: course.title,
          price: "Free",
          isFree: true,
          image: course.thumbnailUrl || undefined,
        },
        actionType: "enroll",
      })
    }
  }

  const isTeacherOrAdmin = userRole === "ADMIN" || userRole === "TEACHER"

  // Calculate total lessons and attachments
  const totalLessons = course.chapters.reduce((sum, ch) => sum + ch.lessons.length, 0)
  const totalAttachments = course.chapters.reduce(
    (sum, ch) => sum + ch.lessons.filter((l) => l.attachmentName || l.attachmentType).length,
    0
  )

  // Pricing
  const isFree = !course.isPremium && (!course.price || course.price === 0)
  const basePrice = isFree ? 0 : (course.price || 3299)
  const originalPrice = course.originalPrice || (isFree ? 1999 : 4499)
  const discountPercent = isFree ? 100 : (course.discountPercent || 27)
  const couponDiscount = course.couponDiscount || 50
  const finalPrice = isFree
    ? 0
    : appliedCoupon
    ? Math.round(basePrice * (1 - couponDiscount / 100))
    : basePrice

  // Find first trial lesson
  let firstTrialLesson: LessonItem | null = null
  for (const ch of course.chapters) {
    const trial = ch.lessons.find((l) => l.isTrial)
    if (trial) {
      firstTrialLesson = trial
      break
    }
  }
  if (!firstTrialLesson && course.chapters[0]?.lessons[0]) {
    firstTrialLesson = course.chapters[0].lessons[0]
  }

  const toggleChapter = (id: string) => {
    setExpandedChapters((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleCopyCoupon = () => {
    if (course.couponCode) {
      navigator.clipboard.writeText(course.couponCode)
      setCopiedCoupon(true)
      setAppliedCoupon(true)
      setTimeout(() => setCopiedCoupon(false), 3000)
    }
  }

  const handleStartTrial = () => {
    if (firstTrialLesson) {
      router.push(`/courses/${course.slug}/learn/${firstTrialLesson.id}`)
    } else {
      router.push(`/courses/${course.slug}/learn/start`)
    }
  }

  const scrollToSection = (id: string) => {
    setActiveTab(id)
    const el = document.getElementById(id)
    if (el) {
      const offset = 90
      const elementPosition = el.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      })
    }
  }

  // Setup scroll spy for tabs
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 120
      for (let i = TABS.length - 1; i >= 0; i--) {
        const el = document.getElementById(TABS[i].id)
        if (el) {
          const top = el.offsetTop
          if (scrollPos >= top) {
            setActiveTab(TABS[i].id)
            break
          }
        }
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // About Highlights
  const highlights = batch?.aboutHighlights && batch.aboutHighlights.length > 0
    ? batch.aboutHighlights
    : [
        "Comprehensive chapter-wise video syllabus with structured step-by-step clarity",
        "High-yield downloadable PDF study notes & classroom slide handouts",
        "Self-paced 24x7 video access with playback speed control and free trial preview",
        "Expert-curated curriculum aligned with exam patterns and modern problem-solving standards",
      ]

  // Weekly Schedule
  const scheduleItems = (batch?.weeklySchedule && batch.weeklySchedule.length > 0)
    ? batch.weeklySchedule
    : (batch?.schedule && batch.schedule.length > 0)
    ? batch.schedule
    : [
        {
          day: "Monday - Friday",
          subjects: "Core Video Modules & Practice Sessions",
          time: "Flexible Self-Paced (24/7 Access)",
          type: "Video Lectures",
        },
        {
          day: "Saturday",
          subjects: "Chapter Revision & Concept Mapping",
          time: "Self-Review & PDF Handouts",
          type: "Revision & Notes",
        },
        {
          day: "Sunday",
          subjects: "Self-Assessment & Practice Quizzes",
          time: "Anytime",
          type: "Practice Assessment",
        },
      ]

  // Teachers / Faculty
  const teachers = (batch?.teachers && batch.teachers.length > 0)
    ? batch.teachers
    : [
        {
          name: "Academic Lead & Faculty",
          role: "Subject Expert & Course Creator",
          subject: batch?.classTag || "Curriculum Specialist",
          experience: "10+ Years",
          qualification: "Master of Science • Senior Educator",
          avatar: "/curious-avatar.svg",
          bio: "Passionate educator dedicated to conceptual mastery, structured problem-solving, and student success.",
        },
      ]

  // FAQs
  const faqs = (batch?.faqs && batch.faqs.length > 0)
    ? batch.faqs
    : [
        {
          question: "How do I access video lectures and notes after enrolling?",
          answer:
            "Once enrolled, all locked chapters, high-resolution video streams, and downloadable PDF study notes become immediately accessible. You can access them from 'Continue Learning' anytime.",
        },
        {
          question: "Can I watch the video lessons on both mobile and desktop?",
          answer:
            "Yes! The video player is fully responsive and supports smooth playback across mobile browsers, tablets, and desktop computers with speed control up to 2x.",
        },
        {
          question: "Are PDF notes and study materials included in this course?",
          answer:
            "Yes, classroom PDF notes, formula sheets, and study attachments are provided for lessons and can be viewed online or downloaded for offline revision.",
        },
        {
          question: "Can I try out lectures before enrolling?",
          answer:
            "Yes, you can click 'Free Trial' or 'Start A Free Trial' to instantly preview unlocked trial lectures without making a payment.",
        },
      ]

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900 pb-20">
      {/* Brand Navigation Bar (Exact aspirantbook Storefront Header) */}
      <CuriousNavbar />

      {/* Top Breadcrumb Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider overflow-hidden">
            {userRole === "ADMIN" ? (
              <Link href="/admin" className="hover:text-orange-600 transition-colors">Admin Panel</Link>
            ) : userRole === "TEACHER" ? (
              <Link href="/teacher" className="hover:text-orange-600 transition-colors">Teacher Panel</Link>
            ) : (
              <Link href="/dashboard" className="hover:text-orange-600 transition-colors">Home</Link>
            )}
            <span>/</span>
            <Link
              href={isTeacherOrAdmin ? "/admin/courses" : "/courses"}
              className="hover:text-orange-600 transition-colors"
            >
              Courses
            </Link>
            <span>/</span>
            <span className="text-gray-900 truncate font-bold">{course.title}</span>
          </div>

          {/* Teacher/Admin Fast Edit Shortcut */}
          {isTeacherOrAdmin && (
            <Link
              href={`/admin/courses/${course.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-orange-100 text-orange-800 hover:bg-orange-200 transition-colors border border-orange-200 shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Course in Studio
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* Title & Category Badge */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200">
            {batch?.classTag || "Video Course"}
          </span>
          <span className="text-xs font-bold text-gray-500">
            Language: <span className="text-gray-900 font-extrabold">{batch?.language || "HINGLISH"}</span>
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-5">
          {course.title}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (8 cols): Tabs, Syllabus, About, Schedule, Teachers, FAQs */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Offer Coupon Card (Matching Image 1) */}
            {course.couponCode && !isFree && (
              <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-800 block">Offers For you</span>
                    <span className="text-xs text-gray-500">Save extra with official batch coupon</span>
                  </div>
                </div>

                {/* Dashed Coupon Pill */}
                <div
                  onClick={handleCopyCoupon}
                  className="flex items-center self-start sm:self-auto border border-dashed border-gray-300 rounded-xl overflow-hidden cursor-pointer hover:border-orange-500 transition-all group max-w-full"
                  title="Click to copy and apply discount"
                >
                  <div className="bg-emerald-800 text-white font-black text-xs px-3 py-2 flex items-center gap-1 shrink-0">
                    {course.couponDiscount || 50}%
                  </div>
                  <div className="px-3.5 py-2 bg-gray-50 group-hover:bg-orange-50 flex items-center gap-2 truncate">
                    <span className="font-mono font-bold text-xs text-gray-800 truncate">{course.couponCode}</span>
                    {copiedCoupon ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-400 group-hover:text-orange-600 shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PW-Style Sticky In-Page Navigation Bar */}
            <div data-scroll-x="true" className="sticky top-16 z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200 shadow-xs p-1.5 flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
              {TABS.map((tab) => {
                const isSelected = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => scrollToSection(tab.id)}
                    className={`px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? "bg-orange-700 text-white shadow-xs"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-100/80"
                    }`}
                  >
                    {tab.label}
                    {tab.id === "syllabus" && (
                      <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        isSelected ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                      }`}>
                        {course.chapters.length}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* SECTION 1: Syllabus & Video Lectures */}
            <section id="syllabus" className="scroll-mt-32 bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                    <span>Syllabus & Video Lectures</span>
                    <Video className="w-5 h-5 text-orange-600" />
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {course.chapters.length} Chapters • {totalLessons} lessons {totalAttachments > 0 && `• ${totalAttachments} attachments`}
                  </p>
                </div>
                {course.hasTrialLesson && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    1 Free Trial Lesson
                  </span>
                )}
              </div>

              {/* Accordion Chapters */}
              <div className="divide-y divide-gray-100">
                {course.chapters.map((chapter, idx) => {
                  const isExpanded = !!expandedChapters[chapter.id]
                  const formattedNum = String(idx + 1).padStart(2, "0")
                  const chAttachmentsCount = chapter.lessons.filter(
                    (l) => l.attachmentName || l.attachmentType
                  ).length
                  const hasTrial = chapter.lessons.some((l) => l.isTrial)

                  return (
                    <div key={chapter.id} className="transition-colors">
                      {/* Chapter Header */}
                      <button
                        onClick={() => toggleChapter(chapter.id)}
                        className={`w-full p-4 sm:p-5 flex items-center justify-between text-left transition-colors ${
                          isExpanded ? "bg-gray-50/70" : "hover:bg-gray-50/40"
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                          <span className="font-mono text-sm font-bold text-gray-600 dark:text-gray-300 shrink-0 mt-0.5 sm:mt-0">
                            {formattedNum}
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-snug">
                              {chapter.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                {chapter.lessons.length} {chapter.lessons.length === 1 ? "lesson" : "lessons"}
                              </span>
                              {chAttachmentsCount > 0 && (
                                <>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-xs text-gray-600 dark:text-gray-400">
                                    {chAttachmentsCount} {chAttachmentsCount === 1 ? "attachment" : "attachments"}
                                  </span>
                                </>
                              )}
                              {hasTrial && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                                  1 Trial
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-gray-500 shrink-0 ml-2">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </button>

                      {/* Expanded Lessons List */}
                      {isExpanded && (
                        <div className="bg-gray-50/30 divide-y divide-gray-100/80 px-4 sm:px-6 py-1">
                          {chapter.lessons.map((lesson) => {
                            const isPdf = lesson.attachmentType === "PDF" || lesson.type === "READING"
                            const isLive = lesson.attachmentType === "LIVE"
                            const isVideo = lesson.type === "VIDEO" || lesson.attachmentType === "VIDEO"
                            const isUnlocked = isFree || isEnrolled || hasAccess || lesson.isTrial || isTeacherOrAdmin

                            return (
                              <div
                                key={lesson.id}
                                onClick={() => router.push(`/courses/${course.slug}/learn/${lesson.id}`)}
                                onMouseEnter={() => router.prefetch(`/courses/${course.slug}/learn/${lesson.id}`)}
                                className="py-3.5 flex items-start justify-between gap-3 group cursor-pointer hover:bg-white rounded-xl px-3 transition-colors"
                              >
                                <div className="flex items-start gap-3 min-w-0">
                                  <div className="mt-0.5 shrink-0 text-gray-500 group-hover:text-orange-600 transition-colors">
                                    {isLive ? (
                                      <Radio className="w-4 h-4 text-red-500 animate-pulse" />
                                    ) : isVideo ? (
                                      <Video className="w-4 h-4" />
                                    ) : (
                                      <FileText className="w-4 h-4" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-gray-900 text-xs sm:text-sm group-hover:text-orange-600 transition-colors truncate">
                                        {lesson.title}
                                      </span>
                                      {lesson.isTrial && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                          Free Trial
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-600 dark:text-gray-300 font-medium">
                                      {isLive && <span className="text-red-700 font-semibold">Live</span>}
                                      {isVideo && <span>Video {lesson.durationText && `• ${lesson.durationText}`}</span>}
                                      {isPdf && <span>PDF</span>}
                                      {lesson.attachmentName && (
                                        <span>• Attachment</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="shrink-0 flex items-center gap-2 text-xs font-semibold text-orange-600 group-hover:translate-x-0.5 transition-transform">
                                  {isUnlocked ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-300 font-bold">
                                      <Unlock className="w-3.5 h-3.5" /> {isFree || isEnrolled || hasAccess ? "Watch" : "Preview"}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300">
                                      <Lock className="w-3.5 h-3.5" />
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            {/* SECTION 2: About Course & Exam Targets */}
            <section id="about" className="scroll-mt-32 bg-white rounded-2xl p-6 sm:p-7 border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <span>About This Course</span>
                    <Sparkles className="h-5 w-5 text-orange-600" />
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Everything you need to know about the curriculum, expectations & inclusions
                  </p>
                </div>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-gray-50/80 border border-gray-100 mb-6">
                <div>
                  <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider block">Target</span>
                  <span className="text-xs sm:text-sm font-extrabold text-gray-900 mt-0.5 block truncate">
                    {batch?.classTag || "Comprehensive"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider block">Medium</span>
                  <span className="text-xs sm:text-sm font-extrabold text-gray-900 mt-0.5 block">
                    {batch?.language || "HINGLISH"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider block">Mode</span>
                  <span className="text-xs sm:text-sm font-extrabold text-gray-900 mt-0.5 block">
                    Online / Self-Paced
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider block">Lectures</span>
                  <span className="text-xs sm:text-sm font-extrabold text-gray-900 mt-0.5 block">
                    {totalLessons} Videos & Notes
                  </span>
                </div>
              </div>

              {/* Highlights Bullet List */}
              <div className="space-y-3 mb-6">
                <h3 className="font-extrabold text-sm sm:text-base text-gray-900">
                  Key Course Highlights:
                </h3>
                {highlights.map((hl, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-gray-700">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <span className="leading-relaxed font-medium">{hl}</span>
                  </div>
                ))}
              </div>

              {/* Detailed Description */}
              <div className="pt-5 border-t border-gray-100 text-xs sm:text-sm text-gray-600 leading-relaxed space-y-2">
                <p>{course.description}</p>
                {batch?.aboutDetails && batch.aboutDetails.map((det, idx) => (
                  <p key={idx}>{det}</p>
                ))}
              </div>
            </section>

            {/* SECTION 3: Weekly Schedule & Routine */}
            <section id="schedule" className="scroll-mt-32 bg-white rounded-2xl p-6 sm:p-7 border border-gray-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <span>Learning Schedule & Routine</span>
                    <Clock className="h-5 w-5 text-orange-600" />
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Structured learning plan designed for self-paced and disciplined study
                  </p>
                </div>
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-lg self-start sm:self-auto">
                  24x7 On-Demand Access
                </span>
              </div>

              {/* Timetable Cards */}
              <div className="space-y-3 mb-6">
                {scheduleItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-gray-50/80 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 font-black text-xs flex items-center justify-center shrink-0">
                        {item.day.slice(0, 3)}
                      </div>
                      <div>
                        <span className="font-extrabold text-sm text-gray-900 block">
                          {item.day}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                          {item.subjects}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs min-w-0 max-w-full">
                      <div className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg font-bold text-gray-800 flex items-center gap-1.5 shadow-2xs max-w-full flex-wrap shrink-0">
                        <Clock className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                        <span className="break-words">{item.time}</span>
                      </div>
                      <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg self-start sm:self-auto shrink-0">
                        {item.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Subjects tags */}
              {batch?.subjects && batch.subjects.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider block mb-2">
                    Subjects Covered
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {batch.subjects.map((sub, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-extrabold text-gray-800 bg-gray-100 px-3 py-1 rounded-lg"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* SECTION 4: Know Your Teachers */}
            <CourseTeachersSection
              teachers={teachers}
              title="Know Your Teachers"
              subtitle="Learn from top educators and experienced subject matter experts"
            />

            {/* SECTION 5: FAQs & Help */}
            <section id="faqs" className="scroll-mt-32 bg-white rounded-2xl p-6 sm:p-7 border border-gray-200 shadow-xs">
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <span>Frequently Asked Questions</span>
                  <HelpCircle className="h-5 w-5 text-orange-600" />
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Have doubts about enrollment, access, or content? Find quick answers here.
                </p>
              </div>

              <div className="space-y-3">
                {faqs.map((faq, idx) => {
                  const isOpen = openFaqIndex === idx
                  return (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-xl overflow-hidden transition-all bg-white"
                    >
                      <button
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full p-4 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-gray-900 hover:bg-gray-50/70 transition-colors"
                      >
                        <span>{faq.question}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-gray-100 bg-gray-50/40">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

          </div>

          {/* Right Column (4 cols): Sticky Purchase Card (Matching Original Layout & Unchanged Colors) */}
          <div className="lg:col-span-4 sticky top-20 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
              {/* Course Thumbnail Banner */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-gray-200 flex items-center justify-center p-4 text-center">
                {course.thumbnailUrl ? (
                  <img
                    src={course.thumbnailUrl}
                    alt={course.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="space-y-1 z-10">
                    <span className="px-2.5 py-0.5 rounded bg-orange-600 text-white font-bold text-[10px] uppercase tracking-wider">
                      Video Course
                    </span>
                    <h3 className="font-extrabold text-white text-base sm:text-lg leading-tight px-2 line-clamp-2">
                      {course.title}
                    </h3>
                    <p className="text-[10px] text-amber-300 font-medium">
                      Full Video Lectures &bull; Notes &bull; High Yield Practice
                    </p>
                  </div>
                )}
              </div>

              {/* Expiry Badge */}
              <div className="flex items-center gap-2 text-xs text-gray-600 font-medium pt-1">
                <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                <span>Expires On {course.expiresAt || "Oct 30, 2026"}</span>
              </div>

              {/* Offer Banner */}
              {course.couponCode && !isFree && (
                <div
                  onClick={handleCopyCoupon}
                  className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between text-xs cursor-pointer hover:bg-emerald-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-emerald-700" />
                    <span className="font-bold text-emerald-900">GET {course.couponDiscount || 50}% off</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700">1 Offers &gt;</span>
                </div>
              )}

              {/* Price Row */}
              <div className="flex items-baseline gap-2.5 pt-1 flex-wrap">
                {isFree ? (
                  <>
                    <span className="text-3xl font-black text-emerald-600">FREE</span>
                    {originalPrice > 0 && (
                      <span className="text-base text-gray-600 dark:text-gray-400 line-through">₹ {originalPrice.toLocaleString()}</span>
                    )}
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 text-xs font-bold">
                      100% Free
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-black text-gray-900">₹ {finalPrice.toLocaleString()}</span>
                    {originalPrice > finalPrice && (
                      <span className="text-base text-gray-600 dark:text-gray-400 line-through">₹ {originalPrice.toLocaleString()}</span>
                    )}
                    {discountPercent > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-xs font-bold">
                        {appliedCoupon ? `${couponDiscount}% OFF` : `${discountPercent}% OFF`}
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {isEnrolled ? (
                  <button
                    onClick={handleStartTrial}
                    className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-[#3A10E5] hover:bg-[#300ec2] transition-all shadow-sm flex items-center justify-center gap-2 hover:scale-[1.01]"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    CONTINUE LEARNING
                  </button>
                ) : isFree ? (
                  <>
                    <button
                      onClick={handleEnrollClick}
                      className="w-full py-3.5 rounded-xl text-sm font-extrabold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-sm flex items-center justify-center gap-2 hover:scale-[1.01] cursor-pointer"
                    >
                      <span>ENROLL FREE (ADD TO MY BATCHES)</span>
                    </button>

                    <button
                      onClick={handleStartTrial}
                      className="w-full py-2.5 rounded-xl text-xs sm:text-sm font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-gray-700" />
                      <span>START WATCHING NOW</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleBuyClick}
                      className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-[#556B2F] hover:bg-[#485c26] transition-all shadow-sm flex items-center justify-center gap-2 hover:scale-[1.01] cursor-pointer"
                    >
                      BUY NOW
                    </button>

                    <button
                      onClick={handleStartTrial}
                      className="w-full py-3 rounded-xl text-xs sm:text-sm font-bold text-gray-800 bg-white border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      START A FREE TRIAL
                    </button>

                    {studentDemoBooking ? (
                      <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border-2 border-emerald-500/40 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="inline-flex items-center gap-1.5 font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider text-[11px]">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Your Upcoming Demo Class</span>
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            studentDemoBooking.slotStatus === "LIVE"
                              ? "bg-red-500 text-white animate-pulse"
                              : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {studentDemoBooking.slotStatus === "LIVE" ? "LIVE NOW" : "REGISTERED"}
                          </span>
                        </div>
                        <div className="text-xs text-gray-800 dark:text-gray-200 font-bold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{studentDemoBooking.fullTimeLabel || `${studentDemoBooking.slotDate} at ${studentDemoBooking.slotTime}`}</span>
                        </div>
                        {studentDemoBooking.slotStatus === "LIVE" ? (
                          <Link
                            href={`/courses/${course.slug}/demo?slot=${studentDemoBooking.slotId}`}
                            className="w-full py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md animate-pulse"
                          >
                            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                            <span>🔴 Enter Demo Room (LIVE NOW)</span>
                          </Link>
                        ) : (
                          <div className="space-y-1">
                            <button
                              type="button"
                              disabled
                              className="w-full py-3 px-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed border border-gray-200 dark:border-gray-700"
                            >
                              <Video className="w-4 h-4 text-gray-400" />
                              <span>Enter Demo Room (Starts {studentDemoBooking.slotTime || "Scheduled"})</span>
                            </button>
                            <p className="text-[10px] text-center text-gray-500 font-medium">
                              Classroom unlocks automatically when teacher starts live session
                            </p>
                          </div>
                        )}
                      </div>
                    ) : demoSettings?.enabled === true && (
                      <button
                        type="button"
                        onClick={() => setIsScheduleDemoOpen(true)}
                        className="w-full py-3.5 rounded-xl text-xs sm:text-sm font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Video className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>SCHEDULE FREE DEMO CLASS</span>
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* What's Included */}
              <div className="pt-3 border-t border-gray-100 space-y-2.5">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">What's included</h4>
                <div className="space-y-2 text-xs text-gray-600 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 font-bold">+</span>
                    <span>{totalLessons} lessons</span>
                  </div>
                  {course.hasTrialLesson && (
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>1 Trial Lesson</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>[Online] Accessibility</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Free Demo Scheduling Modal */}
      <ScheduleDemoModal
        isOpen={isScheduleDemoOpen}
        onClose={() => setIsScheduleDemoOpen(false)}
        course={{
          id: course.id,
          slug: course.slug,
          title: course.title,
          thumbnailUrl: course.thumbnailUrl,
          price: course.price,
          demoSettings,
        }}
      />
    </div>
  )
}
