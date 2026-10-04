"use client"

import React, { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ShoppingBag,
  Video,
  ClipboardList,
  Layers,
  FileText,
  ArrowRight,
  CheckCircle2,
  PlayCircle,
  PencilRuler,
  Search,
  ChevronRight,
  FileCheck,
} from "lucide-react"

interface MyPurchasesClientProps {
  user: {
    id: string
    name: string | null
    email: string | null
    role: string
  }
  enrolledCourses: any[]
  testSeries: any[]
  batches: any[]
  pyqs: any[]
}

export default function MyPurchasesClient({
  user,
  enrolledCourses,
  testSeries,
  batches,
  pyqs,
}: MyPurchasesClientProps) {
  const [activeTab, setActiveTab] = useState<"all" | "courses" | "tests" | "batches" | "pyqs">("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Total counts across the 4 purchase sections
  const totalCount = enrolledCourses.length + testSeries.length + batches.length + pyqs.length

  // Filter helper
  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true
    return text.toLowerCase().includes(searchQuery.toLowerCase())
  }

  const filteredCourses = enrolledCourses.filter((c) => matchesSearch(c.title || c.course?.title || ""))
  const filteredTests = testSeries.filter((t) => matchesSearch(t.title || ""))
  const filteredBatches = batches.filter((b) => matchesSearch(b.title || ""))
  const filteredPyqs = pyqs.filter((p) => matchesSearch(p.title || ""))

  return (
    <div className="space-y-6 sm:space-y-8 pb-16 max-w-7xl mx-auto">
      {/* Hero Profile & Purchase Banner (matching /profile styling) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-50 via-cyan-50 to-indigo-50 dark:from-[#05192D] dark:via-[#0a2540] dark:to-[#0d2f52] p-6 sm:p-8 text-gray-900 dark:text-white border border-teal-100 dark:border-gray-800 shadow-xl">
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#3AAFA9]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-gradient-to-br from-[#3AAFA9] to-[#1DB954] text-white flex items-center justify-center font-extrabold text-3xl shadow-lg border-2 border-white/40 flex-shrink-0">
            {user.name?.[0]?.toUpperCase() || "U"}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-1.5">
              <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-600 text-white tracking-wider">
                My Purchases
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                Verified Student Access
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
              {user.name || "Student Learner"}'s Library & Enrollments
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 max-w-2xl">
              Access all your enrolled Video Courses, CBT Test Series, Live Batches, and Unlocked PYQs in one unified hub.
            </p>

            {/* Quick Metrics Bar */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-6 mt-4 pt-4 border-t border-gray-200/80 dark:border-white/10 text-xs">
              <div className="flex items-center gap-1.5">
                <Video className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="font-bold text-gray-900 dark:text-white">{enrolledCourses.length}</span>
                <span className="text-gray-500 dark:text-gray-400">Courses</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="font-bold text-gray-900 dark:text-white">{testSeries.length}</span>
                <span className="text-gray-500 dark:text-gray-400">Test Series</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="font-bold text-gray-900 dark:text-white">{batches.length}</span>
                <span className="text-gray-500 dark:text-gray-400">Batches</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="font-bold text-gray-900 dark:text-white">{pyqs.length}</span>
                <span className="text-gray-500 dark:text-gray-400">PYQs</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Search Header */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-3">
        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-3 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === "all"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-white dark:bg-[#05192D] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:border-teal-400"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>All Purchases ({totalCount})</span>
          </button>

          <button
            onClick={() => setActiveTab("courses")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === "courses"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-white dark:bg-[#05192D] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:border-teal-400"
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Video Courses ({enrolledCourses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("tests")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === "tests"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-white dark:bg-[#05192D] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:border-teal-400"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Test Series ({testSeries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("batches")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === "batches"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-white dark:bg-[#05192D] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:border-teal-400"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Batches ({batches.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("pyqs")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === "pyqs"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-white dark:bg-[#05192D] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:border-teal-400"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PYQs ({pyqs.length})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search purchased items..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#05192D] text-xs font-medium text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none"
          />
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: VIDEO COURSES
      ========================================================================== */}
      {(activeTab === "all" || activeTab === "courses") && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                  Enrolled Video Courses ({filteredCourses.length})
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Full chapter-wise video curriculum with lecture notes and tracking.
                </p>
              </div>
            </div>

            <Link
              href="/courses"
              className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1"
            >
              <span>Browse Courses</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {filteredCourses.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white dark:bg-[#05192D] border border-gray-200 dark:border-gray-800 text-center space-y-3">
              <Video className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">No Video Courses enrolled yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Explore our comprehensive video course library with state PCS and technology curricula.
              </p>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md transition-all"
              >
                <span>Browse Video Courses →</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCourses.map((c) => {
                const title = c.title || c.course?.title
                const slug = c.slug || c.course?.slug
                const progress = c.progress || 45
                const diff = c.difficulty || c.course?.difficulty || "BEGINNER"
                const thumb = c.thumbnailUrl || c.course?.thumbnailUrl || "/course-bpsc.svg"

                return (
                  <div
                    key={c.id || slug}
                    className="p-4 rounded-2xl bg-white dark:bg-[#05192D] border border-gray-200 dark:border-gray-800 hover:border-teal-500/50 shadow-xs flex flex-col justify-between space-y-4 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700 relative">
                        <Image src={thumb} alt={title} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                          {diff}
                        </span>
                        <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white mt-1 line-clamp-1">
                          {title}
                        </h3>
                        <p className="text-[11px] text-gray-500 mt-0.5">Active Student Enrollment</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] text-gray-500 font-semibold">
                        <span>Progress</span>
                        <span>{progress}% Completed</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <Link
                      href={`/courses/${slug}`}
                      className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-teal-600/20 transition-all"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>Resume Learning</span>
                    </Link>
                  </div>
                )
              })}
            </div>
          )}

          {/* Quick Browse Bar */}
          <div className="p-3.5 rounded-xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <span className="text-teal-900 dark:text-teal-200 font-bold">
              Looking for more courses? Explore new video curriculums.
            </span>
            <Link
              href="/courses"
              className="px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors shrink-0"
            >
              <span>Browse Video Courses</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 2: TEST SERIES
      ========================================================================== */}
      {(activeTab === "all" || activeTab === "tests") && (
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <ClipboardList className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                  Test Series ({filteredTests.length})
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  CBT exam simulators with real test timer, all-India rank, and instant solutions.
                </p>
              </div>
            </div>

            <Link
              href="/test-series"
              className="text-xs font-bold text-purple-700 dark:text-purple-400 hover:underline flex items-center gap-1"
            >
              <span>Browse Test Series</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {filteredTests.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white dark:bg-[#05192D] border border-gray-200 dark:border-gray-800 text-center space-y-3">
              <ClipboardList className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">No Test Series purchased yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Evaluate your exam readiness with all-India mock tests tailored for BPSC, UPSC, and State Boards.
              </p>
              <Link
                href="/test-series"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-md transition-all"
              >
                <span>Browse Test Series →</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTests.map((test) => (
                <div
                  key={test.id}
                  className="p-5 rounded-2xl bg-white dark:bg-[#05192D] border border-gray-200 dark:border-gray-800 hover:border-purple-400 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          {test.category || "CBT Test Series"}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Full Access
                        </span>
                      </div>
                      <h3 className="text-sm font-black text-gray-900 dark:text-white">{test.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{test.subtitle || "Includes sectional and full syllabus benchmark mocks."}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800 text-xs">
                    <span className="text-gray-500 font-semibold">{test.testCount || 20} Total Mocks Included</span>
                    <Link
                      href={`/test-series`}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <PencilRuler className="w-3.5 h-3.5" />
                      <span>Start / Attempt Test</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Browse Bar */}
          <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <span className="text-purple-900 dark:text-purple-200 font-bold">
              Looking for more test practice? Browse full-length exam series.
            </span>
            <Link
              href="/test-series"
              className="px-3.5 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors shrink-0"
            >
              <span>Browse Test Series</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 3: BATCHES
      ========================================================================== */}
      {(activeTab === "all" || activeTab === "batches") && (
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                  Enrolled Batches ({filteredBatches.length})
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Live interaction, assigned faculty, daily class schedule, and doubt resolution.
                </p>
              </div>
            </div>

            <Link
              href="/batches"
              className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>Browse Batches</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {filteredBatches.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white dark:bg-[#05192D] border border-gray-200 dark:border-gray-800 text-center space-y-3">
              <Layers className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">No Batches enrolled yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Join structured foundation and revision batches taught by verified faculty mentors.
              </p>
              <Link
                href="/batches"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition-all"
              >
                <span>Browse Batches →</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBatches.map((b) => (
                <div
                  key={b.id}
                  className="p-5 rounded-2xl bg-white dark:bg-[#05192D] border border-gray-200 dark:border-gray-800 hover:border-blue-400 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200">
                        {b.classTag || "Active Batch"}
                      </span>
                      <span className="text-[11px] text-gray-500 font-semibold">{b.scheduleText || "Daily Live Classes"}</span>
                    </div>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white">{b.title}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{b.targetText || b.scheduleText}</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800 text-xs">
                    <span className="text-blue-600 font-bold">{b.teachers?.length || 1} Faculty Assigned</span>
                    <Link
                      href={`/batches/${b.slug}`}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <span>Classroom & Schedule</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Browse Bar */}
          <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <span className="text-blue-900 dark:text-blue-200 font-bold">
              Looking for a new live batch? Explore classroom batches.
            </span>
            <Link
              href="/batches"
              className="px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors shrink-0"
            >
              <span>Browse All Batches</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 4: PREVIOUS YEAR QUESTIONS (PYQs)
      ========================================================================== */}
      {(activeTab === "all" || activeTab === "pyqs") && (
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                  Unlocked PYQ Question Papers ({filteredPyqs.length})
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Official question papers with step-by-step marking schemes and PDF downloads.
                </p>
              </div>
            </div>

            <Link
              href="/pyqs"
              className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              <span>Browse PYQs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {filteredPyqs.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white dark:bg-[#05192D] border border-gray-200 dark:border-gray-800 text-center space-y-3">
              <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">No PYQs unlocked yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Practice with verified past 10-25 years papers for BPSC, UPSC, and CBSE Boards.
              </p>
              <Link
                href="/pyqs"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md transition-all"
              >
                <span>Browse Previous Year Questions →</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPyqs.map((p) => (
                <div
                  key={p.id}
                  className="p-5 rounded-2xl bg-white dark:bg-[#05192D] border border-gray-200 dark:border-gray-800 hover:border-amber-400 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200">
                        {p.examName || "Solved Paper"}
                      </span>
                      <span className="text-[10px] text-gray-500 font-semibold">{p.year || "2026 Edition"}</span>
                    </div>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white">{p.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{p.description || "100% Solved Papers with detailed explanations."}</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800 text-xs">
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Instant PDF Unlocked
                    </span>
                    <Link
                      href="/pyqs"
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>View & Practice Paper</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Browse Bar */}
          <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <span className="text-amber-900 dark:text-amber-200 font-bold">
              Looking for other exam papers? Unlock 45,000+ past year questions.
            </span>
            <Link
              href="/pyqs"
              className="px-3.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors shrink-0"
            >
              <span>Browse Previous Year Questions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
