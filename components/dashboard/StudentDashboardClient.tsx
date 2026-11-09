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
  // B12: the tests tab showed two hand-written mock tests per goal. They are
  // now the real published tests for the goal's category, with explicit
  // loading / error / empty states.
  const [mockTests, setMockTests] = useState<any[]>([])
  const [testsLoading, setTestsLoading] = useState(false)
  const [testsError, setTestsError] = useState<string | null>(null)

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
    // Only fetch the catalog when the learner opens the tests tab.
    if (activeTab !== "tests") return

    let isMounted = true
    const loadTests = async () => {
      setTestsLoading(true)
      setTestsError(null)
      try {
        const params = new URLSearchParams()
        const category = selectedGoal.category?.trim()
        if (category) params.set("category", category)

        const res = await fetch(`/api/exam/test/list?${params.toString()}`)
        if (!res.ok) {
          throw new Error(`Test catalog returned status ${res.status}`)
        }
        const json = await res.json()
        if (!json.success || !Array.isArray(json.data)) {
          throw new Error(json.error || "Unexpected test catalog response")
        }
        if (!isMounted) return
        setMockTests(json.data)
      } catch (err) {
        if (!isMounted) return
        console.error("Failed to load dashboard mock tests:", err)
        setMockTests([])
        setTestsError("We could not load mock tests right now. Please try again.")
      } finally {
        if (isMounted) setTestsLoading(false)
      }
    }

    loadTests()
    return () => {
      isMounted = false
    }
  }, [activeTab, selectedGoal.category])

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
      {/* Active Goal / Cohort Context Ribbon (PW Style) - slim 56px strip */}
      <div className="hidden lg:flex flex-wrap items-center justify-between gap-3 min-h-[56px] py-2 px-3.5 sm:px-5 rounded-2xl bg-gradient-to-r from-teal-500/10 via-indigo-500/10 to-blue-500/10 border border-teal-500/20 text-slate-800 dark:text-slate-200">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1448d8] to-[#1DB954] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
            <GoalIcon name={selectedGoal.icon} className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-black tracking-wider text-teal-600 dark:text-teal-400">
                Active Cohort
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                {selectedGoal.fullName || selectedGoal.name}
              </span>
              {selectedSubGoal && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                  {selectedSubGoal.name}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Displaying batches, lectures, and mock tests customized for {selectedGoal.name}
            </p>
          </div>
        </div>

        <button
          onClick={openGoalModal}
          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 shrink-0 min-h-[36px]"
        >
          <span>Switch Goal</span>
          <ChevronRight className="h-3.5 w-3.5 text-teal-500" />
        </button>
      </div>

      {/* Guest Welcome Banner - slim 56px strip with halved gap */}
      {isGuest && (
        <div className="min-h-[56px] -mt-2 sm:-mt-3 py-2 px-3.5 sm:px-5 rounded-2xl bg-gradient-to-r from-teal-500/10 via-indigo-500/10 to-blue-500/10 border border-teal-500/30 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left min-w-0">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <LogIn className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                To see your enrolled courses, login
              </h3>
              <p className="text-[11px] text-gray-600 dark:text-gray-300 truncate">
                Track your live batches, CBT test progress, certificates and notes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogin}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#1448d8] hover:bg-[#0f37a8] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 min-h-[40px] sm:min-h-[36px]"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login with Mobile</span>
          </button>
        </div>
      )}

      {/* Quick Actions 5-Grid (Desktop / Tablet >= 1024px): 80 to 88px height, 2 columns on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {/* Action 1: Jump to Learning */}
        <Link
          href={inProgressCourses[0] ? `/courses/${inProgressCourses[0].course.slug}` : "/courses"}
          className="group h-[84px] p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-[#05192D] border border-gray-200 dark:border-gray-800 hover:border-[#1448d8] dark:hover:border-[#1448d8] shadow-sm transition-all flex items-center gap-2.5 sm:gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <PlayCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
              Continue Learning
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {inProgressCourses[0] ? inProgressCourses[0].course.title : "Explore Catalog"}
            </p>
          </div>
        </Link>

        {/* Action 2: Text Tutorials */}
        <Link
          href="/tutorials"
          className="group h-[84px] p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-[#05192D] border border-gray-200 dark:border-gray-800 hover:border-[#3A10E5] dark:hover:border-indigo-400 shadow-sm transition-all flex items-center gap-2.5 sm:gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-[#3A10E5] dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
              Text Tutorials
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
              Chapters &amp; notes
            </p>
          </div>
        </Link>

        {/* Action 3: Previous Year Papers */}
        <Link
          href="/pyqs"
          className="group h-[84px] p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-[#05192D] border border-gray-200 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-500 shadow-sm transition-all flex items-center gap-2.5 sm:gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
              Previous Papers
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
              Official Archives
            </p>
          </div>
        </Link>

        {/* Action 4: Practice & CBT */}
        <Link
          href="/test-series"
          className="group h-[84px] p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-[#05192D] border border-gray-200 dark:border-gray-800 hover:border-purple-400 dark:hover:border-purple-500 shadow-sm transition-all flex items-center gap-2.5 sm:gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <FileQuestion className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
              CBT Mock Tests
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
              Ranks &amp; Analytics
            </p>
          </div>
        </Link>

        {/* Action 5: Ask a Doubt */}
        <button
          onClick={handleOpenDoubtModal}
          className="group text-left h-[84px] p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-[#05192D] border border-gray-200 dark:border-gray-800 hover:border-amber-400 dark:hover:border-amber-500 shadow-sm transition-all col-span-2 sm:col-span-1 flex items-center gap-2.5 sm:gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white flex items-center gap-1 truncate">
              <span>Ask Doubt</span>
              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
              Photo / PDF
            </p>
          </div>
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
                  ? "border-[#1448d8] text-[#1448d8]"
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
                  ? "border-[#1448d8] text-[#1448d8]"
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
                  ? "border-[#1448d8] text-[#1448d8]"
                  : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              <FileQuestion className="w-4 h-4" />
              <span>Tests & CBT ({mockTests.length})</span>
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
            className="text-xs text-[#1448d8] hover:underline font-semibold hidden sm:flex items-center gap-1"
          >
            <span>Full Hub</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Tab 1: Courses */}
        {activeTab === "courses" && (
          <div>
            {inProgressCourses.length === 0 ? (
              <div className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5 text-center">
                <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">No courses started yet</h4>
                <p className="text-xs text-gray-500 mt-1">Enroll in any of our specialized tracks below to jumpstart your career.</p>
                <Link
                  href="/courses"
                  className="mt-3 inline-block px-4 py-2 rounded-xl bg-[#1448d8] text-white text-xs font-semibold hover:bg-[#0f37a8] transition-colors"
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
                    className="group flex flex-col justify-between bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-[#1448d8]/50 shadow-sm p-4 relative transition-all"
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
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1448d8]/20 to-[#1DB954]/20 text-[#1448d8]">
                            <BookOpen className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#1448d8] bg-[#1448d8]/10 px-2 py-0.5 rounded-full">
                          {course.difficulty}
                        </span>
                        <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white mt-1 line-clamp-1 group-hover:text-[#1448d8] transition-colors">
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
                          className="h-full bg-gradient-to-r from-[#1448d8] to-[#1DB954] rounded-full transition-all duration-500"
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
                  <span className="text-xs text-[#1448d8] font-semibold">
                    {batch.teachers?.length || 1} Faculty Assigned
                  </span>
                  <Link
                    href={`/batches/${batch.slug}`}
                    className="text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-[#1448d8] flex items-center gap-1"
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
            {testsLoading && (
              <div className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5 text-center">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Loading mock tests…
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Fetching the published tests for {selectedGoal.name}.
                </p>
              </div>
            )}

            {!testsLoading && testsError && (
              <div className="bg-red-50 dark:bg-red-950/30 rounded-2xl border border-red-200 dark:border-red-900/60 p-4 sm:p-5 text-center space-y-3">
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">{testsError}</p>
                <button
                  type="button"
                  onClick={() => setActiveTab("courses")}
                  className="px-4 py-2 rounded-xl bg-[#1448d8] text-white text-xs font-bold"
                >
                  Back to courses
                </button>
              </div>
            )}

            {!testsLoading && !testsError && mockTests.length === 0 && (
              <div className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5 text-center space-y-3">
                <FileQuestion className="w-8 h-8 text-gray-400 mx-auto" />
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                  No mock tests published yet
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  There are no published CBT tests for {selectedGoal.name} right now. Browse the full
                  test series to see everything available.
                </p>
                <Link
                  href="/test-series"
                  className="inline-block px-4 py-2 rounded-xl bg-[#1448d8] text-white text-xs font-bold"
                >
                  Browse Test Series
                </Link>
              </div>
            )}

            {!testsLoading && !testsError && mockTests.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockTests.map((ct) => (
                  <div
                    key={ct.id}
                    className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-black uppercase">
                          {String(ct.testType || "CBT Test").replace(/_/g, " ")}
                        </span>
                        {ct.category && (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#00A8FF]/10 text-[#00A8FF] text-[11px] font-bold">
                            {ct.category}
                          </span>
                        )}
                        {Boolean(
                          ct.isFreeSample ||
                            (ct.seriesIsPro && (ct.isFree || ct.accessMode === "FREE"))
                        ) && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-extrabold uppercase">
                            Free sample
                          </span>
                        )}
                      </div>
                      {ct.durationMinutes ? (
                        <span className="text-xs text-gray-500 font-semibold shrink-0">
                          {ct.durationMinutes} Mins
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 shrink-0">Duration not set</span>
                      )}
                    </div>
                    <h4 className="font-black text-base text-gray-900 dark:text-white">{ct.title}</h4>
                    <div className="pt-2 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 gap-3">
                      <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                        {Number.isFinite(Number(ct.questions))
                          ? Number(ct.questions)
                          : Array.isArray(ct.questionsList)
                            ? ct.questionsList.length
                            : Number(ct.totalQuestions) || 0}{" "}
                        Questions
                      </span>
                      {ct.seriesId ? (
                        <TestActionButton
                          testId={ct.id}
                          seriesId={ct.seriesId}
                          testTitle={ct.title}
                          returnPath="/dashboard"
                          size="sm"
                          isFreeSample={Boolean(
                            ct.isFreeSample ||
                              (ct.seriesIsPro && (ct.isFree || ct.accessMode === "FREE"))
                          )}
                        />
                      ) : (
                        <Link
                          href="/test-series"
                          className="px-3.5 py-1.5 rounded-xl bg-[#1448d8] hover:bg-[#0f37a8] text-white text-xs font-semibold"
                        >
                          Open Test Series
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            className="px-5 py-2.5 rounded-xl bg-[#1448d8] hover:bg-[#0f37a8] text-white text-xs font-bold shadow-md shadow-[#1448d8]/20 flex items-center gap-2 transition-colors"
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
