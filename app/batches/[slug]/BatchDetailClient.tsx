"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Play,
  Share2,
  Sparkles,
  ShieldCheck,
  GraduationCap,
  Video,
  HelpCircle,
  X,
  Phone,
  ArrowRight,
} from "lucide-react"
import CuriousNavbar from "@/components/common/CuriousNavbar"
import { useSession } from "next-auth/react"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"
import type { Batch, BatchTier } from "@/lib/batches-service"
import { CourseTeachersSection } from "@/components/course/CourseTeachersSection"
import { resolveAnchorHref } from "@/lib/home/real-batches"

interface BatchDetailClientProps {
  batch: Batch
  hasRealBatches: boolean
}

const NAV_TABS = [
  { id: "features", label: "Features" },
  { id: "about", label: "About" },
  { id: "schedule", label: "Schedule" },
  { id: "teachers", label: "Teachers" },
  { id: "free-content", label: "Free Content" },
  { id: "more-details", label: "More Details" },
]

export default function BatchDetailClient({ batch, hasRealBatches }: BatchDetailClientProps) {
  const router = useRouter()
  const { openMobileAuth } = useMobileAuth()
  const [activeTab, setActiveTab] = useState<string>("features")
  const [selectedTier, setSelectedTier] = useState<BatchTier>(
    batch.tiers && batch.tiers.length > 0
      ? batch.tiers[0]
      : {
          id: "regular",
          name: "Regular",
          price: batch.price,
          originalPrice: batch.originalPrice,
          features: [],
        }
  )
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)
  const [activeVideoModal, setActiveVideoModal] = useState<{
    title: string
    videoUrl?: string
    subject: string
  } | null>(null)
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState<boolean>(false)
  const [copiedLink, setCopiedLink] = useState<boolean>(false)
  const [enrollSuccess, setEnrollSuccess] = useState<boolean>(false)
  const [studentPhone, setStudentPhone] = useState<string>("")
  const { data: session } = useSession()

  const handleEnrollClick = async () => {
    const p = (selectedTier.price || "").toLowerCase()
    const isFree = p.includes("free") || p === "₹0" || p === "0" || !selectedTier.price

    if (session?.user) {
      if (isFree) {
        try {
          await fetch("/api/auth/mobile-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phoneNumber: (session.user as any).phoneNumber || "0000000000",
              courseId: batch.slug,
            }),
          })
        } catch {}
        router.push("/my-learning")
        router.refresh()
      } else {
        router.push(`/checkout?courseId=${batch.slug}`)
      }
    } else {
      openMobileAuth({
        course: {
          id: batch.id,
          slug: batch.slug,
          title: batch.title,
          price: selectedTier.price,
          isFree,
          image: batch.coverImage ?? undefined,
          classTag: batch.classTag,
        },
        actionType: isFree ? "enroll" : "buy",
      })
    }
  }

  // IntersectionObserver / scroll spy to auto-highlight sticky tab when scrolling
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 160
      for (let i = NAV_TABS.length - 1; i >= 0; i--) {
        const sectionEl = document.getElementById(NAV_TABS[i].id)
        if (sectionEl) {
          const top = sectionEl.offsetTop
          if (scrollPos >= top) {
            setActiveTab(NAV_TABS[i].id)
            break
          }
        }
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToSection = (id: string) => {
    setActiveTab(id)
    const el = document.getElementById(id)
    if (el) {
      const navOffset = 130 // height of top navbar + sticky tabs
      const elementPosition = el.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - navOffset
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      })
    }
  }

  const handleShare = () => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2500)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans antialiased selection:bg-orange-100 selection:text-orange-900">
      {/* Project Navbar */}
      <CuriousNavbar activeTab="school-prep" hasRealBatches={hasRealBatches} />

      {/* Top Breadcrumbs & Batch Hero Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-gray-500 font-medium mb-4 overflow-x-auto no-scrollbar">
            <Link href="/" className="hover:text-[#F26522] transition-colors">
              Home
            </Link>
            <span>&gt;</span>
            <Link href={resolveAnchorHref("/#all-courses-container", hasRealBatches)} className="hover:text-[#F26522] transition-colors">
              School Prep
            </Link>
            <span>&gt;</span>
            <span className="text-gray-700 font-semibold">{batch.classTag}</span>
            <span>&gt;</span>
            <span className="text-gray-900 font-bold truncate max-w-xs">{batch.title}</span>
          </nav>

          {/* Hero Content Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-bold text-[#F26522] bg-orange-50 px-2.5 py-1 rounded-md border border-orange-100">
                  {batch.classTag}
                </span>
                <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md uppercase">
                  {batch.language || "HINGLISH"}
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                  {batch.badge || "ONLINE"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">
                {batch.title}
              </h1>
              <p className="text-sm sm:text-base text-gray-600 font-medium">
                {batch.targetText}
              </p>
            </div>

            {/* Starts / Ends Timeline Pill */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 self-start md:self-auto">
              <div className="bg-[#FFF8F4] border border-[#FFE0D0] rounded-2xl p-4 flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 rounded-xl bg-[#F26522] text-white flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                    Batch Schedule
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-gray-900 block">
                    {batch.scheduleText || (batch.startDate + " - " + batch.endDate)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Tab Navigation Bar */}
      <div className="sticky top-20 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex items-center gap-1 sm:gap-4 overflow-x-auto no-scrollbar py-2.5">
            {NAV_TABS.map((tab) => {
              const isSelected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => scrollToSection(tab.id)}
                  className={"px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer " +
                    (isSelected
                      ? "text-[#5B47FB] bg-[#F5F3FF] border-b-2 border-[#5B47FB]"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50")
                  }
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content Layout with 2 Columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: All 6 Sections (Scrolls freely) */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* Section 1: Features & Plan Tiers */}
            <section id="features" className="scroll-mt-36">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
                    <span>Batch Features &amp; Options</span>
                    <Sparkles className="h-5 w-5 text-[#F26522]" />
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Select the package tier that best fits your child&apos;s learning path
                  </p>
                </div>
              </div>

              {/* Tier Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {batch.tiers && batch.tiers.length > 0 ? (
                  batch.tiers.map((tier) => {
                    const isSelected = selectedTier.id === tier.id
                    return (
                      <div
                        key={tier.id}
                        onClick={() => setSelectedTier(tier)}
                        className={"rounded-2xl border-2 p-5 cursor-pointer transition-all duration-200 relative flex flex-col justify-between " +
                          (isSelected
                            ? "border-[#5B47FB] bg-white shadow-md ring-2 ring-[#5B47FB]/10"
                            : "border-gray-200 bg-white hover:border-gray-300 shadow-2xs")
                        }
                      >
                        {tier.isPopular && (
                          <div className="absolute -top-3 right-4 bg-gradient-to-r from-[#F26522] to-[#FF7A38] text-white text-[10px] font-black uppercase px-3 py-0.5 rounded-full tracking-wider shadow-xs">
                            Most Popular
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-black text-gray-900">
                              {tier.name}
                            </h3>
                            <div className={"w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors " +
                              (isSelected ? "border-[#5B47FB]" : "border-gray-300")
                            }>
                              {isSelected && (
                                <div className="w-2.5 h-2.5 bg-[#5B47FB] rounded-full" />
                              )}
                            </div>
                          </div>

                          <div className="flex items-baseline gap-2 mb-4 pb-3 border-b border-gray-100">
                            <span className="text-2xl font-black text-gray-900">
                              {tier.price}
                            </span>
                            {tier.originalPrice && (
                              <span className="text-xs text-gray-400 line-through">
                                {tier.originalPrice}
                              </span>
                            )}
                          </div>

                          <div className="space-y-2.5">
                            {tier.features.map((feature, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span className="leading-snug">{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-5 mt-4 border-t border-gray-100">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedTier(tier)
                              setIsEnrollModalOpen(true)
                            }}
                            className={"w-full py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all " +
                              (isSelected
                                ? "bg-[#5B47FB] hover:bg-[#4A38E8] text-white shadow-xs"
                                : "bg-gray-100 hover:bg-gray-200 text-gray-800")
                            }
                          >
                            Select {tier.name}
                          </button>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="bg-white rounded-2xl p-6 border border-gray-200">
                    <p className="text-sm text-gray-600">Standard batch features included.</p>
                  </div>
                )}
              </div>

              {/* Core Feature Highlight Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                {batch.features && batch.features.map((feat, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-2xs flex items-start gap-3.5"
                  >
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#F26522] flex items-center justify-center shrink-0">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-gray-900">{feat.title}</h4>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">{feat.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 2: About Batch */}
            <section id="about" className="scroll-mt-36 bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-2xs">
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <span>About this Batch</span>
                <BookOpen className="h-5 w-5 text-[#5B47FB]" />
              </h2>

              {/* Key Quick Metadata Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 bg-[#FAFBFD] p-5 rounded-2xl border border-gray-100">
                <div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                    Duration
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-gray-900 mt-0.5 block">
                    {batch.durationText || "Full Academic Year"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                    Validity
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-gray-900 mt-0.5 block">
                    {batch.validityText || "Until 31 Mar, 2027"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                    Medium
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-gray-900 mt-0.5 block">
                    {batch.language || "Hinglish"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                    Target Class
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-gray-900 mt-0.5 block">
                    {batch.classTag}
                  </span>
                </div>
              </div>

              {/* Highlights Bullet List */}
              <div className="space-y-3 mb-6">
                <h3 className="font-extrabold text-sm sm:text-base text-gray-900">
                  Course Highlights &amp; Inclusions:
                </h3>
                {batch.aboutHighlights && batch.aboutHighlights.map((hl, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-gray-700">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <span className="leading-relaxed font-medium">{hl}</span>
                  </div>
                ))}
              </div>

              {/* Detailed Descriptions */}
              {batch.aboutDetails && batch.aboutDetails.length > 0 && (
                <div className="pt-6 border-t border-gray-100 space-y-3 text-xs sm:text-sm text-gray-600 leading-relaxed">
                  {batch.aboutDetails.map((det, idx) => (
                    <p key={idx}>{det}</p>
                  ))}
                </div>
              )}
            </section>

            {/* Section 3: Schedule */}
            <section id="schedule" className="scroll-mt-36 bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
                    <span>Weekly Class Schedule</span>
                    <Clock className="h-5 w-5 text-[#F26522]" />
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Structured routine tailored for school-going students
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">
                    6 Days a Week
                  </span>
                </div>
              </div>

              {/* Timetable Cards */}
              <div className="space-y-3 mb-6">
                {batch.weeklySchedule && batch.weeklySchedule.length > 0 ? (
                  batch.weeklySchedule.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-[#FAFBFD] border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#F26522] font-black text-xs flex items-center justify-center shrink-0">
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

                      <div className="flex items-center gap-3 text-xs">
                        <div className="bg-white border border-gray-200 px-3 py-1.5 rounded-xl font-bold text-gray-800 flex items-center gap-1.5 shadow-2xs">
                          <Clock className="h-3.5 w-3.5 text-[#5B47FB]" />
                          <span>{item.time}</span>
                        </div>
                        <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                          {item.type}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Live lecture schedules are announced prior to session kickoff.</p>
                )}
              </div>

              {/* Subjects tags */}
              {batch.subjects && batch.subjects.length > 0 && (
                <div className="pt-5 border-t border-gray-100">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                    Subjects Covered in Syllabus
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {batch.subjects.map((sub, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-extrabold text-gray-800 bg-gray-100 px-3 py-1.5 rounded-xl"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Section 4: Teachers */}
            <CourseTeachersSection
              teachers={batch.teachers}
              title="Know Your Teachers"
              subtitle="Learn directly from India's most passionate and seasoned school educators"
            />

            {/* Section 5: Free Content / Demo Videos */}
            <section id="free-content" className="scroll-mt-36 bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-2xl shadow-gray-100/50">
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
                  <span>Free Demo Lectures &amp; Notes</span>
                  <Video className="h-5 w-5 text-red-500" />
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Preview our interactive teaching method before purchasing
                </p>
              </div>

              {/* Demo Lecture Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {batch.demoVideos && batch.demoVideos.length > 0 ? (
                  batch.demoVideos.map((video, idx) => (
                    <div
                      key={idx}
                      onClick={() =>
                        setActiveVideoModal({
                          title: video.title,
                          subject: video.subject,
                          videoUrl: video.videoUrl,
                        })
                      }
                      className="group rounded-2xl border border-gray-200 overflow-hidden bg-[#FAFBFD] hover:border-[#5B47FB] transition-all cursor-pointer shadow-2xs"
                    >
                      {/* Video Poster with Play Button */}
                      <div className="relative h-40 bg-gray-900 flex items-center justify-center overflow-hidden">
                        <Image
                          src={video.thumbnail || "/batch-green.svg"}
                          alt={video.title}
                          fill
                          className="object-cover opacity-80 group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
                        <div className="relative z-10 w-12 h-12 rounded-full bg-[#5B47FB] text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="h-5 w-5 fill-white ml-0.5" />
                        </div>
                        <span className="absolute bottom-2.5 right-2.5 bg-black/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                          {video.duration}
                        </span>
                      </div>

                      {/* Video Info */}
                      <div className="p-4 space-y-1.5">
                        <span className="text-[10px] font-extrabold text-[#F26522] uppercase tracking-wider">
                          {video.subject} &bull; {video.teacher}
                        </span>
                        <h4 className="font-extrabold text-sm text-gray-900 group-hover:text-[#5B47FB] transition-colors line-clamp-1">
                          {video.title}
                        </h4>
                        <div className="pt-2 flex items-center justify-between text-xs font-bold text-[#5B47FB]">
                          <span>Watch Free Demo</span>
                          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Demo lectures will be uploaded soon.</p>
                )}
              </div>
            </section>

            {/* Section 6: More Details & FAQs */}
            <section id="more-details" className="scroll-mt-36 bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-2xs">
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
                  <span>Frequently Asked Questions</span>
                  <HelpCircle className="h-5 w-5 text-amber-500" />
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Have questions about this batch? Find quick answers below
                </p>
              </div>

              {/* Accordion list */}
              <div className="space-y-3">
                {batch.faqs && batch.faqs.map((faq, idx) => {
                  const isOpen = openFaqIndex === idx
                  return (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-2xl overflow-hidden transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full px-5 py-4 text-left font-bold text-sm text-gray-900 bg-[#FAFBFD] hover:bg-gray-100 flex items-center justify-between gap-4 transition-colors cursor-pointer"
                      >
                        <span>{faq.question}</span>
                        <ChevronDown
                          className={"h-4 w-4 text-gray-500 shrink-0 transition-transform duration-200 " +
                            (isOpen ? "rotate-180 text-[#5B47FB]" : "")}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-5 py-4 bg-white text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-gray-100">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Additional Batch Guidelines */}
              {batch.moreDetails && batch.moreDetails.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-100 space-y-4">
                  <h3 className="font-extrabold text-sm sm:text-base text-gray-900">
                    Important Batch Guidelines
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {batch.moreDetails.map((det, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-gray-50 border border-gray-200/60">
                        <span className="font-extrabold text-xs text-gray-900 block mb-1">
                          {det.title}
                        </span>
                        <p className="text-xs text-gray-600 leading-relaxed">{det.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Sticky Course Pricing Card */}
          <div className="lg:col-span-4 sticky top-28 self-start">
            <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-xl overflow-hidden">
              
              {/* Batch Card Poster */}
              <div
                className="relative h-48 sm:h-52 w-full bg-gray-900 overflow-hidden"
                style={{ position: "relative", width: "100%", height: "208px", overflow: "hidden" }}
              >
                <Image
                  src={batch.image || "/batch-green.svg"}
                  alt={batch.title}
                  fill
                  priority
                  style={{ objectFit: "cover" }}
                  className="object-cover"
                />
                <div className="absolute top-3 left-3 bg-[#5B47FB] text-white text-[11px] font-black uppercase px-3 py-1 rounded-md shadow-xs">
                  {batch.badge || "ONLINE"}
                </div>
                <div className="absolute top-3 right-3">
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-md transition-colors cursor-pointer"
                    title="Share batch"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {copiedLink && (
                <div className="bg-emerald-500 text-white text-xs font-bold text-center py-1.5">
                  Link copied to clipboard!
                </div>
              )}

              {/* Card Body & Pricing details */}
              <div className="p-6 space-y-5">
                
                {/* Dates & Validity row */}
                <div className="space-y-2 pb-4 border-b border-gray-100 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#F26522] shrink-0" />
                    <span>
                      Starts <strong>{batch.startDate}</strong> &bull; Ends{" "}
                      <strong>{batch.endDate}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      Access validity: <strong>{batch.validityText}</strong>
                    </span>
                  </div>
                </div>

                {/* Selected Tier Switcher */}
                {batch.tiers && batch.tiers.length > 1 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Selected Plan Tier
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {batch.tiers.map((tier) => {
                        const isSelected = selectedTier.id === tier.id
                        return (
                          <button
                            key={tier.id}
                            type="button"
                            onClick={() => setSelectedTier(tier)}
                            className={"p-2.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer " +
                              (isSelected
                                ? "border-[#5B47FB] bg-[#F5F3FF] text-[#5B47FB] shadow-2xs"
                                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50")
                            }
                          >
                            <span className="block truncate">{tier.name}</span>
                            <span className="block text-[11px] font-bold mt-0.5 text-gray-900">
                              {tier.price}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Price Display */}
                <div className="pt-2">
                  <span className="text-xs text-gray-500 font-semibold block mb-0.5">
                    Total Enrollment Fee
                  </span>
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-3xl sm:text-4xl font-black text-gray-900">
                      {selectedTier.price}
                    </span>
                    {(selectedTier.originalPrice || batch.originalPrice) && (
                      <span className="text-sm text-gray-400 line-through">
                        {selectedTier.originalPrice || batch.originalPrice}
                      </span>
                    )}
                    {batch.discount && (
                      <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                        {batch.discount}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-400 block mt-1">
                    Inclusive of all taxes &amp; study materials
                  </span>
                </div>

                {/* CTA Action Button */}
                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleEnrollClick}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#F26522] to-[#FF7A38] hover:from-[#E05310] hover:to-[#F26522] text-white font-extrabold text-base shadow-lg hover:shadow-xl transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Enroll in {selectedTier.name}</span>
                    <ArrowRight className="h-5 w-5 stroke-[2.5]" />
                  </button>

                  <p className="text-[11px] text-center text-gray-500 font-medium">
                    ⚡ Instant Course Access &bull; 100% Satisfaction Guarantee
                  </p>
                </div>

                {/* Trust Badges */}
                <div className="pt-4 border-t border-gray-100 space-y-2.5 text-xs text-gray-600">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Live Interactive Sessions + HD Recordings</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Daily Practice Papers with Video Solutions</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>24x7 Dedicated Academic Doubt Mentors</span>
                  </div>
                </div>

                {/* Admin Quick Edit Button */}
                <div className="pt-3 border-t border-gray-100 text-center">
                  <Link
                    href={"/admin/batches/" + batch.id + "/edit"}
                    className="text-xs font-bold text-[#5B47FB] hover:underline"
                  >
                    ⚙️ Edit this batch in Admin Panel
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Free Demo Video Preview Modal */}
      {activeVideoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-[#F26522] uppercase tracking-wider">
                  {activeVideoModal.subject} Free Demo
                </span>
                <h3 className="font-extrabold text-base text-gray-900">
                  {activeVideoModal.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveVideoModal(null)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative aspect-video bg-black flex items-center justify-center">
              <iframe
                src={
                  activeVideoModal.videoUrl ||
                  "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1"
                }
                title={activeVideoModal.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div className="p-4 bg-gray-50 flex items-center justify-between">
              <span className="text-xs text-gray-600 font-medium">
                Ready to join the full live interactive batch?
              </span>
              <button
                onClick={() => {
                  setActiveVideoModal(null)
                  handleEnrollClick()
                }}
                className="px-4 py-2 rounded-xl bg-[#5B47FB] hover:bg-[#4A38E8] text-white text-xs font-bold transition-all cursor-pointer"
              >
                Enroll Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enrollment / Buy Now Modal */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-[#F26522] uppercase tracking-wider">
                  Quick Enrollment
                </span>
                <h3 className="text-lg font-black text-gray-900">
                  {batch.title}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsEnrollModalOpen(false)
                  setEnrollSuccess(false)
                }}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {enrollSuccess ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      Admission Confirmed
                    </span>
                    <h4 className="text-xl font-black text-gray-900">
                      Welcome to {batch.title}!
                    </h4>
                    <p className="text-xs text-gray-600 max-w-xs mx-auto">
                      Your batch access is unlocked. Enter the live classroom now to participate in lectures, polls, and doubt solving!
                    </p>
                  </div>

                  <div className="pt-2 space-y-2">
                    <Link
                      href="/my-learning"
                      className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#F26522] to-[#FF7A38] hover:from-[#E05310] hover:to-[#F26522] text-white font-extrabold text-sm shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <span>View My Batches & Learning 🚀</span>
                      <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                    </Link>
                    <button
                      onClick={() => {
                        setIsEnrollModalOpen(false)
                        setEnrollSuccess(false)
                      }}
                      className="text-xs text-gray-400 hover:text-gray-700 font-bold block mx-auto pt-1 cursor-pointer"
                    >
                      Back to Overview
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-[#FAFBFD] p-4 rounded-2xl border border-gray-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium">Selected Tier:</span>
                      <span className="font-extrabold text-gray-900">{selectedTier.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium">Fee:</span>
                      <span className="font-extrabold text-lg text-[#F26522]">
                        {selectedTier.price}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">
                      Mobile Number (for OTP &amp; class updates)
                    </label>
                    <div className="relative">
                      <Phone className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={studentPhone}
                        onChange={(e) => setStudentPhone(e.target.value)}
                        placeholder="Enter 10-digit mobile number"
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F26522] font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      if (studentPhone.trim().length >= 10) {
                        const isFreeTier = selectedTier.price?.toLowerCase().includes("free") || selectedTier.price === "₹0"
                        if (isFreeTier) {
                          try {
                            const res = await fetch("/api/auth/mobile-login", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                phoneNumber: studentPhone.trim(),
                                courseId: batch.slug,
                              }),
                            })
                            const data = await res.json()
                            if (data?.goalId) {
                              try {
                                localStorage.setItem("trillion_selected_goal", data.goalId)
                                window.dispatchEvent(new CustomEvent("goalChange", { detail: { goalId: data.goalId } }))
                              } catch {}
                            }
                          } catch (e) {
                            console.error("Batch mobile-login error:", e)
                          }
                          setEnrollSuccess(true)
                        } else {
                          router.push(`/checkout?batchId=${batch.slug}`)
                        }
                      } else {
                        alert("Please enter a valid 10-digit mobile number.")
                      }
                    }}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#F26522] to-[#FF7A38] hover:from-[#E05310] hover:to-[#F26522] text-white font-extrabold text-sm shadow-md cursor-pointer"
                  >
                    Proceed to Enroll
                  </button>

                  <p className="text-[11px] text-center text-gray-400">
                    By proceeding, you agree to our Terms of Service &amp; Privacy Policy.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
