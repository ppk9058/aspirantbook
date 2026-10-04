"use client"

import Link from "next/link"
import {
  Radio,
  ClipboardList,
  HelpCircle,
  FileText,
  BookOpen,
  GraduationCap,
  Layers,
  Compass,
} from "lucide-react"

interface QuickAccessItem {
  id: string
  name: string
  href: string
  icon: any
  iconBg: string
  iconColor: string
  badge?: string
  badgeColor?: string
}

const QUICK_ACCESS_ITEMS: QuickAccessItem[] = [
  {
    id: "live",
    name: "Live Classes",
    href: "/classroom/upsc-foundation",
    icon: Radio,
    iconBg: "bg-rose-50 dark:bg-rose-950/40",
    iconColor: "text-rose-600 dark:text-rose-400",
    badge: "LIVE",
    badgeColor: "bg-rose-700 text-white",
  },
  {
    id: "tests",
    name: "Test Series",
    href: "/test-series",
    icon: ClipboardList,
    iconBg: "bg-teal-50 dark:bg-teal-950/40",
    iconColor: "text-teal-600 dark:text-teal-400",
  },
  {
    id: "quizzes",
    name: "Quizzes",
    href: "/current-affairs-quizzes",
    icon: HelpCircle,
    iconBg: "bg-amber-50 dark:bg-amber-950/40",
    iconColor: "text-amber-600 dark:text-amber-400",
    badge: "FREE",
    badgeColor: "bg-emerald-700 text-white",
  },
  {
    id: "pyqs",
    name: "PYQs",
    href: "/pyqs",
    icon: FileText,
    iconBg: "bg-blue-50 dark:bg-blue-950/40",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "courses",
    name: "Courses",
    href: "/courses",
    icon: BookOpen,
    iconBg: "bg-indigo-50 dark:bg-indigo-950/40",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
  {
    id: "tutorials",
    name: "Tutorials",
    href: "/tutorials",
    icon: GraduationCap,
    iconBg: "bg-violet-50 dark:bg-violet-950/40",
    iconColor: "text-violet-600 dark:text-violet-400",
    badge: "NEW",
    badgeColor: "bg-indigo-600 text-white",
  },
  {
    id: "batches",
    name: "Batches",
    href: "/my-learning",
    icon: Layers,
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "tracks",
    name: "Career Tracks",
    href: "/tracks",
    icon: Compass,
    iconBg: "bg-cyan-50 dark:bg-cyan-950/40",
    iconColor: "text-cyan-600 dark:text-cyan-400",
  },
]

export default function MobileQuickAccessGrid() {
  return (
    <div className="lg:hidden px-3 pt-2">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="grid grid-cols-4 gap-y-3.5 gap-x-2">
          {QUICK_ACCESS_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.id}
                href={item.href}
                className="group flex flex-col items-center text-center active:scale-95 transition-transform"
              >
                {/* Circular tinted icon container with optional top badge */}
                <div className="relative">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.iconBg} ${item.iconColor} shadow-2xs group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  {item.badge && (
                    <span
                      className={`absolute -top-1.5 -right-2 text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase shadow-xs ${
                        item.badgeColor || "bg-teal-600 text-white"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* Label below */}
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-1.5 line-clamp-1 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                  {item.name}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
