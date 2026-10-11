"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { useGoal } from "@/components/providers/GoalProvider"
import GoalIcon from "@/components/layout/GoalIcon"
import {
  PlayCircle,
  Radio,
  Video,
  BookOpen,
  Award,
  HelpCircle,
  FileQuestion,
  Calendar,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Users,
  Layers,
  ArrowRight,
  Flame,
  FileText,
  GraduationCap,
} from "lucide-react"
import RecommendedCourses from "@/components/dashboard/RecommendedCourses"
import ActivityFeed from "@/components/dashboard/ActivityFeed"
import DoubtSubmissionModal from "@/components/student/DoubtSubmissionModal"
import { isCourseMatchingGoal, isTextTutorialCourse } from "@/lib/course-classifier"
import MobilePromoCarousel from "@/components/dashboard/mobile/MobilePromoCarousel"
import MobileQuickAccessGrid from "@/components/dashboard/mobile/MobileQuickAccessGrid"
import MobileRecommendedSection from "@/components/dashboard/mobile/MobileRecommendedSection"
import { TestActionButton } from "@/components/test-series/TestActionButton"
import type { HomepagePromoCard } from "@/lib/homepage-cards-service"
import { useSession } from "next-auth/react"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"
import { LogIn } from "lucide-react"

interface StudentDashboardProps {
  user: any
  inProgressCourses: any[]
  recommendedCourses: any[]
  recentProgress: any[]
  batches: any[]
  promoCards?: HomepagePromoCard[]
  stats: any
}

