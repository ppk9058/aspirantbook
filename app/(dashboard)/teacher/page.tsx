import Link from "next/link"
import {
  Video,
  Radio,
  HelpCircle,
  Users,
  Calendar,
  Clock,
  PlusCircle,
  CheckCircle2,
  FileQuestion,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Upload,
} from "lucide-react"
import { getAllDoubts } from "@/lib/doubts-service"
import { getAllBatches } from "@/lib/batches-service"
import { prisma } from "@/lib/prisma"
import { formatUtcToIst } from "@/lib/demo/slot-utils"

export default async function TeacherDashboardPage() {
  const doubts = await getAllDoubts().catch(() => [])
  const pendingDoubts = doubts.filter((d) => d.status === "PENDING")
  const batches = await getAllBatches().catch(() => [])

  const demoSlots = await prisma.demoSlot.findMany({
    where: { status: { in: ["SCHEDULED", "LIVE"] } },
    include: {
      course: { select: { id: true, slug: true, title: true } },
      _count: { select: { bookings: true } },
    },
    orderBy: [{ status: "desc" }, { startTime: "asc" }],
    take: 5,
  }).catch(() => [])

  const scheduledClasses = demoSlots.map((s) => {
    const ist = formatUtcToIst(s.startTime)
    return {
      id: s.id,
      title: `Live Demo: ${s.topic}`,
      batch: s.course?.title || "Demo Batch",
      time: ist.fullLabel,
      status: s.status === "LIVE" ? "LIVE NOW" : "SCHEDULED",
      studentsCount: s._count.bookings,
      demoLink: `/courses/${s.course?.slug}/demo?slot=${s.id}`,
    }
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#05192D] via-[#0a2540] to-[#0d2f52] rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1448d8]/20 border border-[#1448d8]/30 text-teal-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              Teacher Operational Cockpit
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Good day, Professor! Ready for today's lecture?
            </h1>
            <p className="text-xs sm:text-sm text-gray-300">
              Manage your live broadcasts, student questions, assessments, and classroom resources from one unified command center.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/teacher/classes/new"
              className="px-6 py-3.5 rounded-2xl bg-[#1448d8] hover:bg-[#0f37a8] text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#1448d8]/30 flex items-center gap-2 transition-all hover:scale-102"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Schedule New Class</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Today's Classes</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-[#1448d8] flex items-center justify-center">
              <Video className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-2">
            {scheduledClasses.length}
          </p>
          <p className="text-[11px] text-emerald-500 font-medium mt-0.5">
            {scheduledClasses.filter((c) => c.status === "LIVE NOW").length} Live &bull;{" "}
            {scheduledClasses.filter((c) => c.status !== "LIVE NOW").length} Scheduled
          </p>
        </div>

        <div className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Pending Doubts</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-2">
            {pendingDoubts.length}
          </p>
          <Link href="/teacher/questions" className="text-[11px] text-[#1448d8] hover:underline font-medium mt-0.5 inline-block">
            View queue & answer &rarr;
          </Link>
        </div>

        <div className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Active Students</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-2">1,316</p>
          <p className="text-[11px] text-gray-400 font-medium mt-0.5">Across assigned batches</p>
        </div>

        <div className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Published Tests</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-500 flex items-center justify-center">
              <FileQuestion className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-2">6</p>
          <Link href="/teacher/tests/new" className="text-[11px] text-purple-500 hover:underline font-medium mt-0.5 inline-block">
            + Create New Test
          </Link>
        </div>
      </div>

      {/* Main Grid: Scheduled Classes & Doubts Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Class Schedule */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Upcoming & Live Classes
              </h2>
              <p className="text-xs text-gray-500">Your scheduled teaching sessions</p>
            </div>
            <Link
              href="/teacher/classes/new"
              className="px-3.5 py-1.5 rounded-xl bg-[#1448d8] hover:bg-[#0f37a8] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Schedule Class</span>
            </Link>
          </div>

          <div className="space-y-3">
            {scheduledClasses.map((cls) => (
              <div
                key={cls.id}
                className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {cls.status === "LIVE NOW" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-500 text-[11px] font-bold animate-pulse">
                        <Radio className="w-3 h-3" />
                        LIVE NOW
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-500 text-[11px] font-semibold">
                        <Clock className="w-3 h-3" />
                        Scheduled
                      </span>
                    )}
                    <span className="text-xs font-semibold text-gray-500">{cls.batch}</span>
                  </div>
                  <span className="text-xs text-gray-400">{cls.time}</span>
                </div>

                <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                  {cls.title}
                </h3>

                <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {cls.studentsCount} Students registered
                  </span>
                  <Link
                    href={cls.demoLink || "/teacher/classes"}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Join Demo</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Pending Student Doubts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Student Doubts
              </h2>
              <p className="text-xs text-gray-500">Unanswered questions from students</p>
            </div>
            <Link
              href="/teacher/questions"
              className="text-xs text-[#1448d8] hover:underline font-semibold flex items-center gap-1"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {pendingDoubts.length === 0 ? (
              <div className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 text-center text-gray-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                All student questions answered! Good job!
              </div>
            ) : (
              pendingDoubts.slice(0, 3).map((doubt) => (
                <div
                  key={doubt.id}
                  className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-[#1448d8]/10 text-[#1448d8] text-[10px] font-bold">
                      {doubt.subject}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {new Date(doubt.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                    {doubt.questionText}
                  </p>

                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                    <span className="text-gray-400">From: {doubt.studentName}</span>
                    <Link
                      href="/teacher/questions"
                      className="text-[#1448d8] hover:underline font-semibold"
                    >
                      Answer &rarr;
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick Teacher Actions */}
          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-2">
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">Quick Faculty Actions</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link
                href="/teacher/tests/new"
                className="p-2.5 rounded-xl bg-white dark:bg-[#05192D] border border-gray-200 dark:border-gray-800 hover:border-[#1448d8] text-gray-800 dark:text-gray-200 font-semibold flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#1448d8]" />
                <span>Create Test</span>
              </Link>
              <Link
                href="/teacher/pyqs/upload"
                className="p-2.5 rounded-xl bg-white dark:bg-[#05192D] border border-gray-200 dark:border-gray-800 hover:border-orange-500 text-gray-800 dark:text-gray-200 font-semibold flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5 text-orange-500" />
                <span>Upload PYQ</span>
              </Link>
              <Link
                href="/teacher/pyqs"
                className="p-2.5 rounded-xl bg-white dark:bg-[#05192D] border border-gray-200 dark:border-gray-800 hover:border-orange-500 text-gray-800 dark:text-gray-200 font-semibold flex items-center gap-1.5 col-span-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>PYQ & Exam Category Studio</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
