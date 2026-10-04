"use client"

import React, { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
    Pencil,
    ChevronDown,
    ChevronUp,
    Check,
    FileText,
    BookOpen,
    Play,
    Award,
    Clock,
    Sparkles,
    LayoutGrid,
    List,
    Video,
    ChevronRight,
} from "lucide-react"

interface LessonItem {
    id: string
    title: string
    type?: string
    order: number
}

interface ChapterItem {
    id: string
    title: string
    order: number
    lessons: LessonItem[]
}

interface CourseProgressItem {
    id: string
    courseId: string
    enrolledAt: Date | string
    course: {
        id: string
        title: string
        slug: string
        difficulty: string
        thumbnailUrl?: string | null
        price?: number | null
        technology?: string | null
        chapters: ChapterItem[]
    }
    totalLessons: number
    completedLessons: number
    progressPercentage: number
    completedLessonIds: string[]
    nextLesson?: LessonItem
    timeSpent: number
    isCompleted: boolean
    isDemoWatched?: boolean
    demoSlotId?: string
    demoTimeLabel?: string
    upcomingDemo?: UpcomingDemoItem
}

export interface UpcomingDemoItem {
    id: string
    slotId: string
    courseId?: string
    courseSlug: string
    courseTitle: string
    timeLabel: string
    dateLabel?: string
    clockLabel?: string
    status?: string
    startTime?: string
    topic: string
    facultyName?: string
}

interface MyLearningClientProps {
    courses: CourseProgressItem[]
    upcomingDemos?: UpcomingDemoItem[]
}