export default function StudentDashboardClient({
  user,
  inProgressCourses,
  recommendedCourses,
  recentProgress,
  batches,
  promoCards = [],
  stats,
}: StudentDashboardProps) {
  const { data: session } = useSession()
  const { selectedGoal, selectedSubGoal, openGoalModal } = useGoal()
  const { openMobileAuth } = useMobileAuth()
  const [isDoubtModalOpen, setIsDoubtModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"courses" | "batches" | "tests" | "tutorials">("courses")
  const [mockTests, setMockTests] = useState<any[]>([])

  const isGuest = !session?.user

  const handleLogin = (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    openMobileAuth({
      actionType: "login",
      callbackUrl: "/dashboard",
    })
  }

  const handleOpenDoubtModal = () => {
    if (isGuest) {
      openMobileAuth({
        actionType: "login",
        onSuccess: () => setIsDoubtModalOpen(true),
      })
      return
    }
    setIsDoubtModalOpen(true)
  }

  // Filter batches based on active goal / cohort
  const filteredBatches = useMemo(() => {
    if (!batches || batches.length === 0) return []
    const gTags = (selectedGoal.tags || []).map(t => t.toLowerCase())
    const gId = selectedGoal.id.toLowerCase()

    const matched = batches.filter((b: any) => {
      const bCat = (b.category || "").toLowerCase()
      const bTitle = (b.title || "").toLowerCase()
      const bSlug = (b.slug || "").toLowerCase()

      return (
        bCat.includes(gId) ||
        bTitle.includes(gId) ||
        bSlug.includes(gId) ||
        gTags.some(t => bCat.includes(t) || bTitle.includes(t) || bSlug.includes(t))
      )
    })

    return matched.length > 0 ? matched : batches
  }, [batches, selectedGoal])

  // Filter recommended courses strictly matching the active goal (excluding text tutorials)
  const goalCourses = useMemo(() => {
    if (!recommendedCourses || recommendedCourses.length === 0) return []
    const gId = selectedGoal.id.toLowerCase()
    const gTags = (selectedGoal.tags || []).map((t: string) => t.toLowerCase())

    return recommendedCourses.filter((c: any) => {
      // Exclude text-based reading tutorials from Video Courses section
      if (isTextTutorialCourse(c)) return false

      return isCourseMatchingGoal(c, gId, gTags)
    })
  }, [recommendedCourses, selectedGoal])

  useEffect(() => {
    // Only fetch remote test catalog over network when user opens the tests tab
    if (activeTab !== "tests") return

    let isMounted = true
    const loadTests = async () => {
      try {
        const res = await fetch("/api/exam/test/list?seriesId=bpsc-72nd-2026")
        if (res.ok && isMounted) {
          const json = await res.json()
          if (json.success && Array.isArray(json.data)) {
            setMockTests(json.data)
          }
        }
      } catch (err) {}
    }
    loadTests()
    return () => {
      isMounted = false
    }
  }, [activeTab])

  const upcomingTests = useMemo(() => {
    const gid = selectedGoal.id.toLowerCase()
    if (gid === "bpsc") {
      return [
        {
          id: "bpsc-72nd-2026",
          title: "72nd BPSC CCE Full Length Prelims Mock 01",
          duration: "120 mins",
          questionsCount: 150,
          difficulty: "INTERMEDIATE",
        },
        {
          id: "bihar-gk-speed-drill",
          title: "Bihar Special History & Contemporary GK Drill",
          duration: "45 mins",
          questionsCount: 50,
          difficulty: "BEGINNER",
        },
      ]
    }
    if (gid === "upsc") {
      return [
        {
          id: "upsc-prelims-2026",
          title: "UPSC Prelims GS Paper 1 All India Rank Mock 01",
          duration: "120 mins",
          questionsCount: 100,
          difficulty: "ADVANCED",
        },
        {
          id: "upsc-csat-mock",
          title: "UPSC CSAT Paper 2 Speed Drill & Passages",
          duration: "120 mins",
          questionsCount: 80,
          difficulty: "INTERMEDIATE",
        },
      ]
    }
    if (gid === "class-10" || gid.startsWith("class-")) {
      return [
        {
          id: "class-10-boards-2026",
          title: "CBSE Class 10th Mathematics Pre-Board Mock 01",
          duration: "180 mins",
          questionsCount: 38,
          difficulty: "INTERMEDIATE",
        },
        {
          id: "class-10-science-drill",
          title: "Class 10th Science Full Syllabus Board Mock",
          duration: "180 mins",
          questionsCount: 39,
          difficulty: "BEGINNER",
        },
      ]
    }
    if (gid === "govt-exams" || gid === "ssc") {
      return [
        {
          id: "ssc-cgl-2026",
          title: "SSC CGL 2026 Tier 1 All India Live Mock",
          duration: "60 mins",
          questionsCount: 100,
          difficulty: "INTERMEDIATE",
        },
        {
          id: "ssc-static-gk-test",
          title: "General Awareness & Static GK 100 Speed MCQs",
          duration: "30 mins",
          questionsCount: 100,
          difficulty: "BEGINNER",
        },
      ]
    }
    if (gid === "data-science") {
      return [
        {
          id: "ds-ml-diagnostic",
          title: "NumPy, Pandas & Machine Learning Diagnostic Benchmark",
          duration: "60 mins",
          questionsCount: 40,
          difficulty: "INTERMEDIATE",
        },
        {
          id: "deep-learning-test",
          title: "Deep Learning & Neural Network Mathematics Test",
          duration: "45 mins",
          questionsCount: 25,
          difficulty: "ADVANCED",
        },
      ]
    }
    if (gid === "dsa-interview") {
      return [
        {
          id: "dsa-blind-75-mock",
          title: "Blind 75 & NeetCode 150 All India Coding Sprint",
          duration: "90 mins",
          questionsCount: 4,
          difficulty: "ADVANCED",
        },
        {
          id: "dsa-trees-graphs-test",
          title: "Trees, Graphs & Dynamic Programming Speed Mock",
          duration: "60 mins",
          questionsCount: 25,
          difficulty: "INTERMEDIATE",
        },
      ]
    }
    return [
      {
        id: "skills-dsa-faang-2026",
        title: "Python Data Structures & OOPs Benchmark",
        duration: "45 mins",
        questionsCount: 25,
        difficulty: "INTERMEDIATE",
      },
      {
        id: "skills-python-ai-2026",
        title: "Linear Algebra & NumPy Arrays CBT Test",
        duration: "30 mins",
        questionsCount: 20,
        difficulty: "ADVANCED",
      },
    ]
  }, [selectedGoal.id])

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* MOBILE-ONLY SECTION (< 1024px): Principle 3 Native Mobile Look */}
      <div className="lg:hidden space-y-3 -mx-4 sm:-mx-6 -mt-2">
        {/* Promo Carousel from real homepage-cards.json data */}
        {promoCards && promoCards.length > 0 && (
          <MobilePromoCarousel cards={promoCards} />
        )}

        {/* Quick-Access 4 cols x 2 rows Grid with 8 distinct destinations */}
        <MobileQuickAccessGrid />

        {/* Recommended for you horizontal scroll-snap row */}
        <MobileRecommendedSection
          courses={goalCourses.length > 0 ? goalCourses : recommendedCourses}
          heading={inProgressCourses.length > 0 ? "Continue Learning" : "Recommended for you"}
          viewAllHref="/courses"
          accentColor="bg-teal-500"
        />
      </div>

      {/* DESKTOP-PRESERVED & FULL TABLET/DESKTOP VIEW: Identical to existing UI on >= 1024px */}
      {/* Active Goal / Cohort Context Ribbon (PW Style) */}
      <div className="hidden lg:flex flex-wrap items-center justify-between gap-3 p-3.5 sm:px-5 rounded-2xl bg-gradient-to-r from-teal-500/10 via-indigo-500/10 to-blue-500/10 border border-teal-500/20 text-slate-800 dark:text-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#3AAFA9] to-[#1DB954] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
            <GoalIcon name={selectedGoal.icon} className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-black tracking-wider text-teal-600 dark:text-teal-400">
                Active Cohort
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                {selectedGoal.fullName || selectedGoal.name}
              </span>
              {selectedSubGoal && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                  {selectedSubGoal.name}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Displaying batches, lectures, and mock tests customized for {selectedGoal.name}
            </p>
          </div>
        </div>

        <button
          onClick={openGoalModal}
          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
        >
          <span>Switch Goal</span>
          <ChevronRight className="h-3.5 w-3.5 text-teal-500" />
        </button>
      </div>

      {/* Guest Welcome Banner */}
      {isGuest && (
        <div className="bg-gradient-to-r from-teal-500/10 via-indigo-500/10 to-blue-500/10 border border-teal-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                To see your enrolled courses, login
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Track your live batches, CBT test progress, certificates and notes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogin}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#3AAFA9] hover:bg-[#2d8a85] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 shrink-0"
          >
            <LogIn className="w-4 h-4" />
            <span>Login with Mobile</span>
          </button>
        </div>
      )}

      {/* Quick Actions 5-Grid (Desktop / Tablet >= 1024px) */}
      <div className="hidden lg:grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Action 1: Jump to Learning */}
        <Link
          href={inProgressCourses[0] ? `/courses/${inProgressCourses[0].course.slug}` : "/courses"}
          className="group p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#05192D] border border-gray-200 dark:border-gray-800 hover:border-[#3AAFA9] dark:hover:border-[#3AAFA9] shadow-sm transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <PlayCircle className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
            Continue Learning
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
            {inProgressCourses[0] ? inProgressCourses[0].course.title : "Explore Course Catalog"}
          </p>
        </Link>

        {/* Action 2: Text Tutorials */}
        <Link
          href="/tutorials"
          className="group p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#05192D] border border-gray-200 dark:border-gray-800 hover:border-[#3A10E5] dark:hover:border-indigo-400 shadow-sm transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-[#3A10E5] dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <GraduationCap className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
            Text Tutorials
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            Chapters & subtopics
          </p>
        </Link>

        {/* Action 3: Previous Year Papers */}
        <Link
          href="/pyqs"
          className="group p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#05192D] border border-gray-200 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-500 shadow-sm transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
            Previous Year Papers
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            Official PYQ Archives
          </p>
        </Link>

        {/* Action 4: Practice & CBT */}
        <Link
          href="/test-series"
          className="group p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#05192D] border border-gray-200 dark:border-gray-800 hover:border-purple-400 dark:hover:border-purple-500 shadow-sm transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <FileQuestion className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
            CBT Mock Tests
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            Test readiness & ranks
          </p>
        </Link>

        {/* Action 5: Ask a Doubt */}
        <button
          onClick={handleOpenDoubtModal}
          className="group text-left p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#05192D] border border-gray-200 dark:border-gray-800 hover:border-amber-400 dark:hover:border-amber-500 shadow-sm transition-all col-span-2 sm:col-span-1"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <HelpCircle className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white flex items-center gap-1">
            Ask a Doubt
            <Sparkles className="w-3 h-3 text-amber-500" />
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            Upload photo or PDF
          </p>
        </button>
      </div>


      {/* My Learning Hub - Tabs (Desktop / Tablet >= 1024px) */}
      <div className="hidden lg:block space-y-4">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab("courses")}
              className={`pb-2 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === "courses"
                  ? "border-[#3AAFA9] text-[#3AAFA9]"
                  : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Enrolled Courses ({inProgressCourses.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("batches")}
              className={`pb-2 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === "batches"
                  ? "border-[#3AAFA9] text-[#3AAFA9]"
                  : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>My Batches ({filteredBatches.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("tests")}
              className={`pb-2 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === "tests"
                  ? "border-[#3AAFA9] text-[#3AAFA9]"
                  : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              <FileQuestion className="w-4 h-4" />
              <span>Tests & CBT ({upcomingTests.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("tutorials")}
              className={`pb-2 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === "tutorials"
                  ? "border-[#3A10E5] text-[#3A10E5] dark:text-indigo-400"
                  : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Tutorials</span>
            </button>
          </div>

          <Link
            href="/my-learning"
            className="text-xs text-[#3AAFA9] hover:underline font-semibold hidden sm:flex items-center gap-1"
          >
            <span>Full Hub</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Tab 1: Courses */}
        {activeTab === "courses" && (
          <div>
            {isGuest ? (
              <div className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center space-y-3">
                <div className="w-12 h-12 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center mx-auto">
                  <LogIn className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white text-base">To see your enrolled courses, login</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">Sign in with your mobile OTP to view your active enrollments and resume learning.</p>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleLogin}
                    className="px-5 py-2.5 rounded-xl bg-[#3AAFA9] hover:bg-[#2d8a85] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Login</span>
                  </button>
                  <Link
                    href="/courses"
                    className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Browse Courses
                  </Link>
                </div>
              </div>
            ) : inProgressCourses.length === 0 ? (
              <div className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
                <BookOpen className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">No courses started yet</h4>
                <p className="text-xs text-gray-500 mt-1">Enroll in any of our specialized tracks below to jumpstart your career.</p>
                <Link
                  href="/courses"
                  className="mt-4 inline-block px-4 py-2 rounded-xl bg-[#3AAFA9] text-white text-xs font-semibold"
                >
                  Explore Courses
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inProgressCourses.map(({ course, progress }) => (
                  <Link
                    key={course.id}
                    href={`/courses/${course.slug}`}
                    className="group flex flex-col justify-between bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-[#3AAFA9]/50 shadow-sm p-4 relative transition-all"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="relative w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex-shrink-0 overflow-hidden border border-gray-100 dark:border-gray-800">
                        {course.thumbnailUrl ? (
                          <Image
                            src={course.thumbnailUrl}
                            alt={course.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#3AAFA9]/20 to-[#1DB954]/20 text-[#3AAFA9]">
                            <BookOpen className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#3AAFA9] bg-[#3AAFA9]/10 px-2 py-0.5 rounded-full">
                          {course.difficulty}
                        </span>
                        <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white mt-1 line-clamp-1 group-hover:text-[#3AAFA9] transition-colors">
                          {course.title}
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                          {progress}% Completed
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80">
                      <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#3AAFA9] to-[#1DB954] rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Batches */}
        {activeTab === "batches" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBatches.map((batch) => (
              <div
                key={batch.id}
                className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 text-xs font-bold">
                    {batch.classTag || "Active Batch"}
                  </span>
                  <span className="text-xs text-gray-400">Starts {batch.startDate}</span>
                </div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                  {batch.title}
                </h3>
                <p className="text-xs text-gray-500 line-clamp-2">{batch.scheduleText}</p>
                <div className="pt-2 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
                  <span className="text-xs text-[#3AAFA9] font-semibold">
                    {batch.teachers?.length || 1} Faculty Assigned
                  </span>
                  <Link
                    href={`/batches/${batch.slug}`}
                    className="text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-[#3AAFA9] flex items-center gap-1"
                  >
                    <span>View Batch Schedule</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Tests */}
        {activeTab === "tests" && (
          <div className="space-y-4">
            {mockTests.map((ct) => (
              <div
                key={ct.id}
                className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5 rounded-2xl border-2 border-emerald-500/30 p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-black uppercase">
                      Faculty Mock
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#00A8FF]/10 text-[#00A8FF] text-[11px] font-bold">
                      {ct.category || "Civil Services"}
                    </span>
                    {Boolean(ct.isFreeSample || (ct.seriesIsPro && (ct.isFree || ct.accessMode === "FREE"))) && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-extrabold uppercase">
                        Free sample
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 font-semibold">{ct.durationMinutes || 10} Mins</span>
                </div>
                <h4 className="font-black text-base text-gray-900 dark:text-white">{ct.title}</h4>
                <div className="pt-2 flex items-center justify-between border-t border-emerald-100 dark:border-gray-800">
                  <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                    {ct.questions || (ct.questionsList ? ct.questionsList.length : 5)} Questions • Bilingual (English/Hindi)
                  </span>
                  <TestActionButton
                    testId={ct.id}
                    seriesId={ct.seriesId || "bpsc-72nd-2026"}
                    testTitle={ct.title}
                    returnPath="/dashboard"
                    size="sm"
                    isFreeSample={Boolean(ct.isFreeSample || (ct.seriesIsPro && (ct.isFree || ct.accessMode === "FREE")))}
                  />
                </div>
              </div>
            ))}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingTests.map((t) => (
              <div
                key={t.id}
                className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 text-[11px] font-bold">
                    CBT Test
                  </span>
                  <span className="text-xs text-gray-400">{t.duration}</span>
                </div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">{t.title}</h4>
                <div className="pt-2 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
                  <span className="text-xs text-gray-500">{t.questionsCount} Questions</span>
                  <Link
                    href={`/test-series`}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                  >
                    Start Test
                  </Link>
                </div>
              </div>
            ))}
            </div>
          </div>
        )}

        {/* Tab 5: Tutorials */}
        {activeTab === "tutorials" && (
          <div className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-[#3A10E5] dark:text-indigo-400 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white">
                    Text-Based Tutorials & Self-Paced Curriculum
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Continuous reading view with code syntax highlighting, rich diagrams, and interactive modules.
                  </p>
                </div>
              </div>
              <Link
                href="/tutorials"
                className="px-4 py-2 rounded-xl bg-[#3A10E5] hover:bg-[#300ec2] text-white text-xs font-black shadow-xs flex items-center justify-center gap-1.5 self-start sm:self-auto transition-all"
              >
                <span>Browse All Tutorials</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {inProgressCourses.length === 0 ? (
              <div className="text-center py-8">
                <GraduationCap className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <h5 className="font-bold text-gray-900 dark:text-white text-sm">No tutorials started yet</h5>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  Browse our curated text tutorial library authored directly with rich Codecademy-style content.
                </p>
                <Link
                  href="/tutorials"
                  className="mt-4 inline-block px-4 py-2 rounded-xl bg-[#3A10E5] text-white text-xs font-bold"
                >
                  Explore Tutorials
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inProgressCourses.map(({ course, progress }) => (
                  <Link
                    key={course.id}
                    href={`/courses/${course.slug}`}
                    className="group flex flex-col justify-between bg-gray-50/60 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-[#3A10E5] dark:hover:border-indigo-400 p-4 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#3A10E5] dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
                          Text Guide
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-bold">
                          {progress}% Read
                        </span>
                      </div>
                      <h5 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white line-clamp-1 group-hover:text-[#3A10E5] transition-colors">
                        {course.title}
                      </h5>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        Continue reading continuous chapter stream
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-gray-200/60 dark:border-gray-800 flex items-center justify-between text-xs font-bold text-[#3A10E5] dark:text-indigo-400">
                      <span>Resume Reading</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Direct Doubt Support Card (Desktop / Tablet >= 1024px) */}
      <div className="hidden lg:flex bg-gradient-to-r from-amber-500/10 via-teal-500/10 to-indigo-500/10 border border-amber-300/40 dark:border-amber-500/20 rounded-3xl p-6 sm:p-7 flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <HelpCircle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Stuck on a tricky question or assignment bug?
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 max-w-xl">
              Snap a photo or upload your code PDF. Our verified faculty members answer your queries with step-by-step guidance!
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link
            href="/doubts"
            className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-semibold text-gray-800 dark:text-gray-200 transition-colors"
          >
            View Discussions
          </Link>
          <button
            onClick={handleOpenDoubtModal}
            className="px-5 py-2.5 rounded-xl bg-[#3AAFA9] hover:bg-[#2d8a85] text-white text-xs font-bold shadow-md shadow-[#3AAFA9]/20 flex items-center gap-2 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask a Doubt</span>
          </button>
        </div>
      </div>

      {/* Featured Courses / Catalog (Desktop / Tablet >= 1024px) */}
      <section className="hidden lg:block">
        <RecommendedCourses courses={goalCourses} />
      </section>

      {/* Learning Activity Timeline */}
      {recentProgress.length > 0 && (
        <ActivityFeed activities={recentProgress} />
      )}

      {/* Doubt Modal */}
      <DoubtSubmissionModal
        isOpen={isDoubtModalOpen}
        onClose={() => setIsDoubtModalOpen(false)}
      />
    </div>
  )
}
