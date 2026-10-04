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
} from "lucide-react"

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<any[]>([
    {
      id: "72nd-bpsc-prelims-current-affairs",
      title: "🔴 Free Demo: 72nd BPSC Prelims Current Affairs & Trend Analysis",
      batch: "BPSC 72nd Live Demo Funnel",
      time: "Scheduled Today, 6:00 PM",
      status: "LIVE DEMO",
      studentsCount: 148,
      demoLink: "/courses/72nd-bpsc-prelims-current-affairs/demo",
    },
    {
      id: "half-yearly-6",
      title: "Science & Physics: Motion & Measurement of Distances",
      batch: "Champs 2.0 (Class 6)",
      time: "Today, 5:00 PM - 6:30 PM",
      status: "LIVE NOW",
      studentsCount: 976,
    },
    {
      id: "python-masterclass",
      title: "Python Vectorization & Matrix Ops with NumPy",
      batch: "Foundation Batch 2026",
      time: "Tomorrow, 10:00 AM - 11:30 AM",
      status: "UPCOMING",
      studentsCount: 340,
    },
    {
      id: "dsa-trees",
      title: "Binary Search Trees, Rotations & AVL Trees",
      batch: "DSA & Competitive Programming Bootcamp",
      time: "Friday, 4:00 PM - 6:00 PM",
      status: "UPCOMING",
      studentsCount: 420,
    },
  ])

  useEffect(() => {
    fetch("/api/teacher/classes")
      .then((res) => res.json())
      .then((data) => {
        if (data.classes && data.classes.length > 0) {
          setClasses((prev) => {
            const dynamicIds = new Set(data.classes.map((c: any) => c.id))
            const remaining = prev.filter((p) => !dynamicIds.has(p.id))
            return [...data.classes, ...remaining]
          })
        }
      })
      .catch(() => {})
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
        {classes.map((cls) => (
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
                href={cls.demoLink || `/classroom/${cls.id}?role=teacher`}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Go to Live Studio</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