export default function MyLearningClient({ courses, upcomingDemos = [] }: MyLearningClientProps) {
    const router = useRouter()
    const [viewMode, setViewMode] = useState<"cards" | "list">("cards")
    const [activeTab, setActiveTab] = useState<"in-progress" | "completed">("in-progress")
    const [sortBy, setSortBy] = useState<"last-added" | "title" | "progress">("last-added")
    const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {}
        if (courses.length > 0) {
            initial[courses[0].id] = true
        }
        return initial
    })

    const toggleCourse = (id: string) => {
        setExpandedCourses((prev) => ({
            ...prev,
            [id]: !prev[id],
        }))
    }

    // Filter courses by tab
    const inProgressCourses = courses.filter((c) => !c.isCompleted)
    const completedCourses = courses.filter((c) => c.isCompleted)

    const currentList = activeTab === "in-progress" ? inProgressCourses : completedCourses

    // Sort list
    const sortedList = [...currentList].sort((a, b) => {
        if (sortBy === "progress") {
            return b.progressPercentage - a.progressPercentage
        }
        if (sortBy === "title") {
            return a.course.title.localeCompare(b.course.title)
        }
        return new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime()
    })

    // Helper for card image fallback
    const getCardImage = (course: any) => {
        if (course.thumbnailUrl && course.thumbnailUrl.startsWith("/")) {
            return course.thumbnailUrl
        }
        const s = (course.slug || "").toLowerCase()
        if (s.includes("bpsc")) return "/course-bpsc.svg"
        if (s.includes("upsc")) return "/batch-amber.svg"
        if (s.includes("class-6")) return "/batch-purple.svg"
        if (s.includes("class-7")) return "/batch-blue.svg"
        if (s.includes("class-8")) return "/batch-amber.svg"
        if (s.includes("class-9")) return "/batch-blue.svg"
        if (s.includes("class-10")) return "/batch-rose.svg"
        return "/batch-blue.svg"
    }

    return (
        <div className="min-h-screen bg-[#FFFDF9] -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-8 py-8 space-y-6 text-[#10162F]">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black uppercase tracking-wider mb-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>My Enrolled &amp; Active Batches</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#10162F] tracking-tight">
                            My Batches &amp; enrollment
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            All video courses and classroom batches you have enrolled in or are actively watching.
                        </p>
                    </div>

                    {/* View Switcher: Cards vs List */}
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-center border border-gray-200 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={() => setViewMode("cards")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[40px] ${
                                viewMode === "cards"
                                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                                    : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                            }`}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span>Flash Cards</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("list")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[40px] ${
                                viewMode === "list"
                                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                                    : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                            }`}
                        >
                            <List className="w-3.5 h-3.5" />
                            <span>Syllabus List</span>
                        </button>
                    </div>
                </div>

                {/* Upcoming Live Demos Card Section */}
                {upcomingDemos.length > 0 && (
                    <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 dark:from-emerald-950/30 dark:to-indigo-950/30 rounded-3xl border-2 border-emerald-300 dark:border-emerald-800 p-5 sm:p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                                <h3 className="font-extrabold text-base sm:text-lg text-emerald-950 dark:text-emerald-200">
                                    Your Scheduled Live Demo Classes ({upcomingDemos.length})
                                </h3>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {upcomingDemos.map((demo) => (
                                <div
                                    key={demo.id}
                                    className="bg-white dark:bg-[#07192C] p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex flex-col justify-between space-y-3 shadow-xs"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                                {demo.timeLabel}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase">
                                                Demo Confirmed
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">
                                            {demo.courseTitle}
                                        </h4>
                                        <p className="text-xs text-gray-500 line-clamp-1">
                                            {demo.topic}
                                        </p>
                                    </div>

                                    {demo.status === "LIVE" ? (
                                        <Link
                                            href={`/courses/${demo.courseSlug}/demo?slot=${demo.slotId}`}
                                            className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs text-center flex items-center justify-center gap-2 transition-colors shadow-xs animate-pulse"
                                        >
                                            <Video className="w-3.5 h-3.5" />
                                            <span>🔴 Enter Live Demo Room (LIVE NOW) →</span>
                                        </Link>
                                    ) : (
                                        <div className="space-y-1">
                                            <button
                                                type="button"
                                                disabled
                                                className="w-full py-2.5 px-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 font-bold text-xs text-center flex items-center justify-center gap-2 cursor-not-allowed border border-gray-200 dark:border-gray-700"
                                            >
                                                <Video className="w-3.5 h-3.5 text-gray-400" />
                                                <span>Enter Demo Room (Starts {demo.clockLabel || demo.timeLabel})</span>
                                            </button>
                                            <p className="text-[10px] text-center text-gray-400">
                                                Classroom unlocks automatically when teacher starts live session
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tabs & Sort Row */}
                <div className="border-b-2 border-gray-200 flex flex-wrap items-center justify-between gap-4 pb-0">
                    {/* Tabs */}
                    <div className="flex items-center gap-8 -mb-0.5">
                        <button
                            type="button"
                            onClick={() => setActiveTab("in-progress")}
                            className={`pb-3 text-sm sm:text-base font-extrabold transition-colors relative cursor-pointer ${
                                activeTab === "in-progress"
                                    ? "text-[#10162F]"
                                    : "text-gray-500 hover:text-gray-800"
                            }`}
                        >
                            <span>In Progress ({inProgressCourses.length})</span>
                            {activeTab === "in-progress" && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#3A10E5] rounded-full" />
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab("completed")}
                            className={`pb-3 text-sm sm:text-base font-extrabold transition-colors relative cursor-pointer ${
                                activeTab === "completed"
                                    ? "text-[#10162F]"
                                    : "text-gray-500 hover:text-gray-800"
                            }`}
                        >
                            <span>Completed ({completedCourses.length})</span>
                            {activeTab === "completed" && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#3A10E5] rounded-full" />
                            )}
                        </button>
                    </div>

                    {/* Sort Dropdown */}
                    <div className="pb-2">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="px-3 py-1.5 bg-white border-2 border-[#10162F] rounded-lg text-xs font-bold text-[#10162F] focus:outline-none cursor-pointer shadow-xs"
                        >
                            <option value="last-added">Last active</option>
                            <option value="progress">Highest progress</option>
                            <option value="title">Alphabetical</option>
                        </select>
                    </div>
                </div>

                {/* Empty State */}
                {sortedList.length === 0 ? (
                    <div className="bg-white rounded-3xl border-2 border-gray-200 p-12 text-center space-y-4">
                        <BookOpen className="w-12 h-12 text-gray-400 mx-auto" />
                        <h3 className="font-extrabold text-lg text-gray-900">
                            {activeTab === "in-progress" ? "No active batches yet" : "No completed courses yet"}
                        </h3>
                        <p className="text-xs text-gray-500 max-w-sm mx-auto">
                            Explore our UPSC, BPSC, and School preparation courses on the homepage or course catalog to enroll and start learning.
                        </p>
                        <Link
                            href="/#all-courses-container"
                            className="inline-block px-5 py-2.5 rounded-xl bg-[#5B47FB] text-white text-xs font-bold hover:bg-[#4a36ea] transition-all"
                        >
                            Explore Courses &amp; Batches
                        </Link>
                    </div>
                ) : viewMode === "cards" ? (
                    /* ─── FLASH CARDS GRID VIEW ─────────────────────────────────────── */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedList.map((item) => {
                            const pct = Math.round(item.progressPercentage)
                            const cardImg = getCardImage(item.course)
                            const continueHref = item.nextLesson
                                ? `/courses/${item.course.slug}/learn/${item.nextLesson.id}`
                                : `/courses/${item.course.slug}`

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => router.push(continueHref)}
                                    role="link"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault()
                                            router.push(continueHref)
                                        }
                                    }}
                                    className="group bg-white rounded-2xl border border-gray-200/90 hover:border-[#5B47FB]/50 shadow-xs hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between cursor-pointer focus-visible:ring-2 focus-visible:ring-[#5B47FB]"
                                >
                                    <div>
                                        {/* Top Banner Graphic with Badges */}
                                        <div className="relative h-44 w-full bg-gray-100 overflow-hidden border-b border-gray-100">
                                            <Image
                                                src={cardImg}
                                                alt={item.course.title}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                            {/* Status Badge */}
                                            <div
                                                className={`absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-[10px] font-black uppercase tracking-wider shadow-sm ${
                                                    item.isDemoWatched ? "bg-indigo-600" : "bg-emerald-600/90"
                                                }`}
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                <span>{item.isDemoWatched ? "Demo Watched" : pct > 0 ? `${pct}% Completed` : "Enrolled"}</span>
                                            </div>

                                            <div className="absolute top-3 right-3 z-10 px-2 py-0.5 rounded bg-gray-900/80 backdrop-blur-xs text-white text-[10px] font-bold uppercase tracking-wider">
                                                Video Batch
                                            </div>
                                        </div>

                                        {/* Card Body */}
                                        <div className="p-5 space-y-3.5">
                                            {/* Tag and Difficulty Row */}
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-[#F26522]">
                                                    {item.course.technology || "General Studies"}
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase">
                                                    {item.course.difficulty || "BEGINNER"}
                                                </span>
                                            </div>

                                            {/* Course Title */}
                                            <Link
                                                href={`/courses/${item.course.slug}`}
                                                className="block font-extrabold text-base text-gray-900 group-hover:text-[#5B47FB] transition-colors line-clamp-2 leading-snug"
                                            >
                                                {item.course.title}
                                            </Link>

                                            {/* Progress Bar */}
                                            <div className="space-y-1.5 pt-1">
                                                <div className="flex items-center justify-between text-xs font-bold">
                                                    <span className="text-gray-500">Progress</span>
                                                    <span className="text-gray-900">{pct}%</span>
                                                </div>
                                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between text-[11px] text-gray-400 pt-0.5">
                                                    <span>{item.completedLessons} of {item.totalLessons} lessons</span>
                                                    <span>{item.timeSpent > 0 ? `${item.timeSpent} mins` : "Self-paced"}</span>
                                                </div>
                                            </div>

                                            {/* Next Lesson Preview */}
                                            {item.nextLesson && (
                                                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                                                    <span className="text-[10px] uppercase font-bold text-gray-400 block">
                                                        Next Lesson
                                                    </span>
                                                    <p className="font-semibold text-gray-800 line-clamp-1 mt-0.5">
                                                        {item.nextLesson.title}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Upcoming Demo Card on Course Item */}
                                            {item.upcomingDemo && (
                                                <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border-2 border-emerald-500/40 space-y-2 mt-2">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider text-[10px] flex items-center gap-1">
                                                            <Video className="w-3.5 h-3.5 text-emerald-600" />
                                                            <span>Your Upcoming Demo Class</span>
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                            item.upcomingDemo.status === "LIVE"
                                                                ? "bg-red-500 text-white animate-pulse"
                                                                : "bg-emerald-100 text-emerald-800"
                                                        }`}>
                                                            {item.upcomingDemo.status === "LIVE" ? "LIVE NOW" : "REGISTERED"}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                                                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                                                        <span>{item.upcomingDemo.timeLabel}</span>
                                                    </div>
                                                    {item.upcomingDemo.status === "LIVE" ? (
                                                        <Link
                                                            href={`/courses/${item.course.slug}/demo?slot=${item.upcomingDemo.slotId}`}
                                                            className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 transition-colors shadow-xs animate-pulse"
                                                        >
                                                            <Video className="w-3.5 h-3.5" />
                                                            <span>🔴 Enter Demo Room (LIVE NOW) →</span>
                                                        </Link>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            <button
                                                                type="button"
                                                                disabled
                                                                className="w-full py-2.5 px-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed border border-gray-200 dark:border-gray-700"
                                                            >
                                                                <Video className="w-3.5 h-3.5 text-gray-400" />
                                                                <span>Enter Demo Room (Starts {item.upcomingDemo.clockLabel || "Scheduled"})</span>
                                                            </button>
                                                            <p className="text-[10px] text-center text-gray-400 font-medium">
                                                                Classroom unlocks when teacher goes live
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Button Footer */}
                                    <div className="p-5 pt-0">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                router.push(continueHref)
                                            }}
                                            className="w-full py-2.5 rounded-xl bg-[#5B47FB] hover:bg-[#4a36ea] text-white font-extrabold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 group-hover:gap-2 cursor-pointer"
                                        >
                                            <Play className="w-3.5 h-3.5 fill-white" />
                                            <span>Watch Now</span>
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    /* ─── DETAILED SYLLABUS LIST VIEW ───────────────────────────────── */
                    <div className="space-y-6">
                        {sortedList.map((item) => {
                            const isExpanded = expandedCourses[item.id] ?? false
                            const allLessons = item.course.chapters.flatMap((ch) => ch.lessons)
                            const pct = Math.round(item.progressPercentage)
                            const continueHref = item.nextLesson
                                ? `/courses/${item.course.slug}/learn/${item.nextLesson.id}`
                                : `/courses/${item.course.slug}`

                            return (
                                <div
                                    key={item.id}
                                    className="bg-white rounded-2xl border-2 border-[#10162F] shadow-[4px_4px_0px_0px_#10162F] p-5 sm:p-6 space-y-4"
                                >
                                    {/* Course Card Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <span className="font-mono text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-0.5">
                                                Course
                                            </span>
                                            <Link
                                                href={`/courses/${item.course.slug}`}
                                                className="text-xl sm:text-2xl font-extrabold text-[#10162F] hover:text-[#3A10E5] transition-colors"
                                            >
                                                {item.course.title}
                                            </Link>
                                        </div>

                                        {/* Progress & Toggle Accordion */}
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2.5">
                                                <span className="text-xs sm:text-sm font-black text-[#10162F]">
                                                    {pct}%
                                                </span>

                                                <div className="w-24 sm:w-28 h-2.5 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${pct}%`,
                                                            backgroundImage:
                                                                "repeating-linear-gradient(45deg, #10162F 0, #10162F 3px, #2A304F 0, #2A304F 6px)",
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <Link
                                                href={continueHref}
                                                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5B47FB] hover:bg-[#4a36ea] text-white font-extrabold text-xs transition-all shadow-xs"
                                            >
                                                <Play className="w-3 h-3 fill-white" />
                                                <span>Watch Now</span>
                                            </Link>

                                            <button
                                                type="button"
                                                onClick={() => toggleCourse(item.id)}
                                                className="p-1.5 rounded-lg hover:bg-gray-100 text-[#10162F] transition-colors cursor-pointer"
                                                title={isExpanded ? "Collapse Syllabus" : "Expand Syllabus"}
                                            >
                                                {isExpanded ? (
                                                    <ChevronUp className="h-5 w-5 stroke-[2.5]" />
                                                ) : (
                                                    <ChevronDown className="h-5 w-5 stroke-[2.5]" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Collapsible Syllabus Content */}
                                    {isExpanded && (
                                        <div className="pt-2">
                                            <div className="rounded-xl border border-gray-200 bg-[#FFFDF9] p-4 sm:p-5 space-y-3">
                                                <div className="font-extrabold text-sm text-[#10162F] mb-3">
                                                    {item.course.title}
                                                </div>

                                                <div className="space-y-1">
                                                    {allLessons.map((lesson, idx) => {
                                                        const isDone = item.completedLessonIds.includes(lesson.id)
                                                        return (
                                                            <div
                                                                key={lesson.id}
                                                                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white text-xs transition-colors border border-transparent hover:border-gray-200"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div
                                                                        className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                                                            isDone
                                                                                ? "bg-[#10162F] text-white"
                                                                                : "border-2 border-gray-300 text-gray-400"
                                                                        }`}
                                                                    >
                                                                        {isDone ? <Check className="h-3 w-3 stroke-[3]" /> : idx + 1}
                                                                    </div>
                                                                    <span
                                                                        className={`font-semibold ${
                                                                            isDone ? "text-gray-500 line-through" : "text-gray-900"
                                                                        }`}
                                                                    >
                                                                        {lesson.title}
                                                                    </span>
                                                                </div>

                                                                <Link
                                                                    href={`/courses/${item.course.slug}/learn/${lesson.id}`}
                                                                    className="px-2.5 py-1 rounded bg-[#10162F] hover:bg-[#3A10E5] text-white font-bold text-[10px] transition-colors"
                                                                >
                                                                    {isDone ? "Review" : "Start"}
                                                                </Link>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
