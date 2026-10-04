"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronUp,
  Play,
  CheckCircle2,
  Circle,
  Lock,
  Bookmark,
  Share2,
  FileText,
  Download,
  Clock,
  Sparkles,
  Layers,
  Check,
  Video,
  Sun,
  Moon,
  TrendingUp,
  Paperclip,
  Eye,
  MessageSquare,
  HelpCircle,
  FileCheck,
} from "lucide-react"
import { toggleLessonCompletion } from "@/lib/actions/course/progress"
import { useSession } from "next-auth/react"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"

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

interface CoursePlayerProps {
  course: {
    id: string
    title: string
    slug: string
    thumbnailUrl?: string | null
    price?: number | null
    originalPrice?: number | null
    discountPercent?: number | null
    expiresAt?: string | null
    chapters: ChapterItem[]
  }
  initialLessonId?: string
  userRole?: string
  userName?: string
  initialCompletedIds?: { [id: string]: boolean }
}

export function CoursePlayerClient({
  course,
  initialLessonId,
  userRole,
  userName = "Student",
  initialCompletedIds = {},
}: CoursePlayerProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const { openMobileAuth } = useMobileAuth()

  // Theme state: default false (clean white mode as in Image 1)
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("ts_player_theme")
    if (saved === "dark") {
      setIsDarkMode(true)
    }
  }, [])

  const toggleTheme = () => {
    const next = !isDarkMode
    setIsDarkMode(next)
    localStorage.setItem("ts_player_theme", next ? "dark" : "light")
  }

  // Find active lesson
  const allLessons = course.chapters.flatMap((ch) => ch.lessons)
  const initialLesson =
    allLessons.find((l) => l.id === initialLessonId) ||
    allLessons.find((l) => l.isTrial) ||
    allLessons[0]

  const [activeLesson, setActiveLesson] = useState<LessonItem>(initialLesson)
  // Real database-persisted progress state
  const [completedLessonIds, setCompletedLessonIds] = useState<{ [id: string]: boolean }>(
    initialCompletedIds
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"overview" | "bookmarks" | "resources" | "recent" | "discussions">("overview")
  const [isSaved, setIsSaved] = useState(false)
  const [copiedShare, setCopiedShare] = useState(false)
  const [isPlayingVideo, setIsPlayingVideo] = useState(false)
  const [expandedChapters, setExpandedChapters] = useState<{ [id: string]: boolean }>({
    [course.chapters[0]?.id || ""]: true,
    [course.chapters[1]?.id || ""]: true,
  })

  // Find chapter of active lesson
  const activeChapter = course.chapters.find((ch) =>
    ch.lessons.some((l) => l.id === activeLesson.id)
  )
  const activeChapterIndex = course.chapters.findIndex((ch) => ch.id === activeChapter?.id)
  const activeLessonIndex = allLessons.findIndex((l) => l.id === activeLesson.id) + 1

  // Real-time Database-backed completion calculation
  const completedCount = allLessons.filter((l) => completedLessonIds[l.id]).length
  const progressPercent = allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0

  // Locked condition (if not trial, and user is not enrolled/admin/teacher)
  const isUnlocked = activeLesson.isTrial || userRole === "ADMIN" || userRole === "TEACHER"

  const toggleChapter = (id: string) => {
    setExpandedChapters((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Real-time Database Toggle
  const handleToggleLessonComplete = async (lessonId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const nextState = !completedLessonIds[lessonId]
    // 1. Instant optimistic UI update
    setCompletedLessonIds((prev) => ({ ...prev, [lessonId]: nextState }))
    // 2. Real PostgreSQL database update
    try {
      await toggleLessonCompletion(lessonId)
    } catch (err) {
      console.warn("Progress update warning:", err)
    }
  }

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href)
      setCopiedShare(true)
      setTimeout(() => setCopiedShare(false), 2500)
    }
  }

  const trialLesson = allLessons.find((l) => l.isTrial)

  // Filter lessons if searching
  const filteredChapters = course.chapters.map((ch) => {
    if (!searchQuery.trim()) return ch
    return {
      ...ch,
      lessons: ch.lessons.filter((l) =>
        l.title.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }
  })

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isDarkMode ? "bg-[#0a0f1d] text-gray-100" : "bg-[#f8f9fa] text-gray-900"
      }`}
    >
      {/* ======================================================== */}
      {/* 1. TOP HEADER (Matches Image 1 with Toggle for Black/White) */}
      {/* ======================================================== */}
      <header
        className={`h-14 border-b px-3 sm:px-6 flex items-center justify-between z-30 shrink-0 transition-colors ${
          isDarkMode ? "bg-[#0b1329] border-gray-800" : "bg-white border-gray-200/90 shadow-2xs"
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link
            href="/my-learning"
            className={`flex items-center gap-1 sm:gap-1.5 text-xs font-bold transition-colors shrink-0 ${
              isDarkMode ? "text-gray-300 hover:text-white" : "text-gray-700 hover:text-black"
            }`}
            title="Back to My Batches"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span className="hidden xs:inline">Back</span>
          </Link>

          <div className={`h-4 w-[1px] shrink-0 ${isDarkMode ? "bg-gray-700" : "bg-gray-300"}`} />

          <h1 className={`text-xs sm:text-sm md:text-base font-extrabold truncate max-w-[130px] xs:max-w-[200px] sm:max-w-md md:max-w-xl ${
            isDarkMode ? "text-white" : "text-[#10162F]"
          }`}>
            {course.title}
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Black & White Page Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-2xs ${
              isDarkMode
                ? "bg-gray-800 border-gray-700 text-amber-300 hover:bg-gray-700"
                : "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
            }`}
            title="Toggle between Black Mode and White Mode"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">White Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-gray-700 shrink-0" />
                <span className="hidden sm:inline">Black Mode</span>
              </>
            )}
          </button>

          {/* User Initial Avatar (Image 1 'N' Avatar style) */}
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold flex items-center justify-center text-xs shadow-2xs shrink-0">
            {userName ? userName.charAt(0).toUpperCase() : "N"}
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. MAIN SPLIT: Left Syllabus Sidebar & Main Player Stage */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        {/* Left Sidebar (Desktop: Left Docked; Mobile/Tablet: Order-2 below video) */}
        <aside
          className={`w-full lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-r flex flex-col shrink-0 order-2 lg:order-1 lg:max-h-[calc(100vh-56px)] transition-colors ${
            isDarkMode ? "bg-[#091124] border-gray-800" : "bg-white border-gray-200"
          }`}
        >
          {/* Real-time % Complete & Search Bar */}
          <div
            className={`p-3.5 sm:p-4 border-b flex items-center justify-between gap-2 sm:gap-3 ${
              isDarkMode ? "border-gray-800 bg-[#091124]" : "border-gray-100 bg-white"
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="lg:hidden text-xs font-extrabold uppercase tracking-wider text-sky-600 mr-1">
                Curriculum
              </span>
              <span className={`text-lg sm:text-xl font-black ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                {progressPercent}%
              </span>
              <span className={`text-xs font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                complete
              </span>
              <TrendingUp className="w-4 h-4 text-sky-600 ml-0.5 shrink-0" />
            </div>

            <div className="relative flex-1 max-w-[120px] sm:max-w-[160px]">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className={`w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                  isDarkMode
                    ? "bg-gray-800/70 border-gray-700 text-white placeholder-gray-500"
                    : "bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400"
                }`}
              />
            </div>
          </div>

          {/* Chapters & Lessons Tree */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60 custom-scrollbar">
            {filteredChapters.map((chapter, idx) => {
              const formattedNum = String(idx + 1).padStart(2, "0")
              const chCompletedCount = chapter.lessons.filter((l) => completedLessonIds[l.id]).length
              const chAttachmentsCount = chapter.lessons.filter(
                (l) => l.attachmentName || l.attachmentType
              ).length
              const isExpanded = expandedChapters[chapter.id] !== false

              return (
                <div key={chapter.id} className="text-xs">
                  {/* Chapter Section Title */}
                  <div
                    onClick={() => toggleChapter(chapter.id)}
                    className={`p-3.5 flex items-center justify-between gap-2.5 cursor-pointer transition-colors border-b ${
                      isDarkMode
                        ? "bg-gray-800/30 border-gray-800 hover:bg-gray-800/50"
                        : "bg-gray-50/80 border-gray-100 hover:bg-gray-100/70"
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="font-mono text-gray-400 font-bold shrink-0">{formattedNum}</span>
                      <div className="min-w-0">
                        <div
                          className={`font-bold line-clamp-1 ${
                            isDarkMode ? "text-gray-100" : "text-gray-900"
                          }`}
                        >
                          {chapter.title}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5 font-medium">
                          <span>
                            {chCompletedCount} of {chapter.lessons.length} complete
                          </span>
                          {chAttachmentsCount > 0 && (
                            <>
                              <span>&bull;</span>
                              <span className="flex items-center gap-0.5 text-sky-600 font-semibold">
                                {chAttachmentsCount} <Paperclip className="w-3 h-3 inline" />
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-gray-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Lessons List in this Section (Matching Image 1) */}
                  {isExpanded && (
                    <div className={`divide-y ${isDarkMode ? "bg-[#070d1c] divide-gray-800/40" : "bg-white divide-gray-100"}`}>
                      {chapter.lessons.map((lesson) => {
                        const isActive = lesson.id === activeLesson.id
                        const isCompleted = !!completedLessonIds[lesson.id]

                        return (
                          <div
                            key={lesson.id}
                            onClick={() => {
                              setActiveLesson(lesson)
                              setIsPlayingVideo(false)
                            }}
                            className={`p-3.5 pl-6 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                              isActive
                                ? isDarkMode
                                  ? "bg-sky-950/40 border-l-4 border-sky-500 text-sky-200"
                                  : "bg-[#f0f7ff] border-l-4 border-sky-600 text-sky-950 font-bold shadow-2xs"
                                : isDarkMode
                                ? "hover:bg-gray-800/40 text-gray-300"
                                : "hover:bg-gray-50 text-gray-700"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Real-time Toggle Checkbox */}
                              <button
                                type="button"
                                onClick={(e) => handleToggleLessonComplete(lesson.id, e)}
                                className="shrink-0 p-1.5 -m-1.5 rounded-full transition-transform active:scale-90"
                                title={isCompleted ? "Completed (Click to uncheck)" : "Mark as completed"}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="w-5 h-5 text-sky-600 fill-sky-100 dark:fill-sky-950" />
                                ) : (
                                  <Circle className="w-5 h-5 text-gray-300 hover:text-sky-500" />
                                )}
                              </button>

                              {/* Play Icon */}
                              <Play
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  isActive
                                    ? "text-sky-600 fill-sky-600"
                                    : "text-gray-400 group-hover:text-gray-600"
                                }`}
                              />

                              <div className="min-w-0">
                                <span
                                  className={`block truncate text-xs sm:text-sm ${
                                    isActive
                                      ? isDarkMode
                                        ? "text-white font-extrabold"
                                        : "text-sky-950 font-bold"
                                      : isDarkMode
                                      ? "text-gray-200"
                                      : "text-gray-800 font-medium"
                                  }`}
                                >
                                  {lesson.title}
                                </span>

                                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
                                  <span>{lesson.type === "VIDEO" ? "Video" : "Document"}</span>
                                  <span>&bull;</span>
                                  <span>{lesson.durationText || "1h 14m"}</span>
                                  {lesson.attachmentName && (
                                    <>
                                      <span>&bull;</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setActiveLesson(lesson)
                                          setActiveTab("resources")
                                        }}
                                        className="text-sky-600 font-semibold hover:underline"
                                      >
                                        Attachments
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 text-[10px] font-bold">
                              {lesson.isTrial ? (
                                <span className="px-1.5 py-0.5 rounded text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                  Trial
                                </span>
                              ) : (
                                !isUnlocked && <Lock className="w-3.5 h-3.5 text-gray-400" />
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
        </aside>

        {/* ======================================================== */}
        {/* 3. MAIN VIDEO STAGE & LESSON DETAILS */}
        {/* ======================================================== */}
        <main
          className={`flex-1 flex flex-col p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 order-1 lg:order-2 lg:overflow-y-auto transition-colors ${
            isDarkMode ? "bg-[#0b1329]" : "bg-[#f8f9fa]"
          }`}
        >
          {/* 16:9 Video Canvas / Paywall Container */}
          <div className="relative aspect-video w-full max-w-5xl mx-auto rounded-xl sm:rounded-2xl overflow-hidden bg-black shadow-xl border border-gray-800/80 flex items-center justify-center">
            {isUnlocked ? (
              /* Unlocked / Trial Video Player */
              isPlayingVideo ? (
                activeLesson.videoUrl && (activeLesson.videoUrl.includes("youtube.com") || activeLesson.videoUrl.includes("youtu.be")) ? (
                  <iframe
                    src={(() => {
                      const match = activeLesson.videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)
                      const videoId = match ? match[1] : null
                      return videoId
                        ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`
                        : activeLesson.videoUrl.replace("watch?v=", "embed/") + "?autoplay=1"
                    })()}
                    title={activeLesson.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                ) : (
                  <video
                    src={activeLesson.videoUrl || undefined}
                    controls
                    autoPlay
                    playsInline
                    onEnded={() => {
                      // Automatically mark lesson as completed upon finishing
                      if (!completedLessonIds[activeLesson.id]) {
                        setCompletedLessonIds((prev) => ({ ...prev, [activeLesson.id]: true }))
                        toggleLessonCompletion(activeLesson.id).catch((err) => console.warn("Auto complete warning:", err))
                      }
                    }}
                    className="w-full h-full"
                  />
                )
              ) : (
                <div
                  onClick={() => setIsPlayingVideo(true)}
                  className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-t from-black/90 via-black/50 to-transparent cursor-pointer group"
                >
                  {course.thumbnailUrl && (
                    <img
                      src={course.thumbnailUrl}
                      alt={activeLesson.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-60 transition-opacity"
                    />
                  )}
                  <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-sky-600 group-hover:bg-sky-500 text-white flex items-center justify-center shadow-xl shadow-sky-600/40 group-hover:scale-110 transition-all">
                    <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-white ml-0.5 sm:ml-1" />
                  </div>
                  <span className="relative z-10 mt-3 sm:mt-4 text-xs sm:text-sm font-bold text-white drop-shadow text-center px-4">
                    Play {activeLesson.title} ({activeLesson.durationText || "1h 45m"})
                  </span>
                  {activeLesson.isTrial && (
                    <span className="relative z-10 mt-1 px-3 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 drop-shadow">
                      Free Preview Active
                    </span>
                  )}
                </div>
              )
            ) : (
              /* Paywall when course is locked */
              <div className="flex flex-col items-center justify-center text-center p-4 sm:p-6 space-y-3 sm:space-y-4 max-w-md animate-in fade-in zoom-in-95 duration-200">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-800 text-gray-300 border border-gray-700">
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                  PAID LESSON
                </span>

                <div className="space-y-1">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-2xl sm:text-4xl font-extrabold text-white">
                      ₹{(course.price || 3299).toLocaleString()}
                    </span>
                    <span className="text-sm sm:text-base text-gray-400 line-through">
                      ₹{(course.originalPrice || 4499).toLocaleString()}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      {course.discountPercent || 27}% off
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Access till {course.expiresAt || "30 Oct 2026"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 pt-2">
                  <button
                    onClick={() => {
                      if (session?.user) {
                        router.push(`/checkout?courseId=${course.id}`)
                      } else {
                        openMobileAuth({
                          course: {
                            id: course.id,
                            slug: course.slug,
                            title: course.title,
                            price: course.price,
                            isFree: false,
                          },
                          actionType: "buy",
                        })
                      }
                    }}
                    className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold text-white bg-sky-500 hover:bg-sky-400 transition-all shadow-lg shadow-sky-500/30 hover:scale-105 cursor-pointer"
                  >
                    Buy Now
                  </button>

                  {trialLesson && (
                    <button
                      onClick={() => {
                        setActiveLesson(trialLesson)
                        setIsPlayingVideo(false)
                      }}
                      className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold text-gray-300 bg-transparent hover:bg-white/5 border border-gray-600 transition-colors"
                    >
                      Start a free trial
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* Lesson Metadata Card & Details (Matching Image 1) */}
          {/* ======================================================== */}
          <div
            className={`max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl border shadow-xs transition-colors space-y-4 sm:space-y-6 ${
              isDarkMode
                ? "bg-[#0f172a] border-gray-800 text-gray-100"
                : "bg-white border-gray-200/90 text-gray-900"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-gray-100 dark:border-gray-800 pb-4 sm:pb-5">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold mb-1.5 sm:mb-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold ${
                      isDarkMode ? "bg-gray-800 text-gray-200" : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <Video className="w-3.5 h-3.5 text-sky-600" />
                    Video lesson
                  </span>
                  <span className="text-gray-500 font-medium text-[11px] sm:text-xs">
                    {activeChapter?.title} &bull; Lesson {activeLessonIndex} of {allLessons.length}
                  </span>
                </div>

                <h2
                  className={`text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {activeLesson.title}
                </h2>
              </div>

              {/* Action Buttons: Save & Share */}
              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                <button
                  onClick={() => setIsSaved(!isSaved)}
                  className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold border transition-colors shadow-2xs ${
                    isSaved
                      ? "bg-sky-50 border-sky-300 text-sky-700 dark:bg-sky-950/60 dark:border-sky-500 dark:text-sky-300"
                      : isDarkMode
                      ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-sky-600 text-sky-600" : ""}`} />
                  <span>{isSaved ? "Saved" : "Save"}</span>
                </button>

                <button
                  onClick={handleShare}
                  className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold border transition-colors shadow-2xs ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {copiedShare ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                  )}
                  <span>{copiedShare ? "Copied" : "Share"}</span>
                </button>
              </div>
            </div>

            {/* Bottom Tabs: Overview, Bookmarks, Resources, Recently added, Discussions */}
            <div className="space-y-4">
              <div
                className={`flex items-center gap-4 sm:gap-8 border-b text-xs sm:text-sm font-bold overflow-x-auto no-scrollbar scroll-smooth ${
                  isDarkMode ? "border-gray-800" : "border-gray-200"
                }`}
              >
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`pb-3 border-b-2 transition-colors shrink-0 ${
                    activeTab === "overview"
                      ? "border-sky-600 text-sky-600 font-extrabold"
                      : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Overview
                </button>

                <button
                  onClick={() => setActiveTab("bookmarks")}
                  className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors shrink-0 ${
                    activeTab === "bookmarks"
                      ? "border-sky-600 text-sky-600 font-extrabold"
                      : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <span>Bookmarks</span>
                </button>

                <button
                  onClick={() => setActiveTab("resources")}
                  className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors shrink-0 ${
                    activeTab === "resources"
                      ? "border-sky-600 text-sky-600 font-extrabold"
                      : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <span>Resources</span>
                  {activeLesson.attachmentName && (
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("recent")}
                  className={`pb-3 border-b-2 transition-colors shrink-0 ${
                    activeTab === "recent"
                      ? "border-sky-600 text-sky-600 font-extrabold"
                      : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Recently added
                </button>

                <button
                  onClick={() => setActiveTab("discussions")}
                  className={`pb-3 border-b-2 transition-colors shrink-0 ${
                    activeTab === "discussions"
                      ? "border-sky-600 text-sky-600 font-extrabold"
                      : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Discussions
                </button>
              </div>

              {/* Tab 1: Overview */}
              {activeTab === "overview" && (
                <div className="space-y-4 pt-2 text-sm leading-relaxed">
                  <p className={isDarkMode ? "text-gray-300" : "text-gray-600"}>
                    {activeLesson.content ||
                      `Welcome to "${activeLesson.title}". In this comprehensive video lecture, we cover the core concepts, analytical frameworks, and exam-oriented topics designed for thorough conceptual understanding.`}
                  </p>
                  <div
                    className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                      isDarkMode ? "bg-gray-800/40 border-gray-700" : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-sky-600" />
                      <span>Duration: {activeLesson.durationText || "1h 45m 00s"}</span>
                    </span>
                    <button
                      onClick={(e) => handleToggleLessonComplete(activeLesson.id, e)}
                      className={`px-3 py-1.5 rounded-lg font-bold border transition-colors flex items-center gap-1.5 ${
                        completedLessonIds[activeLesson.id]
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300"
                          : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{completedLessonIds[activeLesson.id] ? "Completed ✓" : "Mark Complete"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Bookmarks */}
              {activeTab === "bookmarks" && (
                <div className="pt-2 text-sm">
                  {isSaved ? (
                    <div
                      className={`p-4 rounded-xl border flex items-center justify-between ${
                        isDarkMode ? "bg-gray-800/40 border-gray-700" : "bg-sky-50/50 border-sky-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-sky-900 dark:text-sky-300">
                        <Bookmark className="w-4 h-4 fill-sky-600 text-sky-600" />
                        <span>{activeLesson.title}</span>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">Saved to library</span>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <Bookmark className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="font-semibold text-sm">No bookmarks yet</p>
                      <p className="text-xs mt-1">Click the &quot;Save&quot; button above to bookmark key timestamps and lessons.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Resources (PDF attachments) */}
              {activeTab === "resources" && (
                <div className="pt-2 space-y-3">
                  {activeLesson.attachmentName || activeLesson.attachmentUrl ? (
                    <div
                      className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                        isDarkMode ? "bg-gray-800/40 border-gray-700" : "bg-indigo-50/60 border-indigo-200"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                            {activeLesson.attachmentName || "Lecture Notes & Study Material"}
                          </h4>
                          <span className="text-xs text-indigo-700 dark:text-indigo-400 font-medium">
                            PDF Document Attachment
                          </span>
                        </div>
                      </div>

                      <a
                        href={activeLesson.attachmentUrl || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </a>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="font-semibold text-sm">No attachments for this lesson</p>
                      <p className="text-xs mt-1">Check other lectures in the syllabus for downloadable PDF study notes.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Recently Added */}
              {activeTab === "recent" && (
                <div className="pt-2 space-y-2">
                  {allLessons.slice(0, 5).map((l, idx) => (
                    <div
                      key={l.id}
                      onClick={() => setActiveLesson(l)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                        isDarkMode ? "bg-gray-800/30 border-gray-700 hover:bg-gray-800" : "bg-gray-50 border-gray-200 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-bold text-gray-400">{idx + 1}.</span>
                        <span className="text-xs font-bold">{l.title}</span>
                      </div>
                      <span className="text-xs text-gray-400">{l.durationText || "1h 30m"}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 5: Discussions */}
              {activeTab === "discussions" && (
                <div className="pt-2 space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Ask a doubt or start a discussion for this lesson..."
                      className={`flex-1 px-4 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                        isDarkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                      }`}
                    />
                    <button className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-sm">
                      Post Question
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 text-center py-4">
                    Be the first to start a discussion about this lecture.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
