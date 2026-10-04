"use client"

import Link from "next/link"
import Image from "next/image"
import { ChevronRight, PlayCircle, BookOpen, Clock, Users } from "lucide-react"

interface MobileRecommendedSectionProps {
  courses: any[]
  heading?: string
  viewAllHref?: string
  accentColor?: string
}

export default function MobileRecommendedSection({
  courses,
  heading = "Recommended for you",
  viewAllHref = "/courses",
  accentColor = "bg-teal-500",
}: MobileRecommendedSectionProps) {
  if (!courses || courses.length === 0) return null

  const displayCourses = courses.slice(0, 6)

  return (
    <div className="lg:hidden px-3 pt-3">
      {/* Section Header with Accent Bar & View All */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className={`w-1 h-4 rounded-full ${accentColor}`} />
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {heading}
          </h2>
        </div>

        <Link
          href={viewAllHref}
          className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-0.5"
        >
          <span>View all</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Horizontal Scroll-Snap Card Row */}
      <div
        data-scroll-x="true"
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar gap-3 pb-1"
        style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
      >
        {displayCourses.map((course) => (
          <Link
            key={course.id || course.slug}
            href={`/courses/${course.slug}`}
            className="w-[240px] shrink-0 snap-start bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col justify-between group active:scale-[0.98] transition-transform"
          >
            {/* Thumbnail */}
            <div className="relative w-full h-28 bg-slate-100 dark:bg-slate-800 overflow-hidden">
              {course.thumbnailUrl ? (
                <Image
                  src={course.thumbnailUrl}
                  alt={course.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-teal-500/10 text-teal-600">
                  <BookOpen className="w-8 h-8" />
                </div>
              )}

              {course.difficulty && (
                <span className="absolute top-2 left-2 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900/80 text-white backdrop-blur-xs">
                  {course.difficulty}
                </span>
              )}
            </div>

            {/* Content Details */}
            <div className="p-3 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                  {course.title}
                </h3>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1 font-semibold">
                  <PlayCircle className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Start Learning</span>
                </span>
                {course.duration && (
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 truncate font-medium">
                    {course.duration}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
