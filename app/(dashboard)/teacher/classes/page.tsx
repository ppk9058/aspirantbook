"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Calendar,
  Radio,
  PlusCircle,
  Users,
  Clock,
  ArrowLeft,
  ChevronRight,
  Share2,
  Video,
} from "lucide-react"

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/teacher/classes")
      .then((res) => res.json())
      .then((data) => {
        if (data.classes) {
          setClasses(data.classes)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/teacher"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Teacher Dashboard</span>
          </Link>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">
            My Teaching Classes & Broadcasts
          </h1>
          <p className="text-xs text-gray-500">
            View upcoming sessions, start broadcasts, and schedule new lectures.
          </p>
        </div>

        <Link
          href="/teacher/classes/new"
          className="px-5 py-2.5 rounded-xl bg-[#3AAFA9] hover:bg-[#2d8a85] text-white text-xs font-bold shadow-md shadow-[#3AAFA9]/20 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Schedule New Class</span>
        </Link>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-400 text-xs">
            Loading scheduled classes...
          </div>
        ) : classes.length === 0 ? (
          <div className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-500">
            <Calendar className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No scheduled lectures yet</p>
            <p className="text-xs text-gray-400 mt-1">Click &quot;Schedule New Class&quot; to create a new live broadcast.</p>
          </div>
        ) : (
          classes.map((cls) => (
            <div
              key={cls.id}
              className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {cls.status === "LIVE NOW" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-500 text-[11px] font-bold animate-pulse">
                      <Radio className="w-3 h-3" />
                      LIVE NOW
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-500 text-[11px] font-semibold">
                      <Clock className="w-3 h-3" />
                      Scheduled
                    </span>
                  )}
                  <span className="text-xs font-semibold text-gray-500">{cls.batch}</span>
                </div>
                <span className="text-xs text-gray-400">{cls.time}</span>
              </div>

              <h3 className="font-bold text-base text-gray-900 dark:text-white">{cls.title}</h3>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {cls.studentsCount} Students registered
                </span>
                <Link
                  href={cls.demoLink || "/teacher/classes"}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Join Live Demo</span>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
